import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, BookOpen, Clock, Trophy, TrendingUp } from 'lucide-react'
import { getProgressStats } from '@/services/progressService'

export async function ProgressOverview() {
  const stats = await getProgressStats().catch(() => null)

  if (!stats || stats.total === 0) {
    return null // Don't show anything if no progress yet
  }

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  return (
    <Card className="mb-8 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800 w-full">
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {/* Lessons Started */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.total}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Lessons Started
              </p>
            </div>
          </div>

          {/* Completed */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.completed}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Completed
              </p>
            </div>
          </div>

          {/* Time Spent */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalTimeMinutes}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Minutes Studying
              </p>
            </div>
          </div>

          {/* Average Quiz Score */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Trophy className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.averageQuizScore > 0 ? `${stats.averageQuizScore}%` : '-'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Avg Quiz Score
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {completionRate > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Overall Progress
              </span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {completionRate}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
