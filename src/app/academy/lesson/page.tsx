import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import LessonListClient from '@/components/lessons/LessonListClient'
import { getLessonsAssignedToStudent } from '@/repositories/lesson/lessonRepository'

export const metadata = {
  title: 'Lessons - LCA Academy',
  description: 'Manage your lessons',
}

interface LessonItem {
  id: string
  title: string
  description: string | null
  content_type: string
  created_at: string
  created_by: string | null
  creatorName: string
  creatorRole: string | null
  blocks: Array<{ type?: string }> | null
  difficulty: string | null
  lessonStatus?: string
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

  let lessonList: LessonItem[] = []

  if (isStudent) {
    const assignedLessons = await getLessonsAssignedToStudent(user.id)
    lessonList = assignedLessons.map(l => ({
      id:          l.id,
      title:       l.title,
      description: l.description,
      content_type: l.content_type,
      created_at:  l.created_at,
      created_by:  l.created_by,
      creatorName: l.creator_name || 'Unknown',
      creatorRole: l.creator_role,
      blocks:      l.blocks as Array<{ type?: string }> | null,
      difficulty:  l.difficulty ?? null,
    }))
  } else {
    let query = supabase
      .from('lessons')
      .select('id, title, description, content_type, created_at, created_by, creator_name, creator_role, blocks, difficulty')
      .order('created_at', { ascending: false })

    if (!isAdmin) query = query.eq('created_by', user.id)

    const { data: lessons } = await query
    lessonList = (lessons || []).map((l: any) => ({
      id:          l.id,
      title:       l.title,
      description: l.description,
      content_type: l.content_type,
      created_at:  l.created_at,
      created_by:  l.created_by,
      creatorName: l.creator_name || 'Unknown',
      creatorRole: l.creator_role,
      blocks:      l.blocks as Array<{ type?: string }> | null,
      difficulty:  l.difficulty ?? null,
    }))
  }

  // For students: fetch lesson progress + sort To Do first
  let progressMap: Record<string, string> = {}
  if (isStudent && lessonList.length > 0) {
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('lesson_id, status')
      .eq('student_id', user.id)
    progressMap = Object.fromEntries(progress?.map(p => [p.lesson_id, p.status]) || [])

    lessonList = [...lessonList].sort((a, b) => {
      const aCompleted = progressMap[a.id] === 'completed' ? 1 : 0
      const bCompleted = progressMap[b.id] === 'completed' ? 1 : 0
      return aCompleted - bCompleted
    })
  }

  const lessonsWithStatus: LessonItem[] = lessonList.map(l => ({
    ...l,
    lessonStatus: isStudent ? (progressMap[l.id] ?? 'not_started') : undefined,
  }))

  const activeLessonsWithStatus    = isStudent ? lessonsWithStatus.filter(l => l.lessonStatus !== 'completed') : lessonsWithStatus
  const completedLessonsWithStatus = isStudent ? lessonsWithStatus.filter(l => l.lessonStatus === 'completed') : []

  const pageTitle       = isAdmin ? 'All Lessons' : isCoach ? 'My Lessons' : 'My Lessons'
  const pageDescription = isAdmin ? 'All lessons across all coaches'
                        : isCoach ? 'Lessons you have created'
                        :           'Lessons assigned to you'

  return (
    <div className="max-w-6xl mx-auto px-5 py-7">

      {/* Page header */}
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

      {/* Empty state */}
      {lessonList.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-14 text-center">
          <p className="text-sm font-medium text-foreground mb-1">
            {isStudent ? 'No lessons yet' : 'No lessons created yet'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isStudent
              ? "Your coach hasn't assigned any lessons to you yet."
              : isCoach
                ? 'Click "New lesson" above to create your first lesson.'
                : 'No lessons have been created yet.'}
          </p>
          {isAdmin && (
            <Link href="/academy/lesson/add" className="inline-block mt-4">
              <Button size="sm" variant="outline">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create first lesson
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <LessonListClient
          activelessons={activeLessonsWithStatus}
          completedLessons={completedLessonsWithStatus}
          isStudent={isStudent}
          showActions={!isStudent}
        />
      )}
    </div>
  )
}
