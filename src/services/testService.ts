'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { checkCoachRole, checkAdminRole, getCurrentUserWithProfile } from '@/utils/auth/academyAuth'

export interface Test {
  id: string
  title: string
  description: string | null
  category_id: string | null
  time_limit_minutes: number | null
  passing_score: number
  max_attempts: number | null
  questions_data: any
  published: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TestAttempt {
  id: string
  test_id: string
  student_id: string
  score: number
  passed: boolean
  time_taken_seconds: number | null
  answers_data: any
  started_at: string
  completed_at: string | null
}

// ============================================
// TESTS - READ OPERATIONS
// ============================================

/**
 * Get all published tests
 */
export async function getPublishedTests(): Promise<Test[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tests:', error)
    throw new Error('Failed to fetch tests')
  }

  return data || []
}

/**
 * Get all tests (including unpublished) - Admin/Coach only
 */
export async function getAllTests(): Promise<Test[]> {
  await checkCoachRole()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all tests:', error)
    throw new Error('Failed to fetch tests')
  }

  return data || []
}

/**
 * Get a single test by ID
 */
export async function getTestById(id: string): Promise<Test | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Error fetching test:', error)
    throw new Error('Failed to fetch test')
  }

  return data
}

/**
 * Get tests by category
 */
export async function getTestsByCategory(categoryId: string): Promise<Test[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('category_id', categoryId)
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching tests by category:', error)
    throw new Error('Failed to fetch tests')
  }

  return data || []
}

// ============================================
// TESTS - WRITE OPERATIONS (Admin/Coach)
// ============================================

/**
 * Create a new test
 */
export async function createTest(testData: {
  title: string
  description?: string
  category_id?: string
  time_limit_minutes?: number
  passing_score?: number
  max_attempts?: number
  questions_data: any
  published?: boolean
}) {
  await checkCoachRole()

  const { profile } = await getCurrentUserWithProfile()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tests')
    .insert({
      title: testData.title,
      description: testData.description || null,
      category_id: testData.category_id || null,
      time_limit_minutes: testData.time_limit_minutes || null,
      passing_score: testData.passing_score || 70,
      max_attempts: testData.max_attempts || null,
      questions_data: testData.questions_data,
      published: testData.published || false,
      created_by: profile.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating test:', error)
    throw new Error('Failed to create test')
  }

  revalidatePath('/academy/tests')
  revalidatePath('/academy/admin')
  return data
}

/**
 * Update an existing test
 */
export async function updateTest(
  testId: string,
  updates: Partial<{
    title: string
    description: string
    category_id: string
    time_limit_minutes: number
    passing_score: number
    max_attempts: number
    questions_data: any
    published: boolean
  }>
) {
  await checkCoachRole()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tests')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', testId)
    .select()
    .single()

  if (error) {
    console.error('Error updating test:', error)
    throw new Error('Failed to update test')
  }

  revalidatePath('/academy/tests')
  revalidatePath('/academy/admin')
  return data
}

/**
 * Delete a test (Admin only)
 */
export async function deleteTest(testId: string) {
  await checkAdminRole()

  const supabase = await createClient()

  const { error } = await supabase.from('tests').delete().eq('id', testId)

  if (error) {
    console.error('Error deleting test:', error)
    throw new Error('Failed to delete test')
  }

  revalidatePath('/academy/tests')
  revalidatePath('/academy/admin')
  return { success: true }
}

/**
 * Toggle test published status
 */
export async function toggleTestPublished(testId: string, published: boolean) {
  await checkCoachRole()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('tests')
    .update({ published, updated_at: new Date().toISOString() })
    .eq('id', testId)
    .select()
    .single()

  if (error) {
    console.error('Error toggling test published status:', error)
    throw new Error('Failed to update test')
  }

  revalidatePath('/academy/tests')
  revalidatePath('/academy/admin')
  return data
}

// ============================================
// TEST ATTEMPTS
// ============================================

/**
 * Get student's attempts for a specific test
 */
export async function getStudentTestAttempts(testId: string): Promise<TestAttempt[]> {
  const { profile } = await getCurrentUserWithProfile()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('test_attempts')
    .select('*')
    .eq('test_id', testId)
    .eq('student_id', profile.id)
    .order('started_at', { ascending: false })

  if (error) {
    console.error('Error fetching test attempts:', error)
    throw new Error('Failed to fetch test attempts')
  }

  return data || []
}

/**
 * Get all attempts for a test (Coach/Admin only)
 */
export async function getAllTestAttempts(testId: string): Promise<TestAttempt[]> {
  await checkCoachRole()

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('test_attempts')
    .select('*')
    .eq('test_id', testId)
    .order('started_at', { ascending: false })

  if (error) {
    console.error('Error fetching all test attempts:', error)
    throw new Error('Failed to fetch test attempts')
  }

  return data || []
}

/**
 * Create a new test attempt
 */
export async function createTestAttempt(testId: string) {
  const { profile } = await getCurrentUserWithProfile()
  const supabase = await createClient()

  // Check if max attempts reached
  const test = await getTestById(testId)
  if (!test) {
    throw new Error('Test not found')
  }

  if (test.max_attempts) {
    const attempts = await getStudentTestAttempts(testId)
    if (attempts.length >= test.max_attempts) {
      throw new Error('Maximum attempts reached')
    }
  }

  const { data, error } = await supabase
    .from('test_attempts')
    .insert({
      test_id: testId,
      student_id: profile.id,
      score: 0,
      passed: false,
      answers_data: {},
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating test attempt:', error)
    throw new Error('Failed to create test attempt')
  }

  return data
}

/**
 * Submit test attempt with answers
 */
export async function submitTestAttempt(
  attemptId: string,
  answersData: any,
  score: number,
  passed: boolean,
  timeTakenSeconds: number
) {
  const { profile } = await getCurrentUserWithProfile()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('test_attempts')
    .update({
      answers_data: answersData,
      score,
      passed,
      time_taken_seconds: timeTakenSeconds,
      completed_at: new Date().toISOString(),
    })
    .eq('id', attemptId)
    .eq('student_id', profile.id) // Ensure student can only update their own attempt
    .select()
    .single()

  if (error) {
    console.error('Error submitting test attempt:', error)
    throw new Error('Failed to submit test attempt')
  }

  revalidatePath('/academy/tests')
  return data
}
