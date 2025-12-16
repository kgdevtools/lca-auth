import { checkCoachRole } from '@/utils/auth/academyAuth'
import { getLessonById, getAllCategories } from '@/services/lessonService'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import LessonEditorForm from '@/components/academy/admin/LessonEditorForm'

interface EditLessonPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditLessonPage({ params }: EditLessonPageProps) {
  await checkCoachRole()

  const { id } = await params
  const lesson = await getLessonById(id)
  const categories = await getAllCategories()

  if (!lesson) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {/* Breadcrumb / Back Navigation */}
      <div className="mb-5">
        <Link href="/academy/admin/lessons">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Your Lessons
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
            <Edit className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
            Edit Lesson
          </h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 tracking-tight leading-tight">
          Update your training content
        </p>
      </div>

      {/* Editor Form */}
      <LessonEditorForm lesson={lesson} categories={categories} mode="edit" />
    </div>
  )
}
