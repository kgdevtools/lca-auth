'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Verifies that the current user is authenticated and has admin role
 * @throws {Error} If user is not authenticated or not an admin
 * @returns {Promise<{user: User, profile: Profile}>} User and profile data
 */
export async function checkAdminRole() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    throw new Error('Profile not found')
  }

  if (profile.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }

  return { user, profile }
}

/**
 * Checks if the current user has admin role (doesn't throw)
 * @returns {Promise<boolean>} True if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    await checkAdminRole()
    return true
  } catch {
    return false
  }
}
