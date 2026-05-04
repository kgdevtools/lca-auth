'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

interface Props {
  userId: string
  role: 'coach' | 'student' | 'admin'
}

export default function ClassroomRealtimeSync({ userId, role }: Props) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channels: ReturnType<typeof supabase.channel>[] = []

    if (role === 'coach' || role === 'admin') {
      channels.push(
        supabase
          .channel(`classroom-sessions-${userId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'classroom_sessions', filter: `coach_id=eq.${userId}` },
            () => router.refresh(),
          )
          .subscribe(),
      )
    } else {
      // Watch enrollment changes (added/removed from a session)
      channels.push(
        supabase
          .channel(`classroom-enrollments-${userId}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'classroom_session_students', filter: `student_id=eq.${userId}` },
            () => router.refresh(),
          )
          .subscribe(),
      )
      // Watch session status changes (scheduled → active, active → ended)
      channels.push(
        supabase
          .channel(`classroom-status-${userId}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'classroom_sessions' },
            () => router.refresh(),
          )
          .subscribe(),
      )
    }

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [userId, role, router])

  return null
}
