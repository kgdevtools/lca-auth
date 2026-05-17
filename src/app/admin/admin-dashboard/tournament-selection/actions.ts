"use server"

import { createClient } from "@/utils/supabase/server"

export interface TournamentSelectionMeta {
  id: string
  tournament_id: string | null
  tournament_name: string
  tournament_type: 'open' | 'junior_qualifying' | 'other'
  age_category: 'U10' | 'U12' | 'U14' | 'U16' | 'U18' | 'U20' | 'Open' | 'Multiple'
  player_count: number | null
  avg_top_seeds: number | null
  rating_threshold: number | null
  meets_criteria: boolean
  is_capricorn: boolean
  approved: boolean
  approved_by: string | null
  approved_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Tournament {
  id: string
  tournament_name: string
  location: string | null
  tournament_type: string | null
  date: string | null
}

// Keywords for detecting junior qualifying tournaments
// Derived from actual tournament calendar data patterns
const juniorQualifyingKeywords = [
  // Primary: Capricorn Qualifying Tournaments (1-8)
  "capricorn qualifying",
  // Other CDC/Club junior events
  "winter games",
  "primary schools league",
  "primary schools",
  "junior trials",
  "high schools league",
  "team practice",
  "team champs",
  "provincial junior",
  // Legacy patterns from original spec
  "cdc junior qualifiers", "cdc junior qualifying", "cdc qualifiers",
  "capricorn junior qualifying", "capricorn district chess",
  "vhembe district chess junior", "vhembe district junior",
  "mopani open junior", "mopani district junior qualifiers", "mopani open junior qualifying",
  "sekhukhune junior qualifying", "sekhukhune junior qualifiers",
  "vhembe district junior qualifier", "waterberg junior"
]

// Keywords for detecting Capricorn/Limpopo region
// Expanded to include: town names, venues, and inference from tournament name patterns
const limpopoKeywords = [
  // Explicit region names
  "capricorn", "limpopo", "vhembe", "mopani", "sekhukhune", "waterberg",
  // Major towns/cities in Limpopo
  "polokwane", "seshego", "tzaneen", "mokopane", "modimolle", "mookgopong",
  "dendron", "senwabarwana", "ga-machaba", "musina", "thabazimbi",
  // Venues and institutions
  "northern academy", "university of limpopo", "turfloop", "capricorn tvet",
  "flora park", "hans strijdom", "bela-bela", "tshakhuma", "seshego",
  // Legacy keywords
  "tzaneen", "polokwane", "northern academy", "mokopane", "limpopo",
  "modimolle", "mookgopong", "seshego", "capricorn", "vhembe",
  "mopani", "sekhukhune", "hans strijdom", "bela-bela", "tshakhuma",
  "turfloop", "university of limp", "capricorn tvet", "flora park", "waterberg"
]

function isJuniorQualifying(name: string): boolean {
  const lower = name.toLowerCase()
  return juniorQualifyingKeywords.some(kw => lower.includes(kw))
}

function isCapricorn(name: string, location: string | null): boolean {
  // Check name first - many tournaments explicitly mention location in name
  const lowerName = name.toLowerCase()
  const nameMatch = limpopoKeywords.some(kw => lowerName.includes(kw))
  if (nameMatch) return true
  
  // Then check location field
  if (location) {
    const lowerLoc = location.toLowerCase()
    return limpopoKeywords.some(kw => lowerLoc.includes(kw))
  }
  
  // Inference: If name contains certain patterns, likely in Limpopo
  // e.g., "Polokwane Open", "Limpopo Open", "Seshego Easter"
  const inferencePatterns = [
    /\bpolokwane\b/i, /\blimpopo\b/i, /\bseshego\b/i, 
    /\btzaneen\b/i, /\bmokopane\b/i, /\bdendron\b/i
  ]
  return inferencePatterns.some(pattern => pattern.test(name))
}

export async function getTournaments(): Promise<Tournament[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, tournament_name, location, tournament_type, date')
    .order('date', { ascending: false })
  
  if (error) {
    console.error('Error fetching tournaments:', error)
    return []
  }
  
  return (data || []) as Tournament[]
}

export async function getSelectionMeta(): Promise<TournamentSelectionMeta[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tournament_selection_meta')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching selection meta:', error)
    return []
  }
  
  return (data || []) as TournamentSelectionMeta[]
}

