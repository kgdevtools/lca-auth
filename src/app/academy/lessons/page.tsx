import { getPublishedLessons, getAllCategories } from '@/services/lessonService'
import { getAllProgress } from '@/services/progressService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Clock, ChevronRight, CheckCircle2, Trophy, Target, Timer } from 'lucide-react'
import Link from 'next/link'
import { ProgressOverview } from '@/components/academy/ProgressOverview'

export default async function LessonsPage() {
  const lessons = await getPublishedLessons()
  const categories = await getAllCategories()

  // Fetch user's progress for all lessons
  const progressData = await getAllProgress().catch(() => [])
  const progressMap = new Map(progressData.map(p => [p.lesson_id, p]))

  // Group lessons by category
  const lessonsByCategory = lessons.reduce((acc, lesson) => {
    const categoryId = lesson.category_id || 'uncategorized'
    if (!acc[categoryId]) {
      acc[categoryId] = []
    }
    acc[categoryId].push(lesson)
    return acc
  }, {} as Record<string, typeof lessons>)

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

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return '🎥'
      case 'quiz':
        return '❓'
      case 'puzzle':
        return '♟️'
      case 'mixed':
        return '📚'
      default:
        return '📄'
    }
  }

  const LessonCard = ({ lesson }: { lesson: typeof lessons[0] }) => {
    const progress = progressMap.get(lesson.id)
    const isCompleted = progress?.status === 'completed'
    const isInProgress = progress?.status === 'in_progress'
    const hasQuizScore = progress?.quiz_score !== null && progress?.quiz_score !== undefined

    return (
      <Link href={`/academy/lessons/${lesson.slug}`} className="block">
        <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer group relative overflow-hidden">
          {/* Completion Badge */}
          {isCompleted && (
            <div className="absolute top-3 right-3 z-20">
              <div className="bg-green-500 text-white rounded-full p-1.5 shadow-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          )}

          {/* In Progress Badge */}
          {isInProgress && !isCompleted && (
            <div className="absolute top-3 right-3 z-20">
              <Badge className="bg-blue-500 text-white">In Progress</Badge>
            </div>
          )}

          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className="text-2xl">{getContentTypeIcon(lesson.content_type)}</span>
              {lesson.difficulty && (
                <Badge className={getDifficultyColor(lesson.difficulty)}>
                  {lesson.difficulty}
                </Badge>
              )}
            </div>
            <CardTitle className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight leading-tight">
              {lesson.title}
            </CardTitle>
            <CardDescription className="line-clamp-2 text-xs tracking-tight leading-tight">
              {lesson.description || 'No description available'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Quiz Score Display */}
            {hasQuizScore && (
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Best Score: {progress.quiz_score}%
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                {lesson.estimated_duration_minutes && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    <Clock className="w-3.5 h-3.5" />
                    {lesson.estimated_duration_minutes}m
                  </div>
                )}
                {progress?.time_spent_seconds && progress.time_spent_seconds > 0 && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                    <Timer className="w-3.5 h-3.5" />
                    {Math.round(progress.time_spent_seconds / 60)}m spent
                  </div>
                )}
                {progress?.attempts && progress.attempts > 0 && (
                  <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                    <Target className="w-3.5 h-3.5" />
                    {progress.attempts} {progress.attempts === 1 ? 'attempt' : 'attempts'}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-medium group-hover:gap-2 transition-all">
                {isCompleted ? 'Review' : isInProgress ? 'Continue' : 'Start'}
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    )
  }

  // Render function for lesson categories
  const renderLessonCategory = (categoryId: string, categoryName: string, categoryDescription?: string) => {
    const categoryLessons = lessonsByCategory[categoryId] || []
    if (categoryLessons.length === 0) return null

    return (
      <section key={categoryId} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
            {categoryName}
          </h2>
          <Badge variant="outline">{categoryLessons.length}</Badge>
        </div>
        {categoryDescription && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 tracking-tight leading-tight">
            {categoryDescription}
          </p>
        )}

        {/* Responsive Grid with explicit CSS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))',
            gap: '1rem',
            width: '100%',
          }}
        >
          {categoryLessons.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="w-full min-h-screen">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                Your Learning Journey
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 tracking-tight leading-tight">
                {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} available • {progressData.filter(p => p.status === 'completed').length} completed
              </p>
            </div>
          </div>
        </div>

        {/* Progress Overview */}
        <ProgressOverview />

        {/* Lessons */}
        {lessons.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 tracking-tight leading-tight">
                No Lessons Yet
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 tracking-tight leading-tight">
                Check back soon for awesome chess training content!
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Categorized Lessons */}
            {categories.map((category) => renderLessonCategory(category.id, category.name, category.description || undefined))}

            {/* Uncategorized Lessons */}
            {renderLessonCategory('uncategorized', 'Other Lessons')}
          </>
        )}
      </div>
    </div>
  )
}
