import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import NewSessionClient from './_components/NewSessionClient'

export const metadata: Metadata = {
  title: 'New Classroom Session — LCA Academy',
}

export default async function NewClassroomSessionPage() {
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) redirect('/login')

  if (profile.role !== 'coach' && profile.role !== 'admin') {
    redirect('/academy/classroom')
  }

  return <NewSessionClient />
}
