import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { createClient } from '@/utils/supabase/server'
import {
  getTodaysSetForCoach,
  getTodaysSetForStudent,
  getStudentAttemptsToday,
} from '@/services/dailyPuzzleService'
import { getAcademyRatingSummary } from '@/services/academyRatingService'
import { tierRatingBand } from '@/lib/academyRating'
import CoachPuzzleCuration from './_components/CoachPuzzleCuration'
import StudentDailyPuzzles from './_components/StudentDailyPuzzles'

export const metadata: Metadata = {
  title: 'Daily Puzzles — LCA Academy',
}

export default async function AcademyPuzzlesPage() {
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) redirect('/login')

  // ── Coach / admin: curate today's pool ──────────────────────────────────────
  if (profile.role === 'coach' || profile.role === 'admin') {
    const set = await getTodaysSetForCoach(profile.id)
    return <CoachPuzzleCuration initialPuzzles={set?.puzzles ?? []} />
  }

  // ── Student: today's set, auto-filtered to their rating band ─────────────────
  const supabase = await createClient()
  const [set, attempts, rating, apRes] = await Promise.all([
    getTodaysSetForStudent(profile.id),
    getStudentAttemptsToday(profile.id),
    getAcademyRatingSummary(profile.id),
    supabase.from('academy_profiles').select('tier').eq('student_id', profile.id).maybeSingle(),
  ])

  const tier = (apRes.data as { tier?: string | null } | null)?.tier ?? null
  const currentRating = rating?.rating ?? 800
  const band = tierRatingBand(currentRating, tier)

  const filtered = (set?.puzzles ?? []).filter(p => {
    const r = p.rating ?? currentRating
    return r >= band.min && r <= band.max
  })
  // If filtering leaves too few, fall back to the whole pool so the student always
  // has something to do.
  const puzzles = filtered.length >= 3 ? filtered : (set?.puzzles ?? [])

  return (
    <StudentDailyPuzzles
      puzzles={puzzles}
      attempts={attempts}
      rating={currentRating}
      hasCoach={set !== null}
    />
  )
}
