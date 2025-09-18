'use server'

import { createClient } from '@/utils/supabase/server'

export interface PlayerListItem {
  id: string
  lim_id: string | null
  surname: string | null
  firstname: string | null
  normalized_name: string | null
  unique_no: string | null
  federation: string | null
  cf_rating: number | null
  avg_performance_rating: number | null
  performance_count: number | null
  bdate: string | null
  sex: string | null
}

export interface PlayerDetail {
  id: string
  lim_id: string | null
  surname: string | null
  firstname: string | null
  normalized_name: string | null
  unique_no: string | null
  federation: string | null
  cf_rating: number | null
  avg_performance_rating: number | null
  performance_count: number | null
  bdate: string | null
  sex: string | null
  title: string | null
  is_reconciled: boolean
  performance_stats: any | null
  performance_stats_resolved: boolean
  confidence_score: number | null
  match_type: string | null
  source_records: string[] | null
  created_at: string
  updated_at: string
}

export interface TournamentInfo {
  id: string
  tournament_name: string | null
  organizer: string | null
  federation: string | null
  location: string | null
  date: string | null
  rounds: number | null
  tournament_type: string | null
  average_elo: number | null
  time_control: string | null
  rate_of_play: string | null
}

export async function getPlayersForListing() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('local_active_players_duplicate')
      .select(`
        id, 
        lim_id, 
        surname, 
        firstname, 
        normalized_name, 
        unique_no, 
        federation, 
        cf_rating, 
        avg_performance_rating, 
        performance_count, 
        bdate, 
        sex
      `)
      .order('avg_performance_rating', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('Error fetching players for listing:', error)
      return { data: null, error: error.message }
    }

    return { data: data as PlayerListItem[], error: null }
  } catch (error) {
    console.error('Unexpected error in getPlayersForListing:', error)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

export async function getPlayerDetails(playerId: string) {
  try {
    const supabase = await createClient()
    
    const { data: player, error: playerError } = await supabase
      .from('local_active_players_duplicate')
      .select('*')
      .eq('id', playerId)
      .single()

    if (playerError) {
      console.error('Error fetching player details:', playerError)
      return { data: null, error: playerError.message }
    }

    if (!player) {
      return { data: null, error: 'Player not found' }
    }

    return { data: player as PlayerDetail, error: null }
  } catch (error) {
    console.error('Unexpected error in getPlayerDetails:', error)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

export async function getPlayerTournaments(sourceRecords: string[] | null) {
  if (!sourceRecords || sourceRecords.length === 0) {
    return { data: [], error: null }
  }

  try {
    const supabase = await createClient()
    
    const { data: tournaments, error } = await supabase
      .from('tournaments')
      .select(`
        id,
        tournament_name,
        organizer,
        federation,
        location,
        date,
        rounds,
        tournament_type,
        average_elo,
        time_control,
        rate_of_play
      `)
      .in('id', sourceRecords)
      .order('date', { ascending: false, nullsFirst: false })

    if (error) {
      console.error('Error fetching player tournaments:', error)
      return { data: [], error: error.message }
    }

    return { data: tournaments as TournamentInfo[], error: null }
  } catch (error) {
    console.error('Unexpected error in getPlayerTournaments:', error)
    return { data: [], error: 'Unexpected error occurred' }
  }
}

export async function getPlayerTournamentPerformances(playerId: string, sourceRecords: string[] | null) {
  if (!sourceRecords || sourceRecords.length === 0) {
    return { data: [], error: null }
  }

  try {
    const supabase = await createClient()
    
    // Get player records from the players table for each tournament
    const { data: playerRecords, error } = await supabase
      .from('players')
      .select(`
        tournament_id,
        name,
        federation,
        rank,
        rating,
        points,
        rounds,
        tie_breaks
      `)
      .in('tournament_id', sourceRecords)
      .order('tournament_id')

    if (error) {
      console.error('Error fetching player tournament performances:', error)
      return { data: [], error: error.message }
    }

    return { data: playerRecords || [], error: null }
  } catch (error) {
    console.error('Unexpected error in getPlayerTournamentPerformances:', error)
    return { data: [], error: 'Unexpected error occurred' }
  }
}