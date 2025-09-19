"use server"

import { createClient } from '@/utils/supabase/server'
import { redirect } from "next/navigation"
import { headers } from 'next/headers'

export async function signInWithGoogle() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })
  if (error) {
    redirect(`/login?message=${error.message}`)
  }
  redirect(data.url)
}

export async function signInWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect(`/login?message=${error.message}`)
  }

  redirect('/')
}

export async function signInWithFacebook() {
  const supabase = await createClient()
  const origin = (await headers()).get('origin')
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })
  if (error) {
    redirect(`/login?message=${error.message}`)
  }
  redirect(data.url)
}




