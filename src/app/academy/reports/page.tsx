import { getAllProgress, getProgressStats } from '@/services/progressService'
import { getPublishedLessons } from '@/services/lessonService'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Trophy, Clock, Target, BookOpen, CheckCircle2, TrendingUp, Award, Zap } from 'lucide-react'
import Link from 'next/link'

export default async function ReportsPage() {
  const progressData = await getAllProgress().catch(() => [])
  const stats = await getProgressStats().catch(() => ({
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    totalTimeMinutes: 0,
    averageQuizScore: 0,
  }))
  const allLessons = await getPublishedLessons().catch(() => [])

  // Calculate not started
  const notStarted = allLessons.length - stats.total
  const completionRate = allLessons.length > 0 ? Math.round((stats.completed / allLessons.length) * 100) : 0

  // Recent activity (last 5 lessons accessed)
  const recentActivity = progressData
    .sort((a, b) => new Date(b.last_accessed_at).getTime() - new Date(a.last_accessed_at).getTime())
    .slice(0, 5)

  // Get lesson details for recent activity
  const recentLessons = recentActivity
    .map(progress => {
      const lesson = allLessons.find(l => l.id === progress.lesson_id)
      return lesson ? { ...progress, lesson } : null
    })
    .filter(Boolean)

  // Achievement badges
  const achievements = []
  if (stats.completed >= 1) achievements.push({ icon: '🎯', title: 'First Step', description: 'Completed your first lesson' })
  if (stats.completed >= 5) achievements.push({ icon: '🌟', title: 'Rising Star', description: 'Completed 5 lessons' })
  if (stats.completed >= 10) achievements.push({ icon: '🏆', title: 'Champion', description: 'Completed 10 lessons' })
  if (stats.averageQuizScore >= 90) achievements.push({ icon: '💎', title: 'Quiz Master', description: 'Average quiz score above 90%' })
  if (stats.totalTimeMinutes >= 60) achievements.push({ icon: '⏰', title: 'Dedicated Learner', description: 'Spent over 1 hour learning' })

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
              Your Progress
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 tracking-tight leading-tight">
              Track your learning journey and achievements
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Lessons Completed */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Lessons Completed</CardDescription>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stats.completed}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {completionRate}% of all lessons
            </p>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">In Progress</CardDescription>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stats.inProgress}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Keep going!
            </p>
          </CardContent>
        </Card>

        {/* Average Quiz Score */}
        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Average Score</CardDescription>
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stats.averageQuizScore}%
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {stats.averageQuizScore >= 70 ? 'Excellent work!' : 'Keep practicing!'}
            </p>
          </CardContent>
        </Card>

        {/* Total Time */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-xs">Time Spent</CardDescription>
              <Clock className="w-4 h-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalTimeMinutes}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              minutes of learning
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                <CardTitle className="tracking-tight leading-tight">Recent Activity</CardTitle>
              </div>
              <CardDescription className="text-xs tracking-tight leading-tight">
                Your latest learning sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentLessons.length > 0 ? (
                <div className="space-y-3">
                  {recentLessons.map((item: any) => (
                    <Link
                      key={item.id}
                      href={`/academy/lessons/${item.lesson.slug}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate tracking-tight leading-tight">
                              {item.lesson.title}
                            </p>
                            {item.status === 'completed' && (
                              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 tracking-tight leading-tight">
                            Last accessed: {new Date(item.last_accessed_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          {item.quiz_score !== null && (
                            <Badge variant="outline" className="text-xs">
                              <Trophy className="w-3 h-3 mr-1 text-yellow-500" />
                              {item.quiz_score}%
                            </Badge>
                          )}
                          <Badge
                            className={
                              item.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                            }
                          >
                            {item.status === 'completed' ? 'Done' : 'In Progress'}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 tracking-tight leading-tight">
                    No lessons started yet. Begin your journey!
                  </p>
                  <Link href="/academy/lessons">
                    <Badge className="mt-3 cursor-pointer bg-blue-500 hover:bg-blue-600">
                      Browse Lessons
                    </Badge>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Achievements */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-yellow-500" />
                <CardTitle className="tracking-tight leading-tight">Achievements</CardTitle>
              </div>
              <CardDescription className="text-xs tracking-tight leading-tight">
                Your earned badges
              </CardDescription>
            </CardHeader>
            <CardContent>
              {achievements.length > 0 ? (
                <div className="space-y-3">
                  {achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800"
                    >
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 tracking-tight leading-tight">
                          {achievement.title}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 tracking-tight leading-tight">
                          {achievement.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 tracking-tight leading-tight">
                    Complete lessons to unlock achievements!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base tracking-tight leading-tight">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/academy/lessons">
                <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-medium tracking-tight leading-tight">Browse Lessons</span>
                  </div>
                </div>
              </Link>
              {stats.inProgress > 0 && recentLessons.length > 0 && (
                <Link href={`/academy/lessons/${recentLessons[0]?.lesson?.slug}`}>
                  <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium tracking-tight leading-tight">Continue Learning</span>
                    </div>
                  </div>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
