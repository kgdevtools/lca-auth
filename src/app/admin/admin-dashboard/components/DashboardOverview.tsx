// src/app/admin/admin-dashboard/components/DashboardOverview.tsx
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { LEVEL_NAMES, type LevelNumber } from '@/lib/constants/achievements'
import React from 'react'

// ── Date helpers (server-safe) ───────────────────────────────────────────────

function shortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function relativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7)   return `${days}d ago`
  return shortDate(dateStr)
}

// ── Data fetching ────────────────────────────────────────────────────────────

async function getDashboardStats() {
  const supabase      = await createClient()
  const adminClient   = createAdminClient()

  try {
    // Run standard queries and auth.admin.listUsers in parallel
    const [
      { count: tournamentsCount },
      { count: playersCount },
      { count: recentTournamentsCount },
      { data: avgRatingData },
      { data: lastTournamentData },
      { count: studentsCount },
      { count: pendingRegistrations },
      { count: coachesCount },
      { count: publishedLessons },
      { data: lastCompletedData },
      { data: profilesData },
      authUsersResult,
      { data: progressSummaryData },
      { count: assignedLessonsCount },
      { data: lessonProgressData },
    ] = await Promise.all([
      // LCA Database
      supabase.from('tournaments').select('*', { count: 'exact', head: true }),
      supabase.from('players').select('*', { count: 'exact', head: true }),
      supabase.from('tournaments').select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('tournaments').select('average_elo').not('average_elo', 'is', null),
      supabase.from('tournaments').select('tournament_name, created_at')
        .order('created_at', { ascending: false }).limit(1),
      // Counts
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('player_registrations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'coach'),
      supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      // Last completed lesson (with student name via FK join)
      supabase.from('lesson_progress')
        .select('completed_at, student:profiles!student_id(full_name)')
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1),
      // All student + coach profiles (for auth cross-reference)
      supabase.from('profiles')
        .select('id, full_name, role')
        .in('role', ['student', 'coach']),
      // Auth users with last_sign_in_at (service role)
      adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      // Gamification: progress summary for all students
      supabase.from('student_progress_summary').select('student_id, total_points, level'),
      // Academy: assigned lessons total
      supabase.from('lesson_students').select('*', { count: 'exact', head: true }),
      // Academy: lesson progress rows for completion rate + avg quiz score
      supabase.from('lesson_progress').select('status, quiz_score'),
    ])

    const averageRating =
      avgRatingData && avgRatingData.length > 0
        ? Math.round(
            avgRatingData.reduce((sum, t) => sum + (t.average_elo || 0), 0) /
            avgRatingData.length
          )
        : 0

    // Last completed lesson
    const lastCompleted = lastCompletedData?.[0]
      ? {
          completed_at: (lastCompletedData[0] as any).completed_at as string | null,
          student_name: ((lastCompletedData[0] as any).student as any)?.full_name as string | null,
        }
      : null

    // Cross-reference profiles with auth users to get last_sign_in_at
    const authUsers = authUsersResult.data?.users ?? []
    const authMap   = new Map(authUsers.map(u => [u.id, u.last_sign_in_at]))

    const students = (profilesData ?? []).filter(p => p.role === 'student')
    const coaches  = (profilesData ?? []).filter(p => p.role === 'coach')

    const lastSignedInStudent = students
      .map(p => ({ ...p, last_sign_in_at: authMap.get(p.id) ?? null }))
      .filter(p => p.last_sign_in_at)
      .sort((a, b) =>
        new Date(b.last_sign_in_at!).getTime() - new Date(a.last_sign_in_at!).getTime()
      )[0] ?? null

    const lastSignedInCoach = coaches
      .map(p => ({ ...p, last_sign_in_at: authMap.get(p.id) ?? null }))
      .filter(p => p.last_sign_in_at)
      .sort((a, b) =>
        new Date(b.last_sign_in_at!).getTime() - new Date(a.last_sign_in_at!).getTime()
      )[0] ?? null

    // Active students this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const activeThisWeek = students.filter(p => {
      const lastSignIn = authMap.get(p.id)
      return lastSignIn && new Date(lastSignIn) > weekAgo
    }).length

    // Gamification aggregates
    const progressRows = progressSummaryData ?? []
    const totalXP = progressRows.reduce((sum, r) => sum + (r.total_points ?? 0), 0)
    const avgLevel = progressRows.length > 0
      ? Math.round(progressRows.reduce((sum, r) => sum + (r.level ?? 1), 0) / progressRows.length)
      : 0
    const topRow = [...progressRows].sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0))[0] ?? null
    const topStudentProfile = topRow ? (profilesData ?? []).find(p => p.id === topRow.student_id) ?? null : null
    const topStudent = topStudentProfile
      ? { full_name: topStudentProfile.full_name, total_points: topRow?.total_points ?? 0 }
      : null
    const levelCounts: Record<number, number> = {}
    for (const r of progressRows) {
      const l = r.level ?? 1
      levelCounts[l] = (levelCounts[l] ?? 0) + 1
    }

    // Academy aggregates
    const lpRows = lessonProgressData ?? []
    const completedCount = lpRows.filter(r => r.status === 'completed').length
    const totalAssigned = assignedLessonsCount || 0
    const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0
    const quizScores = lpRows.filter(r => r.quiz_score != null).map(r => r.quiz_score as number)
    const avgQuizScore = quizScores.length > 0
      ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length)
      : null

    return {
      tournamentsCount:       tournamentsCount || 0,
      playersCount:           playersCount || 0,
      recentTournamentsCount: recentTournamentsCount || 0,
      averageRating,
      lastTournament:         lastTournamentData?.[0] ?? null,
      studentsCount:          studentsCount || 0,
      pendingRegistrations:   pendingRegistrations || 0,
      lastSignedInStudent,
      coachesCount:           coachesCount || 0,
      lastSignedInCoach,
      publishedLessons:       publishedLessons || 0,
      lastCompleted,
      activeThisWeek,
      totalXP,
      avgLevel,
      topStudent,
      levelCounts,
      assignedLessonsCount:   totalAssigned,
      completionRate,
      avgQuizScore,
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      tournamentsCount: 0, playersCount: 0, recentTournamentsCount: 0,
      averageRating: 0, lastTournament: null,
      studentsCount: 0, pendingRegistrations: 0, lastSignedInStudent: null,
      coachesCount: 0, lastSignedInCoach: null,
      publishedLessons: 0, lastCompleted: null,
      activeThisWeek: 0,
      totalXP: 0, avgLevel: 0, topStudent: null, levelCounts: {} as Record<number, number>,
      assignedLessonsCount: 0, completionRate: 0, avgQuizScore: null,
    }
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono font-bold tracking-widest uppercase text-muted-foreground mb-4">
      {children}
    </p>
  )
}

