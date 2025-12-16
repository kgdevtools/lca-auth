import { checkCoachRole } from '@/utils/auth/academyAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BookOpen, ClipboardCheck, FolderTree, Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { getAllLessons } from '@/services/lessonService'
import { getAllTests } from '@/services/testService'

export default async function AdminDashboard() {
  // Check authorization
  await checkCoachRole()

  // Fetch stats
  const lessons = await getAllLessons()
  const tests = await getAllTests()

  const publishedLessons = lessons.filter((l) => l.published).length
  const draftLessons = lessons.filter((l) => !l.published).length
  const publishedTests = tests.filter((t) => t.published).length
  const draftTests = tests.filter((t) => !t.published).length

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Content Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Create and manage lessons, tests, and learning materials
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Lessons */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Lessons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {lessons.length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {publishedLessons} published • {draftLessons} drafts
            </p>
          </CardContent>
        </Card>

        {/* Total Tests */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Tests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {tests.length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {publishedTests} published • {draftTests} drafts
            </p>
          </CardContent>
        </Card>

        {/* Students (placeholder) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">--</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Coming soon</p>
          </CardContent>
        </Card>

        {/* Completion Rate (placeholder) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Avg. Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">--</div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Coming soon</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Manage Lessons */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Lessons</CardTitle>
                <CardDescription>Create and manage lessons</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href="/academy/admin/lessons/create" className="flex-1">
              <Button className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create New Lesson
              </Button>
            </Link>
            <Link href="/academy/admin/lessons" className="flex-1">
              <Button variant="outline" className="w-full" size="sm">
                View All Lessons
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Manage Tests */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <ClipboardCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>Tests</CardTitle>
                <CardDescription>Create and manage tests</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href="/academy/admin/tests/create" className="flex-1">
              <Button className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create New Test
              </Button>
            </Link>
            <Link href="/academy/admin/tests" className="flex-1">
              <Button variant="outline" className="w-full" size="sm">
                View All Tests
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Manage Categories */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FolderTree className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle>Categories</CardTitle>
                <CardDescription>Organize content by topic</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Link href="/academy/admin/categories/create" className="flex-1">
              <Button className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create New Category
              </Button>
            </Link>
            <Link href="/academy/admin/categories" className="flex-1">
              <Button variant="outline" className="w-full" size="sm">
                View All Categories
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity (placeholder) */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates to your content</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>Activity tracking coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
