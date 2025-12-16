import { checkCoachRole } from '@/utils/auth/academyAuth'
import { getAllLessons, getAllCategories } from '@/services/lessonService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Eye, Edit, Trash2, CheckCircle2, XCircle, ArrowLeft, BookOpen, Clock, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { DeleteLessonButton } from '@/components/academy/admin/DeleteLessonButton'

export default async function ManageLessonsPage() {
  await checkCoachRole()

  const lessons = await getAllLessons()
  const categories = await getAllCategories()

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

  const getContentTypeColor = (contentType: string) => {
    switch (contentType) {
      case 'text':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'video':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'quiz':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'puzzle':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
      case 'mixed':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Breadcrumb / Back Navigation */}
      <div className="mb-5">
        <Link href="/academy/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Create Content
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
              Your Training Lessons
            </h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 tracking-tight leading-tight">
            {lessons.length} total {lessons.length === 1 ? 'lesson' : 'lessons'} • {lessons.filter((l) => l.published).length}{' '}
            ready for students
          </p>
        </div>
        <Link href="/academy/admin/lessons/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Lesson
          </Button>
        </Link>
      </div>

      {/* Lessons grouped by category */}
      <div className="space-y-8">
        {/* Uncategorized */}
        {lessonsByCategory['uncategorized'] && lessonsByCategory['uncategorized'].length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 tracking-tight leading-tight">
              Uncategorized
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lessonsByCategory['uncategorized'].map((lesson) => (
                <Card key={lesson.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3 space-y-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <CardTitle className="text-base font-semibold tracking-tight leading-tight line-clamp-2 flex-1">
                        {lesson.title}
                      </CardTitle>
                      {lesson.published ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex-shrink-0 h-fit">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Live
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 flex-shrink-0 h-fit">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs tracking-tight leading-tight line-clamp-2">
                      {lesson.description || 'No description yet'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 pb-4 flex flex-col flex-1">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <Badge className={`${getContentTypeColor(lesson.content_type)} text-xs`}>
                        {lesson.content_type}
                      </Badge>
                      {lesson.difficulty && (
                        <Badge className={`${getDifficultyColor(lesson.difficulty)} text-xs`}>
                          {lesson.difficulty}
                        </Badge>
                      )}
                      {lesson.estimated_duration_minutes && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Clock className="w-3 h-3" />
                          {lesson.estimated_duration_minutes}m
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 mt-auto">
                      <div className="flex gap-2">
                        <Link href={`/academy/lessons/${lesson.slug}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full gap-2">
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/academy/admin/lessons/${lesson.id}/edit`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full gap-2">
                            <Edit className="w-4 h-4" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                      <DeleteLessonButton lessonId={lesson.id} lessonTitle={lesson.title} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Categorized lessons */}
        {categories.map((category) => {
          const categoryLessons = lessonsByCategory[category.id] || []
          if (categoryLessons.length === 0) return null

          return (
            <div key={category.id}>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 tracking-tight leading-tight">
                {category.name}
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                  ({categoryLessons.length})
                </span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryLessons.map((lesson) => (
                  <Card key={lesson.id} className="flex flex-col hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3 space-y-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <CardTitle className="text-base font-semibold tracking-tight leading-tight line-clamp-2 flex-1">
                          {lesson.title}
                        </CardTitle>
                        {lesson.published ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex-shrink-0 h-fit">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Live
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 flex-shrink-0 h-fit">
                            Draft
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs tracking-tight leading-tight line-clamp-2">
                        {lesson.description || 'No description yet'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4 flex flex-col flex-1">
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <Badge className={`${getContentTypeColor(lesson.content_type)} text-xs`}>
                          {lesson.content_type}
                        </Badge>
                        {lesson.difficulty && (
                          <Badge className={`${getDifficultyColor(lesson.difficulty)} text-xs`}>
                            {lesson.difficulty}
                          </Badge>
                        )}
                        {lesson.estimated_duration_minutes && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="w-3 h-3" />
                            {lesson.estimated_duration_minutes}m
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 mt-auto">
                        <div className="flex gap-2">
                          <Link href={`/academy/lessons/${lesson.slug}`} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full gap-2">
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                          </Link>
                          <Link href={`/academy/admin/lessons/${lesson.id}/edit`} className="flex-1">
                            <Button size="sm" variant="outline" className="w-full gap-2">
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                          </Link>
                        </div>
                        <DeleteLessonButton lessonId={lesson.id} lessonTitle={lesson.title} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}

        {/* Empty state */}
        {lessons.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 tracking-tight leading-tight">
                Ready to Create Your First Lesson?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 tracking-tight leading-tight max-w-md mx-auto">
                Start building amazing chess training content for your students. Whether it's tactics, openings, or endgames - let's get started!
              </p>
              <Link href="/academy/admin/lessons/create">
                <Button size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Create Your First Lesson
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
