'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdminRole } from '@/utils/auth/adminAuth'
import type { Player, TableResponse, FilterOptions } from '@/types/admin'

/**
 * Get all players with pagination and filtering
 */
export async function getAllPlayers(
  page: number = 1,
  itemsPerPage: number = 50,
  filters?: FilterOptions
): Promise<TableResponse<Player>> {
  try {
    // Verify admin role
    await checkAdminRole()

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('players')
      .select('*', { count: 'exact' })
      .order('rank', { ascending: true, nullsFirst: false })

    // Apply filters
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    if (filters?.federation) {
      query = query.eq('federation', filters.federation)
    }

    if (filters?.minRating) {
      query = query.gte('rating', filters.minRating)
    }

    if (filters?.maxRating) {
      query = query.lte('rating', filters.maxRating)
    }

    if (filters?.tournament) {
      query = query.eq('tournament_id', filters.tournament)
    }

    // Apply pagination
    const from = (page - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('Error fetching players:', error)
      return {
        data: null,
        error: error.message,
        count: 0,
        totalPages: 0,
      }
    }

    return {
      data: data as Player[],
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
 * Get all players for export (with filters)
 */
export async function getAllPlayersForExport(
  filters?: FilterOptions
): Promise<{ data: Player[] | null; error: string | null }> {
  try {
    // Verify admin role
    await checkAdminRole()

    const supabase = await createClient()

    // Build query (no pagination for export)
    let query = supabase
      .from('players')
      .select('*')
      .order('rank', { ascending: true, nullsFirst: false })

    // Apply same filters as main query
    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }

    if (filters?.federation) {
      query = query.eq('federation', filters.federation)
    }

    if (filters?.minRating) {
      query = query.gte('rating', filters.minRating)
    }

    if (filters?.maxRating) {
      query = query.lte('rating', filters.maxRating)
    }

    if (filters?.tournament) {
      query = query.eq('tournament_id', filters.tournament)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching all players:', error)
      return {
        data: null,
        error: error.message,
      }
    }

    return {
      data: data as Player[],
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
export async function getUniqueFederationsForPlayers(): Promise<{
  data: string[] | null
  error: string | null
}> {
  try {
    await checkAdminRole()

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('players')
      .select('federation')
      .not('federation', 'is', null)
      .order('federation', { ascending: true })

    if (error) {
      console.error('Error fetching federations:', error)
      return { data: null, error: error.message }
    }

    // Get unique federations
    const uniqueFeds = [...new Set(data.map((item) => item.federation).filter(Boolean))]

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
 * Get tournaments for filter dropdown
 */
export async function getTournamentsForPlayers(): Promise<{
  data: Array<{ id: string; name: string }> | null
  error: string | null
}> {
  try {
    await checkAdminRole()

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('tournaments')
      .select('id, tournament_name')
      .not('tournament_name', 'is', null)
      .order('tournament_name', { ascending: true })

    if (error) {
      console.error('Error fetching tournaments:', error)
      return { data: null, error: error.message }
    }

    return {
      data: data.map((t) => ({ id: t.id, name: t.tournament_name || '' })),
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
 * Update a player
 */
export async function updatePlayer(
  id: string,
  updates: Partial<Player>
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Verify admin role
    await checkAdminRole()

    const supabase = await createClient()

    const { error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Error updating player:', error)
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
