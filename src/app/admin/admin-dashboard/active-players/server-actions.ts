'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdminRole } from '@/utils/auth/adminAuth'
import type { ActivePlayer, TableResponse, FilterOptions } from '@/types/admin'

/**
 * Get active players with pagination and filtering
 */
export async function getActivePlayers(
  page: number = 1,
  itemsPerPage: number = 100,
  filters?: FilterOptions
): Promise<TableResponse<ActivePlayer>> {
  try {
    // Verify admin role
    await checkAdminRole()

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('active_players_august_2025_profiles')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })

    // Apply filters
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,SURNAME.ilike.%${filters.search}%,FIRSTNAME.ilike.%${filters.search}%`)
    }

    if (filters?.federation) {
      query = query.eq('FED', filters.federation)
    }

    if (filters?.minRating) {
      query = query.gte('RATING', filters.minRating.toString())
    }

    if (filters?.maxRating) {
      query = query.lte('RATING', filters.maxRating.toString())
    }

    if (filters?.tournament) {
      query = query.eq('tournament_id', filters.tournament)
    }

    // Apply pagination
    const from = (page - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('Error fetching active players:', error)
      return {
        data: null,
        error: error.message,
        count: 0,
        totalPages: 0,
      }
    }

    return {
      data: data as ActivePlayer[],
      error: null,
      count: count || 0,
      totalPages: count ? Math.ceil(count / itemsPerPage) : 0,
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unexpected error occurred',
      count: 0,
      totalPages: 0,
    }
  }
}

/**
 * Get all active players for export (with filters)
 */
export async function getAllActivePlayersForExport(
  filters?: FilterOptions
): Promise<{ data: ActivePlayer[] | null; error: string | null }> {
  try {
    // Verify admin role
    await checkAdminRole()

    const supabase = await createClient()

    // Build query (no pagination for export)
    let query = supabase
      .from('active_players_august_2025_profiles')
      .select('*')
      .order('name', { ascending: true })

    // Apply same filters as main query
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,SURNAME.ilike.%${filters.search}%,FIRSTNAME.ilike.%${filters.search}%`)
    }

    if (filters?.federation) {
      query = query.eq('FED', filters.federation)
    }

    if (filters?.minRating) {
      query = query.gte('RATING', filters.minRating.toString())
    }

    if (filters?.maxRating) {
      query = query.lte('RATING', filters.maxRating.toString())
    }

    if (filters?.tournament) {
      query = query.eq('tournament_id', filters.tournament)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching all active players:', error)
      return {
        data: null,
        error: error.message,
      }
    }

    return {
      data: data as ActivePlayer[],
      error: null,
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unexpected error occurred',
    }
  }
}

/**
 * Get unique federations for filter dropdown
 */
export async function getUniqueFederations(): Promise<{
  data: string[] | null
  error: string | null
}> {
  try {
    await checkAdminRole()

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('active_players_august_2025_profiles')
      .select('FED')
      .not('FED', 'is', null)
      .order('FED', { ascending: true })

    if (error) {
      console.error('Error fetching federations:', error)
      return { data: null, error: error.message }
    }

    // Get unique federations
    const uniqueFeds = [...new Set(data.map((item) => item.FED).filter(Boolean))]

    return {
      data: uniqueFeds as string[],
      error: null,
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unexpected error occurred',
    }
  }
}

/**
 * Get unique tournaments for filter dropdown
 */
export async function getUniqueTournamentsForActivePlayers(): Promise<{
  data: Array<{ id: string; name: string }> | null
  error: string | null
}> {
  try {
    await checkAdminRole()

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('active_players_august_2025_profiles')
      .select('tournament_id, tournament_name')
      .not('tournament_id', 'is', null)
      .not('tournament_name', 'is', null)

    if (error) {
      console.error('Error fetching tournaments:', error)
      return { data: null, error: error.message }
    }

    // Get unique tournaments
    const tournamentsMap = new Map<string, string>()
    data.forEach((item) => {
      if (item.tournament_id && item.tournament_name) {
        tournamentsMap.set(item.tournament_id, item.tournament_name)
      }
    })

    const uniqueTournaments = Array.from(tournamentsMap.entries()).map(
      ([id, name]) => ({
        id,
        name,
      })
    )

    return {
      data: uniqueTournaments,
      error: null,
    }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unexpected error occurred',
    }
  }
}
