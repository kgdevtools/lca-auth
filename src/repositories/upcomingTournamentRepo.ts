import { createClient } from "@/utils/supabase/client"
import type { UpcomingTournament, CreateUpcomingTournamentPayload, TournamentSection } from "@/types/upcoming-tournament"
import { cache } from "@/utils/cache"

export async function getNextUpcomingTournament(): Promise<UpcomingTournament | null> {
  try {
    const supabase = await createClient()
    const now = new Date()
    
    // 10 AM cutoff logic
    const todayAt10AM = new Date(now)
    todayAt10AM.setHours(10, 0, 0, 0)
    
    const cutoffDate = now > todayAt10AM ? 
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) : 
      now
    
    // Check cache first
    const cacheKey = `next-upcoming-tournament-${cutoffDate.toDateString()}`
    let cached = cache.get(cacheKey)
    if (cached) {
      return cached
    }
    
    // Get next upcoming tournament
    const { data, error } = await supabase
      .from('upcoming_tournaments')
      .select('*')
      .eq('is_active', true)
      .gte('tournament_date', cutoffDate.toISOString())
      .order('tournament_date', { ascending: true })
      .limit(1)
      
    if (error) {
      console.error('Error fetching next upcoming tournament:', error)
      return null
    }
    
    const tournament = data?.[0] || null
    
    // Cache for 5 minutes
    if (tournament) {
      cache.set(cacheKey, tournament, 300)
    }
    
    return tournament
  } catch (error) {
    console.error('Unexpected error in getNextUpcomingTournament:', error)
    return null
  }
}

export async function createUpcomingTournament(data: CreateUpcomingTournamentPayload): Promise<{ success: boolean; error?: string; tournamentId?: string }> {
  try {
    const supabase = await createClient()
    
    const { data: result, error } = await supabase
      .from('upcoming_tournaments')
      .insert([{
        tournament_name: data.tournament_name,
        tournament_date: data.tournament_date,
        location: data.location,
        organizer_name: data.organizer_name,
        organizer_contact: data.organizer_contact,
        registration_form_link: data.registration_form_link,
        poster_url: data.poster_url,
        poster_public_id: data.poster_public_id,
        sections: data.sections || [],
        description: data.description || null,
        is_active: true
      }])
      .select('id')
      .single()
      
    if (error) {
      console.error('Error creating upcoming tournament:', error)
      return { success: false, error: error.message }
    }
    
    // Clear cache when new tournament is created
    cache.clear()
    
    return { 
      success: true, 
      tournamentId: result.id 
    }
  } catch (error) {
    console.error('Unexpected error in createUpcomingTournament:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getAllUpcomingTournaments(): Promise<UpcomingTournament[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('upcoming_tournaments')
      .select('*')
      .eq('is_active', true)
      .order('tournament_date', { ascending: true })
      
    if (error) {
      console.error('Error fetching all upcoming tournaments:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Unexpected error in getAllUpcomingTournaments:', error)
    return []
  }
}