function StatsStrip({
  items,
}: {
  items: { label: string; value: string | number }[]
}) {
  return (
    <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
      {items.map((item, i, arr) => (
        <React.Fragment key={item.label}>
          <div>
            <p className="font-mono font-bold text-2xl leading-none tracking-tight text-foreground">
              {item.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{item.label}</p>
          </div>
          {i < arr.length - 1 && (
            <div className="w-px h-6 bg-border hidden sm:block self-center" />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function RecentEntry({
  label,
  name,
  timestamp,
}: {
  label: string
  name: string
  timestamp: string
}) {
  return (
    <div className="flex items-baseline gap-2 mt-3 min-w-0">
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50 flex-shrink-0">
        {label}
      </span>
      <span className="text-border flex-shrink-0 text-[11px]">·</span>
      <span className="text-sm font-medium text-foreground truncate">{name}</span>
      <span className="text-border flex-shrink-0 text-[11px]">·</span>
      <span className="font-mono text-[11px] text-muted-foreground flex-shrink-0">{timestamp}</span>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default async function DashboardOverview() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-8">

      {/* ── LCA Database ──────────────────────────────────────── */}
      <div className="pb-8 border-b border-border/50">
        <SectionLabel>LCA Database</SectionLabel>
        <StatsStrip items={[
          { label: 'Tournaments',  value: stats.tournamentsCount },
          { label: 'Players',      value: stats.playersCount },
          { label: 'Recent (30d)', value: stats.recentTournamentsCount },
          { label: 'Avg Rating',   value: stats.averageRating || '—' },
        ]} />
        {stats.lastTournament && (
          <RecentEntry
            label="Last entry"
            name={stats.lastTournament.tournament_name ?? 'Unknown'}
            timestamp={shortDate(stats.lastTournament.created_at)}
          />
        )}
      </div>

      {/* ── Students ──────────────────────────────────────────── */}
      <div className="pb-8 border-b border-border/50">
        <SectionLabel>Students</SectionLabel>
        <StatsStrip items={[
          { label: 'Students',        value: stats.studentsCount },
          { label: 'Active this week', value: stats.activeThisWeek },
          { label: 'Pending',         value: stats.pendingRegistrations },
        ]} />
        {stats.lastSignedInStudent && (
          <RecentEntry
            label="Last login"
            name={stats.lastSignedInStudent.full_name ?? 'Unknown'}
            timestamp={relativeDate(stats.lastSignedInStudent.last_sign_in_at)}
          />
        )}
      </div>

      {/* ── Coaches ───────────────────────────────────────────── */}
      <div className="pb-8 border-b border-border/50">
        <SectionLabel>Coaches</SectionLabel>
        <StatsStrip items={[
          { label: 'Coaches', value: stats.coachesCount },
        ]} />
        {stats.lastSignedInCoach && (
          <RecentEntry
            label="Last login"
            name={stats.lastSignedInCoach.full_name ?? 'Unknown'}
            timestamp={relativeDate(stats.lastSignedInCoach.last_sign_in_at)}
          />
        )}
      </div>

      {/* ── Lessons ───────────────────────────────────────────── */}
      <div className="pb-8 border-b border-border/50">
        <SectionLabel>Lessons</SectionLabel>
        <StatsStrip items={[
          { label: 'Published', value: stats.publishedLessons },
        ]} />
        {stats.lastCompleted?.student_name && stats.lastCompleted.completed_at && (
          <RecentEntry
            label="Last completed"
            name={stats.lastCompleted.student_name}
            timestamp={relativeDate(stats.lastCompleted.completed_at)}
          />
        )}
      </div>

      {/* ── Gamification ──────────────────────────────────────── */}
      <div className="pb-8 border-b border-border/50">
        <SectionLabel>Gamification</SectionLabel>
        <StatsStrip items={[
          { label: 'Total XP',  value: stats.totalXP.toLocaleString() },
          { label: 'Avg Level', value: stats.avgLevel || '—' },
          { label: 'Top student', value: stats.topStudent
              ? `${stats.topStudent.full_name ?? 'Unknown'} (${stats.topStudent.total_points.toLocaleString()} XP)`
              : '—'
          },
        ]} />
        {Object.keys(stats.levelCounts).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {([1, 2, 3, 4, 5, 6] as LevelNumber[])
              .filter(l => stats.levelCounts[l] != null)
              .map(l => (
                <span
                  key={l}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-foreground/[0.06] border border-border/50 text-xs font-mono"
                >
                  <span className="text-muted-foreground">{LEVEL_NAMES[l]}</span>
                  <span className="font-bold text-foreground">{stats.levelCounts[l]}</span>
                </span>
              ))
            }
          </div>
        )}
      </div>

      {/* ── Academy ───────────────────────────────────────────── */}
      <div>
        <SectionLabel>Academy</SectionLabel>
        <StatsStrip items={[
          { label: 'Assigned',         value: stats.assignedLessonsCount },
          { label: 'Completion rate',  value: stats.completionRate ? `${stats.completionRate}%` : '—' },
          { label: 'Avg quiz score',   value: stats.avgQuizScore != null ? `${stats.avgQuizScore}%` : '—' },
        ]} />
      </div>

    </div>
  )
}
