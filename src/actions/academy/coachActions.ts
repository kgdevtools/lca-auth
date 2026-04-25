'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { revalidatePath } from 'next/cache'
import { grantCoachAward } from '@/services/gamificationService'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CoachStudentRow {
  id: string
  coach_id: string
  student_id: string
  assigned_at: string
  notes: string | null
}

export interface ProfileRow {
  id: string
  full_name: string | null
  role: string | null
}

export interface AssignmentWithProfiles {
  coach: ProfileRow
  student: ProfileRow
  assigned_at: string
  notes: string | null
}

// ── Guards ────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const { profile } = await getCurrentUserWithProfile()
  if (profile.role !== 'admin') {
    throw new Error('Unauthorised: admin access required')
  }
  return profile
}

// Coach or admin, and the coach must own the student.
async function requireCoachOrAdminForStudent(studentId: string) {
  const { profile } = await getCurrentUserWithProfile()
  if (profile.role === 'admin') return profile

  if (profile.role === 'coach') {
    const supabase = await createClient()
    const { data } = await supabase
      .from('coach_students')
      .select('id')
      .eq('coach_id', profile.id)
      .eq('student_id', studentId)
      .single()
    if (!data) throw new Error('Unauthorised: student not assigned to this coach')
    return profile
  }

  throw new Error('Unauthorised: coach or admin access required')
}

// ── Reads ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all students with their currently assigned coach (if any).
 * Returns every student profile joined with coach_students.
 * Admin only.
 */
export async function getAllStudentsWithCoaches(): Promise<
  Array<{
    student: ProfileRow
    coaches: ProfileRow[]
  }>
> {
  await requireAdmin()
  const supabase = await createClient()

  const { data: students, error: sErr } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'student')
    .order('full_name')

  if (sErr) throw new Error('Failed to fetch students')

  const { data: assignments, error: aErr } = await supabase
    .from('coach_students')
    .select('id, coach_id, student_id, assigned_at, notes')

  if (aErr) throw new Error('Failed to fetch assignments')

  const { data: coaches, error: cErr } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'coach')
    .order('full_name')

  if (cErr) throw new Error('Failed to fetch coaches')

  const coachMap = new Map(coaches?.map(c => [c.id, c]) ?? [])

  const assignmentsByStudent = new Map<string, typeof assignments>()
  for (const a of assignments ?? []) {
    const existing = assignmentsByStudent.get(a.student_id) ?? []
    assignmentsByStudent.set(a.student_id, [...existing, a])
  }

  return (students ?? []).map(student => {
    const studentAssignments = assignmentsByStudent.get(student.id) ?? []
    const assignedCoaches = studentAssignments
      .map(a => coachMap.get(a.coach_id))
      .filter((c): c is ProfileRow => c != null)
    return { student, coaches: assignedCoaches }
  })
}

/**
 * Fetch all coach profiles. Admin only.
 */
export async function getAllCoaches(): Promise<ProfileRow[]> {
  await requireAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'coach')
    .order('full_name')

  if (error) throw new Error('Failed to fetch coaches')
  return data ?? []
}

// ── Writes ────────────────────────────────────────────────────────────────────

/**
 * Assign a coach to a student.
 * If the student already has a coach this will fail due to the unique
 * constraint on (coach_id, student_id) — caller should unassign first.
 * Admin only.
 */
export async function assignCoachToStudent(
  studentId: string,
  coachId: string,
  notes?: string
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  // Remove any existing assignment for this student first (one coach per student)
  await supabase
    .from('coach_students')
    .delete()
    .eq('student_id', studentId)

  // Fetch the coach's name from profiles so we can denormalise it onto the row.
  // The DB trigger (trg_sync_coach_name_on_assign) also does this, but setting it
  // explicitly avoids a round-trip and keeps the value consistent if the trigger
  // is ever missing in a local/staging environment.
  const { data: coachProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', coachId)
    .maybeSingle()

  const { error } = await supabase
    .from('coach_students')
    .insert({
      coach_id:   coachId,
      student_id: studentId,
      coach_name: coachProfile?.full_name ?? null,
      notes:      notes ?? null,
    })

  if (error) throw new Error(`Failed to assign coach: ${error.message}`)

  revalidatePath('/academy/admin/assignments')
  revalidatePath('/academy/students')
}

/**
 * Add an additional coach to a student without removing existing coaches.
 * Admin only.
 */
export async function addCoachToStudent(
  studentId: string,
  coachId: string,
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { data: coachProfile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', coachId)
    .maybeSingle()

  const { error } = await supabase
    .from('coach_students')
    .insert({
      coach_id:   coachId,
      student_id: studentId,
      coach_name: coachProfile?.full_name ?? null,
      notes:      null,
    })

  if (error) throw new Error(`Failed to assign coach: ${error.message}`)

  revalidatePath('/academy/admin/assignments')
  revalidatePath('/academy/students')
}

/**
 * Remove a specific coach from a student.
 * Admin only.
 */
export async function removeCoachFromStudent(
  studentId: string,
  coachId: string,
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('coach_students')
    .delete()
    .eq('student_id', studentId)
    .eq('coach_id', coachId)

  if (error) throw new Error(`Failed to remove coach: ${error.message}`)

  revalidatePath('/academy/admin/assignments')
  revalidatePath('/academy/students')
}

/**
 * Remove a coach assignment from a student.
 * Admin only.
 */
export async function unassignCoach(studentId: string): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('coach_students')
    .delete()
    .eq('student_id', studentId)

  if (error) throw new Error(`Failed to unassign coach: ${error.message}`)

  revalidatePath('/academy/admin/assignments')
  revalidatePath('/academy/students')
}

/**
 * Update notes on an existing coach-student assignment.
 * Admin only.
 */
export async function updateAssignmentNotes(
  assignmentId: string,
  notes: string
): Promise<void> {
  await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('coach_students')
    .update({ notes })
    .eq('id', assignmentId)

  if (error) throw new Error(`Failed to update notes: ${error.message}`)

  revalidatePath('/academy/admin/assignments')
}

// ── Gamification: coach manual award ─────────────────────────────────────────

/**
 * Grant points to a student manually. Coach must own the student; admin can award anyone.
 * Points must be a positive integer. A note is required for audit trail.
 */
export async function grantManualPoints(
  studentId: string,
  points: number,
  note: string,
): Promise<void> {
  await requireCoachOrAdminForStudent(studentId)

  if (!Number.isInteger(points) || points <= 0) {
    throw new Error('Points must be a positive integer')
  }
  if (!note.trim()) {
    throw new Error('A note is required for manual point awards')
  }

  await grantCoachAward(studentId, points, note.trim())
  revalidatePath(`/academy/students/${studentId}`)
}

// ── Gamification: student tier ────────────────────────────────────────────────

const VALID_TIERS = ['beginner', 'intermediate', 'advanced'] as const
export type StudentTier = typeof VALID_TIERS[number]

/**
 * Set or update a student's tier. Coach must own the student; admin can set for anyone.
 * UPSERTs into academy_profiles on student_id conflict.
 */
export async function setStudentTier(
  studentId: string,
  tier: StudentTier,
): Promise<void> {
  await requireCoachOrAdminForStudent(studentId)

  if (!(VALID_TIERS as readonly string[]).includes(tier)) {
    throw new Error(`Invalid tier: ${tier}`)
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('academy_profiles')
    .upsert(
      { student_id: studentId, tier },
      { onConflict: 'student_id' },
    )

  if (error) throw new Error(`Failed to set tier: ${error.message}`)

  revalidatePath(`/academy/students/${studentId}`)
  revalidatePath('/academy/students')
}
