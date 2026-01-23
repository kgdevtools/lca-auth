import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const user = body.user
    if (!user || !user.id) return NextResponse.json({ error: 'missing user' }, { status: 400 })

    const supabase = await createClient()

    // Upsert profile row to link auth.users and profiles table
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        role: 'student',
      }, { onConflict: 'id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