export async function getDetectedTournaments(): Promise<Tournament[]> {
  const supabase = await createClient()
  
  const { data: allTournaments, error } = await supabase
    .from('tournaments')
    .select('id, tournament_name, location, tournament_type, date')
    .order('date', { ascending: false })
  
  if (error) {
    console.error('Error fetching tournaments for detection:', error)
    return []
  }
  
  // Filter to only tournaments that meet detection criteria
  const detected = (allTournaments || []).filter(t => {
    const name = t.tournament_name || ""
    const location = t.location
    return isJuniorQualifying(name) || isCapricorn(name, location)
  })
  
  return detected as Tournament[]
}

export async function saveSelectionMeta(
  items: Partial<TournamentSelectionMeta>[],
  approvedBy: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  
  try {
    // For each item, upsert into the table
    for (const item of items) {
      if (!item.tournament_name) continue
      
      const payload = {
        ...item,
        approved: item.approved ?? false,
        approved_by: item.approved ? approvedBy : null,
        approved_at: item.approved ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }
      
      if (item.id) {
        // Update existing
        const { error } = await supabase
          .from('tournament_selection_meta')
          .update(payload)
          .eq('id', item.id)
        
        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('tournament_selection_meta')
          .insert([payload])
        
        if (error) throw error
      }
    }
    
    return { success: true, error: null }
  } catch (err: any) {
    console.error('Error saving selection meta:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteSelectionMeta(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('tournament_selection_meta')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting selection meta:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, error: null }
}

export async function addTournamentToSelection(
  tournament: Tournament
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  
  const name = tournament.tournament_name || ""
  const location = tournament.location
  
  const isJuniorQual = isJuniorQualifying(name)
  const isCapricornRegion = isCapricorn(name, location)
  
  // Determine tournament type
  let tournamentType: 'open' | 'junior_qualifying' | 'other' = 'other'
  if (isJuniorQual) {
    tournamentType = 'junior_qualifying'
  } else if (tournamentType !== 'other') {
    tournamentType = 'open'
  }
  
  const payload = {
    tournament_id: tournament.id,
    tournament_name: name,
    tournament_type: tournamentType,
    age_category: 'Open' as const,
    is_capricorn: isCapricornRegion,
    meets_criteria: isJuniorQual || (tournamentType === 'open' && isCapricornRegion),
    approved: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('tournament_selection_meta')
    .insert([payload])
  
  if (error) {
    console.error('Error adding tournament to selection:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, error: null }
}

export async function getTournamentStats(tournamentId: string): Promise<{ playerCount: number; avgTopSeeds: number | null }> {
  const supabase = await createClient()
  
  console.log('[getTournamentStats] Querying for tournament_id:', tournamentId)
  
  // Get all players for this tournament using tournament_id
  const { data: players, error } = await supabase
    .from('players')
    .select('rating')
    .eq('tournament_id', tournamentId)
  
  console.log('[getTournamentStats] Error:', error)
  console.log('[getTournamentStats] Players found:', players?.length)
  console.log('[getTournamentStats] Sample:', players?.slice(0, 3))
  
  if (error || !players || players.length === 0) {
    console.log('[getTournamentStats] No players found with tournament_id')
    return { playerCount: 0, avgTopSeeds: null }
  }

  // Filter valid ratings and sort descending
  const ratings = players
    .filter(p => p.rating && p.rating > 0)
    .map(p => p.rating as number)
    .sort((a, b) => b - a)
  
  const playerCount = players.length
  const topN = playerCount <= 40 ? 10 : 15
  const topRatings = ratings.slice(0, topN)
  
  const avgTopSeeds = topRatings.length > 0 
    ? Number((topRatings.reduce((sum, r) => sum + r, 0) / topRatings.length).toFixed(1))
    : null

  console.log('[getTournamentStats] Result:', { playerCount, avgTopSeeds, validRatings: ratings.length })
  
  return { playerCount, avgTopSeeds }
}