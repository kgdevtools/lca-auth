'use client'

import Link from 'next/link'
import { motion, type Variants } from 'framer-motion'
import { LEVEL_NAMES, type LevelNumber } from '@/lib/constants/achievements'
import type { Profile } from '@/utils/auth/academyAuth'

// ── Level display data ────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500] as const
const LEVEL_PIECES: Record<number, string> = {
  1: '♙', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚',
}

// ── Animation variants ────────────────────────────────────────────────────────

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } },
}
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0 },
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface GamificationData {
  totalPoints: number
  level: number
  currentStreak: number
  lessonsCompleted: number
}

interface LessonSummaryData {
  totalAssigned: number
  completed: number
  inProgress: number
  inProgressLessons: { id: string; title: string; lastAccessed: string | null }[]
  recentlyCompleted: { id: string; title: string; completedAt: string | null; quizScore: number | null }[]
}

interface StudentSummaryRow {
  id: string
  full_name: string | null
  lessonsCompleted: number
  totalPoints: number
  level: number
}

interface AcademyDashboardClientProps {
  profile: Profile
  userEmail: string
  gamification: GamificationData | null
  coachName: string | null
  coachAssigned: boolean
  lessonSummary: LessonSummaryData | null
  playerRating: string | null
  playerFed: string | null
  coachStudentsCount: number
  coachStudentsSummary: StudentSummaryRow[]
  totalStudentsCount: number
  totalCoachesCount: number
}

// ── Root component ────────────────────────────────────────────────────────────

