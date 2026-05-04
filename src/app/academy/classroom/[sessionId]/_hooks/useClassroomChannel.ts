'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Arrow } from '../_components/ClassroomBoard'

// ── Shared types ──────────────────────────────────────────────────────────────

export interface PresenceUser {
  userId:    string
  name:      string
  role:      'coach' | 'student'
  handRaised: boolean
}

// ── Broadcast payload types ───────────────────────────────────────────────────

export interface BoardUpdatePayload {
  fen:      string
  pgn:      string
  lastMove: { from: string; to: string; san: string }
  movedBy:  string
  ts:       number
}

export interface AnnotationUpdatePayload {
  arrows:     Arrow[]
  highlights: string[]
  ts:         number
}

export interface ModeChangePayload {
  mode: 'demonstration' | 'exercise'
  ts:   number
}

export interface PawnTransferPayload {
  activeStudentId: string | null
  ts:              number
}

export interface BoardFreezePayload {
  frozen: boolean
  ts:     number
}

// ── Hook interface ────────────────────────────────────────────────────────────

interface Options {
  sessionId:           string
  userId:              string
  userName:            string
  role:                'coach' | 'student'
  onBoardUpdate:       (p: BoardUpdatePayload)       => void
  onAnnotationUpdate?: (p: AnnotationUpdatePayload)  => void
  onModeChange?:       (p: ModeChangePayload)        => void
  onPawnTransfer?:     (p: PawnTransferPayload)      => void
  onBoardFreeze?:      (p: BoardFreezePayload)       => void
  onSessionEnd?:       ()                            => void
}

