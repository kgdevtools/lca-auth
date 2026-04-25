import { createClient } from '@/utils/supabase/server'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StudentWithProgress {
  id: string
  full_name: string | null
  assigned_at: string
  notes: string | null
  lessons_assigned: number
  lessons_completed: number
  lessons_in_progress: number
  total_time_minutes: number
  average_quiz_score: number | null
  last_active_at: string | null
  points: number
}

export interface StudentLessonProgress {
  lesson_id: string
  lesson_title: string
  lesson_difficulty: string | null
  lesson_content_type: string
  status: 'not_started' | 'in_progress' | 'completed'
  progress_percentage: number
  quiz_score: number | null
  time_spent_seconds: number
  attempts: number
  started_at: string | null
  completed_at: string | null
  last_accessed_at: string | null
  assigned_at: string
  points: number
}

export interface CoachFeedbackRow {
  id: string
  coach_id: string
  lesson_id: string | null
  lesson_title: string | null
  feedback_text: string
  rating: number | null
  created_at: string
}

// ── Per-lesson points (display only) ──────────────────────────────────────────
// Mirrors the formula in gamificationService.ts / grant_points DB function.
// Used only for per-lesson point display — totals come from student_progress_summary.
function computeLessonPoints(
  status: string,
  contentType: string,
  difficulty: string | null,
  quizScore: number | null,
): number {
  if (status !== 'completed') return 0
  const base       = contentType === 'study' ? 20 : 15
  const diff       = (difficulty ?? '').toLowerCase()
  const multiplier = diff === 'hard' ? 1.5 : diff === 'medium' ? 1.25 : 1.0
  const quizBonus  = quizScore != null ? Math.round((quizScore / 100) * 15) : 0
  return Math.round(base * multiplier) + quizBonus
}

// ── Coach: roster with aggregated progress ────────────────────────────────────

