'use server'

import { createClient } from '@/utils/supabase/server'
import { checkAdminRole } from '@/utils/auth/adminAuth'
import type { PlayerRegistration } from '@/types/admin'

export async function getRegistrations(
  page: number = 1,
  itemsPerPage: number = 50
): Promise<{ data: PlayerRegistration[] | null; count: number; totalPages: number; error: string | null }> {
  try {
    await checkAdminRole()
    const supabase = await createClient()

    const from = (page - 1) * itemsPerPage
    const to = from + itemsPerPage - 1

    const { data, error, count } = await supabase
      .from('playerRegistrations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching registrations:', error)
      return { data: null, count: 0, totalPages: 0, error: error.message }
    }

    const totalPages = count ? Math.ceil(count / itemsPerPage) : 0
    return { data: data as PlayerRegistration[], count: count || 0, totalPages, error: null }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { data: null, count: 0, totalPages: 0, error: error instanceof Error ? error.message : 'Unexpected error' }
  }
}

export async function getRegistrationById(
  id: number
): Promise<{ data: PlayerRegistration | null; error: string | null }> {
  try {
    await checkAdminRole()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('playerRegistrations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching registration:', error)
      return { data: null, error: error.message }
    }

    return { data: data as PlayerRegistration, error: null }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Unexpected error' }
  }
}

export async function deleteRegistration(
  id: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    await checkAdminRole()
    const supabase = await createClient()

    const { error } = await supabase.from('player_registrations').delete().eq('id', id)

    if (error) {
      console.error('Error deleting registration:', error)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unexpected error' }
  }
}

export async function getAllRegistrationsForExport(): Promise<{
  data: PlayerRegistration[] | null
  error: string | null
}> {
  try {
    await checkAdminRole()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('playerRegistrations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching registrations for export:', error)
      return { data: null, error: error.message }
    }

    return { data: data as PlayerRegistration[], error: null }
  } catch (error) {
    console.error('Unexpected error:', error)
    return { data: null, error: error instanceof Error ? error.message : 'Unexpected error' }
  }
}
