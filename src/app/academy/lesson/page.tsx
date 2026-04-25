import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import LessonCard from '@/components/lessons/LessonCard'
import { getLessonsAssignedToStudent } from '@/repositories/lesson/lessonRepository'

export const metadata = {
  title: 'Lessons - LCA Academy',
  description: 'Manage your lessons',
}

interface Lesson {
  id: string
  title: string
  description: string | null
  slug: string
  content_type: string
  created_at: string
  created_by: string | null
  creator_name: string | null
  creator_role: string | null
  blocks: Array<{ type?: string }> | null
  difficulty: string | null
}

export default async function AcademyLessonsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .single()

  const isAdmin   = profile?.role === 'admin'
  const isCoach   = profile?.role === 'coach'
  const isStudent = profile?.role === 'student'

  let lessonList: Lesson[] = []

  if (isStudent) {
    const assignedLessons = await getLessonsAssignedToStudent(user.id)
    lessonList = assignedLessons.map(l => ({
      id:           l.id,
      title:        l.title,
      description:  l.description,
      slug:         l.slug,
      content_type: l.content_type,
      created_at:   l.created_at,
      created_by:   l.created_by,
      creator_name: l.creator_name,
      creator_role: l.creator_role,
      blocks:       l.blocks as Array<{ type?: string }> | null,
      difficulty:   l.difficulty ?? null,
    }))
  } else {
    let query = supabase
      .from('lessons')
      .select('id, title, description, slug, content_type, created_at, created_by, creator_name, creator_role, blocks, difficulty')
      .order('created_at', { ascending: false })

    if (!isAdmin) query = query.eq('created_by', user.id)

    const { data: lessons } = await query
    lessonList = (lessons || []).map((l: any) => ({ ...l, difficulty: l.difficulty ?? null }))
  }

  // For students: fetch lesson completion status + sort To Do first
  let progressMap = new Map<string, string>()
  if (isStudent && lessonList.length > 0) {
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('lesson_id, status')
      .eq('student_id', user.id)
    progressMap = new Map(progress?.map(p => [p.lesson_id, p.status]) || [])

    const order = (id: string) => progressMap.get(id) === 'completed' ? 1 : 0
    lessonList = [...lessonList].sort((a, b) => order(a.id) - order(b.id))
  }

  const pageTitle       = isAdmin ? 'All Lessons' : isCoach ? 'My Lessons' : 'My Lessons'
  const pageDescription = isAdmin ? 'All lessons across all coaches'
                        : isCoach ? 'Lessons you have created'
                        :           'Lessons assigned to you'

  return (
    <div className="max-w-6xl mx-auto px-5 py-7">

      {/* ── Page header ── */}
      <div className="flex items-end justify-between mb-7 gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
            {pageTitle}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pageDescription}
            {lessonList.length > 0 && (
              <span className="ml-2 font-medium text-foreground/60">
                · {lessonList.length} {lessonList.length === 1 ? 'lesson' : 'lessons'}
              </span>
            )}
          </p>
        </div>

        {!isStudent && (
          <Link href="/academy/lesson/add">
            <Button size="sm" className="flex items-center gap-1.5 flex-shrink-0">
              <Plus className="w-3.5 h-3.5" />
              New lesson
            </Button>
          </Link>
        )}
      </div>

      {/* ── Empty state ── */}
      {lessonList.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-14 text-center">
          <p className="text-sm font-medium text-foreground mb-1">
            {isStudent ? 'No lessons yet' : 'No lessons created yet'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isStudent
              ? "Your coach hasn't assigned any lessons to you yet."
              : 'Click "New lesson" above to create your first lesson.'}
          </p>
          {!isStudent && (
            <Link href="/academy/lesson/add" className="inline-block mt-4">
              <Button size="sm" variant="outline">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create first lesson
              </Button>
            </Link>
          )}
        </div>
      ) : (() => {
        const activeLessons    = isStudent ? lessonList.filter(l => progressMap.get(l.id) !== 'completed') : lessonList
        const completedLessons = isStudent ? lessonList.filter(l => progressMap.get(l.id) === 'completed') : []

        const cardProps = (lesson: Lesson) => ({
          id:           lesson.id,
          title:        lesson.title,
          description:  lesson.description,
          content_type: lesson.content_type,
          created_at:   lesson.created_at,
          created_by:   lesson.created_by || '',
          creatorName:  lesson.creator_name || 'Unknown',
          creatorRole:  lesson.creator_role || '',
          blocks:       lesson.blocks,
          difficulty:   lesson.difficulty,
          showActions:  !isStudent,
          lessonStatus: isStudent ? (progressMap.get(lesson.id) ?? 'not_started') : undefined,
        })

        return (
          <div className="space-y-6">
            {/* Active lessons grid */}
            {activeLessons.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeLessons.map(lesson => (
                  <LessonCard key={lesson.id} {...cardProps(lesson)} />
                ))}
              </div>
            )}

            {/* Completed lessons list */}
            {completedLessons.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/50 mb-2">
                  Completed · {completedLessons.length}
                </p>
                <div className="flex flex-col gap-1.5">
                  {completedLessons.map(lesson => (
                    <LessonCard key={lesson.id} {...cardProps(lesson)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
