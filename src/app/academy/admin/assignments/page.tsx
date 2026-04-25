import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAllStudentsWithCoaches, getAllCoaches } from '@/actions/academy/coachActions'
import AssignmentsClient from './_components/AssignmentsClient'

export const metadata = {
  title: 'Coach Assignments — LCA Admin',
  description: 'Assign coaches to students',
}

export default async function AssignmentsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/academy')

  const [studentsWithCoaches, coaches] = await Promise.all([
    getAllStudentsWithCoaches(),
    getAllCoaches(),
  ])

  return (
    <div className="max-w-5xl mx-auto px-5 py-7">
      <div className="mb-7">
        <h1 className="text-xl font-bold tracking-tight text-foreground leading-tight">
          Assign Roles
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Assign one or more coaches to each student.
          <span className="ml-2 font-medium text-foreground/60">
            · {studentsWithCoaches.length} students
            · {coaches.length} coaches
          </span>
        </p>
      </div>

      <AssignmentsClient
        studentsWithCoaches={studentsWithCoaches}
        coaches={coaches}
      />
    </div>
  )
}
