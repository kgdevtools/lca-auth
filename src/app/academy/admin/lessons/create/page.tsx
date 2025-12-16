import { checkCoachRole } from '@/utils/auth/academyAuth'
import { getAllCategories } from '@/services/lessonService'
import LessonEditorForm from '@/components/academy/admin/LessonEditorForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen } from 'lucide-react'

export default async function CreateLessonPage() {
  await checkCoachRole()

  const categories = await getAllCategories()

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Create New Lesson
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Design engaging learning content for your students
        </p>
      </div>

      {/* Form */}
      <LessonEditorForm categories={categories} mode="create" />
    </div>
  )
}
