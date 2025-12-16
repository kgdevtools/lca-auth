import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { GraduationCap, User, Mail, Calendar, Shield } from 'lucide-react'

export default async function AcademyDashboard() {
  const { user, profile } = await getCurrentUserWithProfile()

  // Format the created date
  const createdDate = new Date(profile.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'coach':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'student':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
          <GraduationCap className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            LCA Academy
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome to your learning dashboard
          </p>
        </div>
      </div>

      {/* User Profile Card */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
          <CardDescription>
            Your account information and role in the academy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <Avatar
              name={profile.full_name || user.email || 'User'}
              size={80}
              className="flex-shrink-0"
            />

            {/* User Info */}
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {profile.full_name || 'User'}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={getRoleBadgeColor(profile.role)}>
                    <Shield className="w-3 h-3 mr-1" />
                    {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Member since {createdDate}</span>
                </div>
                {profile.chessa_id && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <User className="w-4 h-4" />
                    <span>ChessaSA ID: {profile.chessa_id}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Welcome Message */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {profile.role === 'student' && (
              <>
                <p className="text-gray-700 dark:text-gray-300">
                  Welcome to the LCA Academy! Here you can:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 ml-4">
                  <li>Browse and complete chess lessons</li>
                  <li>Take tests to assess your knowledge</li>
                  <li>Solve chess puzzles to improve your tactics</li>
                  <li>Track your progress and view reports</li>
                  <li>Receive feedback from your coaches</li>
                </ul>
              </>
            )}

            {profile.role === 'coach' && (
              <>
                <p className="text-gray-700 dark:text-gray-300">
                  Welcome, Coach! In the Academy you can:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 ml-4">
                  <li>View and manage your assigned students</li>
                  <li>Assign lessons to students</li>
                  <li>Provide feedback on student progress</li>
                  <li>Access all lessons and learning materials</li>
                  <li>Track student performance and analytics</li>
                </ul>
              </>
            )}

            {profile.role === 'admin' && (
              <>
                <p className="text-gray-700 dark:text-gray-300">
                  Welcome, Administrator! You have full access to:
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-400 ml-4">
                  <li>Create and manage all lessons and content</li>
                  <li>Manage coach-student assignments</li>
                  <li>View all student progress and analytics</li>
                  <li>Create and manage tests and assessments</li>
                  <li>Oversee the entire academy platform</li>
                </ul>
              </>
            )}

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Next steps:</strong> Use the sidebar navigation to explore the academy features.
                Start with the Lessons section to begin your learning journey!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