export async function getCoachStudentsWithProgress(
  coachId: string
): Promise<StudentWithProgress[]> {
  const supabase = await createClient()

  // 1. Students assigned to this coach
  const { data: assignments, error: aErr } = await supabase
    .from('coach_students')
    .select('student_id, assigned_at, notes')
    .eq('coach_id', coachId)

  if (aErr) throw new Error('Failed to fetch coach students')
  if (!assignments || assignments.length === 0) return []

  const studentIds = assignments.map(a => a.student_id)

  // 2. Student profiles
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', studentIds)

  if (pErr) throw new Error('Failed to fetch student profiles')

  // 3. Lesson assignment counts per student
  const { data: lessonAssignments, error: lErr } = await supabase
    .from('lesson_students')
    .select('student_id, lesson_id')
    .in('student_id', studentIds)

  if (lErr) throw new Error('Failed to fetch lesson assignments')

  // 4. Progress rows for these students
  const { data: progressRows, error: prErr } = await supabase
    .from('lesson_progress')
    .select('student_id, status, quiz_score, time_spent_seconds, last_accessed_at')
    .in('student_id', studentIds)

  if (prErr) throw new Error('Failed to fetch progress')

  // 5. Total points from persistent summary (includes streak bonuses, coach awards, etc.)
  const { data: summaries } = await supabase
    .from('student_progress_summary')
    .select('student_id, total_points')
    .in('student_id', studentIds)

  const summaryMap = new Map((summaries ?? []).map(s => [s.student_id, s.total_points as number]))

  // 6. Aggregate in memory
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const lessonCountMap = new Map<string, number>()
  ;(lessonAssignments ?? []).forEach(la => {
    lessonCountMap.set(la.student_id, (lessonCountMap.get(la.student_id) ?? 0) + 1)
  })

  const progressMap = new Map<string, typeof progressRows>()
  ;(progressRows ?? []).forEach(pr => {
    const list = progressMap.get(pr.student_id) ?? []
    list.push(pr)
    progressMap.set(pr.student_id, list)
  })

  return assignments.map(assignment => {
    const profile  = profileMap.get(assignment.student_id)
    const progress = progressMap.get(assignment.student_id) ?? []

    const completed   = progress.filter(p => p.status === 'completed')
    const inProgress  = progress.filter(p => p.status === 'in_progress')
    const totalTime   = progress.reduce((s, p) => s + (p.time_spent_seconds ?? 0), 0)
    const scoredRows  = completed.filter(p => p.quiz_score != null)
    const avgScore    = scoredRows.length > 0
      ? Math.round(scoredRows.reduce((s, p) => s + (p.quiz_score ?? 0), 0) / scoredRows.length)
      : null
    const lastActive  = progress
      .map(p => p.last_accessed_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null
    const points      = summaryMap.get(assignment.student_id) ?? 0

    return {
      id:                  assignment.student_id,
      full_name:           profile?.full_name ?? null,
      assigned_at:         assignment.assigned_at,
      notes:               assignment.notes,
      lessons_assigned:    lessonCountMap.get(assignment.student_id) ?? 0,
      lessons_completed:   completed.length,
      lessons_in_progress: inProgress.length,
      total_time_minutes:  Math.round(totalTime / 60),
      average_quiz_score:  avgScore,
      last_active_at:      lastActive,
      points,
    }
  })
}

// ── Student: per-lesson progress detail ───────────────────────────────────────

export async function getStudentLessonDetail(
  studentId: string
): Promise<StudentLessonProgress[]> {
  const supabase = await createClient()

  // All lessons assigned to this student
  const { data: allAssigned, error: aErr } = await supabase
    .from('lesson_students')
    .select(`
      assigned_at,
      lesson:lessons(id, title, difficulty, content_type)
    `)
    .eq('student_id', studentId)

  if (aErr) throw new Error('Failed to fetch assigned lessons')

  // All progress rows for this student
  const { data: progressRows, error: prErr } = await supabase
    .from('lesson_progress')
    .select(`
      lesson_id, status, progress_percentage, quiz_score,
      time_spent_seconds, attempts,
      started_at, completed_at, last_accessed_at
    `)
    .eq('student_id', studentId)

  if (prErr) throw new Error('Failed to fetch progress rows')

  const progressMap = new Map(
    (progressRows ?? []).map(p => [p.lesson_id, p])
  )

  return (allAssigned ?? [])
    .map((row: any) => {
      const lesson    = row.lesson
      if (!lesson?.id) return null

      const progress  = progressMap.get(lesson.id)
      const status    = (progress?.status as StudentLessonProgress['status']) ?? 'not_started'
      const quizScore = progress?.quiz_score ?? null

      return {
        lesson_id:           lesson.id,
        lesson_title:        lesson.title ?? 'Unknown',
        lesson_difficulty:   lesson.difficulty ?? null,
        lesson_content_type: lesson.content_type ?? '',
        status,
        progress_percentage: progress?.progress_percentage ?? 0,
        quiz_score:          quizScore,
        time_spent_seconds:  progress?.time_spent_seconds ?? 0,
        attempts:            progress?.attempts ?? 0,
        started_at:          progress?.started_at ?? null,
        completed_at:        progress?.completed_at ?? null,
        last_accessed_at:    progress?.last_accessed_at ?? null,
        assigned_at:         row.assigned_at,
        points:              computeLessonPoints(status, lesson.content_type ?? '', lesson.difficulty, quizScore),
      } as StudentLessonProgress
    })
    .filter((r): r is StudentLessonProgress => r !== null)
}

// ── Student: feedback received ────────────────────────────────────────────────

export async function getStudentFeedback(
  studentId: string
): Promise<CoachFeedbackRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('coach_feedback')
    .select(`
      id, coach_id, lesson_id, feedback_text, rating, created_at,
      lesson:lessons(title)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to fetch feedback')

  return (data ?? []).map((row: any) => ({
    id:            row.id,
    coach_id:      row.coach_id,
    lesson_id:     row.lesson_id,
    lesson_title:  row.lesson?.title ?? null,
    feedback_text: row.feedback_text,
    rating:        row.rating,
    created_at:    row.created_at,
  }))
}

// ── Student: self-service summary (used in reports page) ─────────────────────

export async function getStudentSelfProgress(studentId: string): Promise<{
  lessons: StudentLessonProgress[]
  stats: {
    total: number
    completed: number
    in_progress: number
    not_started: number
    total_time_minutes: number
    average_quiz_score: number | null
    points: number
  }
  feedback: CoachFeedbackRow[]
}> {
  const supabase = await createClient()

  const [lessons, feedback, summaryRes] = await Promise.all([
    getStudentLessonDetail(studentId),
    getStudentFeedback(studentId),
    supabase
      .from('student_progress_summary')
      .select('total_points')
      .eq('student_id', studentId)
      .single(),
  ])

  const completed  = lessons.filter(l => l.status === 'completed').length
  const inProgress = lessons.filter(l => l.status === 'in_progress').length
  const notStarted = lessons.filter(l => l.status === 'not_started').length
  const totalTime  = Math.round(lessons.reduce((s, l) => s + l.time_spent_seconds, 0) / 60)
  const scored     = lessons.filter(l => l.quiz_score != null)
  const avgScore   = scored.length > 0
    ? Math.round(scored.reduce((s, l) => s + (l.quiz_score ?? 0), 0) / scored.length)
    : null
  // Total points from persistent summary (includes streak bonuses, coach awards, etc.)
  const points     = summaryRes.data?.total_points ?? 0

  return {
    lessons,
    stats: {
      total:               lessons.length,
      completed,
      in_progress:         inProgress,
      not_started:         notStarted,
      total_time_minutes:  totalTime,
      average_quiz_score:  avgScore,
      points,
    },
    feedback,
  }
}

// ── Coach: all students across all coaches (admin view) ───────────────────────

export async function getAllStudentsWithProgressAdmin(): Promise<StudentWithProgress[]> {
  const supabase = await createClient()

  const { data: allAssignments, error: aErr } = await supabase
    .from('coach_students')
    .select('coach_id')

  if (aErr) throw new Error('Failed to fetch assignments')

  const coachIds = [...new Set((allAssignments ?? []).map((a: any) => a.coach_id))]
  if (coachIds.length === 0) return []

  const perCoach = await Promise.all(
    coachIds.map(cid => getCoachStudentsWithProgress(cid).catch(() => [] as StudentWithProgress[]))
  )

  // Deduplicate by student id — a student has exactly one coach
  const seen = new Set<string>()
  return perCoach.flat().filter(s => {
    if (seen.has(s.id)) return false
    seen.add(s.id)
    return true
  })
}