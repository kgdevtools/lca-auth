'use client'

import '@livekit/components-styles'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  ParticipantTile,
  TrackToggle,
} from '@livekit/components-react'
import { Track, type RemoteParticipant } from 'livekit-client'
import { MonitorPlay, Mic, Video, Monitor, LogOut, VolumeX, GripVertical, Minus, Square as SquareIcon } from 'lucide-react'
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
      <div className="flex items-center justify-center h-full text-[11px] text-muted-foreground">
        No participants yet
      </div>
    )
  }

  return (
    <div className={cn('bg-black h-full min-h-0 overflow-hidden', tracks.length === 1 ? 'flex flex-col' : 'grid grid-cols-2 auto-rows-fr gap-px')}>
      {tracks.map(trackRef => (
        <div key={`${trackRef.participant.identity}-${trackRef.source}`} className="relative w-full h-full min-h-0">
          <ParticipantTile trackRef={trackRef} className="w-full h-full overflow-hidden" />
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
    <div className="flex items-center justify-center gap-2 px-2 py-2 border-t border-border bg-card">
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

// ── Floating, draggable + resizable Picture-in-Picture shell ──────────────────
// Rendered via a portal to <body> so it escapes the panel's overflow/hidden and
// can be moved anywhere on screen. Mounts once per call (no remount on drag) so
// the LiveKit connection is never interrupted.

const PIP_MIN_W = 180
const PIP_MAX_W = 640
const PIP_MIN_H = 160
const PIP_MAX_H = 720

type ResizeDir = 'e' | 's' | 'se'

function FloatingPiP({ isCoach, roomName, onLeave }: { isCoach: boolean; roomName: string; onLeave: () => void }) {
  const [pos, setPos]   = useState<{ x: number; y: number } | null>(null)
  const [size, setSize] = useState({ w: 300, h: 250 })
  const [minimised, setMin] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const drag   = useRef<{ dx: number; dy: number } | null>(null)
  const resize = useRef<{ dir: ResizeDir; startX: number; startY: number; startW: number; startH: number } | null>(null)

  // Initial placement: bottom-right, clamped to viewport.
  useEffect(() => {
    const w = Math.min(size.w, window.innerWidth - 24)
    setPos({ x: window.innerWidth - w - 12, y: Math.max(12, window.innerHeight - size.h - 16) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const clampPos = useCallback((x: number, y: number) => {
    const el = boxRef.current
    const w = el?.offsetWidth ?? size.w
    const h = el?.offsetHeight ?? size.h
    return {
      x: Math.max(8, Math.min(x, window.innerWidth  - w - 8)),
      y: Math.max(8, Math.min(y, window.innerHeight - h - 8)),
    }
  }, [size])

  const onDragDown = useCallback((e: React.PointerEvent) => {
    if (!pos) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
  }, [pos])

  const onResizeDown = (dir: ResizeDir) => (e: React.PointerEvent) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resize.current = { dir, startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h }
  }

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (drag.current) {
      setPos(clampPos(e.clientX - drag.current.dx, e.clientY - drag.current.dy))
      return
    }
    const r = resize.current
    if (!r || !pos) return
    let { w, h } = size
    if (r.dir === 'e' || r.dir === 'se') {
      w = Math.max(PIP_MIN_W, Math.min(r.startW + (e.clientX - r.startX), PIP_MAX_W, window.innerWidth - pos.x - 8))
    }
    if (r.dir === 's' || r.dir === 'se') {
      h = Math.max(PIP_MIN_H, Math.min(r.startH + (e.clientY - r.startY), PIP_MAX_H, window.innerHeight - pos.y - 8))
    }
    setSize({ w, h })
  }, [clampPos, pos, size])

  const endGesture = useCallback(() => { drag.current = null; resize.current = null }, [])

  const dockCorner = useCallback(() => {
    setPos(p => p ? { x: window.innerWidth - size.w - 12, y: window.innerHeight - size.h - 16 } : p)
  }, [size])

  if (!pos) return null

  return (
    <div
      ref={boxRef}
      className="fixed z-[60] flex flex-col rounded-md border border-border bg-card shadow-2xl overflow-hidden select-none"
      style={{ left: pos.x, top: pos.y, width: size.w, height: minimised ? undefined : size.h }}
      onPointerMove={onPointerMove}
      onPointerUp={endGesture}
      onPointerCancel={endGesture}
    >
      {/* Drag handle / title bar */}
      <div
        onPointerDown={onDragDown}
        className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5 bg-muted/60 border-b border-border cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex-1">Video</span>
        <button onClick={() => setMin(m => !m)} title={minimised ? 'Expand' : 'Minimise'}
          className="p-0.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          {minimised ? <SquareIcon className="w-3 h-3" /> : <Minus className="w-3.5 h-3.5" />}
        </button>
        <button onClick={dockCorner} title="Dock to corner"
          className="p-0.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Monitor className="w-3.5 h-3.5" />
        </button>
      </div>

      {!minimised && (
        <>
          <div className="flex-1 min-h-0">
            <VideoGrid isCoach={isCoach} roomName={roomName} />
          </div>
          <VideoControls isCoach={isCoach} onLeave={onLeave} />

          {/* Resize handles — right edge (X), bottom edge (Y), corner (both).
              touch-none so finger drags resize instead of scrolling. */}
          <div
            onPointerDown={onResizeDown('e')}
            className="absolute top-8 bottom-3 right-0 w-2.5 cursor-e-resize touch-none hover:bg-primary/20"
            title="Drag to resize width"
          />
          <div
            onPointerDown={onResizeDown('s')}
            className="absolute bottom-0 left-3 right-3 h-2.5 cursor-s-resize touch-none hover:bg-primary/20"
            title="Drag to resize height"
          />
          <div
            onPointerDown={onResizeDown('se')}
            className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize touch-none z-10"
            style={{ background: 'linear-gradient(135deg, transparent 50%, var(--color-border, #94a3b8) 50%)' }}
            title="Drag to resize"
          />
        </>
      )}
    </div>
  )
}

export default function VideoPanel({ sessionId, isCoach, sessionActive }: VideoPanelProps) {
  const [token,   setToken]   = useState<string | null>(null)
  const [joining, setJoining] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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
      {/* Header row — stays docked in the panel */}
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Video</p>
        {!token ? (
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
        ) : (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">In call ↗ floating</span>
        )}
      </div>

      {error && (
        <p className="px-3 pb-2 text-[11px] text-destructive">{error}</p>
      )}

      {!token && (
        <p className="px-3 pb-2 text-[10px] text-muted-foreground/70 leading-snug">
          Join to open a movable, resizable video window you can place anywhere on screen.
        </p>
      )}

      {/* Active call lives in a floating PiP portal so it survives tab/panel switches */}
      {mounted && token && createPortal(
        <LiveKitRoom
          token={token}
          serverUrl={livekitUrl}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={handleLeave}
        >
          <RoomAudioRenderer />
          <FloatingPiP isCoach={isCoach} roomName={roomName} onLeave={handleLeave} />
        </LiveKitRoom>,
        document.body,
      )}
    </div>
  )
}
