// src/app/admin/admin-dashboard/server-actions.ts

'use server'

import { createClient } from '@/utils/supabase/server'
import { exportRegistrationsToExcel } from '@/services/exportToExcel'

// Tournament interface
interface Tournament {
  id?: string
  tournament_name: string | null
  organizer: string | null
  federation: string | null
  tournament_director: string | null
  chief_arbiter: string | null
  deputy_chief_arbiter: string | null
  arbiter: string | null
  time_control: string | null
  rate_of_play: string | null
  location: string | null
  rounds: number | null
  tournament_type: string | null
  rating_calculation: string | null
  date: string | null
  average_elo: number | null
  average_age: number | null
  source: string | null
}

// Tournament registration interface
interface TournamentRegistration {
  id: string
  surname: string
  names: string
  section: string
  chessa_id: string | null
  federation: string | null
  rating: number | null
  sex: string | null
  created_at: string
  phone: string
  dob: string
  emergency_name: string
  emergency_phone: string
  comments?: string
  gender?: string | null
  club?: string | null
  city?: string | null
}

export async function getPlayersWithPerformanceStats() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('local_active_players_duplicate')
      .select('id, lim_id, surname, firstname, normalized_name, unique_no, federation, cf_rating, avg_performance_rating, performance_count, sex, bdate, performance_stats')
      .order('avg_performance_rating', { ascending: false })

    if (error) {
      console.error('Error fetching players:', error)
      return { data: null, error: error.message }
    }

    // Sort manually: non-null values first (descending), then null values
    const sortedData = (data || []).sort((a, b) => {
      if (a.avg_performance_rating === null && b.avg_performance_rating === null) return 0;
      if (a.avg_performance_rating === null) return 1; // nulls come last
      if (b.avg_performance_rating === null) return -1; // non-nulls come first
      return b.avg_performance_rating - a.avg_performance_rating; // descending
    });

    return { data: sortedData, error: null }
  } catch (error) {
    console.error('Unexpected error in getPlayersWithPerformanceStats:', error)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

export async function getPlayerPerformanceDetails(playerId: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('local_active_players_duplicate')
      .select('performance_stats, avg_performance_rating, performance_count, sex, bdate')
      .eq('id', playerId)
      .single()

    if (error) {
      console.error('Error fetching player performance:', error)
      return { data: null, error: error.message }
    }

    // Parse performance_stats if it's a string (JSONB might come as string)
    let performanceStats = data.performance_stats
    if (typeof performanceStats === 'string') {
      try {
        performanceStats = JSON.parse(performanceStats)
      } catch (parseError) {
        console.error('Error parsing performance_stats:', parseError)
        performanceStats = []
      }
    }

    // Ensure it's an array and handle potential null/undefined
    const parsedStats = Array.isArray(performanceStats) ? performanceStats : []

    return {
      data: {
        ...data,
        performance_stats: parsedStats
      },
      error: null
    }
  } catch (error) {
    console.error('Unexpected error in getPlayerPerformanceDetails:', error)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

export async function getPerformanceStatsSummary() {
  try {
    const supabase = await createClient()

    // Count players who have performance data (non-null avg_performance_rating)
    const { count: playersWithStats, error: countError } = await supabase
      .from('local_active_players_duplicate')
      .select('*', { count: 'exact', head: true })
      .not('avg_performance_rating', 'is', null)

    if (countError) {
      console.error('Error counting players with performance stats:', countError)
      return { data: null, error: countError.message }
    }

    // Get average of all performance ratings
    const { data: avgData, error: avgError } = await supabase
      .from('local_active_players_duplicate')
      .select('avg_performance_rating')
      .not('avg_performance_rating', 'is', null)

    if (avgError) {
      console.error('Error calculating average:', avgError)
      return { data: null, error: avgError.message }
    }

    let averageRating = null
    if (avgData && avgData.length > 0) {
      const totalAvg = avgData.reduce((sum, item) => sum + item.avg_performance_rating, 0) / avgData.length
      averageRating = Math.round(totalAvg * 10) / 10 // Round to 1 decimal place
    }

    return {
      data: {
        playersWithStats: playersWithStats || 0,
        averageRating
      },
      error: null
    }
  } catch (error) {
    console.error('Unexpected error in getPerformanceStatsSummary:', error)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

export async function createTournament(tournamentData: Partial<Tournament>) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('tournaments')
      .insert([tournamentData])
      .select()
      .single()

    if (error) {
      console.error('Error creating tournament:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error in createTournament:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

export async function updateTournament(id: string, tournamentData: Partial<Tournament>) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('tournaments')
      .update(tournamentData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating tournament:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Unexpected error in updateTournament:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

// Add tournament-related functions that might be used by the TournamentsTable
export async function getTournaments(page: number = 1, itemsPerPage: number = 10, search?: string) {
  try {
    const supabase = await createClient()
    
    let query = supabase
      .from('tournaments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('tournament_name', `%${search}%`)
    }

    const from = (page - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    const { data: tournaments, error, count } = await query.range(from, to)

    if (error) {
      console.error('Error fetching tournaments:', error)
      return { success: false, error: error.message, tournaments: [], count: 0, totalPages: 0 }
    }

    const totalPages = count ? Math.ceil(count / itemsPerPage) : 0

    return {
      success: true,
      tournaments: tournaments || [],
      count: count || 0,
      totalPages,
    }
  } catch (error) {
    console.error('Unexpected error in getTournaments:', error)
    return { success: false, error: 'Unexpected error occurred', tournaments: [], count: 0, totalPages: 0 }
  }
}

export async function deleteTournament(id: string) {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting tournament:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in deleteTournament:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

// Functions for tournament registrations
export async function getTournamentRegistrations(): Promise<{ data: TournamentRegistration[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('lca_open_2025_registrations')
      .select('*')
      .order('section', { ascending: true })
      .order('surname', { ascending: true })

    if (error) {
      console.error('Error fetching tournament registrations:', error)
      return { data: null, error: error.message }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('Unexpected error in getTournamentRegistrations:', error)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

export async function deleteTournamentRegistration(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('lca_open_2025_registrations')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting tournament registration:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Unexpected error in deleteTournamentRegistration:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

export async function updateTournamentRegistration(id: string, registrationData: Partial<TournamentRegistration>): Promise<{ success: boolean; data?: TournamentRegistration; error: string | null }> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('lca_open_2025_registrations')
      .update(registrationData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating tournament registration:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data, error: null }
  } catch (error) {
    console.error('Unexpected error in updateTournamentRegistration:', error)
    return { success: false, error: 'Unexpected error occurred' }
  }
}

// Export to Excel function
export async function exportRegistrationsToExcelFile() {
  try {
    const { data: registrations } = await getTournamentRegistrations();
    
    if (!registrations) {
      return { success: false, error: "No registrations found" };
    }

    const excelBuffer = exportRegistrationsToExcel(registrations);
    
    // Convert Buffer to Uint8Array for client consumption
    const uint8Array = new Uint8Array(excelBuffer);
    
    return { 
      success: true, 
      data: uint8Array // Return as Uint8Array instead of Buffer
    };
  } catch (error) {
    console.error("Export error:", error);
    return { success: false, error: "Failed to export data" };
  }
}