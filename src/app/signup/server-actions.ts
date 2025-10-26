"use server"

import { createClientForServerAction } from '@/utils/supabase/server'
import { redirect } from "next/navigation"
import { headers } from 'next/headers'
import { cookies } from 'next/headers'

export async function signUpWithGoogle(formData: FormData) {
  const tournamentFullName = formData.get('tournament_fullname') as string
  const chessaId = formData.get('chessa_id') as string

  // Validate required fields
  if (!tournamentFullName || !tournamentFullName.trim()) {
    redirect('/signup?message=Tournament Full Name is required')
  }

  const supabase = await createClientForServerAction()
  const origin = (await headers()).get('origin')
  
  // Store signup data in cookies temporarily to be used in callback
  const cookieStore = await cookies()
  cookieStore.set('signup_tournament_fullname', tournamentFullName, { 
    maxAge: 600, // 10 minutes
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  })
  
  if (chessaId && chessaId.trim()) {
    cookieStore.set('signup_chessa_id', chessaId, { 
      maxAge: 600,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })
  }

  // Mark this as a signup flow
  cookieStore.set('is_signup', 'true', { 
    maxAge: 600,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  })

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })
  
  if (error) {
    redirect(`/signup?message=${error.message}`)
  }
  
  redirect(data.url)
}
