"use server"

import { createClientForServerAction } from '@/utils/supabase/server'
import { redirect } from "next/navigation"
import { headers } from 'next/headers'
import { cookies } from 'next/headers'

async function getRedirectUrl() {
  const headersList = await headers()
  const host = headersList.get('host') || ''

  const isLocal = host.includes('localhost') ||
                  host.includes('127.0.0.1') ||
                  host.match(/^192\.168\.\d+\.\d+:?\d*$/) ||
                  host.match(/^10\.\d+\.\d+\.\d+:?\d*$/) ||
                  host.match(/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:?\d*$/)

  if (isLocal) return `http://${host}/auth/callback`

  const origin = headersList.get('origin')
  return `${origin || process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
}

export async function signUpWithGoogle(_formData?: FormData) {
  try {
    const supabase = await createClientForServerAction()
    const redirectTo = await getRedirectUrl()
    if (!redirectTo) return { error: 'Unable to determine redirect URL. Please try again.' }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })

    if (error) return { error: error.message }
    if (!data?.url) return { error: 'Failed to initiate Google sign up. Please try again.' }
    return { url: data.url }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('signUpWithGoogle unexpected error:', error)
    return { error: 'An unexpected error occurred. Please try again.' }
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
