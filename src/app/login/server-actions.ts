"use server"

import { createClientForServerAction } from '@/utils/supabase/server'
import { redirect } from "next/navigation"
import { headers } from 'next/headers'

async function getRedirectUrl() {
  const headersList = await headers()
  const host = headersList.get('host') || ''
  
  // Check if we're in development by looking at the host
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1')
  
  if (isLocalhost) {
    return `http://${host}/auth/callback`
  }
  
  // In production, use the origin or fallback to env variable
  const origin = headersList.get('origin')
  return `${origin || process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
}

export async function signInWithGoogle() {
  const supabase = await createClientForServerAction()
  const redirectTo = await getRedirectUrl()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    },
  })
  
  if (error) {
    redirect(`/login?message=${error.message}`)
  }
  
  if (data.url) {
    redirect(data.url)
  }
  
  // Fallback
  redirect('/login?message=Could not authenticate')
}

export async function signInWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClientForServerAction()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect(`/login?message=${error.message}`)
  }

  redirect('/user')
}

export async function signInWithFacebook() {
  const supabase = await createClientForServerAction()
  const redirectTo = await getRedirectUrl()
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo,
    },
  })
  
  if (error) {
    redirect(`/login?message=${error.message}`)
  }
  
  if (data.url) {
    redirect(data.url)
  }
  
  redirect('/login?message=Could not authenticate')
}