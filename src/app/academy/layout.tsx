import AcademyLayoutClient from './AcademyLayoutClient'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { createClient } from '@/utils/supabase/server'

export default async function AcademyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Role + level drive the decorative chess-piece backdrop (coach → kings/queens,
  // student → their level's piece). Best-effort; never blocks the layout.
  let role: string | null = null
  let level = 1
  try {
    const { profile } = await getCurrentUserWithProfile()
    role = profile?.role ?? null
    if (profile?.role === 'student') {
      const supabase = await createClient()
      const { data } = await supabase
        .from('student_progress_summary')
        .select('level')
        .eq('student_id', profile.id)
        .maybeSingle()
      level = data?.level ?? 1
    }
  } catch {
    // unauthenticated / no profile — fall back to defaults
  }

  return (
    <AcademyLayoutClient role={role} level={level}>
      {children}
    </AcademyLayoutClient>
  )
}
