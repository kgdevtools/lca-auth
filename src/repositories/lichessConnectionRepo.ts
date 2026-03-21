import { createClient } from '@/utils/supabase/server'
import type { LichessConnection, LichessConnectionPublic } from '@/types/lichess'

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the full Lichess connection record (includes access_token) for a user.
 * Returns null if the user has no connection.
 */
export async function getLichessConnectionByUserId(
  userId: string
): Promise<LichessConnection | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lichess_connections')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // no row found
    console.error('[lichessConnectionRepo] getLichessConnectionByUserId error:', error)
    throw new Error('Failed to fetch Lichess connection')
  }

  return data as LichessConnection
}

/**
 * Get the public-safe Lichess connection record (no access_token) for a user.
 * Returns null if the user has no connection.
 */
export async function getLichessConnectionPublicByUserId(
  userId: string
): Promise<LichessConnectionPublic | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('lichess_connections')
    .select('id, user_id, lichess_username, scope, connected_at, last_synced_at, is_active, status')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    console.error('[lichessConnectionRepo] getLichessConnectionPublicByUserId error:', error)
    throw new Error('Failed to fetch Lichess connection')
  }

  return data as LichessConnectionPublic
}

/**
 * Get public Lichess connection records for all students assigned to a coach.
 * Returns an array — students without a connection are excluded.
 */
export async function getStudentConnectionsForCoach(
  coachId: string
): Promise<Array<LichessConnectionPublic & { student_name: string | null; student_id: string }>> {
  const supabase = await createClient()

  // 1. Get all student IDs for this coach
  const { data: rows, error: studentsError } = await supabase
    .from('coach_students')
    .select('student_id')
    .eq('coach_id', coachId)

  if (studentsError) {
    console.error('[lichessConnectionRepo] getStudentConnectionsForCoach (students) error:', studentsError)
    throw new Error('Failed to fetch assigned students')
  }

  if (!rows || rows.length === 0) return []

  const studentIds = rows.map((r) => r.student_id)

  // 2. Get Lichess connections for those students (joined with profile name)
  const { data: connections, error: connError } = await supabase
    .from('lichess_connections')
    .select(
      'id, user_id, lichess_username, scope, connected_at, last_synced_at, is_active, status, profiles!lichess_connections_user_id_fkey(id, full_name)'
    )
    .in('user_id', studentIds)

  if (connError) {
    console.error('[lichessConnectionRepo] getStudentConnectionsForCoach (connections) error:', connError)
    throw new Error('Failed to fetch student Lichess connections')
  }

  return (connections ?? []).map((conn: any) => ({
    id: conn.id,
    user_id: conn.user_id,
    lichess_username: conn.lichess_username,
    scope: conn.scope,
    connected_at: conn.connected_at,
    last_synced_at: conn.last_synced_at,
    is_active: conn.is_active,
    status: conn.status,
    student_id: conn.profiles?.id ?? conn.user_id,
    student_name: conn.profiles?.full_name ?? null,
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insert or update a Lichess connection for a user.
 * Uses upsert on the unique `user_id` constraint.
 */
export async function upsertLichessConnection(data: {
  user_id: string
  lichess_username: string
  access_token: string
  token_type: string
  scope: string
  expires_in: number | null
}): Promise<LichessConnection> {
  const supabase = await createClient()

  const now = new Date().toISOString()

  const { data: result, error } = await supabase
    .from('lichess_connections')
    .upsert(
      {
        user_id: data.user_id,
        lichess_username: data.lichess_username,
        access_token: data.access_token,
        token_type: data.token_type,
        scope: data.scope,
        expires_in: data.expires_in ?? null,
        connected_at: now,
        is_active: true,
        status: 'active',
        updated_at: now,
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[lichessConnectionRepo] upsertLichessConnection error:', error)
    throw new Error('Failed to save Lichess connection')
  }

  return result as LichessConnection
}

/**
 * Update the last_synced_at timestamp after a successful sync.
 */
export async function updateLastSynced(userId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lichess_connections')
    .update({
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    console.error('[lichessConnectionRepo] updateLastSynced error:', error)
    throw new Error('Failed to update sync timestamp')
  }
}

/**
 * Mark a student's Lichess connection as pending reconnect.
 * Sets is_active=false and status='pending_reconnect'.
 * An admin must delete the row to allow the student to reconnect.
 */
export async function requestLichessReconnect(userId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lichess_connections')
    .update({
      status: 'pending_reconnect',
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    console.error('[lichessConnectionRepo] requestLichessReconnect error:', error)
    throw new Error('Failed to request Lichess reconnect')
  }
}

/**
 * Hard-delete a Lichess connection row (admin only).
 * This allows the student to connect a new account.
 * Only deletes rows with status='pending_reconnect' as a safety check.
 */
export async function deleteLichessConnection(userId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('lichess_connections')
    .delete()
    .eq('user_id', userId)
    .eq('status', 'pending_reconnect')

  if (error) {
    console.error('[lichessConnectionRepo] deleteLichessConnection error:', error)
    throw new Error('Failed to delete Lichess connection')
  }
}
