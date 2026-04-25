import { redirect } from 'next/navigation'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { getPublished } from '@/services/lesson/lessonService'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lessons',
  description: 'Browse chess lessons',
}

const CONTENT_TYPE_LABEL: Record<string, string> = {
  puzzle:            'Puzzles',
  study:             'Study',
  interactive_study: 'Interactive',
  block:             'Lesson',
}

export default async function LessonsPage() {
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) redirect('/login')

  const lessons = await getPublished()

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="pb-5 border-b border-border flex items-baseline justify-between">
          <h1 className="font-mono font-bold tracking-tighter text-2xl leading-tight text-foreground">
            Lessons
          </h1>
          {(profile.role === 'coach' || profile.role === 'admin') && (
            <Link
              href="/academy/lesson/add"
              className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Create new →
            </Link>
          )}
        </div>

        {lessons.length === 0 ? (
          <div className="py-8">
            <p className="text-sm text-muted-foreground">No lessons available yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/50 mt-1">
            {lessons.map((lesson: any) => (
              <Link
                key={lesson.id}
                href={`/academy/lesson/${lesson.id}`}
                className="flex items-center justify-between gap-3 py-3 group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:underline leading-tight truncate">
                    {lesson.title}
                  </p>
                  {lesson.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {lesson.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 text-[10px] font-mono text-muted-foreground">
                  {lesson.difficulty && (
                    <span className="capitalize">{lesson.difficulty}</span>
                  )}
                  {lesson.content_type && CONTENT_TYPE_LABEL[lesson.content_type] && (
                    <>
                      <span className="text-border">·</span>
                      <span>{CONTENT_TYPE_LABEL[lesson.content_type]}</span>
                    </>
                  )}
                  {lesson.estimated_duration_minutes && (
                    <>
                      <span className="text-border">·</span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {lesson.estimated_duration_minutes}m
                      </span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
