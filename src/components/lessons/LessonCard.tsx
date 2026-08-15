'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Loader2, CheckCircle2, Circle, Users, RotateCcw } from 'lucide-react'
import { deleteLessonAction } from '@/app/academy/lesson/add/actions'
import { LESSON_DIFFICULTY_RATING } from '@/lib/academyRating'
import { getBlockDefinition } from '@/lib/blockRegistry'
import type { BlockType } from '@/lib/constants/lessonBlocks'
import { cn } from '@/lib/utils'

interface LessonCardProps {
  id: string
  title: string
  description: string | null
  content_type: string
  created_at: string
  created_by: string
  creatorName: string
  creatorRole?: string | null
  blocks?: Array<{ type?: string }> | null
  difficulty?: string | null
  showActions?: boolean
  lessonStatus?: string
  isSelected?: boolean
  onToggleSelect?: (id: string) => void
  /** Coach/admin view only — students this lesson is assigned to. */
  assignedStudents?: Array<{ id: string; full_name: string }>
  /** Completed-lesson row only — what this lesson actually earned. */
  sessionStats?: { points: number; ratingDelta: number }
  /** Completed-lesson row only — how many times this lesson has been completed. */
  attempts?: number
}

// ── Gamification tier ────────────────────────────────────────────────────────
// Lessons are authored with beginner/intermediate/advanced/expert difficulty,
// but the rating/points math (LESSON_DIFFICULTY_RATING, DIFF_MULT below) only
// knows easy/medium/hard — map one to the other so the level badge and rating
// shown here are the *actual* value this lesson feeds into a student's Elo,
// not a label that never matches and silently falls back to a flat default.
const DIFFICULTY_TO_TIER: Record<string, 'easy' | 'medium' | 'hard'> = {
  beginner: 'easy', intermediate: 'medium', advanced: 'hard', expert: 'hard',
  easy: 'easy', medium: 'medium', hard: 'hard',
}

const TIER_LEVEL: Record<'easy' | 'medium' | 'hard', { level: number; icon: string }> = {
  easy:   { level: 1, icon: '♙' },
  medium: { level: 2, icon: '♘' },
  hard:   { level: 3, icon: '♖' },
}

