import { redirect } from 'next/navigation'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { createClient } from '@/utils/supabase/server'
import LeaderboardClient from './_components/LeaderboardClient'

export const metadata = {
  title: 'Leaderboard — LCA Academy',
}

interface LeaderboardRow {
  studentId:   string
  fullName:    string | null
  totalPoints: number
  level:       number
  tier:        string | null
}

export default async function LeaderboardPage() {
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) redirect('/login')

  const supabase = await createClient()

  // Top 20 students ordered by total_points desc, joined with tier from academy_profiles
  const { data: rows } = await supabase
    .from('student_progress_summary')
    .select('student_id, total_points, level')
    .order('total_points', { ascending: false })
    .limit(20)

  if (!rows || rows.length === 0) {
    return <LeaderboardClient rows={[]} currentStudentId={profile.id} />
  }

  const studentIds = rows.map(r => r.student_id)

  const [profilesRes, tiersRes] = await Promise.all([
    supabase.from('profiles').select('id, full_name').in('id', studentIds),
    supabase.from('academy_profiles').select('student_id, tier').in('student_id', studentIds),
  ])

  const profileMap = new Map((profilesRes.data ?? []).map(p => [p.id, p.full_name]))
  const tierMap    = new Map((tiersRes.data    ?? []).map(t => [t.student_id, t.tier]))

  const leaderboard: LeaderboardRow[] = rows.map(r => ({
    studentId:   r.student_id,
    fullName:    profileMap.get(r.student_id) ?? null,
    totalPoints: r.total_points,
    level:       r.level,
    tier:        tierMap.get(r.student_id) ?? null,
  }))

  return (
    <LeaderboardClient
      rows={leaderboard}
      currentStudentId={profile.id}
    />
  )
}
