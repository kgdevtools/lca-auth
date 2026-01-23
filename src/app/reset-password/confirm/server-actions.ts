"use server"

import { createClientForServerAction } from '@/utils/supabase/server'
import { headers } from 'next/headers'

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string

  // Validate required fields
  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters long' }
  }

  const supabase = await createClientForServerAction()

  const { error } = await supabase.auth.updateUser({
    password
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
