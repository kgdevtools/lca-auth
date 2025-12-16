'use server'

import { createClient } from '@/utils/supabase/server'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { revalidatePath } from 'next/cache'

export interface LessonProgress {
  id: string
  student_id: string
  lesson_id: string
  status: 'not_started' | 'in_progress' | 'completed'
  progress_percentage: number
  quiz_score: number | null
  time_spent_seconds: number
  attempts: number
  started_at: string | null
  completed_at: string | null
  last_accessed_at: string
}

/**
 * Get student's progress for a specific lesson
 */
export async function getLessonProgress(lessonId: string): Promise<LessonProgress | null> {
  const supabase = await createClient()
  const { profile } = await getCurrentUserWithProfile()

  const { data, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('student_id', profile.id)
    .eq('lesson_id', lessonId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No progress record exists yet
      return null
    }
    console.error('Error fetching lesson progress:', error)
    throw new Error('Failed to fetch lesson progress')
  }

  return data
}

/**
 * Get all progress for current student
 */
export async function getAllProgress(): Promise<LessonProgress[]> {
  const supabase = await createClient()
  const { profile } = await getCurrentUserWithProfile()

  const { data, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('student_id', profile.id)
    .order('last_accessed_at', { ascending: false })

  if (error) {
    console.error('Error fetching all progress:', error)
    throw new Error('Failed to fetch progress')
  }

  return data || []
}

/**
 * Start a lesson (mark as in_progress)
 */
export async function startLesson(lessonId: string): Promise<LessonProgress> {
  const supabase = await createClient()
  const { profile } = await getCurrentUserWithProfile()

  // Check if progress already exists
  const existing = await getLessonProgress(lessonId)

  if (existing) {
    // Update last accessed time
    const { data, error } = await supabase
      .from('lesson_progress')
      .update({
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating lesson access:', error)
      throw new Error('Failed to update lesson progress')
    }

    revalidatePath('/academy/lessons')
    return data
  }

  // Create new progress record
  const { data, error } = await supabase
    .from('lesson_progress')
    .insert({
      student_id: profile.id,
      lesson_id: lessonId,
      status: 'in_progress',
      progress_percentage: 0,
      time_spent_seconds: 0,
      attempts: 1,
      started_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error starting lesson:', error)
    throw new Error('Failed to start lesson')
  }

  revalidatePath('/academy/lessons')
  return data
}

/**
 * Mark lesson as complete
 */
export async function markLessonComplete(lessonId: string): Promise<LessonProgress> {
  const supabase = await createClient()
  const { profile } = await getCurrentUserWithProfile()

  // Get existing progress or create it
  let existing = await getLessonProgress(lessonId)

  if (!existing) {
    // Start the lesson first
    existing = await startLesson(lessonId)
  }

  const { data, error } = await supabase
    .from('lesson_progress')
    .update({
      status: 'completed',
      progress_percentage: 100,
      completed_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) {
    console.error('Error marking lesson complete:', error)
    throw new Error('Failed to mark lesson as complete')
  }

  revalidatePath('/academy/lessons')
  revalidatePath('/academy/reports')
  return data
}

/**
 * Update quiz score for a lesson
 */
export async function updateQuizScore(
  lessonId: string,
  score: number
): Promise<LessonProgress> {
  const supabase = await createClient()
  const { profile } = await getCurrentUserWithProfile()

  // Get existing progress or create it
  let existing = await getLessonProgress(lessonId)

  if (!existing) {
    existing = await startLesson(lessonId)
  }

  const { data, error } = await supabase
    .from('lesson_progress')
    .update({
      quiz_score: score,
      attempts: existing.attempts + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating quiz score:', error)
    throw new Error('Failed to update quiz score')
  }

  revalidatePath('/academy/lessons')
  revalidatePath('/academy/reports')
  return data
}

/**
 * Update time spent on lesson
 */
export async function updateTimeSpent(
  lessonId: string,
  additionalSeconds: number
): Promise<LessonProgress> {
  const supabase = await createClient()
  const { profile } = await getCurrentUserWithProfile()

  const existing = await getLessonProgress(lessonId)

  if (!existing) {
    throw new Error('No progress record found')
  }

  const { data, error } = await supabase
    .from('lesson_progress')
    .update({
      time_spent_seconds: existing.time_spent_seconds + additionalSeconds,
      last_accessed_at: new Date().toISOString(),
    })
    .eq('id', existing.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating time spent:', error)
    throw new Error('Failed to update time spent')
  }

  return data
}

/**
 * Get progress statistics for student
 */
export async function getProgressStats() {
  const supabase = await createClient()
  const { profile } = await getCurrentUserWithProfile()

  const { data: allProgress, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('student_id', profile.id)

  if (error) {
    console.error('Error fetching progress stats:', error)
    throw new Error('Failed to fetch progress statistics')
  }

  const progress = allProgress || []

  const completed = progress.filter(p => p.status === 'completed').length
  const inProgress = progress.filter(p => p.status === 'in_progress').length
  const totalTime = progress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0)
  const averageScore = progress
    .filter(p => p.quiz_score !== null)
    .reduce((sum, p, _, arr) => sum + (p.quiz_score || 0) / arr.length, 0)

  return {
    total: progress.length,
    completed,
    inProgress,
    notStarted: 0, // This would need to be calculated against total lessons
    totalTimeMinutes: Math.round(totalTime / 60),
    averageQuizScore: Math.round(averageScore),
  }
}
