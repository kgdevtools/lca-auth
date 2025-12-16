import { getLessonBySlug } from '@/services/lessonService'
import { getLessonProgress, startLesson } from '@/services/progressService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Clock, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import TextContent from '@/components/academy/lessons/TextContent'
import VideoContent from '@/components/academy/lessons/VideoContent'
import PuzzleContent from '@/components/academy/lessons/PuzzleContent'
import { QuizContent } from '@/components/academy/lessons/QuizContent'
import { CompleteLessonButton } from '@/components/academy/lessons/CompleteLessonButton'
import { LessonTimeTracker } from '@/components/academy/lessons/LessonTimeTracker'

interface LessonPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { slug } = await params
  const lesson = await getLessonBySlug(slug)

  if (!lesson || !lesson.published) {
    notFound()
  }

  // Get or create progress for this lesson
  let progress = await getLessonProgress(lesson.id).catch(() => null)
  if (!progress) {
    // Start the lesson automatically on first view
    progress = await startLesson(lesson.id).catch(() => null)
  }

  const isCompleted = progress?.status === 'completed'

  const getDifficultyColor = (difficulty: string | null) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const renderContent = () => {
    switch (lesson.content_type) {
      case 'text':
        return <TextContent content={lesson.content_data} />
      case 'video':
        return <VideoContent content={lesson.content_data} />
      case 'quiz':
        return (
          <QuizContent
            lessonId={lesson.id}
            questions={lesson.content_data?.questions || []}
            passingScore={lesson.content_data?.passingScore}
            allowRetry={lesson.content_data?.allowRetry}
            showExplanations={lesson.content_data?.showExplanations}
          />
        )
      case 'puzzle':
        return <PuzzleContent content={lesson.content_data} />
      case 'mixed':
        return (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <p className="text-gray-600 dark:text-gray-400">
              Mixed content functionality coming soon!
            </p>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Time Tracker - invisible component that tracks time spent */}
      <LessonTimeTracker lessonId={lesson.id} />

      {/* Back Navigation */}
      <div className="mb-6">
        <Link href="/academy/lessons">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lessons
          </Button>
        </Link>
      </div>

      {/* Lesson Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {lesson.category && (
            <Badge variant="outline">{lesson.category.name}</Badge>
          )}
          {lesson.difficulty && (
            <Badge className={getDifficultyColor(lesson.difficulty)}>
              {lesson.difficulty}
            </Badge>
          )}
          {lesson.estimated_duration_minutes && (
            <Badge variant="outline" className="gap-1">
              <Clock className="w-3 h-3" />
              {lesson.estimated_duration_minutes} min
            </Badge>
          )}
          <Badge variant="outline" className="capitalize">
            {lesson.content_type}
          </Badge>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          {lesson.title}
        </h1>

        {lesson.description && (
          <p className="text-lg text-gray-600 dark:text-gray-400">
            {lesson.description}
          </p>
        )}
      </div>

      {/* Lesson Content */}
      <Card className="mb-8">
        <CardContent className="p-8">
          {renderContent()}
        </CardContent>
      </Card>

      {/* Completion Actions */}
      <div className="flex justify-between items-center">
        <Link href="/academy/lessons">
          <Button variant="outline" size="lg">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Lessons
          </Button>
        </Link>
        <CompleteLessonButton
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          isCompleted={isCompleted}
        />
      </div>
    </div>
  )
}
