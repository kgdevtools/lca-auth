'use client'

import { useState, useCallback, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { UserPlus, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { persistSessionState, grantPawn, revokePawn, addSessionStudent, removeSessionStudent } from '@/actions/academy/classroomActions'
import type { ClassroomSession, SessionMode } from '@/services/classroomService'
import { useClassroomChannel, type BoardUpdatePayload, type AnnotationUpdatePayload, type ModeChangePayload, type PawnTransferPayload, type BoardFreezePayload } from '../_hooks/useClassroomChannel'
import { useBoardNavigation, useStageMetrics } from '../_hooks/useBoardNavigation'
import ClassroomBoard, { type MoveResult, type Arrow } from './ClassroomBoard'
import BoardControlBar from './BoardControlBar'
import SessionHeader from './SessionHeader'
import ModeBar from './ModeBar'
import MoveList from './MoveList'
import PresencePanel from './PresencePanel'
import VideoPanel from './VideoPanel'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'

interface EnrolledStudent { id: string; full_name: string }

interface CoachViewProps {
  session:          ClassroomSession
  userId:           string
  userName:         string
  enrolledStudents: EnrolledStudent[]
  coachStudents:    EnrolledStudent[]
}

const FEN_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export default function CoachView({ session, userId, userName, enrolledStudents, coachStudents }: CoachViewProps) {
  const router = useRouter()
  const [, startEnrollTransition] = useTransition()

  const [fen,             setFen]             = useState(session.current_fen)
  const [pgn,             setPgn]             = useState(session.current_pgn)
  const [mode,            setMode]            = useState<SessionMode>(session.mode)
  const [frozen,          setFrozen]          = useState(session.board_frozen)
  const [activeStudentId, setActiveStudentId] = useState<string | null>(session.active_student_id)
  const [enrolled,        setEnrolled]        = useState<EnrolledStudent[]>(enrolledStudents)
  const [arrows,          setArrows]          = useState<Arrow[]>([])
  const [highlights,      setHighlights]      = useState<string[]>([])
  const [orientation,     setOrientation]     = useState<'white' | 'black'>('white')
  // Mobile-only: which bottom drawer panel is open (null = collapsed, board maximised)
  const [mobilePanel,     setMobilePanel]     = useState<'video' | 'session' | 'moves' | null>(null)

  const stageRef = useRef<HTMLDivElement>(null)
  const { isDesktop, boardSize } = useStageMetrics(stageRef)
  const nav = useBoardNavigation(pgn, fen)

  // ── Realtime ────────────────────────────────────────────────────────────────

  const {
    isConnected,
    connectedUsers,
    broadcastMove,
    broadcastAnnotations,
    broadcastModeChange,
    broadcastPawnTransfer,
    broadcastBoardFreeze,
  } = useClassroomChannel({
    sessionId: session.id,
    userId,
    userName,
    role: 'coach',

    onBoardUpdate: useCallback((payload: BoardUpdatePayload) => {
      setFen(payload.fen)
      setPgn(payload.pgn)
    }, []),

    onAnnotationUpdate: useCallback((payload: AnnotationUpdatePayload) => {
      setArrows(payload.arrows)
      setHighlights(payload.highlights)
    }, []),

    onModeChange:   useCallback((p: ModeChangePayload)    => setMode(p.mode), []),
    onPawnTransfer: useCallback((p: PawnTransferPayload)  => setActiveStudentId(p.activeStudentId), []),
    onBoardFreeze:  useCallback((p: BoardFreezePayload)   => setFrozen(p.frozen), []),

    onSessionEnd: useCallback(() => {
      router.push('/academy/classroom')
    }, [router]),
  })

  // Coach controls the board in demo mode; in exercise mode the pawn-holder does
  const isWritable = mode === 'demonstration' && !frozen
  const canMove    = isWritable && nav.isAtEnd

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleMove = useCallback((result: MoveResult) => {
    setFen(result.newFen)
    setPgn(result.newPgn)
    setArrows([])
    setHighlights([])
    broadcastMove(result.newFen, result.newPgn, { from: result.from, to: result.to, san: result.san })
    broadcastAnnotations([], [])
    persistSessionState(session.id, result.newFen, result.newPgn).catch(console.error)
  }, [session.id, broadcastMove, broadcastAnnotations])

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

  const applyPosition = useCallback((newFen: string, newPgn: string) => {
    setFen(newFen)
    setPgn(newPgn)
    setArrows([])
    setHighlights([])
    broadcastMove(newFen, newPgn, { from: '', to: '', san: '' })
    broadcastAnnotations([], [])
    persistSessionState(session.id, newFen, newPgn).catch(console.error)
  }, [broadcastMove, broadcastAnnotations, session.id])

  const handleReset   = useCallback(() => applyPosition(FEN_START, ''), [applyPosition])
  const handleSetFen  = useCallback((f: string) => applyPosition(f, ''), [applyPosition])
  const handleLoadPgn = useCallback((f: string, p: string) => applyPosition(f, p), [applyPosition])

  const handleGrantPawn = useCallback(async (studentId: string, studentName: string) => {
    const isRevoke = activeStudentId === studentId
    const next = isRevoke ? null : studentId
    setActiveStudentId(next)
    await broadcastPawnTransfer(next)
    try {
      if (isRevoke) await revokePawn(session.id)
      else await grantPawn(session.id, studentId, studentName)
    } catch {}
  }, [activeStudentId, broadcastPawnTransfer, session.id])

  const handleAddStudent = useCallback((studentId: string) => {
    const student = coachStudents.find(s => s.id === studentId)
    if (!student || enrolled.some(e => e.id === studentId)) return
    setEnrolled(prev => [...prev, student])
    startEnrollTransition(() => {
      addSessionStudent(session.id, studentId).catch(() => {
        setEnrolled(prev => prev.filter(e => e.id !== studentId))
      })
    })
  }, [coachStudents, enrolled, session.id, startEnrollTransition])

  const handleRemoveStudent = useCallback((studentId: string) => {
    setEnrolled(prev => prev.filter(e => e.id !== studentId))
    startEnrollTransition(() => {
      removeSessionStudent(session.id, studentId).catch(() => {
        const student = coachStudents.find(s => s.id === studentId)
        if (student) setEnrolled(prev => [...prev, student])
      })
    })
  }, [coachStudents, session.id, startEnrollTransition])

  const enrolledIds    = new Set(enrolled.map(e => e.id))
  const availableToAdd = coachStudents.filter(s => !enrolledIds.has(s.id))

  const hasAnnotations = arrows.length > 0 || highlights.length > 0
  const positionDisabled = session.status !== 'active'

  return (
    <div className="flex flex-col h-[calc(100dvh-5rem)] overflow-hidden">
      <SessionHeader session={session} role="coach" onlineCount={connectedUsers.length} enrolledCount={enrolled.length} />
      <ModeBar
        sessionId={session.id}
        mode={mode}
        frozen={frozen}
        onModeChange={setMode}
        onFrozenChange={setFrozen}
        onBroadcastMode={broadcastModeChange}
        onBroadcastFreeze={broadcastBoardFreeze}
        disabled={session.status !== 'active'}
      />
      {session.status === 'scheduled' && (
        <div className="flex-shrink-0 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-900">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Session not started yet. Click "Start session" to go live.
          </p>
        </div>
      )}
      {session.status === 'ended' && (
        <div className="flex-shrink-0 px-4 py-2 bg-muted/50 border-b border-border">
          <p className="text-xs text-muted-foreground">This session has ended. Board is read-only.</p>
        </div>
      )}

      {/* Stage: board hero + panel. Desktop = side-by-side; mobile = board fills,
          controls always visible, Video/Students/Moves in a collapsible drawer. */}
      <div ref={stageRef} className="relative flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden lg:gap-3 lg:p-3">

        {/* Board column */}
        <div
          className="flex flex-col flex-1 min-h-0 min-w-0 lg:flex-none"
          style={isDesktop && boardSize > 0 ? { width: boardSize, height: boardSize } : undefined}
        >
          <div className="flex-1 min-h-0 flex items-center justify-center">
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

          {/* Mobile controls — ALWAYS visible (board + controls are the priority) */}
          <div className="lg:hidden flex-shrink-0 border-t border-border p-2 flex items-center gap-2">
            <div className="flex-1 min-w-0">
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
                onReset={handleReset}
                onSetFen={handleSetFen}
                onLoadPgn={handleLoadPgn}
                controlsDisabled={positionDisabled}
              />
            </div>
            <button
              onClick={() => setMobilePanel(p => (p ? null : 'moves'))}
              title="Video, students & moves"
              className={cn(
                'flex-shrink-0 h-9 px-2.5 rounded-sm border flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide transition-colors',
                mobilePanel ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted',
              )}
            >
              {mobilePanel ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              Panels
            </button>
          </div>
        </div>

        {/* Panel — one instance. Desktop right column; mobile bottom drawer (animated). */}
        <motion.div
          className="flex flex-col flex-shrink-0 overflow-hidden bg-card border-t border-border lg:border lg:rounded-md lg:flex-1 lg:min-w-[240px]"
          style={isDesktop && boardSize > 0 ? { height: boardSize } : undefined}
          animate={{ height: isDesktop ? (boardSize > 0 ? boardSize : 'auto') : (mobilePanel ? '58dvh' : 0) }}
          transition={isDesktop ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 38 }}
          initial={false}
        >
          {/* Tab bar — mobile only */}
          <div className="flex-shrink-0 flex items-stretch lg:hidden border-b border-border">
            {(['video', 'session', 'moves'] as const).map((p, i) => (
              <button
                key={p}
                onClick={() => setMobilePanel(p)}
                className={cn(
                  'flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors capitalize',
                  i > 0 && 'border-l border-border',
                  mobilePanel === p ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >{p === 'session' ? 'Students' : p}</button>
            ))}
            <button
              onClick={() => setMobilePanel(null)}
              title="Collapse"
              className="px-3 border-l border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Content — video + students + moves */}
          <div className="flex flex-col overflow-hidden flex-1 min-h-0">

            {/* VideoPanel: always mounted (call stays alive across tab switches / drawer collapse) */}
            <div className={cn('flex-shrink-0', mobilePanel !== 'video' && 'hidden lg:block')}>
              <VideoPanel sessionId={session.id} isCoach={true} sessionActive={session.status === 'active'} />
            </div>

            {/* Students */}
            <div className={cn(
              'flex flex-col overflow-y-auto border-b border-border',
              'flex-shrink-0 lg:flex-none lg:max-h-[38%]',
              mobilePanel !== 'session' && 'hidden lg:flex',
            )}>
              <div className="flex-shrink-0 px-3 py-2 border-b border-border flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  Students
                  <span className="ml-1.5 text-muted-foreground/60 normal-case tracking-normal">{enrolled.length}</span>
                </p>
                <div className="flex items-center gap-1.5">
                  {availableToAdd.length > 0 ? (
                    <Select onValueChange={handleAddStudent}>
                      <SelectTrigger
                        className="h-7 gap-1 px-2 border border-border bg-background rounded-sm [&>svg]:hidden group transition-colors hover:bg-muted text-[11px] font-medium text-foreground"
                        title="Add a student to this session"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <span className="hidden sm:inline">Add</span>
                      </SelectTrigger>
                      <SelectContent align="end" className="min-w-[180px]">
                        {availableToAdd.map(s => (
                          <SelectItem key={s.id} value={s.id} className="text-xs">
                            {s.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title={coachStudents.length === 0
                        ? 'No students are assigned to you yet — assign them under Academy → Students'
                        : 'All of your students are already in this session'}
                      className="h-7 gap-1 px-2 inline-flex items-center border border-border bg-background rounded-sm text-[11px] font-medium text-muted-foreground/50 cursor-not-allowed"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add</span>
                    </button>
                  )}
                  <span title={isConnected ? 'Connected' : 'Connecting…'} className="relative flex h-2 w-2">
                    {isConnected && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                    )}
                    <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                  </span>
                </div>
              </div>
              {coachStudents.length === 0 && (
                <div className="flex-shrink-0 px-3 py-2 border-b border-border bg-amber-50 dark:bg-amber-950/20">
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-snug">
                    No students are assigned to you yet. Assign students under{' '}
                    <span className="font-semibold">Academy → Students</span>, then add them here.
                  </p>
                </div>
              )}
              <PresencePanel
                users={connectedUsers}
                activeStudentId={activeStudentId}
                mode={mode}
                isCoach={true}
                sessionId={session.id}
                onGrantPawn={(studentId, name) => { void handleGrantPawn(studentId, name) }}
                enrolledStudents={enrolled}
                onRemoveStudent={handleRemoveStudent}
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

          {/* Controls — desktop only (mobile controls live under the board) */}
          <div className="hidden lg:block flex-shrink-0 border-t border-border p-2">
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
              onReset={handleReset}
              onSetFen={handleSetFen}
              onLoadPgn={handleLoadPgn}
              controlsDisabled={positionDisabled}
            />
          </div>
        </motion.div>
      </div>
    </div>
  )
}
