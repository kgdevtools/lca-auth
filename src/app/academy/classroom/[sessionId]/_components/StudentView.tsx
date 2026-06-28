'use client'

import { useState, useCallback, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Hand, FlipVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { logClassroomEvent, getSessionState, persistSessionState } from '@/actions/academy/classroomActions'
import type { ClassroomSession } from '@/services/classroomService'
import { useClassroomChannel, type BoardUpdatePayload, type AnnotationUpdatePayload, type ModeChangePayload, type PawnTransferPayload, type BoardFreezePayload } from '../_hooks/useClassroomChannel'
import { useBoardNavigation, useStageMetrics } from '../_hooks/useBoardNavigation'
import ClassroomBoard from './ClassroomBoard'
import BoardControlBar from './BoardControlBar'
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
  const [fen,         setFen]         = useState(session.current_fen)
  const [pgn,         setPgn]         = useState(session.current_pgn)
  const [frozen,      setFrozen]      = useState(session.board_frozen)
  const [activeStudentId, setActiveStudentId] = useState<string | null>(session.active_student_id)
  const [arrows,      setArrows]      = useState<Arrow[]>([])
  const [highlights,  setHighlights]  = useState<string[]>([])
  const [handRaised,  setHandRaised]  = useState(false)
  const [isPending,   startTransition] = useTransition()
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  // Mobile-only: which bottom panel is open (null = collapsed, board maximised)
  const [mobilePanel, setMobilePanel] = useState<'video' | 'session' | 'moves' | null>('session')

  const stageRef = useRef<HTMLDivElement>(null)
  const { isDesktop, boardSize } = useStageMetrics(stageRef)
  const nav = useBoardNavigation(pgn, fen)

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
      setArrows(payload.arrows)
      setHighlights(payload.highlights)
    }, []),

    onModeChange:   useCallback((_p: ModeChangePayload)   => { /* Phase 7 */ }, []),
    onPawnTransfer: useCallback((p: PawnTransferPayload)  => setActiveStudentId(p.activeStudentId), []),
    onBoardFreeze:  useCallback((p: BoardFreezePayload)   => setFrozen(p.frozen), []),

    onSessionEnd: useCallback(() => {
      router.push('/academy/classroom')
    }, [router]),
  })

  // Student can move only when they hold the pawn, board isn't frozen, at live end
  const isWritable = activeStudentId === userId && !frozen
  const canMove    = isWritable && nav.isAtEnd

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
  const handleAnnotationsChange = useCallback((a: Arrow[], h: string[]) => {
    setArrows(a)
    setHighlights(h)
    if (annotationDebounce.current) clearTimeout(annotationDebounce.current)
    annotationDebounce.current = setTimeout(() => { broadcastAnnotations(a, h) }, 150)
  }, [broadcastAnnotations])

  const clearAnnotations = useCallback(() => {
    setArrows([])
    setHighlights([])
    broadcastAnnotations([], [])
  }, [broadcastAnnotations])

  const handleMove = useCallback((result: { from: string; to: string; san: string; newFen: string; newPgn: string }) => {
    setFen(result.newFen)
    setPgn(result.newPgn)
    setArrows([])
    setHighlights([])
    broadcastMove(result.newFen, result.newPgn, { from: result.from, to: result.to, san: result.san })
    broadcastAnnotations([], [])
    persistSessionState(session.id, result.newFen, result.newPgn).catch(console.error)
  }, [broadcastMove, broadcastAnnotations, session.id])

  const handleRaiseHand = () => {
    const next = !handRaised
    setHandRaised(next)
    updatePresence({ handRaised: next })
    startTransition(async () => {
      try { await logClassroomEvent(session.id, next ? 'raise_hand' : 'lower_hand') } catch {}
    })
  }

  const notStarted = session.status === 'scheduled'
  const ended      = session.status === 'ended'

  const togglePanel = (p: 'video' | 'session' | 'moves') =>
    setMobilePanel(cur => (cur === p ? null : p))

  const hasAnnotations = arrows.length > 0 || highlights.length > 0

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] overflow-hidden">
      <SessionHeader session={session} role="student" onlineCount={connectedUsers.length} />

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

      {/* Stage: board + panel side-by-side on desktop, stacked on mobile */}
      <div ref={stageRef} className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden lg:gap-3 lg:p-3">

        {/* Board column — sized to fit height on desktop (no side dead-space) */}
        <div
          className="flex-1 min-h-0 min-w-0 lg:flex-none flex items-center justify-center"
          style={isDesktop && boardSize > 0 ? { width: boardSize, height: boardSize } : undefined}
        >
          <ClassroomBoard
            fen={fen}
            pgn={pgn}
            displayFen={nav.displayFen}
            canMove={canMove}
            frozen={frozen}
            arrows={arrows}
            highlights={highlights}
            onMove={handleMove}
            onAnnotationsChange={handleAnnotationsChange}
            orientation={orientation}
            size={isDesktop ? boardSize : undefined}
          />
        </div>

        {/* Panel: bottom drawer (mobile) / right column (desktop) */}
        <div
          className="flex flex-col flex-shrink-0 overflow-hidden bg-card border-t border-border lg:border lg:rounded-md lg:flex-1 lg:min-w-[240px]"
          style={isDesktop && boardSize > 0 ? { height: boardSize } : undefined}
        >
          {/* Tab bar — mobile only */}
          <div className="flex-shrink-0 flex items-stretch lg:hidden border-b border-border">
            {(['video', 'session', 'moves'] as const).map((p, i) => (
              <button
                key={p}
                onClick={() => togglePanel(p)}
                className={cn(
                  'flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors capitalize',
                  i > 0 && 'border-l border-border',
                  mobilePanel === p ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >{p === 'session' ? 'Players' : p}</button>
            ))}
            <button
              onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')}
              title="Flip board"
              className="px-3 border-l border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <FlipVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Content — video + players + moves */}
          <div className="flex flex-col overflow-hidden flex-1 min-h-0 max-h-[42dvh] lg:max-h-none">

            {/* VideoPanel: always mounted (call stays alive across tab switches) */}
            <div className={cn('flex-shrink-0', mobilePanel !== 'video' && 'hidden lg:block')}>
              <VideoPanel sessionId={session.id} isCoach={false} sessionActive={session.status === 'active'} />
            </div>

            {/* Players */}
            <div className={cn(
              'flex flex-col overflow-y-auto border-b border-border',
              'flex-shrink-0 lg:flex-none lg:max-h-[38%]',
              mobilePanel !== 'session' && 'hidden lg:flex',
            )}>
              <div className="flex-shrink-0 px-3 py-2 border-b border-border flex items-center justify-between">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">In this session</p>
                <span title={isConnected ? 'Connected' : 'Connecting…'} className="relative flex h-2 w-2">
                  {isConnected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                </span>
              </div>
              <PresencePanel
                users={connectedUsers}
                activeStudentId={activeStudentId}
                mode={session.mode}
                isCoach={false}
              />
            </div>

            {/* Moves */}
            <div className={cn(
              'flex flex-col overflow-hidden',
              'flex-1 min-h-0 lg:flex-1',
              mobilePanel !== 'moves' && 'hidden lg:flex',
            )}>
              <div className="flex-shrink-0 px-3 py-2 border-b border-border">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Moves</p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <MoveList pgn={pgn} currentPly={nav.currentPly} onSelectPly={nav.goToPly} />
              </div>
            </div>
          </div>

          {/* Controls — pinned to the panel bottom */}
          <div className="flex-shrink-0 border-t border-border p-2 space-y-2">
            {session.status === 'active' && (
              <button
                onClick={handleRaiseHand}
                disabled={isPending}
                className={cn(
                  'w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors',
                  handRaised
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                    : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 border border-border',
                )}
              >
                <Hand className="w-4 h-4" />
                {handRaised ? 'Lower hand' : 'Raise hand'}
              </button>
            )}
            <BoardControlBar
              canBack={nav.canBack}
              canForward={nav.canForward}
              onStart={nav.goStart}
              onPrev={nav.goPrev}
              onNext={nav.goNext}
              onEnd={nav.goEnd}
              hasAnnotations={hasAnnotations}
              onClearAnnotations={clearAnnotations}
              onFlip={() => setOrientation(o => o === 'white' ? 'black' : 'white')}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
