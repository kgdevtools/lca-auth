"use server"

import { createClientForServerAction } from '@/utils/supabase/server'
import { redirect } from "next/navigation"
import { headers } from 'next/headers'
import { cookies } from 'next/headers'

export async function signUpWithGoogle(formData: FormData) {
  try {
    const tournamentFullName = formData.get('tournament_fullname') as string
    const chessaId = formData.get('chessa_id') as string

    // Validate required fields
    if (!tournamentFullName || !tournamentFullName.trim()) {
      redirect('/signup?message=Tournament Full Name is required')
    }

    const supabase = await createClientForServerAction()
    const origin = (await headers()).get('origin')

    if (!origin) {
      redirect('/signup?message=Unable to determine origin. Please try again.')
    }
  
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
      redirect(`/signup?message=${encodeURIComponent(error.message)}`)
    }

    if (!data?.url) {
      redirect('/signup?message=Failed to initiate Google sign in. Please try again.')
    }
    
    redirect(data.url)
  } catch (error) {
    redirect('/signup?message=An unexpected error occurred. Please try again.')
  }
}

export async function signUpWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  // Validate required fields
  if (!email || !email.trim()) {
    return { error: 'Email is required' }
  }

  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters long' }
  }

  const supabase = await createClientForServerAction()
  const origin = (await headers()).get('origin')

  if (!origin) {
    return { error: 'Unable to determine origin. Please try again.' }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  // If user is created but email confirmation is needed
  if (data.user && !data.session) {
    redirect('/signup/confirm-email?message=Please check your email to confirm your account')
  }

  // If user is created and session exists (email confirmation disabled)
  if (data.session && data.user) {
    // Mark this as a signup flow for potential onboarding
    const cookieStore = await cookies()
    cookieStore.set('is_signup', 'true', { 
      maxAge: 600,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    })
    
    // Check user role to determine redirect destination
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
      
      const isAdmin = profile?.role === 'admin'
      const redirectPath = isAdmin ? '/admin/admin-dashboard' : '/user'
      
      redirect(redirectPath)
    } catch (profileError) {
      // If profile check fails, redirect to user page anyway
      redirect('/user')
    }
  }

  return { error: 'An unexpected error occurred' }
}
