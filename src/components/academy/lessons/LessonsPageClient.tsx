'use client'

import { useEffect, useState } from 'react'
import { getPublishedLessons, getAllCategories } from '@/services/lessonService'
import { getAllProgress } from '@/services/progressService'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressOverview } from '@/components/academy/ProgressOverview'
import { 
  BookOpen, Clock, ChevronRight, CheckCircle2, 
  Trophy, Target, Timer, FileText, Video, HelpCircle, 
  Puzzle as PuzzleIcon, Layers, Gamepad2
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function getDifficultyColor(difficulty: string | null) {
  switch (difficulty) {
    case 'beginner': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    case 'intermediate': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
    case 'advanced': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300'
  }
}

function getContentTypeIcon(contentType: string) {
  switch (contentType) {
    case 'video': return <Video className="w-4 h-4 text-sky-600" />
    case 'quiz': return <HelpCircle className="w-4 h-4 text-purple-600" />
    case 'puzzle': return <PuzzleIcon className="w-4 h-4 text-amber-600" />
    case 'pgn': return <Gamepad2 className="w-4 h-4 text-indigo-600" />
    case 'mixed': return <Layers className="w-4 h-4 text-emerald-600" />
    default: return <FileText className="w-4 h-4 text-slate-600" />
  }
}

interface Lesson {
  id: string
  title: string
  slug: string
  description: string | null
  content_type: string
  difficulty: string | null
  estimated_duration_minutes: number | null
  published: boolean
  category?: { name: string } | null
}

interface ProgressData {
  lesson_id: string
  status: string
  quiz_score?: number
  time_spent_seconds?: number
  attempts?: number
}

export default function LessonsPageClient({
  initialLessons,
  initialCategories,
  initialProgress
}: {
  initialLessons: Lesson[]
  initialCategories: any[]
  initialProgress: ProgressData[]
}) {
  const [mounted, setMounted] = useState(false)
  const [lessons, setLessons] = useState(initialLessons)
  const [progressMap, setProgressMap] = useState<Map<string, ProgressData>>(new Map())

  useEffect(() => {
    setMounted(true)
    const map = new Map(initialProgress.map(p => [p.lesson_id, p]))
    setProgressMap(map)
  }, [initialProgress])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Group lessons by category
  const lessonsByCategory = lessons.reduce((acc, lesson) => {
    const categoryId = (lesson as any).category_id || 'uncategorized'
    if (!acc[categoryId]) acc[categoryId] = []
    acc[categoryId].push(lesson)
    return acc
  }, {} as Record<string, Lesson[]>)

  return (
    <div className="container mx-auto px-3 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Your Learning Journey
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 tracking-tight mt-1">
          {lessons.length} lessons available • {initialProgress.filter(p => p.status === 'completed').length} completed
        </p>
      </div>

      {/* Progress Overview */}
      <div className="mb-6">
        <ProgressOverview />
      </div>

      {/* Lessons */}
      {lessons.length === 0 ? (
        <Card className="border-0 bg-white dark:bg-slate-900/50 shadow-sm rounded-sm">
          <CardContent className="py-12 text-center">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-1">
              No Lessons Yet
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Check back soon for chess training content!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Categorized Lessons */}
          {initialCategories.map((category) => {
            const categoryLessons = lessonsByCategory[category.id]
            if (!categoryLessons?.length) return null
            return (
              <div key={category.id}>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {category.name}
                  </h2>
                  <Badge variant="outline" className="text-[10px]">{categoryLessons.length}</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryLessons.map(lesson => (
                    <LessonCard 
                      key={lesson.id} 
                      lesson={lesson} 
                      progress={progressMap.get(lesson.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Uncategorized */}
          {lessonsByCategory['uncategorized']?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                  Other Lessons
                </h2>
                <Badge variant="outline" className="text-[10px]">{lessonsByCategory['uncategorized'].length}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lessonsByCategory['uncategorized'].map(lesson => (
                  <LessonCard 
                    key={lesson.id} 
                    lesson={lesson} 
                    progress={progressMap.get(lesson.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LessonCard({ lesson, progress }: { lesson: Lesson; progress?: ProgressData }) {
  const isCompleted = progress?.status === 'completed'
  const isInProgress = progress?.status === 'in_progress'
  const hasQuizScore = progress?.quiz_score !== null && progress?.quiz_score !== undefined

  return (
    <Link href={`/academy/lessons/${lesson.slug}`} className="block">
      <div className="group relative h-full bg-white dark:bg-slate-900/50 border-0 shadow-sm rounded-sm p-4 transition-all duration-200 hover:shadow-md hover:border-sky-200 dark:hover:border-sky-800">
        {/* Status indicators */}
        {isCompleted && (
          <div className="absolute top-3 right-3">
            <div className="bg-green-500 text-white rounded-full p-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
        )}
        {isInProgress && !isCompleted && (
          <div className="absolute top-3 right-3">
            <Badge className="bg-sky-500 text-white text-[10px]">In Progress</Badge>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {getContentTypeIcon(lesson.content_type)}
            <Badge variant="outline" className="text-[10px] capitalize">
              {lesson.content_type}
            </Badge>
          </div>
          {lesson.difficulty && (
            <Badge className={cn('text-[10px]', getDifficultyColor(lesson.difficulty))}>
              {lesson.difficulty}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 tracking-tight mb-1 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors line-clamp-2">
          {lesson.title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
          {lesson.description || 'No description'}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            {lesson.estimated_duration_minutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {lesson.estimated_duration_minutes}m
              </span>
            )}
            {hasQuizScore && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <Trophy className="w-3 h-3" />
                {progress?.quiz_score}%
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400 flex items-center gap-1 group-hover:gap-1.5 transition-all">
            {isCompleted ? 'Review' : isInProgress ? 'Continue' : 'Start'}
            <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  )
}