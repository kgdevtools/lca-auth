'use client'

import { useEffect, useState } from 'react'
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  GraduationCap, BookOpen, Target, Trophy, Users, 
  ChevronRight, Clock, BarChart3, Shield, Zap,
  FileText, Brain, TrendingUp, Award, Star, Play
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface AcademyDashboardClientProps {
  user: any
  profile: any
  inProgressLessons?: number
  completedLessons?: number
  averageQuizScore?: number
  totalTimeMinutes?: number
  studentsCount?: number
}

export default function AcademyDashboardClient({
  user,
  profile,
  inProgressLessons = 0,
  completedLessons = 0,
  averageQuizScore = 0,
  totalTimeMinutes = 0,
  studentsCount = 0,
}: AcademyDashboardClientProps) {
  const [mounted, setMounted] = useState(false)
  const role = profile?.role || 'student'

  useEffect(() => {
    setMounted(true)
  }, [])

  const getRoleBadgeColor = (r: string) => {
    switch (r) {
      case 'admin': return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      case 'coach': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
      case 'student': return 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300'
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300'
    }
  }

  const memberSince = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Unknown'

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Limpopo Chess Academy Online
        </h1>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-sm text-slate-500 dark:text-slate-400 tracking-tight">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
          </p>
          <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800">
            {role.charAt(0).toUpperCase() + role.slice(1)} Dashboard
          </Badge>
        </div>
      </div>

      {/* Development Notice */}
      <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-sm">
        <p className="text-xs text-amber-800 dark:text-amber-200">
          <span className="font-medium">Academy features</span> like workouts, lessons, puzzles and more are being developed. Stay tuned!
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1 space-y-4">
          {/* Profile Hero */}
          <div className="relative overflow-hidden bg-gradient-to-br from-sky-600 via-sky-600 to-sky-700 dark:from-sky-950 dark:via-sky-900 dark:to-sky-950 rounded-sm p-5">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:12px_20px]" />
            
            <div className="relative flex flex-row items-center gap-4 text-start">
              <div className="relative">
                <Avatar
                  name={profile?.full_name || user?.email || 'User'}
                  size={72}
                  className="ring-4 ring-white/20"
                />
                <Badge className={cn('absolute -bottom-1 -right-1 text-[10px] gap-1', getRoleBadgeColor(role))}>
                  <Shield className="w-3 h-3" />
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
              </div>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {profile?.full_name || 'User'}
                </h2>
                <p className="text-xs text-sky-200 mb-1">{user?.email}</p>

                <div className="flex items-center gap-3 text-[11px] text-sky-200/80">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {memberSince}
                  </span>
                  {profile?.chessa_id && (
                    <span className="flex items-center gap-1 font-mono">
                      <Zap className="w-3 h-3" />
                      {profile.chessa_id}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Link href="/user/profile" className="w-full">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                >
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard 
              icon={<BookOpen className="w-4 h-4" />}
              label="Completed"
              value={completedLessons}
              color="sky"
            />
            <StatCard 
              icon={<Target className="w-4 h-4" />}
              label="In Progress"
              value={inProgressLessons}
              color="blue"
            />
          </div>

          {/* Time & Score */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard 
              icon={<Clock className="w-4 h-4" />}
              label="Time Spent"
              value={`${totalTimeMinutes}m`}
              color="indigo"
            />
            <StatCard 
              icon={<Award className="w-4 h-4" />}
              label="Avg Score"
              value={averageQuizScore > 0 ? `${averageQuizScore}%` : '—'}
              color="violet"
            />
          </div>
        </div>

        {/* Right Column - Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Role-specific content */}
          {role === 'student' && <StudentDashboardContent />}
          {role === 'coach' && <CoachDashboardContent studentsCount={studentsCount} />}
          {role === 'admin' && <AdminDashboardContent />}
        </div>
      </div>
    </div>
  )
}

// Student Dashboard Content
function StudentDashboardContent() {
  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <QuickActionCard 
          href="/academy/lessons"
          icon={<BookOpen className="w-5 h-5" />}
          label="Lessons"
          color="sky"
          description="Start learning"
        />
        <QuickActionCard 
          href="/academy/reports"
          icon={<BarChart3 className="w-5 h-5" />}
          label="Progress"
          color="blue"
          description="View stats"
        />
        <QuickActionCard 
          href="/tournaments"
          icon={<Trophy className="w-5 h-5" />}
          label="Tournaments"
          color="indigo"
          description="Compete"
        />
        <QuickActionCard 
          href="/rankings"
          icon={<TrendingUp className="w-5 h-5" />}
          label="Rankings"
          color="violet"
          description="See where you stand"
        />
      </div>

      {/* Coming Soon Cards */}
      <div className="grid grid-cols-2 gap-2">
        <DisabledCard 
          icon={<Brain className="w-5 h-5" />}
          label="Puzzles"
        />
        <DisabledCard 
          icon={<FileText className="w-5 h-5" />}
          label="Tests"
        />
      </div>

      {/* Recommended Next */}
      <Card className="border-0 bg-white dark:bg-slate-900/50 shadow-sm rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" />
            Recommended Next
          </h3>
        </div>
        <CardContent className="p-4">
          <div className="text-center py-4">
            <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Complete lessons to get personalized recommendations
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Coach Dashboard Content
function CoachDashboardContent({ studentsCount }: { studentsCount: number }) {
  return (
    <div className="space-y-4">
      {/* Coach Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard 
          icon={<Users className="w-4 h-4" />}
          label="Students"
          value={studentsCount}
          color="sky"
        />
        <StatCard 
          icon={<BookOpen className="w-4 h-4" />}
          label="Lessons"
          value="—"
          color="blue"
        />
        <StatCard 
          icon={<BarChart3 className="w-4 h-4" />}
          label="Reports"
          value="—"
          color="indigo"
        />
        <StatCard 
          icon={<Trophy className="w-4 h-4" />}
          label="Tournaments"
          value="—"
          color="violet"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <QuickActionCard 
          href="/academy/admin/lessons"
          icon={<FileText className="w-5 h-5" />}
          label="Lessons"
          color="sky"
          description="Manage content"
        />
        <QuickActionCard 
          href="/academy/admin/students"
          icon={<Users className="w-5 h-5" />}
          label="Students"
          color="blue"
          description="View all"
        />
        <QuickActionCard 
          href="/academy/reports"
          icon={<BarChart3 className="w-5 h-5" />}
          label="Reports"
          color="indigo"
          description="Analytics"
        />
        <QuickActionCard 
          href="/tournaments"
          icon={<Trophy className="w-5 h-5" />}
          label="Tournaments"
          color="violet"
          description="Manage"
        />
      </div>

      {/* Coming Soon */}
      <div className="grid grid-cols-2 gap-2">
        <DisabledCard 
          icon={<Brain className="w-5 h-5" />}
          label="Puzzle Builder"
        />
        <DisabledCard 
          icon={<FileText className="w-5 h-5" />}
          label="Test Builder"
        />
      </div>
    </div>
  )
}

// Admin Dashboard Content
function AdminDashboardContent() {
  return (
    <div className="space-y-4">
      {/* Admin Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <QuickActionCard 
          href="/academy/admin/lessons"
          icon={<BookOpen className="w-5 h-5" />}
          label="Lessons"
          color="sky"
          description="Manage all"
        />
        <QuickActionCard 
          href="/academy/admin/categories"
          icon={<FileText className="w-5 h-5" />}
          label="Categories"
          color="blue"
          description="Organize"
        />
        <QuickActionCard 
          href="/academy/admin/tests"
          icon={<Brain className="w-5 h-5" />}
          label="Tests"
          color="indigo"
          description="Assessments"
        />
        <QuickActionCard 
          href="/admin"
          icon={<Shield className="w-5 h-5" />}
          label="Settings"
          color="violet"
          description="System"
        />
      </div>

      {/* Coming Soon */}
      <div className="grid grid-cols-2 gap-2">
        <DisabledCard 
          label="User Management"
          hideIcon
        />
        <DisabledCard 
          label="Platform Analytics"
          hideIcon
        />
      </div>

      {/* System Info */}
      <Card className="border-0 bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30 shadow-sm rounded-sm">
        <CardContent className="p-4 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Admin Mode Active
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            You have full access to all features
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

// Stat Card Component
function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
}) {
  const colorClasses: Record<string, string> = {
    sky: 'from-sky-50 to-sky-100 dark:from-sky-950/30 dark:to-sky-900/30 text-sky-700 dark:text-sky-300',
    blue: 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 text-blue-700 dark:text-blue-300',
    indigo: 'from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    violet: 'from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30 text-violet-700 dark:text-violet-300',
  }

  return (
    <div className={`
      relative overflow-hidden rounded-sm p-3 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
      bg-gradient-to-br ${colorClasses[color] || colorClasses.sky}
    `}>
      <div className="flex items-center gap-2 mb-1 opacity-70">
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold tracking-tight">{value}</p>
    </div>
  )
}

// Quick Action Card Component
function QuickActionCard({
  href,
  icon,
  label,
  color,
  description,
}: {
  href: string
  icon: React.ReactNode
  label: string
  color: string
  description: string
}) {
  const colorClasses: Record<string, { bg: string; text: string; hover: string }> = {
    sky: { bg: 'bg-sky-50 dark:bg-sky-950/50', text: 'text-sky-600 dark:text-sky-400', hover: 'hover:bg-sky-100 dark:hover:bg-sky-900/50' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-600 dark:text-blue-400', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/50' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/50', text: 'text-indigo-600 dark:text-indigo-400', hover: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/50' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-950/50', text: 'text-violet-600 dark:text-violet-400', hover: 'hover:bg-violet-100 dark:hover:bg-violet-900/50' },
  }
  const colors = colorClasses[color] || colorClasses.sky

  return (
    <Link href={href} className="block">
      <div className={`
        group relative overflow-hidden rounded-sm p-4 transition-all duration-200 
        bg-white dark:bg-slate-900/50 shadow-sm hover:shadow-md ${colors.hover}
      `}>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', colors.bg)}>
          <span className={colors.text}>{icon}</span>
        </div>
        <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 tracking-tight">
          {label}
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          {description}
        </p>
        <ChevronRight className="absolute bottom-3 right-3 w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </Link>
  )
}

// Disabled Card Component (for not-yet-implemented features)
function DisabledCard({
  icon,
  label,
  hideIcon = false,
}: {
  icon?: React.ReactNode
  label: string
  hideIcon?: boolean
  status?: 'soon' | 'development'
}) {
  const statusLabel = status === 'development' ? 'In Development' : 'Coming Soon'
  return (
    <div className="relative overflow-hidden rounded-sm p-4 bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-700">
      {!hideIcon && (
        <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-slate-100 dark:bg-slate-800/50">
          <span className="text-slate-400">{icon}</span>
        </div>
      )}
      <h3 className="font-semibold text-sm text-slate-400 tracking-tight">
        {label}
      </h3>
      <p className="text-[11px] text-slate-400 mt-0.5">
        {status === 'development' ? 'Under development' : 'Coming soon'}
      </p>
      <Badge variant="outline" className="absolute top-2 right-2 text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
        {statusLabel}
      </Badge>
    </div>
  )
}