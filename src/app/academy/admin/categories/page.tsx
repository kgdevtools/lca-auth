import { checkCoachRole } from '@/utils/auth/academyAuth'
import { getAllCategories } from '@/services/lessonService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, ArrowLeft, FolderTree } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export default async function CategoriesPage() {
  await checkCoachRole()

  const categories = await getAllCategories()

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Breadcrumb / Back Navigation */}
      <div className="mb-6">
        <Link href="/academy/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Content Manager
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FolderTree className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Lesson Categories
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {categories.length} categories
          </p>
        </div>
        <Link href="/academy/admin/categories/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Category
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{category.name}</CardTitle>
                  <CardDescription>{category.description || 'No description'}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">Order: {category.display_order}</Badge>
                  {category.icon && <Badge variant="outline">Icon: {category.icon}</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Slug: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">{category.slug}</code>
              </p>
            </CardContent>
          </Card>
        ))}

        {categories.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No categories yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first category to organize lessons
              </p>
              <Link href="/academy/admin/categories/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Category
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
