"use server"

import { createClientForServerAction } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string

  // Validate required fields
  if (!email || !email.trim()) {
    return { error: 'Email is required' }
  }

  const supabase = await createClientForServerAction()
  const origin = (await headers()).get('origin')

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password/confirm`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
