import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getCoachStudentsWithProgress, getAllStudentsWithProgressAdmin } from '@/repositories/lesson/studentRepository'
import StudentsClient from './_components/StudentsClient'

export const metadata = {
  title: 'Students — LCA Academy',
  description: 'View and manage your students',
}

export default async function StudentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'coach' && profile.role !== 'admin')) {
    redirect('/academy')
  }

  const isAdmin = profile.role === 'admin'
  const students = isAdmin
    ? await getAllStudentsWithProgressAdmin()
    : await getCoachStudentsWithProgress(profile.id)

  return (
    <div className="max-w-5xl mx-auto px-5 py-7">
      <div className="mb-7">
        <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
          Students
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isAdmin ? 'All students across all coaches' : 'Students assigned to you'}
          <span className="ml-2 font-medium text-foreground/60">
            · {students.length} students
          </span>
        </p>
      </div>

      <StudentsClient students={students} isAdmin={isAdmin} />
    </div>
  )
}