function getTier(difficulty: string | null | undefined): 'easy' | 'medium' | 'hard' {
  return DIFFICULTY_TO_TIER[(difficulty ?? 'easy').toLowerCase()] ?? 'easy'
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLessonType(contentType: string, blocks: LessonCardProps['blocks']): string {
  // Combined lessons mix block types on purpose (puzzle + mcq + qa) — the
  // block-content sniffing below would otherwise misread one as a plain
  // "puzzle" lesson just because it happens to contain a puzzle block.
  if (contentType.toLowerCase() === 'combined') return 'combined'
  if (!blocks || blocks.length === 0) return contentType.toLowerCase()
  const types = new Set(blocks.map(b => b.type).filter(Boolean))
  if (types.has('puzzle'))      return 'puzzle'
  if (types.has('study'))       return 'study'
  if (types.has('interactive')) return 'interactive'
  return contentType.toLowerCase()
}

interface TypeMeta { label: string; iconPanel: string }

// `label` now only feeds icon `title`/alt text — the visible type badge was
// removed from both card variants in favor of the icon rail / icon glyph.
function getTypeMeta(type: string): TypeMeta {
  switch (type) {
    case 'puzzle':      return { label: 'Puzzle',      iconPanel: 'bg-amber-50 dark:bg-amber-950/30' }
    case 'study':       return { label: 'Study',       iconPanel: 'bg-blue-50 dark:bg-blue-950/30' }
    case 'interactive': return { label: 'Interactive', iconPanel: 'bg-violet-50 dark:bg-violet-950/30' }
    case 'combined':    return { label: 'Combined',    iconPanel: 'bg-teal-50 dark:bg-teal-950/30' }
    default:            return { label: type.charAt(0).toUpperCase() + type.slice(1), iconPanel: 'bg-muted/60' }
  }
}

// Same icon set the puzzle/lesson viewer uses (BLOCK_REGISTRY) — the card's
// rawType strings ('puzzle', 'study', 'interactive', ...) don't all line up
// 1:1 with BlockType keys ('interactive_study' vs 'interactive'), so map
// through rather than assume they match.
const TYPE_TO_BLOCK_TYPE: Record<string, BlockType> = {
  puzzle: 'puzzle',
  study: 'study',
  interactive: 'interactive_study',
  interactive_study: 'interactive_study',
  mcq: 'mcq',
  qa: 'qa',
  puzzle_storm: 'puzzle_storm',
}

function getTypeIcon(type: string): string {
  // No single BlockType for a mixed sequence — same glyph used in the type
  // picker/creator (LessonTypeSelectionModal, CombinedLessonCreator).
  if (type === 'combined') return '🧱'
  const blockType = TYPE_TO_BLOCK_TYPE[type]
  return (blockType && getBlockDefinition(blockType)?.icon) || '📄'
}

const BASE_PTS: Record<string, number>  = { puzzle: 15, study: 20, interactive: 25 }
const DIFF_MULT: Record<'easy' | 'medium' | 'hard', number> = { easy: 1.0, medium: 1.25, hard: 1.5 }

function estimatePoints(type: string, difficulty: string | null | undefined): number {
  const base = BASE_PTS[type] ?? 15
  const mult = DIFF_MULT[getTier(difficulty)]
  return Math.round(base * mult)
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LessonCard({
  id,
  title,
  description,
  content_type,
  created_at,
  creatorName,
  creatorRole,
  blocks,
  difficulty,
  showActions = true,
  lessonStatus,
  isSelected,
  onToggleSelect,
  assignedStudents,
  sessionStats,
  attempts,
}: LessonCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isHovered, setIsHovered]   = useState(false)

  const rawType                     = getLessonType(content_type, blocks)
  const { label, iconPanel } = getTypeMeta(rawType)
  const typeIcon                    = getTypeIcon(rawType)
  const pts               = estimatePoints(rawType, difficulty)
  const tier              = getTier(difficulty)
  const { level, icon: levelIcon } = TIER_LEVEL[tier]
  const tierRating        = LESSON_DIFFICULTY_RATING[tier]
  const isCompleted       = lessonStatus === 'completed'
  const isInProgress      = lessonStatus === 'in_progress'
  const showStatus        = lessonStatus !== undefined
  const isSelectMode      = onToggleSelect !== undefined

  const formattedDate = new Date(created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
  const formattedTime = new Date(created_at).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  })

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setIsDeleting(true)
    try {
      await deleteLessonAction(id)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete')
      setIsDeleting(false)
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    router.push(`/academy/lesson/${id}/edit`)
  }

  // The checkbox is the only thing that toggles selection — the rest of the
  // card always navigates to the lesson viewer, select mode or not (it used
  // to swallow the whole card's click while select mode was active, which
  // for coaches/admins is effectively always, since it's on for any non-
  // student view).
  const handleSelectClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleSelect?.(id)
  }

  // ── Completed: compact row ───────────────────────────────────────────────

  if (isCompleted) {
    return (
      <Link
        href={`/academy/lesson/${id}`}
        className="block group outline-none focus-visible:ring-2 focus-visible:ring-foreground/20 rounded"
      >
        <div className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded border border-border/40 bg-muted/40',
          'transition-colors duration-150 group-hover:bg-muted/60',
          isDeleting && 'opacity-40 pointer-events-none',
          isSelected && 'ring-2 ring-primary border-primary',
        )}>
          {isSelectMode && (
            <button
              type="button"
              onClick={handleSelectClick}
              className={cn('w-4 h-4 rounded-sm border-2 flex-shrink-0 flex items-center justify-center transition-colors', isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40')}
              aria-label={isSelected ? 'Deselect lesson' : 'Select lesson'}
            >
              {isSelected && <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </button>
          )}
          <span className="shrink-0 text-base leading-none" title={label} aria-hidden>{typeIcon}</span>
          <span className="flex-1 min-w-0 text-xs text-muted-foreground truncate">{title}</span>
          {sessionStats && (sessionStats.points > 0 || sessionStats.ratingDelta !== 0) && (
            <span className="shrink-0 flex items-center gap-1.5 text-[10px] font-semibold tabular-nums">
              {sessionStats.points > 0 && (
                <span className="text-amber-600 dark:text-amber-400">+{sessionStats.points} pts</span>
              )}
              {sessionStats.ratingDelta !== 0 && (
                <span className={sessionStats.ratingDelta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                  {sessionStats.ratingDelta > 0 ? '+' : ''}{sessionStats.ratingDelta} rtg
                </span>
              )}
            </span>
          )}
          {!!attempts && (
            <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground" title={`Completed ${attempts} time${attempts === 1 ? '' : 's'}`}>
              <RotateCcw className="w-2.5 h-2.5" />
              {attempts}×
            </span>
          )}
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Done
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground/60">{formattedDate}, {formattedTime}</span>
        </div>
      </Link>
    )
  }

  // ── Active: full card ────────────────────────────────────────────────────

  return (
    <Link
      href={`/academy/lesson/${id}`}
      className="block group outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 rounded-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          'relative flex h-full rounded-md border border-border bg-card overflow-hidden',
          'transition-all duration-200 ease-out',
          'group-hover:-translate-y-0.5 group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] dark:group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)]',
          isDeleting && 'opacity-40 pointer-events-none',
          isSelected && 'ring-2 ring-primary border-primary',
        )}
      >
        {/* Select checkbox overlay — the only part of the card that selects
            instead of navigating */}
        {isSelectMode && (
          <button
            type="button"
            onClick={handleSelectClick}
            className="absolute top-3 left-3 z-10"
            aria-label={isSelected ? 'Deselect lesson' : 'Select lesson'}
          >
            <div className={cn('w-5 h-5 rounded-sm border-2 flex items-center justify-center transition-colors shadow-sm', isSelected ? 'bg-primary border-primary' : 'bg-background/90 border-muted-foreground/40')}>
              {isSelected && <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </div>
          </button>
        )}

        {/* Type icon rail — left-aligned, fills the full card height, same
            icon set as the puzzle/lesson viewer (BLOCK_REGISTRY). */}
        <div className={cn('shrink-0 w-[35%] flex items-center justify-center', iconPanel)}>
          <span className="text-4xl sm:text-5xl leading-none select-none" aria-hidden>{typeIcon}</span>
        </div>

        <div className={cn('flex flex-col flex-1 min-w-0 p-4', isSelectMode && 'pl-10')}>

          {/* Top row: status/actions — type is already shown by the icon rail */}
          <div className="flex items-center justify-end gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              {showStatus && (
                <span className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded',
                  isInProgress
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground',
                )}>
                  <Circle className="w-2.5 h-2.5" />
                  {isInProgress ? 'In progress' : 'To do'}
                </span>
              )}

              {showActions && !isSelectMode && (
                <div className={cn(
                  'flex items-center gap-0.5 transition-opacity duration-150',
                  isHovered ? 'opacity-100' : 'opacity-0',
                )}>
                  <button
                    onClick={handleEdit}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title="Edit lesson"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete lesson"
                  >
                    {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold tracking-tight leading-snug line-clamp-2 text-foreground mb-1.5">
            {title}
          </h3>

          {/* Description */}
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1 mb-2">
            {description || 'No description provided.'}
          </p>

          {/* Assigned students — coach/admin view only */}
          {assignedStudents && assignedStudents.length > 0 && (
            <div className="flex items-center gap-1 mb-2 min-w-0">
              <Users className="w-3 h-3 text-muted-foreground/60 flex-shrink-0" />
              <span className="text-[10px] text-muted-foreground truncate">
                {assignedStudents.slice(0, 2).map(s => s.full_name).join(', ')}
                {assignedStudents.length > 2 && ` +${assignedStudents.length - 2} more`}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-end justify-between pt-3 border-t border-border/60 gap-2">
            <div className="flex flex-col min-w-0">
              {creatorRole && (
                <span className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground/50 leading-tight">
                  {creatorRole}
                </span>
              )}
              <span className="text-[11px] font-medium text-muted-foreground truncate leading-snug">
                {creatorName}
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                title={`Level ${level} · counts as ${tierRating} rating`}
              >
                <span className="leading-none">{levelIcon}</span>
                {tierRating}
              </span>
              <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                ~{pts} pts
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
