import { NextResponse } from 'next/server'
import { RoomServiceClient } from 'livekit-server-sdk'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { roomName, participantIdentity, trackSid, muted } = await request.json()
  if (!roomName || !participantIdentity || !trackSid) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Room name is classroom-{sessionId} — verify caller is coach
  const sessionId = roomName.replace(/^classroom-/, '')
  const { data: session } = await supabase
    .from('classroom_sessions')
    .select('coach_id')
    .eq('id', sessionId)
    .single()

  if (!session || session.coach_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const livekitUrl = process.env.LIVEKIT_URL
  const apiKey     = process.env.LIVEKIT_API_KEY
  const apiSecret  = process.env.LIVEKIT_API_SECRET

  if (!livekitUrl || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit not configured' }, { status: 500 })
  }

  const roomService = new RoomServiceClient(livekitUrl, apiKey, apiSecret)
  await roomService.mutePublishedTrack(roomName, participantIdentity, trackSid, muted ?? true)

  return NextResponse.json({ success: true })
}
