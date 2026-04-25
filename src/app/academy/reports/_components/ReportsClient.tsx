'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { StudentWithProgress, StudentLessonProgress, CoachFeedbackRow } from '@/repositories/lesson/studentRepository'
import FeedbackForm from '@/components/academy/FeedbackForm'
import StudentProgressTable from '@/components/academy/StudentProgressTable'
import LessonCentricReport from '@/components/academy/LessonCentricReport'

interface LessonOption {
  id: string
  title: string
  difficulty: string | null
  content_type: string
}

interface StudentLessonsData {
  lessons: StudentLessonProgress[]
  feedback: CoachFeedbackRow[]
}

interface GamificationSummary {
  totalPoints:      number
  level:            number
  levelName:        string
  currentStreak:    number
  longestStreak:    number
  lessonsCompleted: number
  achievements:     { key: string; name: string; icon: string; earnedAt: string }[]
}

interface ReportsClientProps {
  role: 'coach' | 'admin' | 'student'
  students?: StudentWithProgress[]
  lessons?: LessonOption[]
  isAdmin?: boolean
  selfProgress?: {
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
  }
  gamification?: GamificationSummary | null
  studentLessonsData?: Record<string, StudentLessonsData>
}

type Tab = 'by-student' | 'by-lesson'

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  return `${(seconds / 3600).toFixed(1)}h`
}

export default function ReportsClient({
  role,
  students = [],
  lessons = [],
  isAdmin,
  selfProgress,
  gamification,
  studentLessonsData = {},
}: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('by-student')
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [showFeedbackForm, setShowFeedbackForm] = useState(false)

  const selectedStudent = useMemo(
    () => students.find(s => s.id === selectedStudentId),
    [students, selectedStudentId]
  )

  if (role === 'student' && selfProgress) {
    return <StudentView selfProgress={selfProgress} gamification={gamification} />
  }

  return (
    <div className="max-w-5xl mx-auto px-5 py-7">
      <div className="mb-7">
        <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
          Reports
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isAdmin ? 'All students across all coaches' : 'Students assigned to you'}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 border-b border-border">
        {(['by-student', 'by-lesson'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setSelectedStudentId(''); setShowFeedbackForm(false) }}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab === 'by-student' ? 'By Student' : 'By Lesson'}
          </button>
        ))}
      </div>

      {activeTab === 'by-student' ? (
        <StudentCentricView
          students={students}
          selectedStudentId={selectedStudentId}
          onSelectStudent={setSelectedStudentId}
          showFeedbackForm={showFeedbackForm}
          setShowFeedbackForm={setShowFeedbackForm}
          studentLessonsData={studentLessonsData}
        />
      ) : (
        <LessonCentricView lessons={lessons} />
      )}
    </div>
  )
}

