'use client'

import { useState, useCallback, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, FlipVertical, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { persistSessionState, grantPawn, revokePawn, addSessionStudent, removeSessionStudent } from '@/actions/academy/classroomActions'
import type { ClassroomSession, SessionMode } from '@/services/classroomService'
import { useClassroomChannel, type BoardUpdatePayload, type AnnotationUpdatePayload, type ModeChangePayload, type PawnTransferPayload, type BoardFreezePayload } from '../_hooks/useClassroomChannel'
import ClassroomBoard, { type MoveResult, type Arrow } from './ClassroomBoard'
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

export default function CoachView({ session, userId, userName, enrolledStudents, coachStudents }: CoachViewProps) {
  const router = useRouter()
  const [, startEnrollTransition] = useTransition()

  const [fen,             setFen]             = useState(session.current_fen)
  const [pgn,             setPgn]             = useState(session.current_pgn)
  const [mode,            setMode]            = useState<SessionMode>(session.mode)
  const [frozen,          setFrozen]          = useState(session.board_frozen)
  const [activeStudentId, setActiveStudentId] = useState<string | null>(session.active_student_id)
  const [enrolled,        setEnrolled]        = useState<EnrolledStudent[]>(enrolledStudents)
  const [remoteArrows,     setRemoteArrows]     = useState<Arrow[]>([])
  const [remoteHighlights, setRemoteHighlights] = useState<string[]>([])
  const [orientation,      setOrientation]      = useState<'white' | 'black'>('white')
  const [mobileTab,        setMobileTab]        = useState<'video' | 'session'>('session')
  const [stripOpen,        setStripOpen]        = useState(false)

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

    // Coach receives board updates from students in exercise mode
    onBoardUpdate: useCallback((payload: BoardUpdatePayload) => {
      setFen(payload.fen)
      setPgn(payload.pgn)
    }, []),

    // Phase 8: receive annotation updates from the move-holder
    onAnnotationUpdate: useCallback((payload: AnnotationUpdatePayload) => {
      setRemoteArrows(payload.arrows)
      setRemoteHighlights(payload.highlights)
    }, []),

    onModeChange:   useCallback((p: ModeChangePayload)    => setMode(p.mode), []),
    onPawnTransfer: useCallback((p: PawnTransferPayload)  => setActiveStudentId(p.activeStudentId), []),
    onBoardFreeze:  useCallback((p: BoardFreezePayload)   => setFrozen(p.frozen), []),

    onSessionEnd: useCallback(() => {
      router.push('/academy/classroom')
    }, [router]),
  })

  // ── Board writability ────────────────────────────────────────────────────────
  // Coach controls board in demo mode; in exercise mode the pawn-holder does
  const isWritable = mode === 'demonstration' && !frozen

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleMove = useCallback((result: MoveResult) => {
    setFen(result.newFen)
    setPgn(result.newPgn)
    broadcastMove(result.newFen, result.newPgn, { from: result.from, to: result.to, san: result.san })
    persistSessionState(session.id, result.newFen, result.newPgn).catch(console.error)
  }, [session.id, broadcastMove])

  const annotationDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleAnnotationsChange = useCallback((arrows: Arrow[], highlights: string[]) => {
    if (annotationDebounce.current) clearTimeout(annotationDebounce.current)
    annotationDebounce.current = setTimeout(() => {
      broadcastAnnotations(arrows, highlights)
    }, 150)
  }, [broadcastAnnotations])

  const applyPosition = useCallback((newFen: string, newPgn: string) => {
    setFen(newFen)
    setPgn(newPgn)
    setRemoteArrows([])
    setRemoteHighlights([])
    broadcastMove(newFen, newPgn, { from: '', to: '', san: '' })
    broadcastAnnotations([], [])
    persistSessionState(session.id, newFen, newPgn).catch(console.error)
  }, [broadcastMove, broadcastAnnotations, session.id])

  const FEN_START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const handleReset   = useCallback(() => applyPosition(FEN_START, ''), [applyPosition])
  const handleSetFen  = useCallback((fen: string) => applyPosition(fen, ''), [applyPosition])
  const handleLoadPgn = useCallback((fen: string, pgn: string) => applyPosition(fen, pgn), [applyPosition])

  const handleGrantPawn = useCallback(async (studentId: string, studentName: string) => {
    const isRevoke = activeStudentId === studentId
    const next = isRevoke ? null : studentId
    setActiveStudentId(next)
    await broadcastPawnTransfer(next)
    try {
      if (isRevoke) {
        await revokePawn(session.id)
      } else {
        await grantPawn(session.id, studentId, studentName)
      }
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

  // Students not yet enrolled (for the add dropdown)
  const enrolledIds = new Set(enrolled.map(e => e.id))
  const availableToAdd = coachStudents.filter(s => !enrolledIds.has(s.id))

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] overflow-hidden">
      <SessionHeader session={session} role="coach" />
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

      {/* Main layout: board | sidebar */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Board */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <ClassroomBoard
            fen={fen}
            pgn={pgn}
            isWritable={isWritable}
            frozen={frozen}
            remoteArrows={remoteArrows}
            remoteHighlights={remoteHighlights}
            onMove={handleMove}
            onAnnotationsChange={handleAnnotationsChange}
            onReset={handleReset}
            onSetFen={handleSetFen}
            onLoadPgn={handleLoadPgn}
            controlsDisabled={session.status !== 'active'}
            orientation={orientation}
            onOrientationChange={setOrientation}
          />
        </div>

        {/* Sidebar */}
        <div className="w-[110px] sm:w-32 lg:w-64 flex-shrink-0 border-l border-border flex flex-col overflow-hidden bg-background">

          {/* Collapsible strip — mobile only */}
          <div className="flex-shrink-0 lg:hidden border-b border-border">
            <button
              onClick={() => setStripOpen(o => !o)}
              className="w-full flex items-center justify-center py-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {stripOpen && (
              <div className="flex items-center justify-center gap-3 pb-2">
                <button
                  onClick={() => setOrientation(o => o === 'white' ? 'black' : 'white')}
                  title="Flip board"
                  className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <FlipVertical className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Tab bar — mobile only */}
          <div className="flex-shrink-0 flex lg:hidden border-b border-border">
            <button
              onClick={() => setMobileTab('video')}
              className={cn(
                'flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-colors',
                mobileTab === 'video' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >Video</button>
            <button
              onClick={() => setMobileTab('session')}
              className={cn(
                'flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide border-l border-border transition-colors',
                mobileTab === 'session' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >Session</button>
          </div>

          {/* VideoPanel: always on desktop, tab-controlled on mobile */}
          <div className={cn('flex-shrink-0', mobileTab !== 'video' && 'hidden lg:block')}>
            <VideoPanel sessionId={session.id} isCoach={true} sessionActive={session.status === 'active'} />
          </div>

          {/* Students section: always on desktop, tab-controlled on mobile */}
          <div className={cn(
            'flex flex-col flex-shrink-0 overflow-y-auto border-b border-border max-h-[40%]',
            mobileTab !== 'session' && 'hidden lg:flex',
          )}>
            <div className="flex-shrink-0 px-3 py-2 border-b border-border flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Students</p>
              <div className="flex items-center gap-2">
                {availableToAdd.length > 0 && (
                  <Select onValueChange={handleAddStudent}>
                    <SelectTrigger className="h-8 w-8 p-0 border-0 bg-transparent rounded-sm [&>svg]:hidden group transition-colors hover:bg-muted" title="Add student">
                      <span className="flex items-center justify-center w-full h-full">
                        <Plus className="w-4 h-4 text-muted-foreground transition-all duration-150 group-hover:text-foreground group-hover:scale-110" />
                      </span>
                    </SelectTrigger>
                    <SelectContent align="end" className="min-w-[180px]">
                      {availableToAdd.map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <span title={isConnected ? 'Connected' : 'Connecting…'} className="relative flex h-2 w-2">
                  {isConnected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                </span>
              </div>
            </div>
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

          {/* Moves — always visible */}
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
