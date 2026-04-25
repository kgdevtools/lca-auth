import { createClient } from '@/utils/supabase/server'

export interface BlockProgress {
  id: string
  lesson_id: string
  block_id: string
  student_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  completed_at: string | null
  time_spent_seconds: number
  attempts: number
  created_at: string
  updated_at: string
}

export async function getBlockProgress(
  lessonId: string,
  blockId: string,
  studentId: string
): Promise<BlockProgress | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('block_progress')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('block_id', blockId)
    .eq('student_id', studentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching block progress:', error)
    throw new Error('Failed to fetch block progress')
  }

  return data
}

export async function getAllBlockProgress(
  lessonId: string,
  studentId: string
): Promise<BlockProgress[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('block_progress')
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching block progress:', error)
    throw new Error('Failed to fetch block progress')
  }

  return data || []
}

export async function upsertBlockProgress(progress: {
  lesson_id: string
  block_id: string
  student_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  completed_at?: string
  time_spent_seconds?: number
  attempts?: number
}): Promise<BlockProgress> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('block_progress')
    .select('id')
    .eq('lesson_id', progress.lesson_id)
    .eq('block_id', progress.block_id)
    .eq('student_id', progress.student_id)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('block_progress')
      .update({
        status: progress.status,
        completed_at: progress.completed_at || null,
        time_spent_seconds: progress.time_spent_seconds,
        attempts: progress.attempts,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating block progress:', error)
      throw new Error('Failed to update block progress')
    }

    return data
  } else {
    const { data, error } = await supabase
      .from('block_progress')
      .insert({
        lesson_id: progress.lesson_id,
        block_id: progress.block_id,
        student_id: progress.student_id,
        status: progress.status,
        completed_at: progress.completed_at || null,
        time_spent_seconds: progress.time_spent_seconds || 0,
        attempts: progress.attempts || 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating block progress:', error)
      throw new Error('Failed to create block progress')
    }

    return data
  }
}

export async function markBlockComplete(
  lessonId: string,
  blockId: string,
  studentId: string,
  timeSpentSeconds: number
): Promise<BlockProgress> {
  return upsertBlockProgress({
    lesson_id: lessonId,
    block_id: blockId,
    student_id: studentId,
    status: 'completed',
    completed_at: new Date().toISOString(),
    time_spent_seconds: timeSpentSeconds,
  })
}

export async function startBlock(
  lessonId: string,
  blockId: string,
  studentId: string
): Promise<BlockProgress> {
  const existing = await getBlockProgress(lessonId, blockId, studentId)

  if (existing && existing.status === 'completed') {
    return existing
  }

  return upsertBlockProgress({
    lesson_id: lessonId,
    block_id: blockId,
    student_id: studentId,
    status: 'in_progress',
    attempts: existing ? existing.attempts + 1 : 1,
  })
}