'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Simple logger
function log(action: string, data?: any) {
  console.log(`[${new Date().toISOString()}] ${action}`, data ? JSON.stringify(data, null, 2) : '')
}

/**
 * Detect tie-break type using the same heuristics as player details page
 */
function detectTieBreakType(key: string, value: any, allValues: { [key: string]: any }): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  const isInteger = Number.isInteger(numValue)
  const allNumericValues = Object.values(allValues)
    .map(v => typeof v === 'string' ? parseFloat(v) : v)
    .filter(v => typeof v === 'number' && !isNaN(v))
    .sort((a, b) => b - a)

  if ([0, 1, 0.5].includes(numValue) || value === '') return 'Direct Encounter'
  if (isInteger && numValue >= 0 && numValue <= 15) return 'Number of Wins'
  if (typeof numValue === 'number' && numValue >= 100 && numValue <= 3500) {
    if (allNumericValues.length > 0 && numValue === allNumericValues[0]) return 'Performance Rating'
    return 'Average Rating of Opponents'
  }
  if (typeof numValue === 'number' && !isInteger && numValue > 0) {
    const decimalValues = allNumericValues.filter(v => !Number.isInteger(v))
    if (decimalValues.length >= 2) {
      const sortedDecimals = decimalValues.sort((a, b) => b - a)
      if (numValue === sortedDecimals[0]) return 'Buchholz (Gamepoints)'
      return 'Sonneborn-Berger'
    }
    return 'Buchholz (Gamepoints)'
  }
  return key
}

/**
 * Analyze tie breaks and detect performance rating
 */
function analyzeTieBreaks(tieBreaks: any): { performanceRating?: number; analysis: { [key: string]: string } } {
  const analysis: { [key: string]: string } = {}
  let performanceRating: number | undefined = undefined
  if (!tieBreaks) return { analysis, performanceRating }

  try {
    let parsedTieBreaks = tieBreaks
    if (typeof tieBreaks === 'string') {
      try { parsedTieBreaks = JSON.parse(tieBreaks) } 
      catch { parsedTieBreaks = { TB1: tieBreaks } }
    }

    if (typeof parsedTieBreaks === 'object' && parsedTieBreaks !== null) {
      const allValues = { ...parsedTieBreaks }
      Object.entries(parsedTieBreaks).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          const type = detectTieBreakType(key, value, allValues)
          analysis[key] = type
          if (type === 'Performance Rating') {
            const numValue = typeof value === 'string' ? parseFloat(value) : value
            if (typeof numValue === 'number' && !isNaN(numValue)) performanceRating = numValue
          }
        }
      })
    }
  } catch (error: any) {
    log('analyzeTieBreaks - error', { error: error.message })
  }

  return { analysis, performanceRating }}

/**
 * Get players list with advanced filtering (NO PAGINATION, fetch all in batches)
 */
export async function getPlayersData(filters?: {
  search?: string;
  bdateFrom?: string;
  bdateTo?: string;
  federation?: string;
  sex?: string;
  ratingFrom?: number;
  ratingTo?: number;
}) {
  log('getPlayersData', { filters })
  const supabase = await createClient()

  const BATCH_SIZE = 1000
  let allPlayers: any[] = []
  let start = 0
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from('master_players')
      .select('id, source_name, normalized_name, unique_no, cf_rating, bdate, sex, fed', { count: 'exact' })
      .range(start, start + BATCH_SIZE - 1)

    // Apply filters
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase().trim()
      query = query.or(`source_name.ilike.%${searchTerm}%,normalized_name.ilike.%${searchTerm}%`)
      log('search-debug', {
        searchTerm,
        query: `source_name.ilike.%${searchTerm}%,normalized_name.ilike.%${searchTerm}%`
      })
    }

    if (filters?.bdateFrom) query = query.gte('bdate', filters.bdateFrom.substring(0, 4))
    if (filters?.bdateTo) query = query.lte('bdate', filters.bdateTo.substring(0, 4))
    if (filters?.federation) query = query.eq('fed', filters.federation)
    if (filters?.sex) query = query.eq('sex', filters.sex)
    if (filters?.ratingFrom) query = query.gte('cf_rating', filters.ratingFrom)
    if (filters?.ratingTo) query = query.lte('cf_rating', filters.ratingTo)

    // Order
    if (filters?.search) query = query.order('source_name', { ascending: true })
    else query = query.order('cf_rating', { ascending: false })

    const { data: batch, error } = await query

    if (error) {
      log('getPlayersData - error', { error: error.message })
      return { players: [], error: error.message }
    }

    allPlayers.push(...(batch || []))
    hasMore = (batch?.length || 0) === BATCH_SIZE
    start += BATCH_SIZE
  }

  log('getPlayersData - success', { count: allPlayers.length })
  return { players: allPlayers, count: allPlayers.length }
}


/**
 * Search players across tournaments (raw players table, fetch all in batches)
 */
