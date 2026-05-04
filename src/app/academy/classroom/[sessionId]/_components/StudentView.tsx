'use client'

import { useState, useCallback, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Hand } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logClassroomEvent, getSessionState, persistSessionState } from '@/actions/academy/classroomActions'
import type { ClassroomSession } from '@/services/classroomService'
import { useClassroomChannel, type BoardUpdatePayload, type AnnotationUpdatePayload, type ModeChangePayload, type PawnTransferPayload, type BoardFreezePayload } from '../_hooks/useClassroomChannel'
import ClassroomBoard from './ClassroomBoard'
import SessionHeader from './SessionHeader'
import MoveList from './MoveList'
import PresencePanel from './PresencePanel'
import VideoPanel from './VideoPanel'
import type { Arrow } from './ClassroomBoard'

interface StudentViewProps {
  session:  ClassroomSession
  userId:   string
  userName: string
}

export default function StudentView({ session, userId, userName }: StudentViewProps) {
  const router = useRouter()

  // FEN and PGN start from DB snapshot; updated live via broadcast
  const [fen,             setFen]             = useState(session.current_fen)
  const [pgn,             setPgn]             = useState(session.current_pgn)
  const [frozen,          setFrozen]          = useState(session.board_frozen)
  const [activeStudentId, setActiveStudentId] = useState<string | null>(session.active_student_id)
  const [remoteArrows,    setRemoteArrows]    = useState<Arrow[]>([])
  const [remoteHighlights, setRemoteHighlights] = useState<string[]>([])
  const [handRaised,      setHandRaised]      = useState(false)
  const [isPending,       startTransition]    = useTransition()

  // ── Realtime ─────────────────────────────────────────────────────────────

  const { isConnected, connectedUsers, broadcastMove, broadcastAnnotations, updatePresence } = useClassroomChannel({
    sessionId: session.id,
    userId,
    userName,
    role: 'student',

    onBoardUpdate: useCallback((payload: BoardUpdatePayload) => {
      setFen(payload.fen)
      setPgn(payload.pgn)
    }, []),

    onAnnotationUpdate: useCallback((payload: AnnotationUpdatePayload) => {
      setRemoteArrows(payload.arrows)
      setRemoteHighlights(payload.highlights)
    }, []),

    onModeChange:   useCallback((_p: ModeChangePayload)   => { /* Phase 7 */ }, []),
    onPawnTransfer: useCallback((p: PawnTransferPayload)  => setActiveStudentId(p.activeStudentId), []),
    onBoardFreeze:  useCallback((p: BoardFreezePayload)   => setFrozen(p.frozen), []),

    onSessionEnd: useCallback(() => {
      router.push('/academy/classroom')
    }, [router]),
  })

  // Student can move only when they hold the pawn and board isn't frozen
  const isWritable = activeStudentId === userId && !frozen

  // After the channel connects, re-fetch DB state to close the timing gap between
  // the server render and when the Supabase subscription is established.
  useEffect(() => {
    if (!isConnected) return
    getSessionState(session.id)
      .then(({ fen: f, pgn: p, frozen: fr, activeStudentId: a }) => {
        setFen(f)
        setPgn(p)
        setFrozen(fr)
        setActiveStudentId(a)
      })
      .catch(() => {})
  }, [isConnected, session.id])

  const annotationDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleAnnotationsChange = useCallback((arrows: Arrow[], highlights: string[]) => {
    if (annotationDebounce.current) clearTimeout(annotationDebounce.current)
    annotationDebounce.current = setTimeout(() => {
      broadcastAnnotations(arrows, highlights)
    }, 150)
  }, [broadcastAnnotations])

  const handleRaiseHand = () => {
    const next = !handRaised
    setHandRaised(next)
    // Presence track propagates raise-hand to all clients via sync event
    updatePresence({ handRaised: next })
    startTransition(async () => {
      try {
        await logClassroomEvent(session.id, next ? 'raise_hand' : 'lower_hand')
      } catch {}
    })
  }

  const notStarted = session.status === 'scheduled'
  const ended      = session.status === 'ended'

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] overflow-hidden">
      <SessionHeader session={session} role="student" />

      {notStarted && (
        <div className="flex-shrink-0 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Your coach hasn't started this session yet. The board will go live when they begin.
          </p>
        </div>
      )}
      {ended && (
        <div className="flex-shrink-0 px-4 py-2 bg-muted/50 border-b border-border">
          <p className="text-xs text-muted-foreground">This session has ended.</p>
        </div>
      )}

      {/* Main layout: board | sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Board column */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <div className="flex-1 min-h-0">
            <ClassroomBoard
              fen={fen}
              pgn={pgn}
              isWritable={isWritable}
              frozen={frozen}
              remoteArrows={remoteArrows}
              remoteHighlights={remoteHighlights}
              onMove={useCallback((result) => {
                setFen(result.newFen)
                setPgn(result.newPgn)
                broadcastMove(result.newFen, result.newPgn, { from: result.from, to: result.to, san: result.san })
                persistSessionState(session.id, result.newFen, result.newPgn).catch(console.error)
              }, [broadcastMove, session.id])}
              onAnnotationsChange={handleAnnotationsChange}
            />
          </div>

          {/* Raise hand */}
          {session.status === 'active' && (
            <div className="flex-shrink-0 flex items-center justify-center px-4 py-3 border-t border-border">
              <button
                onClick={handleRaiseHand}
                disabled={isPending}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors',
                  handRaised
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border',
                )}
              >
                <Hand className="w-4 h-4" />
                {handRaised ? 'Lower hand' : 'Raise hand'}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-l border-border flex flex-col overflow-hidden bg-background">
          <VideoPanel sessionId={session.id} isCoach={false} sessionActive={session.status === 'active'} />
          <div className="flex-shrink-0 px-3 py-2 border-b border-border flex items-center justify-between">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">In this session</p>
            <span title={isConnected ? 'Connected' : 'Connecting…'} className="relative flex h-2 w-2">
              {isConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto border-b border-border">
            <PresencePanel
              users={connectedUsers}
              activeStudentId={activeStudentId}
              mode={session.mode}
              isCoach={false}
            />
          </div>

          <div className="flex-shrink-0 px-3 py-2 border-b border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Moves</p>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <MoveList pgn={pgn} />
          </div>
        </div>
      </div>
    </div>
  )
}
