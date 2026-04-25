// src/app/admin/admin-dashboard/server-actions.ts

'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdminRole } from '@/utils/auth/adminAuth'

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


export async function createTournament(tournamentData: Partial<Tournament>) {
  try {
    // Verify admin role
    await checkAdminRole()

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
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error occurred' }
  }
}

export async function updateTournament(id: string, tournamentData: Partial<Tournament>) {
  try {
    // Verify admin role
    await checkAdminRole()

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
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error occurred' }
  }
}

// Add tournament-related functions that might be used by the TournamentsTable
interface TournamentFilters {
  organizer?: string
  location?: string
  chief_arbiter?: string
  tournament_director?: string
  date_from?: string
  date_to?: string
}

export async function getTournaments(
  page: number = 1,
  itemsPerPage: number = 10,
  search?: string,
  filters?: TournamentFilters,
) {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('tournaments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search)                        query = query.ilike('tournament_name',    `%${search}%`)
    if (filters?.organizer?.trim())    query = query.ilike('organizer',           `%${filters.organizer}%`)
    if (filters?.location?.trim())     query = query.ilike('location',            `%${filters.location}%`)
    if (filters?.chief_arbiter?.trim()) query = query.ilike('chief_arbiter',      `%${filters.chief_arbiter}%`)
    if (filters?.tournament_director?.trim()) query = query.ilike('tournament_director', `%${filters.tournament_director}%`)
    if (filters?.date_from?.trim())    query = query.gte('date', filters.date_from)
    if (filters?.date_to?.trim())      query = query.lte('date', filters.date_to)

    const from = (page - 1) * itemsPerPage
    const { data: tournaments, error, count } = await query.range(from, from + itemsPerPage - 1)

    if (error) {
      console.error('Error fetching tournaments:', error)
      return { success: false, error: error.message, tournaments: [], count: 0, totalPages: 0 }
    }

    return {
      success: true,
      tournaments: tournaments || [],
      count: count || 0,
      totalPages: count ? Math.ceil(count / itemsPerPage) : 0,
    }
  } catch (error) {
    console.error('Unexpected error in getTournaments:', error)
    return { success: false, error: 'Unexpected error occurred', tournaments: [], count: 0, totalPages: 0 }
  }
}

export async function deleteTournament(id: string) {
  try {
    await checkAdminRole()
    const supabase = await createClient()
    const { error } = await supabase.from('tournaments').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (error) {
    console.error('Unexpected error in deleteTournament:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error occurred' }
  }
}

export async function bulkDeleteTournaments(ids: string[]) {
  try {
    await checkAdminRole()
    const supabase = await createClient()
    const { error } = await supabase.from('tournaments').delete().in('id', ids)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error occurred' }
  }
}
// Contact submission interface and admin actions
interface ContactSubmission {
  id: string
  name: string
  email: string
  phone?: string | null
  subject?: string | null
  message?: string | null
  status?: string | null
  created_at?: string | null
}

export async function getContactSubmissions(): Promise<{ data: ContactSubmission[] | null; error: string | null }> {
  try {
    await checkAdminRole()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching contact submissions:', error)
      return { data: null, error: error.message }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('Unexpected error in getContactSubmissions:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Unexpected error occurred' }
  }
}

export async function deleteContactSubmission(id: string): Promise<{ success: boolean; error?: string | null }> {
  try {
    await checkAdminRole()
    const supabase = await createClient()

    const { error } = await supabase
      .from('contact_submissions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting contact submission:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in deleteContactSubmission:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error occurred' }
  }
}

export async function toggleContactRead(id: string, read: boolean): Promise<{ success: boolean; error?: string | null }> {
  try {
    await checkAdminRole()
    const supabase = await createClient()
    const { error } = await supabase
      .from('contact_submissions')
      .update({ read })
      .eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' }
  }
}

export async function updateContactSubmissionStatus(id: string, status: string): Promise<{ success: boolean; error?: string | null }> {
  try {
    await checkAdminRole()
    const supabase = await createClient()

    const { error } = await supabase
      .from('contact_submissions')
      .update({ status })
      .eq('id', id)

    if (error) {
      console.error('Error updating contact submission status:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error in updateContactSubmissionStatus:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error occurred' }
  }
}

/**
 * Get all tournaments for export (with optional search filter)
 */
export async function getAllTournamentsForExport(search?: string): Promise<{
  data: Tournament[] | null
  error: string | null
}> {
  try {
    // Verify admin role
    await checkAdminRole()

    const supabase = await createClient()

    // Build query (no pagination for export)
    let query = supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply search filter if provided
    if (search) {
      query = query.ilike('tournament_name', `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching all tournaments:', error)
      return {
        data: null,
        error: error.message,
      }
    }

    return {
      data: data as Tournament[],
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