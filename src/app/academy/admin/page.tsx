import { checkCoachRole } from '@/utils/auth/academyAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, ClipboardCheck, FolderTree, Plus, 
  Users, BarChart3, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { getAllLessons } from '@/services/lessonService'
import { getAllTests } from '@/services/testService'

export default async function AdminDashboard() {
  await checkCoachRole()

  const lessons = await getAllLessons()
  const tests = await getAllTests()

  const publishedLessons = lessons.filter((l) => l.published).length
  const draftLessons = lessons.filter((l) => !l.published).length
  const publishedTests = tests.filter((t) => t.published).length

  return (
    <div className="container mx-auto px-3 py-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Content Management
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 tracking-tight mt-1">
          Create and manage lessons, tests, and learning materials
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard 
          label="Total Lessons"
          value={lessons.length}
          subValue={`${publishedLessons} published`}
          color="sky"
        />
        <StatCard 
          label="Draft Lessons"
          value={draftLessons}
          subValue="Not published"
          color="slate"
        />
        <StatCard 
          label="Total Tests"
          value={tests.length}
          subValue={`${publishedTests} published`}
          color="blue"
        />
        <StatCard 
          label="Categories"
          value="—"
          subValue="Coming soon"
          color="indigo"
        />
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <ActionCard 
          href="/academy/admin/lessons/create"
          icon={<BookOpen className="w-5 h-5" />}
          label="Create Lesson"
          description="Add a new lesson"
          color="sky"
        />
        <ActionCard 
          href="/academy/admin/lessons"
          icon={<BookOpen className="w-5 h-5" />}
          label="Manage Lessons"
          description={`${lessons.length} total lessons`}
          color="blue"
        />
        <ActionCard 
          href="/academy/admin/tests/create"
          icon={<ClipboardCheck className="w-5 h-5" />}
          label="Create Test"
          description="Add a new test"
          color="indigo"
        />
        <ActionCard 
          href="/academy/admin/tests"
          icon={<ClipboardCheck className="w-5 h-5" />}
          label="Manage Tests"
          description={`${tests.length} total tests`}
          color="violet"
        />
        <ActionCard 
          href="/academy/admin/categories/create"
          icon={<FolderTree className="w-5 h-5" />}
          label="Create Category"
          description="Organize content"
          color="emerald"
        />
        <ActionCard 
          href="/academy/admin/categories"
          icon={<FolderTree className="w-5 h-5" />}
          label="Manage Categories"
          description="View all categories"
          color="teal"
        />
      </div>

      {/* Coming Soon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DisabledCard label="Student Management" />
        <DisabledCard label="Platform Analytics" />
      </div>
    </div>
  )
}

function StatCard({ 
  label, 
  value, 
  subValue,
  color 
}: { 
  label: string
  value: number | string
  subValue: string
  color: string 
}) {
  const colorClasses: Record<string, string> = {
    sky: 'from-sky-50 to-sky-100 dark:from-sky-950/30 dark:to-sky-900/30 text-sky-700 dark:text-sky-300',
    blue: 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 text-blue-700 dark:text-blue-300',
    indigo: 'from-indigo-50 to-indigo-100 dark:from-indigo-950/30 dark:to-indigo-900/30 text-indigo-700 dark:text-indigo-300',
    slate: 'from-slate-50 to-slate-100 dark:from-slate-950/30 dark:to-slate-900/30 text-slate-700 dark:text-slate-300',
  }

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color] || colorClasses.slate} rounded-sm p-4`}>
      <p className="text-[10px] uppercase tracking-wider font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-[10px] opacity-60 mt-0.5">{subValue}</p>
    </div>
  )
}

function ActionCard({
  href,
  icon,
  label,
  description,
  color,
}: {
  href: string
  icon: React.ReactNode
  label: string
  description: string
  color: string
}) {
  const colorClasses: Record<string, { bg: string; icon: string }> = {
    sky: { bg: 'bg-sky-50 dark:bg-sky-950/50', icon: 'text-sky-600 dark:text-sky-400' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-950/50', icon: 'text-blue-600 dark:text-blue-400' },
    indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/50', icon: 'text-indigo-600 dark:text-indigo-400' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-950/50', icon: 'text-violet-600 dark:text-violet-400' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', icon: 'text-emerald-600 dark:text-emerald-400' },
    teal: { bg: 'bg-teal-50 dark:bg-teal-950/50', icon: 'text-teal-600 dark:text-teal-400' },
  }
  const colors = colorClasses[color] || colorClasses.sky

  return (
    <Link href={href} className="block group">
      <div className="bg-white dark:bg-slate-900/50 border-0 shadow-sm rounded-sm p-4 transition-all duration-200 hover:shadow-md group-hover:border-sky-200 dark:group-hover:border-sky-800">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.bg}`}>
            <span className={colors.icon}>{icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 tracking-tight">
              {label}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {description}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  )
}

function DisabledCard({ label }: { label: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-sm p-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] bg-slate-100 dark:bg-slate-800">Coming Soon</Badge>
        <span className="text-sm text-slate-400 font-medium">{label}</span>
      </div>
    </div>
  )
}