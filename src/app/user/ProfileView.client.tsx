'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ExternalLink } from 'lucide-react'
import type { ProfilePageData } from './actions'
import type {
  DashboardLesson,
  GamificationSummary,
  CoachDashboardStudent,
  CoachDashboardLesson,
  UserGame,
} from './actions'
import { OnboardingModal } from '@/components/user/OnboardingModal'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ── Props ────────────────────────────────────────────────────────────────────

interface UserDashboardClientProps extends ProfilePageData {
  dashboardLessons:    { completed: DashboardLesson[]; upcoming: DashboardLesson[] }
  gamificationSummary: GamificationSummary | null
  recentGames:         UserGame[]
  coachData:           { students: CoachDashboardStudent[]; createdLessons: CoachDashboardLesson[] } | null
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d    = new Date(dateStr)
  const now  = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return d.toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })
}

function shortDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function difficultyLabel(d: string | null) {
  if (!d) return null
  return d.charAt(0).toUpperCase() + d.slice(1).toLowerCase()
}

function contentTypeLabel(ct: string) {
  const map: Record<string, string> = {
    puzzle:           'Puzzles',
    study:            'Study',
    interactive_study: 'Interactive',
    block:            'Lesson',
  }
  return map[ct] ?? ct
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  label,
  href,
  hrefLabel = 'View all →',
  children,
}: {
  label:     string
  href?:     string
  hrefLabel?: string
  children:  React.ReactNode
}) {
  return (
    <div className="py-5 border-b border-border last:border-b-0">
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-muted-foreground">
          {label}
        </span>
        {href && (
          <Link
            href={href}
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            {hrefLabel}
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-xs text-muted-foreground/60 py-1">{text}</p>
  )
}

// ── Lesson row ────────────────────────────────────────────────────────────────

function LessonRow({ lesson }: { lesson: DashboardLesson }) {
  const isCompleted  = lesson.status === 'completed'
  const isInProgress = lesson.status === 'in_progress'

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm font-medium text-foreground truncate leading-tight">
        {lesson.title}
      </span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {lesson.difficulty && (
          <span className="text-[10px] text-muted-foreground/70 font-mono">
            {difficultyLabel(lesson.difficulty)}
          </span>
        )}
        {isCompleted && (
          <span className="text-[10px] font-mono font-semibold text-green-600 dark:text-green-500">
            ✓
          </span>
        )}
        {isInProgress && (
          <span
            className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
            title="In progress"
          />
        )}
        {lesson.status === 'not_started' && (
          <span
            className="w-1.5 h-1.5 rounded-full border border-amber-400/70 flex-shrink-0"
            title="Not started"
          />
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function UserDashboardClient({
  user,
  profile,
  playerStats,
  activePlayerData,
  dashboardLessons,
  gamificationSummary,
  recentGames,
  coachData,
}: UserDashboardClientProps) {
  const router = useRouter()
  const [showOnboarding, setShowOnboarding] = useState(!profile?.onboarding_completed)

  const role         = profile?.role ?? null
  const isCoach      = role === 'coach'
  const isAdmin      = role === 'admin'
  const hasAcademyAccess = role === 'student' || role === 'coach' || role === 'admin'
  const memberSince  = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })
    : null
  const hasTournamentData = Boolean(profile?.tournament_fullname)

  // Tournament preview — slice activePlayerData which is already fetched
  const recentTournaments = (activePlayerData ?? [])
    .slice()
    .sort((a, b) => ((b.created_at ?? '') > (a.created_at ?? '') ? 1 : -1))
    .slice(0, 5)

  return (
    <div className="min-h-screen">
      <OnboardingModal
        open={showOnboarding}
        userEmail={user?.email || ''}
        onComplete={() => { setShowOnboarding(false); router.refresh() }}
      />

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="pb-5 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-mono font-bold tracking-tighter text-2xl leading-tight text-foreground">
                {profile?.full_name || user?.email?.split('@')[0] || 'Welcome'}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                <span className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground capitalize">
                  {role}
                </span>
                {memberSince && (
                  <>
                    <span className="text-muted-foreground/30 text-[11px]">·</span>
                    <span className="text-[11px] text-muted-foreground">
                      Member since {memberSince}
                    </span>
                  </>
                )}
                {profile?.chessa_id && (
                  <>
                    <span className="text-muted-foreground/30 text-[11px]">·</span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      #{profile.chessa_id}
                    </span>
                  </>
                )}
              </div>
            </div>
            {playerStats?.latestRating && Number(playerStats.latestRating) > 0 && (
              <div className="text-right flex-shrink-0">
                <p className="font-mono font-bold text-lg leading-none tracking-tight">
                  {playerStats.latestRating}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Rating</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Admin redirect notice ───────────────────────────────────── */}
        {isAdmin && (
          <div className="py-6">
            <p className="text-sm text-muted-foreground mb-3">
              Your admin dashboard has more controls.
            </p>
            <Link
              href="/admin/admin-dashboard"
              className="inline-flex items-center gap-1.5 text-sm font-mono font-semibold tracking-tight hover:underline"
            >
              Go to Admin Dashboard
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* ── Gamification strip ─────────────────────────────────────── */}
        {gamificationSummary && hasAcademyAccess && !isAdmin && (
          <div className="py-4 border-b border-border flex items-center gap-5">
            <div>
              <p className="font-mono font-bold text-base leading-none tracking-tight">
                Lv.{gamificationSummary.level}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Level</p>
            </div>
            <div className="w-px h-6 bg-border" />
            <div>
              <p className="font-mono font-bold text-base leading-none tracking-tight">
                {gamificationSummary.total_points.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Points</p>
            </div>
            {gamificationSummary.current_streak_days > 0 && (
              <>
                <div className="w-px h-6 bg-border" />
                <div>
                  <p className="font-mono font-bold text-base leading-none tracking-tight">
                    {gamificationSummary.current_streak_days}d
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Streak</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Academy — only for users with an assigned role ─────────── */}
        {hasAcademyAccess && !isAdmin && (
          <Section label="Academy" href="/academy" hrefLabel="Open →">
            {dashboardLessons.upcoming.length === 0 && dashboardLessons.completed.length === 0 ? (
              <EmptyState text="No lessons assigned yet." />
            ) : (
              <div className="divide-y divide-border/50">
                {/* Upcoming / in-progress first */}
                {dashboardLessons.upcoming.map(lesson => (
                  <LessonRow key={lesson.id} lesson={lesson} />
                ))}
                {/* Then most recently completed */}
                {dashboardLessons.completed.map(lesson => (
                  <LessonRow key={lesson.id} lesson={lesson} />
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── Tournaments ────────────────────────────────────────────── */}
        {hasTournamentData && (
          <Section label="Tournaments" href="/user/tournaments" hrefLabel="View all →">
            {recentTournaments.length === 0 ? (
              <EmptyState text="No tournament data found." />
            ) : (
              <div className="divide-y divide-border/50">
                {recentTournaments.map((t, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="text-sm font-medium text-foreground truncate leading-tight">
                      {t.tournament_name || 'Unknown Tournament'}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(t.RATING || t.player_rating) && (
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {t.RATING || t.player_rating}
                        </span>
                      )}
                      {t.created_at && (
                        <span className="text-[10px] text-muted-foreground/60">
                          {shortDate(t.created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── Recent Games ───────────────────────────────────────────── */}
        {hasTournamentData && (
          <Section label="Recent Games" href="/user/tournaments" hrefLabel="View all →">
            {recentGames.length === 0 ? (
              <EmptyState text="No games found." />
            ) : (
              <div className="divide-y divide-border/50">
                {recentGames.map(game => {
                  const isWhite = (game.white ?? '')
                    .toLowerCase()
                    .includes((profile?.tournament_fullname ?? '').toLowerCase().split(' ')[0])
                  return (
                    <div key={game.id} className="flex items-center justify-between gap-3 py-1.5">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground leading-tight truncate block">
                          {game.white} <span className="text-muted-foreground font-normal">vs</span> {game.black}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate block">
                          {game.tournament}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn(
                          'text-[11px] font-mono font-semibold',
                          game.result === '1-0' && isWhite  && 'text-green-600 dark:text-green-500',
                          game.result === '0-1' && !isWhite && 'text-green-600 dark:text-green-500',
                          game.result === '1/2-1/2'         && 'text-amber-500',
                          !['1-0','0-1','1/2-1/2'].includes(game.result ?? '') && 'text-muted-foreground',
                        )}>
                          {game.result || '—'}
                        </span>
                        {game.created_at && (
                          <span className="text-[10px] text-muted-foreground/60">
                            {relativeDate(game.created_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>
        )}

        {/* ── Coach: My Students ─────────────────────────────────────── */}
        {isCoach && coachData && (
          <Section label="My Students" href="/academy/students" hrefLabel="View all →">
            {coachData.students.length === 0 ? (
              <EmptyState text="No students assigned yet." />
            ) : (
              <div className="divide-y divide-border/50">
                {coachData.students.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="text-sm font-medium text-foreground truncate">
                      {s.full_name || 'Unnamed student'}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0 text-[10px] text-muted-foreground">
                      <span className="font-mono">{s.lessons_completed} done</span>
                      {s.last_active_at && (
                        <>
                          <span className="text-border">·</span>
                          <span>{relativeDate(s.last_active_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── Coach: Lessons Created ─────────────────────────────────── */}
        {isCoach && coachData && (
          <Section label="Lessons Created" href="/academy/lesson/add" hrefLabel="Create new →">
            {coachData.createdLessons.length === 0 ? (
              <EmptyState text="No lessons created yet." />
            ) : (
              <div className="divide-y divide-border/50">
                {coachData.createdLessons.map(l => (
                  <div key={l.id} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="text-sm font-medium text-foreground truncate">
                      {l.title}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px] text-muted-foreground font-mono">
                      {l.difficulty && (
                        <span>{difficultyLabel(l.difficulty)}</span>
                      )}
                      <span className="text-border">·</span>
                      <span>{contentTypeLabel(l.content_type)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        )}

        {/* ── Profile edit link ──────────────────────────────────────── */}
        <div className="pt-5">
          <Link
            href="/user/profile"
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            Edit profile →
          </Link>
        </div>

      </div>
    </div>
  )
}
