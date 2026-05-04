'use client'

import '@livekit/components-styles'

import { useState, useCallback } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  ParticipantTile,
  TrackToggle,
} from '@livekit/components-react'
import { Track, type RemoteParticipant } from 'livekit-client'
import { MonitorPlay, Mic, Video, Monitor, LogOut, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface VideoPanelProps {
  sessionId:     string
  isCoach:       boolean
  sessionActive: boolean
}

function MuteButton({ participantIdentity, roomName }: { participantIdentity: string; roomName: string }) {
  const [muting, setMuting] = useState(false)
  const participants = useParticipants()

  const handleMute = async () => {
    const participant = participants.find(p => p.identity === participantIdentity) as RemoteParticipant | undefined
    const pub = participant
      ? Array.from(participant.audioTrackPublications.values()).find(p => p.trackSid)
      : undefined
    const trackSid = pub?.trackSid
    if (!trackSid) return

    setMuting(true)
    try {
      void fetch('/api/classroom/livekit-mute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ roomName, participantIdentity, trackSid, muted: true }),
      })
    } finally {
      setMuting(false)
    }
  }

  return (
    <button
      onClick={handleMute}
      disabled={muting}
      title="Mute participant"
      className="absolute top-1 right-1 z-10 p-1 rounded bg-black/50 text-white hover:bg-black/70 transition-colors"
    >
      <VolumeX className="w-3 h-3" />
    </button>
  )
}

function VideoGrid({ isCoach, roomName }: { isCoach: boolean; roomName: string }) {
  const tracks = useTracks([
    { source: Track.Source.Camera,      withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ])

  if (tracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-[11px] text-muted-foreground">
        No participants yet
      </div>
    )
  }

  return (
    <div className={cn('bg-black', tracks.length === 1 ? 'flex flex-col' : 'grid grid-cols-2 gap-px')}>
      {tracks.map(trackRef => (
        <div key={`${trackRef.participant.identity}-${trackRef.source}`} className="relative w-full">
          <ParticipantTile trackRef={trackRef} className="w-full aspect-video overflow-hidden" />
          {isCoach && !trackRef.participant.isLocal && (
            <MuteButton
              participantIdentity={trackRef.participant.identity}
              roomName={roomName}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function VideoControls({ isCoach, onLeave }: { isCoach: boolean; onLeave: () => void }) {
  return (
    <div className="flex items-center justify-center gap-2 px-2 py-2 border-t border-border">
      <TrackToggle source={Track.Source.Microphone} className="p-1.5 rounded-sm hover:bg-muted transition-colors" showIcon title="Toggle microphone">
        <Mic className="w-3.5 h-3.5" />
      </TrackToggle>
      <TrackToggle source={Track.Source.Camera} className="p-1.5 rounded-sm hover:bg-muted transition-colors" showIcon title="Toggle camera">
        <Video className="w-3.5 h-3.5" />
      </TrackToggle>
      {isCoach && (
        <TrackToggle source={Track.Source.ScreenShare} className="p-1.5 rounded-sm hover:bg-muted transition-colors" showIcon title="Share screen">
          <Monitor className="w-3.5 h-3.5" />
        </TrackToggle>
      )}
      <button
        onClick={onLeave}
        className="p-1.5 rounded-sm hover:bg-destructive/10 text-destructive transition-colors ml-auto"
        title="Leave video call"
      >
        <LogOut className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function JoinedView({ isCoach, roomName, onLeave }: { isCoach: boolean; roomName: string; onLeave: () => void }) {
  return (
    <div className="flex flex-col">
      <RoomAudioRenderer />
      <VideoGrid isCoach={isCoach} roomName={roomName} />
      <VideoControls isCoach={isCoach} onLeave={onLeave} />
    </div>
  )
}

export default function VideoPanel({ sessionId, isCoach, sessionActive }: VideoPanelProps) {
  const [token,    setToken]    = useState<string | null>(null)
  const [joining,  setJoining]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  const roomName = `classroom-${sessionId}`
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? ''

  const handleJoin = async () => {
    setJoining(true)
    setError(null)
    try {
      const res = await fetch('/api/classroom/livekit-token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sessionId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to get token')
      }
      const { token: jwt } = await res.json()
      setToken(jwt)
    } catch (err: any) {
      setError(err.message ?? 'Failed to join video')
    } finally {
      setJoining(false)
    }
  }

  const handleLeave = useCallback(() => {
    setToken(null)
  }, [])

  return (
    <div className="flex-shrink-0 border-b border-border">
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Video</p>
        {!token && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[11px] gap-1 px-2"
            onClick={handleJoin}
            disabled={!sessionActive || joining}
          >
            <MonitorPlay className="w-3 h-3" />
            {joining ? 'Joining…' : 'Join'}
          </Button>
        )}
      </div>

      {error && (
        <p className="px-3 pb-2 text-[11px] text-destructive">{error}</p>
      )}

      {token && (
        <LiveKitRoom
          token={token}
          serverUrl={livekitUrl}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={handleLeave}
        >
          <JoinedView isCoach={isCoach} roomName={roomName} onLeave={handleLeave} />
        </LiveKitRoom>
      )}
    </div>
  )
}
