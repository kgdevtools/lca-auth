import { NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId } = await request.json()
  if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Verify access: must be coach OR enrolled student
  const { data: session } = await supabase
    .from('classroom_sessions')
    .select('coach_id')
    .eq('id', sessionId)
    .single()

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const isCoach = session.coach_id === profile.id

  if (!isCoach) {
    const { data: enrollment } = await supabase
      .from('classroom_session_students')
      .select('student_id')
      .eq('session_id', sessionId)
      .eq('student_id', profile.id)
      .single()

    if (!enrollment) return NextResponse.json({ error: 'Not enrolled in this session' }, { status: 403 })
  }

  const apiKey    = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 })
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: profile.id,
    name:     profile.full_name ?? 'Participant',
  })

  at.addGrant({
    roomJoin:       true,
    room:           `classroom-${sessionId}`,
    canPublish:     true,
    canSubscribe:   true,
    canPublishData: true,
  })

  return NextResponse.json({ token: await at.toJwt() })
}