interface Return {
  isConnected:            boolean
  connectedUsers:         PresenceUser[]
  broadcastMove:          (fen: string, pgn: string, lastMove: { from: string; to: string; san: string }) => Promise<void>
  broadcastAnnotations:   (arrows: Arrow[], highlights: string[]) => Promise<void>
  broadcastModeChange:    (mode: 'demonstration' | 'exercise') => Promise<void>
  broadcastPawnTransfer:  (activeStudentId: string | null) => Promise<void>
  broadcastBoardFreeze:   (frozen: boolean) => Promise<void>
  updatePresence:         (patch: Partial<Pick<PresenceUser, 'handRaised'>>) => Promise<void>
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useClassroomChannel(opts: Options): Return {
  const channelRef            = useRef<RealtimeChannel | null>(null)
  const mountedAt             = useRef(Date.now())
  const [isConnected,         setIsConnected]    = useState(false)
  const [connectedUsers,      setConnectedUsers] = useState<PresenceUser[]>([])

  // My own presence payload — kept as a ref so updatePresence always merges
  // with the latest state without needing the hook to re-subscribe.
  const myPresence = useRef<PresenceUser>({
    userId:    opts.userId,
    name:      opts.userName,
    role:      opts.role,
    handRaised: false,
  })

  // Single ref for all callbacks — updated every render so the channel effect
  // never re-subscribes due to callback identity changes.
  const cb = useRef(opts)
  useEffect(() => { cb.current = opts })

  // ── Build connected-users list from raw presence state ──────────────────────
  const syncUsers = useCallback((channel: RealtimeChannel) => {
    const raw   = channel.presenceState<PresenceUser>()
    const seen  = new Set<string>()
    const users: PresenceUser[] = []
    // Flatten: each key can have multiple presences (multiple tabs from same user)
    for (const presences of Object.values(raw)) {
      for (const p of presences) {
        if (!seen.has(p.userId)) {
          seen.add(p.userId)
          users.push(p)
        }
      }
    }
    // Coaches first, then students, each group sorted alphabetically
    users.sort((a, b) => {
      if (a.role !== b.role) return a.role === 'coach' ? -1 : 1
      return (a.name ?? '').localeCompare(b.name ?? '')
    })
    setConnectedUsers(users)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel  = supabase.channel(`classroom:${opts.sessionId}`)

    // ── Presence listeners ──────────────────────────────────────────────────
    channel
      .on('presence', { event: 'sync' }, () => {
        syncUsers(channel)
      })
      // join/leave just trigger another sync for simplicity
      .on('presence', { event: 'join' }, () => syncUsers(channel))
      .on('presence', { event: 'leave' }, () => syncUsers(channel))

    // ── Broadcast listeners ─────────────────────────────────────────────────
      .on('broadcast', { event: 'board_update' }, ({ payload }: { payload: BoardUpdatePayload }) => {
        if (payload.ts <= mountedAt.current) return
        if (payload.movedBy === cb.current.userId) return
        cb.current.onBoardUpdate(payload)
      })
      .on('broadcast', { event: 'annotation_update' }, ({ payload }: { payload: AnnotationUpdatePayload }) => {
        if (payload.ts <= mountedAt.current) return
        cb.current.onAnnotationUpdate?.(payload)
      })
      .on('broadcast', { event: 'mode_change' }, ({ payload }: { payload: ModeChangePayload }) => {
        if (payload.ts <= mountedAt.current) return
        cb.current.onModeChange?.(payload)
      })
      .on('broadcast', { event: 'pawn_transfer' }, ({ payload }: { payload: PawnTransferPayload }) => {
        if (payload.ts <= mountedAt.current) return
        cb.current.onPawnTransfer?.(payload)
      })
      .on('broadcast', { event: 'board_freeze' }, ({ payload }: { payload: BoardFreezePayload }) => {
        if (payload.ts <= mountedAt.current) return
        cb.current.onBoardFreeze?.(payload)
      })
      .on('broadcast', { event: 'session_end' }, () => {
        cb.current.onSessionEnd?.()
      })

      .subscribe(async (status) => {
        setIsConnected(status === 'SUBSCRIBED')
        if (status === 'SUBSCRIBED') {
          // Announce ourselves to the room
          await channel.track(myPresence.current)
        }
        if (status === 'CHANNEL_ERROR') {
          console.error('[classroom] realtime channel error')
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      setIsConnected(false)
      setConnectedUsers([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.sessionId, opts.userId, syncUsers])

  // ── Exported functions ────────────────────────────────────────────────────

  const broadcastMove = useCallback(async (
    fen: string,
    pgn: string,
    lastMove: { from: string; to: string; san: string },
  ) => {
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'board_update',
      payload: { fen, pgn, lastMove, movedBy: opts.userId, ts: Date.now() },
    })
  }, [opts.userId])

  const broadcastAnnotations = useCallback(async (arrows: Arrow[], highlights: string[]) => {
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'annotation_update',
      payload: { arrows, highlights, ts: Date.now() },
    })
  }, [])

  const broadcastModeChange = useCallback(async (mode: 'demonstration' | 'exercise') => {
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'mode_change',
      payload: { mode, ts: Date.now() } satisfies ModeChangePayload,
    })
  }, [])

  const broadcastPawnTransfer = useCallback(async (activeStudentId: string | null) => {
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'pawn_transfer',
      payload: { activeStudentId, ts: Date.now() } satisfies PawnTransferPayload,
    })
  }, [])

  const broadcastBoardFreeze = useCallback(async (frozen: boolean) => {
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'board_freeze',
      payload: { frozen, ts: Date.now() } satisfies BoardFreezePayload,
    })
  }, [])

  // Merges patch into own presence and re-tracks — all clients see the update
  // via their presence.sync handler.
  const updatePresence = useCallback(async (patch: Partial<Pick<PresenceUser, 'handRaised'>>) => {
    myPresence.current = { ...myPresence.current, ...patch }
    await channelRef.current?.track(myPresence.current)
  }, [])

  return {
    isConnected,
    connectedUsers,
    broadcastMove,
    broadcastAnnotations,
    broadcastModeChange,
    broadcastPawnTransfer,
    broadcastBoardFreeze,
    updatePresence,
  }
}
