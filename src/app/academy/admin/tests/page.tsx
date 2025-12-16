import { checkCoachRole } from '@/utils/auth/academyAuth'
import { getAllTests } from '@/services/testService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Eye, Edit, ArrowLeft, ClipboardCheck, CheckCircle2, XCircle, Clock, Target } from 'lucide-react'
import Link from 'next/link'

export default async function ManageTestsPage() {
  await checkCoachRole()

  const tests = await getAllTests()
  const publishedTests = tests.filter((t) => t.published)

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Breadcrumb / Back Navigation */}
      <div className="mb-6">
        <Link href="/academy/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Content Manager
          </Button>
        </Link>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ClipboardCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Manage Tests
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {tests.length} total tests • {publishedTests.length} published
          </p>
        </div>
        <Link href="/academy/admin/tests/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        </Link>
      </div>

      {/* Tests List */}
      <div className="grid gap-4">
        {tests.map((test) => (
          <Card key={test.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {test.title}
                    </h3>
                    {test.published ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Published
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                        <XCircle className="w-3 h-3 mr-1" />
                        Draft
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {test.description || 'No description'}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {test.time_limit_minutes && (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" />
                        {test.time_limit_minutes} min
                      </Badge>
                    )}
                    <Badge variant="outline" className="gap-1">
                      <Target className="w-3 h-3" />
                      Pass: {test.passing_score}%
                    </Badge>
                    {test.max_attempts && (
                      <Badge variant="outline">
                        Max attempts: {test.max_attempts}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {test.questions_data?.questions?.length || 0} questions
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0">
                  <Link href={`/academy/tests/${test.id}`}>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href={`/academy/admin/tests/${test.id}/edit`}>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty state */}
        {tests.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No tests yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Create your first test to assess student knowledge
              </p>
              <Link href="/academy/admin/tests/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Test
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
