import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { syncStudentLichessActivity } from '@/services/lichessSync.service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await syncStudentLichessActivity(user.id)

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed'
    console.error('[api/lichess/sync] Unexpected error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