export async function searchAllPlayers(raw: string, normalized?: string, reversed?: string) {
  const supabase = await createClient()
  const query = supabase
    .from('master_players')
    .select('*', { count: 'exact' })
    .or(`
      source_name.ilike.%${raw}%,
      normalized_name.ilike.%${normalized}%,
      normalized_name.ilike.%${reversed}%
    `)
    .limit(5000)

  const { data: players, error } = await query
  return { players: players || [], error: error?.message }
}


/**
 * Get tournaments with pagination + search
 */
export async function getTournaments(page: number = 1, limit: number = 10, search?: string) {
  log('getTournaments', { page, limit, search })
  const supabase = await createClient()
  let query = supabase.from('tournaments').select('*', { count: 'exact' }).order('created_at', { ascending: false })
  if (search) query = query.or(`tournament_name.ilike.%${search}%, organizer.ilike.%${search}%, location.ilike.%${search}%`)
  const { data: tournaments, error, count } = await query.range((page - 1) * limit, page * limit - 1)
  if (error) return { tournaments: [], count: 0, error: error.message }
  log('getTournaments - success', { count: tournaments?.length, total: count })
  return { tournaments: tournaments || [], count: count || 0, totalPages: Math.ceil((count || 0) / limit) }
}

/**
 * CRUD: Create / Update / Delete Tournaments
 */
export async function createTournament(tournamentData: any) {
  log('createTournament', { tournamentData })
  const supabase = await createClient()
  const { data, error } = await supabase.from('tournaments').insert([tournamentData]).select().single()
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/admin-dashboard')
  revalidatePath('/admin/admin-dashboard/tournaments')
  return { success: true, data }
}

export async function updateTournament(id: string, tournamentData: any) {
  log('updateTournament', { id, tournamentData })
  const supabase = await createClient()
  const { data, error } = await supabase.from('tournaments').update(tournamentData).eq('id', id).select().single()
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/admin-dashboard')
  revalidatePath('/admin/admin-dashboard/tournaments')
  return { success: true, data }
}

export async function deleteTournament(id: string) {
  log('deleteTournament', { id })
  const supabase = await createClient()
  const { error } = await supabase.from('tournaments').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/admin/admin-dashboard')
  return { success: true }
}

/**
 * Get player details and their tournaments with performance analysis
 */
export async function getPlayerDetails(playerId: number) {
  log('getPlayerDetails', { playerId })
  const supabase = await createClient()
  const { data: player, error: playerError } = await supabase.from('master_players').select('*').eq('id', playerId).single()
  if (playerError || !player) return { player: null, tournaments: [], error: playerError?.message || 'Player not found' }

  const { tournaments, error: tournamentsError } = await getPlayerTournamentsData(playerId)
  if (tournamentsError) return { player, tournaments: [], error: tournamentsError }

  let totalPerformance = 0
  let performanceCount = 0
  let missingPerformanceCount = 0

  const analyzedTournaments = tournaments.map(tournament => {
    const { performanceRating, analysis } = analyzeTieBreaks(tournament.tie_breaks)
    if (performanceRating !== undefined) { totalPerformance += performanceRating; performanceCount++ } 
    else { missingPerformanceCount++ }
    return { ...tournament, performanceRating, tieBreakAnalysis: analysis }
  })

  const averagePerformance = performanceCount > 0 ? Math.round(totalPerformance / performanceCount) : null
  return { player, tournaments: analyzedTournaments, performanceStats: { averagePerformance, totalTournaments: tournaments.length, tournamentsWithPerformance: performanceCount, tournamentsMissingPerformance: missingPerformanceCount } }
}

/**
 * Get all tournaments a player has played
 */
export async function getPlayerTournamentsData(masterPlayerId: number) {
  log('getPlayerTournamentsData', { masterPlayerId })
  const supabase = await createClient()
  const { data: masterPlayer, error: masterError } = await supabase.from('master_players').select('source_name').eq('id', masterPlayerId).single()
  if (masterError || !masterPlayer) return { tournaments: [], error: masterError?.message || 'Player not found' }

  const { data: playerAppearances, error: playersError } = await supabase.from('players').select('id, tournament_id, name, points, rating, rank, tie_breaks, rounds').eq('name', masterPlayer.source_name)
  if (playersError) return { tournaments: [], error: playersError.message }
  if (!playerAppearances || playerAppearances.length === 0) return { tournaments: [] }

  const tournamentIds = playerAppearances.map(p => p.tournament_id).filter(Boolean)
  if (tournamentIds.length === 0) return { tournaments: [] }

  const { data: tournaments, error: tournamentsError } = await supabase.from('tournaments').select('id, tournament_name, date, location').in('id', tournamentIds)
  if (tournamentsError) return { tournaments: [], error: tournamentsError.message }

  const merged = playerAppearances.map(appearance => {
    const tournament = tournaments?.find(t => t.id === appearance.tournament_id)
    return { ...appearance, tournament_name: tournament?.tournament_name || 'Unknown', tournament_date: tournament?.date || null, tournament_location: tournament?.location || null }
  })

  log('getPlayerTournamentsData - success', { count: merged.length })
  return { tournaments: merged }
}
