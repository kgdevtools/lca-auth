'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdminRole } from '@/utils/auth/adminAuth'
import type { Profile, TableResponse, FilterOptions } from '@/types/admin'
import { findPlayerMatches, type MatchResult } from '@/app/user/tournament-actions'

/**
 * Get profiles with pagination and filtering
 */
export async function getProfiles(
  page: number = 1,
  itemsPerPage: number = 50,
  filters?: FilterOptions
): Promise<TableResponse<Profile>> {
  try {
    // Verify admin role
    await checkAdminRole()

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,tournament_fullname.ilike.%${filters.search}%,chessa_id.ilike.%${filters.search}%`
      )
    }

    if (filters?.role) {
      query = query.eq('role', filters.role)
    }

    // Apply pagination
    const from = (page - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('Error fetching profiles:', error)
      return {
        data: null,
        error: error.message,
        count: 0,
        totalPages: 0,
      }
    }

    return {
      data: data as Profile[],
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
 * Get all profiles for export (with filters)
 */
export async function getAllProfilesForExport(
  filters?: FilterOptions
): Promise<{ data: Profile[] | null; error: string | null }> {
  try {
    // Verify admin role
    await checkAdminRole()

    const supabase = await createClient()

    // Build query (no pagination for export)
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply same filters as main query
    if (filters?.search) {
      query = query.or(
        `full_name.ilike.%${filters.search}%,tournament_fullname.ilike.%${filters.search}%,chessa_id.ilike.%${filters.search}%`
      )
    }

    if (filters?.role) {
      query = query.eq('role', filters.role)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching all profiles:', error)
      return {
        data: null,
        error: error.message,
      }
    }

    return {
      data: data as Profile[],
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
 * Update a profile
 */
export async function updateProfile(
  id: string,
  updates: Partial<Profile>
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Verify admin role
    await checkAdminRole()

    const supabase = await createClient()

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error occurred',
    }
  }
}

/**
 * Admin override for a profile's tournament_fullname
 */
export async function adminUpdateTournamentFullname(
  profileId: string,
  newName: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    await checkAdminRole()
    const supabase = await createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ tournament_fullname: newName.trim() || null })
      .eq('id', profileId)
    if (error) {
      console.error('Error updating tournament_fullname:', error)
      return { success: false, error: error.message }
    }
    return { success: true, error: null }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error occurred' }
  }
}

/**
 * Update the confirmed tournament name aliases for a profile
 */
export async function updateProfileAliases(
  profileId: string,
  aliases: string[]
): Promise<{ success: boolean; error: string | null }> {
  try {
    await checkAdminRole()
    const supabase = await createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ tournament_aliases: aliases })
      .eq('id', profileId)
    if (error) {
      console.error('Error updating tournament_aliases:', error)
      return { success: false, error: error.message }
    }
    return { success: true, error: null }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' }
  }
}

/**
 * Get Chess SA player name matches for a profile
 */
export async function getNameMatchesForProfile(
  profileId: string
): Promise<{ data: MatchResult | null; error: string | null }> {
  try {
    await checkAdminRole()
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('tournament_fullname')
      .eq('id', profileId)
      .single()

    if (error || !profile?.tournament_fullname) {
      return { data: { exactMatch: null, closeMatches: [] }, error: null }
    }

    const matchResult = await findPlayerMatches(profile.tournament_fullname)
    return { data: matchResult, error: null }
  } catch (error) {
    console.error('Unexpected error in getNameMatchesForProfile:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Unexpected error' }
  }
}

export async function approvePendingFullname(
  profileId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    await checkAdminRole()
    const supabase = await createClient()

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('tournament_fullname_pending')
      .eq('id', profileId)
      .single()

    if (fetchError || !profile?.tournament_fullname_pending) {
      return { success: false, error: 'No pending name found.' }
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        tournament_fullname: profile.tournament_fullname_pending,
        tournament_fullname_pending: null,
      })
      .eq('id', profileId)

    if (error) return { success: false, error: error.message }
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' }
  }
}

export async function rejectPendingFullname(
  profileId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    await checkAdminRole()
    const supabase = await createClient()

    const { error } = await supabase
      .from('profiles')
      .update({ tournament_fullname_pending: null })
      .eq('id', profileId)

    if (error) return { success: false, error: error.message }
    return { success: true, error: null }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' }
  }
}

/**
 * Delete a profile (WARNING: This will cascade to related data)
 */
export async function deleteProfile(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Verify admin role
    await checkAdminRole()

    const supabase = await createClient()

    const { error } = await supabase.from('profiles').delete().eq('id', id)

    if (error) {
      console.error('Error deleting profile:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Unexpected error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected error occurred',
    }
  }
}
