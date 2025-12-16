'use server'

import { createClient } from '@/utils/supabase/server'

/**
 * Profile type from the database
 */
export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: 'student' | 'coach' | 'admin'
  created_at: string
  tournament_fullname: string | null
  chessa_id: string | null
}

/**
 * Get current authenticated user with their profile
 * @throws {Error} If user is not authenticated or profile not found
 * @returns {Promise<{user: User, profile: Profile}>} User and full profile data
 */
export async function getCurrentUserWithProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Not authenticated')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    throw new Error('Profile not found')
  }

  return { user, profile: profile as Profile }
}

/**
 * Check if user has one of the required roles
 * @param {string[]} allowedRoles - Array of allowed roles (e.g., ['coach', 'admin'])
 * @throws {Error} If user doesn't have required role
 * @returns {Promise<Profile>} User's profile
 */
export async function checkRole(allowedRoles: string[]) {
  const { profile } = await getCurrentUserWithProfile()

  if (!allowedRoles.includes(profile.role)) {
    throw new Error(`Unauthorized: Requires role ${allowedRoles.join(' or ')}`)
  }

  return profile
}

/**
 * Check if user is a student (or has higher permissions)
 * Students, coaches, and admins can access student features
 * @throws {Error} If user is not authenticated
 * @returns {Promise<Profile>} User's profile
 */
export async function checkStudentRole() {
  return checkRole(['student', 'coach', 'admin'])
}

/**
 * Check if user is a coach or admin
 * @throws {Error} If user is not a coach or admin
 * @returns {Promise<Profile>} User's profile
 */
export async function checkCoachRole() {
  return checkRole(['coach', 'admin'])
}

/**
 * Check if user is an admin
 * @throws {Error} If user is not an admin
 * @returns {Promise<Profile>} User's profile
 */
export async function checkAdminRole() {
  return checkRole(['admin'])
}

/**
 * Non-throwing version: Check if current user is a coach
 * Useful for conditional rendering
 * @returns {Promise<boolean>} True if user is coach or admin
 */
export async function isCoach(): Promise<boolean> {
  try {
    await checkCoachRole()
    return true
  } catch {
    return false
  }
}

/**
 * Non-throwing version: Check if current user is an admin
 * Useful for conditional rendering
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    await checkAdminRole()
    return true
  } catch {
    return false
  }
}

/**
 * Non-throwing version: Check if current user is a student
 * Note: Everyone (student, coach, admin) can access student features
 * @returns {Promise<boolean>} True if user has student access
 */
export async function isStudent(): Promise<boolean> {
  try {
    await checkStudentRole()
    return true
  } catch {
    return false
  }
}

/**
 * Get the current user's role without throwing
 * @returns {Promise<'student' | 'coach' | 'admin' | null>} User's role or null if not authenticated
 */
export async function getCurrentRole(): Promise<'student' | 'coach' | 'admin' | null> {
  try {
    const { profile } = await getCurrentUserWithProfile()
    return profile.role
  } catch {
    return null
  }
}

/**
 * Check if user is a coach for a specific student
 * @param {string} studentId - The student's ID to check
 * @throws {Error} If user is not a coach for this student
 * @returns {Promise<boolean>} True if user is assigned as coach to this student
 */
export async function checkCoachForStudent(studentId: string): Promise<boolean> {
  const supabase = await createClient()
  const { profile } = await getCurrentUserWithProfile()

  // Admins can access all students
  if (profile.role === 'admin') {
    return true
  }

  // Check if coach is assigned to this student
  if (profile.role === 'coach') {
    const { data, error } = await supabase
      .from('coach_students')
      .select('id')
      .eq('coach_id', profile.id)
      .eq('student_id', studentId)
      .single()

    if (error || !data) {
      throw new Error('Not authorized to access this student')
    }

    return true
  }

  // Students can only access their own data
  if (profile.role === 'student' && profile.id === studentId) {
    return true
  }

  throw new Error('Not authorized to access this student')
}