function StudentCentricView({
  students,
  selectedStudentId,
  onSelectStudent,
  showFeedbackForm,
  setShowFeedbackForm,
  studentLessonsData = {},
}: {
  students: StudentWithProgress[]
  selectedStudentId: string
  onSelectStudent: (id: string) => void
  showFeedbackForm: boolean
  setShowFeedbackForm: (show: boolean) => void
  studentLessonsData?: Record<string, StudentLessonsData>
}) {
  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const studentData = selectedStudentId ? studentLessonsData[selectedStudentId] : null

  if (!selectedStudentId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <select
            value=""
            onChange={e => onSelectStudent(e.target.value)}
            className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 appearance-none"
          >
            <option value="">Select a student…</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>{s.full_name ?? 'Unnamed'}</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-border bg-card px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">Select a student to view their progress.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Student selector */}
      <div className="flex items-center gap-3">
        <select
          value={selectedStudentId}
          onChange={e => { onSelectStudent(e.target.value); setShowFeedbackForm(false) }}
          className="flex-1 h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-foreground/20 appearance-none"
        >
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.full_name ?? 'Unnamed'}</option>
          ))}
        </select>
        <button
          onClick={() => setShowFeedbackForm(!showFeedbackForm)}
          className="px-3 py-1.5 rounded text-xs font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors"
        >
          {showFeedbackForm ? 'Cancel' : 'Write feedback'}
        </button>
      </div>

      {/* Stats */}
      {selectedStudent && (
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Lessons</p>
            <p className="text-2xl font-bold tracking-tight">{selectedStudent.lessons_assigned}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Completed</p>
            <p className="text-2xl font-bold tracking-tight text-emerald-600">{selectedStudent.lessons_completed}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">In Progress</p>
            <p className="text-2xl font-bold tracking-tight text-amber-600">{selectedStudent.lessons_in_progress}</p>
          </div>
          <div className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Points</p>
            <p className="text-2xl font-bold tracking-tight">{selectedStudent.points}</p>
          </div>
        </div>
      )}

      {/* Feedback form */}
      {showFeedbackForm && selectedStudent && (
        <FeedbackForm
          coachId=""
          studentId={selectedStudentId}
          studentName={selectedStudent.full_name ?? 'Student'}
          lessons={studentData?.lessons?.map(l => ({ id: l.lesson_id, title: l.lesson_title })) ?? []}
          onSuccess={() => setShowFeedbackForm(false)}
          onCancel={() => setShowFeedbackForm(false)}
        />
      )}

      {/* Lessons table */}
      {studentData?.lessons && studentData.lessons.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Lessons</h3>
          <StudentProgressTable rows={studentData.lessons} showPoints />
        </div>
      )}

      {/* Feedback history */}
      {studentData?.feedback && studentData.feedback.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground mb-3">Feedback History</h3>
          <div className="space-y-2">
            {studentData.feedback.map(item => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    {item.lesson_title && (
                      <p className="text-xs font-medium text-foreground mb-1">{item.lesson_title}</p>
                    )}
                    <p className="text-sm text-foreground/80">{item.feedback_text}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {item.rating != null && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <span key={i} className={cn('text-xs', i <= item.rating! ? 'text-amber-500' : 'text-muted-foreground/30')}>★</span>
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LessonCentricView({ lessons }: { lessons: LessonOption[] }) {
  return <LessonCentricReport lessons={lessons} progressByLesson={{}} />
}

const LEVEL_PIECES: Record<number, string> = { 1: '♙', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' }

function StudentView({
  selfProgress,
  gamification,
}: {
  selfProgress: {
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
  }
  gamification?: GamificationSummary | null
}) {
  const { lessons, stats, feedback } = selfProgress

  return (
    <div className="max-w-5xl mx-auto px-5 py-7">
      <div className="mb-7">
        <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
          My Progress
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your lesson progress and feedback
        </p>
      </div>

      {/* Gamification row */}
      {gamification && (
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted border border-border">
            <span className="text-base leading-none">{LEVEL_PIECES[gamification.level] ?? '♙'}</span>
            <span className="text-xs font-semibold text-foreground tracking-tight">
              {gamification.levelName}
            </span>
            <span className="text-[10px] text-muted-foreground ml-0.5">Lv.{gamification.level}</span>
          </div>
          <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <span className="text-amber-500">🔥</span>
            <span className="font-semibold text-foreground">{gamification.currentStreak}</span>
            <span>day streak</span>
          </div>
          {gamification.longestStreak > 0 && (
            <div className="text-xs text-muted-foreground">
              Best: <span className="font-medium text-foreground">{gamification.longestStreak}d</span>
            </div>
          )}
          {gamification.achievements.length > 0 && (
            <div className="text-xs text-muted-foreground ml-auto">
              <span className="font-medium text-foreground">{gamification.achievements.length}</span> achievement{gamification.achievements.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}

      {/* Achievements shelf */}
      {gamification && gamification.achievements.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {gamification.achievements.map(a => (
            <div
              key={a.key}
              title={new Date(a.earnedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted border border-border text-xs font-medium text-foreground"
            >
              <span className="text-sm leading-none">{a.icon}</span>
              {a.name}
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-7">
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Total Lessons</p>
          <p className="text-2xl font-bold tracking-tight">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Completed</p>
          <p className="text-2xl font-bold tracking-tight text-emerald-600">{stats.completed}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">In Progress</p>
          <p className="text-2xl font-bold tracking-tight text-amber-600">{stats.in_progress}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Points</p>
          <p className="text-2xl font-bold tracking-tight">{stats.points}</p>
        </div>
      </div>

      {/* Lessons */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold tracking-tight text-foreground mb-3">Lessons</h2>
        <StudentProgressTable rows={lessons} showPoints />
      </div>

      {/* Feedback */}
      <div>
        <h2 className="text-sm font-semibold tracking-tight text-foreground mb-3">Feedback</h2>
        {feedback.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No feedback yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {feedback.map(item => (
              <div key={item.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    {item.lesson_title && (
                      <p className="text-xs font-medium text-foreground mb-1">{item.lesson_title}</p>
                    )}
                    <p className="text-sm text-foreground/80">{item.feedback_text}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {item.rating != null && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map(i => (
                          <span key={i} className={cn('text-xs', i <= item.rating! ? 'text-amber-500' : 'text-muted-foreground/30')}>★</span>
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}