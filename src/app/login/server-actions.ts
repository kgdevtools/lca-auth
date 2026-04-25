"use server"

import { createClientForServerAction } from '@/utils/supabase/server'
import { redirect } from "next/navigation"
import { headers } from 'next/headers'

async function getRedirectUrl() {
  const headersList = await headers()
  const host = headersList.get('host') || ''
  
  // Check if we're in development (localhost, 127.0.0.1, or local network IP)
  const isLocal = host.includes('localhost') || 
                  host.includes('127.0.0.1') ||
                  host.match(/^192\.168\.\d+\.\d+:?\d*$/) ||
                  host.match(/^10\.\d+\.\d+\.\d+:?\d*$/) ||
                  host.match(/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+:?\d*$/)
  
  if (isLocal) {
    return `http://${host}/auth/callback`
  }
  
  // Production
  const origin = headersList.get('origin')
  return `${origin || process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
}

export async function signInWithGoogle() {
  try {
    const supabase = await createClientForServerAction()
    const redirectTo = await getRedirectUrl()
    
    if (!redirectTo) {
      redirect('/login?message=Unable to determine redirect URL. Please try again.')
    }
    
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
    // Debug: log Supabase OAuth response for diagnosis
    // eslint-disable-next-line no-console
    console.log('signInWithOAuth result:', { url: data?.url, error: error?.message })

    if (error) {
      // eslint-disable-next-line no-console
      console.warn('Google signInWithOAuth error:', error)
      return { error: error.message }
    }

    if (!data?.url) {
      // eslint-disable-next-line no-console
      console.warn('Google signInWithOAuth missing data.url', data)
      return { error: 'Failed to initiate Google sign in. Please try again.' }
    }

    // Return the external URL to the client so the browser can navigate there.
    // The server-action already wrote the PKCE cookie via `createClientForServerAction()`.
    // We avoid calling `redirect()` to prevent server-action external-redirect issues.
    // eslint-disable-next-line no-console
    console.log('Returning Google OAuth URL to client')
    return { url: data.url }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('signInWithGoogle unexpected error:', error)
    return { error: 'An unexpected error occurred. Please try again.' }
  }
}

export async function signInWithEmail(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/login?message=Email and password are required')
  }

  let authError: string | null = null

  try {
    const supabase = await createClientForServerAction()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      authError = error.message
      console.error('signInWithEmail auth error:', error.message)
    }
  } catch (err) {
    console.error('signInWithEmail unexpected error:', err)
    redirect('/login?message=An unexpected error occurred. Please try again.')
  }

  if (authError) {
    redirect('/login?message=Invalid+email+or+password')
  }

  redirect('/user/overview')
}

export async function signInWithFacebook() {
  try {
    const supabase = await createClientForServerAction()
    const redirectTo = await getRedirectUrl()
    
    if (!redirectTo) {
      redirect('/login?message=Unable to determine redirect URL. Please try again.')
    }
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo,
      },
    })
    if (error) {
      return { error: error.message }
    }

    if (!data?.url) {
      return { error: 'Failed to initiate Facebook sign in. Please try again.' }
    }

    return { url: data.url }
  } catch (error) {
    redirect('/login?message=An unexpected error occurred. Please try again.')
  }
}