export default function AcademyDashboardClient({
  profile,
  userEmail,
  gamification,
  coachName,
  coachAssigned,
  lessonSummary,
  playerRating,
  playerFed,
  coachStudentsCount,
  coachStudentsSummary,
  totalStudentsCount,
  totalCoachesCount,
}: AcademyDashboardClientProps) {
  const firstName   = profile.full_name?.split(' ')[0] ?? 'there'
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'short', year: 'numeric',
  })

  const hasTournamentProfile = !!(profile.chessa_id || profile.tournament_fullname)

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        transition={{ duration: 0.25 }}
        className="space-y-8"
      >

        {/* ── Header + coach (shared 2-col grid aligns with profile row below) ── */}
        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <div className="grid gap-6 sm:grid-cols-2">

            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Limpopo Chess Academy
              </p>
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome back, {firstName}
              </h1>
            </div>

            {/* Right column — coach info for students, empty otherwise */}
            {profile.role === 'student' && (
              <div className="sm:text-right">
                {coachAssigned ? (
                  <>
                    <p className="font-semibold tracking-tight">{coachName ?? 'Assigned'}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Your coach</p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">No coach assigned</p>
                    <MotionLink
                      href="/forms/register-player"
                      className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                    >
                      Join the academy →
                    </MotionLink>
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Profile row (same 2-col grid) ────────────────────────────────── */}
        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <div className="grid gap-6 sm:grid-cols-2">

            {/* Left — Profile */}
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-3">Profile</p>
              <div className="space-y-1">
                <p className="font-semibold tracking-tight">{profile.full_name ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] uppercase tracking-wide border border-border rounded px-1.5 py-0.5">
                    {profile.role}
                  </span>
                  <span className="text-[10px] text-muted-foreground">Since {memberSince}</span>
                </div>
              </div>
            </div>

            {/* Right — Tournament profile (right-aligned, mirrors coach column above) */}
            <div className="sm:text-right">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-3">
                Tournament Profile
              </p>

              {hasTournamentProfile ? (
                <div className="space-y-1">
                  {profile.full_name && (
                    <p className="font-medium tracking-tight text-sm leading-snug">
                      {profile.full_name}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 sm:justify-end mt-1">
                    {profile.chessa_id && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        CHESSA {profile.chessa_id}
                      </span>
                    )}
                    {playerRating && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        RTG {playerRating}
                      </span>
                    )}
                    {playerFed && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        FED {playerFed}
                      </span>
                    )}
                  </div>
                  <MotionLink
                    href="/user/profile"
                    className="inline-block mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
                  >
                    Edit
                  </MotionLink>
                </div>
              ) : profile.role === 'student' ? (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Not linked.{' '}
                  <MotionLink
                    href="/user/profile"
                    className="underline underline-offset-2 hover:text-foreground transition-colors"
                  >
                    Connect your CHESSA profile
                  </MotionLink>{' '}
                  to show your rating and federation.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>

          </div>
        </motion.div>

        {/* ── Divider ──────────────────────────────────────────────────────── */}
        <motion.div variants={fadeUp} transition={{ duration: 0.25 }}>
          <div className="h-px bg-border" />
        </motion.div>

        {/* ── Role-specific sections ───────────────────────────────────────── */}
        {profile.role === 'student' && (
          <StudentSection gamification={gamification} lessonSummary={lessonSummary} />
        )}
        {profile.role === 'coach' && (
          <CoachSection studentsCount={coachStudentsCount} studentsSummary={coachStudentsSummary} />
        )}
        {profile.role === 'admin' && (
          <AdminSection studentsCount={totalStudentsCount} coachesCount={totalCoachesCount} />
        )}

      </motion.div>
    </div>
  )
}

// ── Student section ───────────────────────────────────────────────────────────

function StudentSection({
  gamification,
  lessonSummary,
}: {
  gamification: GamificationData | null
  lessonSummary: LessonSummaryData | null
}) {
  const level       = gamification?.level       ?? 1
  const totalPoints = gamification?.totalPoints ?? 0
  const streak      = gamification?.currentStreak ?? 0

  const levelName     = LEVEL_NAMES[level as LevelNumber]                              ?? 'Pawn'
  const levelPiece    = LEVEL_PIECES[level]                                             ?? '♙'
  const nextLevelName = level < 6 ? (LEVEL_NAMES[Math.min(level + 1, 6) as LevelNumber] ?? null) : null
  const currentMin    = LEVEL_THRESHOLDS[level - 1]                                    ?? 0
  const nextThreshold = level < 6 ? (LEVEL_THRESHOLDS[level] ?? null)                 : null
  const barPct        = nextThreshold
    ? Math.min(Math.round(((totalPoints - currentMin) / (nextThreshold - currentMin)) * 100), 100)
    : 100

  const hasLessons = lessonSummary && lessonSummary.totalAssigned > 0
  const hasInProgress = (lessonSummary?.inProgressLessons.length ?? 0) > 0
  const hasCompleted  = (lessonSummary?.recentlyCompleted.length ?? 0) > 0

  return (
    <motion.div variants={fadeUp} transition={{ duration: 0.25 }} className="space-y-10">

      {/* Lessons */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-4">Lessons</p>

        {hasLessons ? (
          <div className="space-y-6">

            {/* In Progress */}
            {hasInProgress && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">In Progress</p>
                <div className="space-y-px">
                  {lessonSummary!.inProgressLessons.map(lesson => (
                    <motion.div key={lesson.id} whileTap={{ scale: 0.98 }}>
                      <Link
                        href={`/academy/lesson/${lesson.id}`}
                        className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg hover:bg-muted/60 active:bg-muted transition-colors group"
                      >
                        <p className="text-sm font-medium tracking-tight line-clamp-1 group-hover:text-foreground">
                          {lesson.title}
                        </p>
                        <span className="text-muted-foreground text-xs ml-4 shrink-0 group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Recently Completed */}
            {hasCompleted && (
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Recently Completed</p>
                <div className="space-y-px">
                  {lessonSummary!.recentlyCompleted.map(lesson => (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-lg"
                    >
                      <p className="text-sm font-medium tracking-tight line-clamp-1">
                        {lesson.title}
                      </p>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        {lesson.quizScore != null && (
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            {lesson.quizScore}%
                          </span>
                        )}
                        {lesson.completedAt && (
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {new Date(lesson.completedAt).toLocaleDateString('en-GB', {
                              day: '2-digit', month: 'short',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Counts summary */}
            {!hasInProgress && !hasCompleted && (
              <MotionLink
                href="/academy/lesson"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {lessonSummary!.totalAssigned} lesson{lessonSummary!.totalAssigned !== 1 ? 's' : ''} assigned — start one →
              </MotionLink>
            )}

          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No lessons assigned yet.</p>
        )}
      </div>

      {/* Academy Progress */}
      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-4">Academy Progress</p>

        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-xl leading-none">{levelPiece}</span>
            <span className="font-semibold tracking-tight">{levelName}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground ml-auto">
              Level {level}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="h-[3px] rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-700 ease-out"
                style={{ width: `${barPct}%` }}
              />
            </div>
            {nextLevelName && nextThreshold ? (
              <p className="text-[10px] text-muted-foreground tabular-nums">
                {totalPoints} / {nextThreshold} pts to {nextLevelName}
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground">Maximum level reached</p>
            )}
          </div>

          <div className="flex gap-6 pt-1">
            <Stat label="Points" value={totalPoints} />
            <Stat label="Streak" value={streak > 0 ? `${streak}d` : '—'} />
          </div>
        </div>
      </div>

    </motion.div>
  )
}

// ── Coach section ─────────────────────────────────────────────────────────────

function CoachSection({
  studentsCount,
  studentsSummary,
}: {
  studentsCount: number
  studentsSummary: StudentSummaryRow[]
}) {
  return (
    <motion.div variants={fadeUp} transition={{ duration: 0.25 }} className="space-y-10">

      <div>
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Students</p>
          {studentsCount > 0 && (
            <MotionLink
              href="/academy/students"
              className="text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
            >
              View all ({studentsCount}) →
            </MotionLink>
          )}
        </div>

        {studentsSummary.length > 0 ? (
          <div>
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 pb-2 border-b border-border">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Name</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground text-right w-14">Lessons</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground text-right w-10">Pts</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground text-right w-8">Lvl</p>
            </div>

            {studentsSummary.map(student => (
              <motion.div key={student.id} whileTap={{ scale: 0.995 }}>
                <Link
                  href={`/academy/students/${student.id}`}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/50 -mx-3 px-3 rounded-lg transition-colors group"
                >
                  <p className="text-sm font-medium tracking-tight truncate group-hover:text-foreground">
                    {student.full_name ?? '—'}
                  </p>
                  <p className="text-sm tabular-nums text-right w-14 text-muted-foreground group-hover:text-foreground">
                    {student.lessonsCompleted}
                  </p>
                  <p className="text-sm tabular-nums text-right w-10 text-muted-foreground group-hover:text-foreground">
                    {student.totalPoints}
                  </p>
                  <p className="text-sm text-right w-8">
                    {LEVEL_PIECES[student.level] ?? '♙'}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No students assigned yet.</p>
        )}
      </div>

    </motion.div>
  )
}

// ── Admin section ─────────────────────────────────────────────────────────────

function AdminSection({
  studentsCount,
  coachesCount,
}: {
  studentsCount: number
  coachesCount: number
}) {
  const links = [
    { href: '/admin',              label: 'Admin Dashboard' },
    { href: '/academy/students',   label: 'Students' },
    { href: '/academy/lesson',     label: 'Lessons' },
    { href: '/academy/lesson/add', label: 'Add Lesson' },
  ]

  return (
    <motion.div variants={fadeUp} transition={{ duration: 0.25 }} className="space-y-10">

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-4">Platform</p>
        <div className="flex gap-8">
          <Stat label="Students" value={studentsCount} />
          <Stat label="Coaches"  value={coachesCount}  />
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-2">Quick Access</p>
        <div className="divide-y divide-border">
          {links.map(link => (
            <motion.div key={link.href} whileTap={{ scale: 0.99 }}>
              <Link
                href={link.href}
                className="flex items-center justify-between py-2.5 text-sm font-medium hover:text-muted-foreground hover:bg-muted/40 -mx-3 px-3 rounded-lg transition-colors group"
              >
                {link.label}
                <span className="text-muted-foreground text-xs group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

    </motion.div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-bold tabular-nums tracking-tight text-lg leading-tight">{value}</p>
    </div>
  )
}

function MotionLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <motion.span whileTap={{ scale: 0.97 }} className="inline-block">
      <Link href={href} className={className}>
        {children}
      </Link>
    </motion.span>
  )
}
