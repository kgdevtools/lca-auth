'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, Loader2, CheckCircle2, Circle } from 'lucide-react'
import { deleteLessonAction } from '@/app/academy/lesson/add/actions'
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
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLessonType(contentType: string, blocks: LessonCardProps['blocks']): string {
  if (!blocks || blocks.length === 0) return contentType.toLowerCase()
  const types = new Set(blocks.map(b => b.type).filter(Boolean))
  if (types.has('puzzle'))      return 'puzzle'
  if (types.has('study'))       return 'study'
  if (types.has('interactive')) return 'interactive'
  return contentType.toLowerCase()
}

interface TypeMeta { label: string; badge: string }

function getTypeMeta(type: string): TypeMeta {
  switch (type) {
    case 'puzzle':      return { label: 'Puzzle',      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' }
    case 'study':       return { label: 'Study',       badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' }
    case 'interactive': return { label: 'Interactive', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400' }
    default:            return { label: type.charAt(0).toUpperCase() + type.slice(1), badge: 'bg-muted text-muted-foreground' }
  }
}

const BASE_PTS: Record<string, number>  = { puzzle: 15, study: 20, interactive: 25 }
const DIFF_MULT: Record<string, number> = { easy: 1.0, medium: 1.25, hard: 1.5 }

function estimatePoints(type: string, difficulty: string | null | undefined): number {
  const base = BASE_PTS[type] ?? 15
  const mult = DIFF_MULT[(difficulty ?? 'easy').toLowerCase()] ?? 1.0
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
}: LessonCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isHovered, setIsHovered]   = useState(false)

  const rawType       = getLessonType(content_type, blocks)
  const { label, badge } = getTypeMeta(rawType)
  const pts           = estimatePoints(rawType, difficulty)
  const isCompleted   = lessonStatus === 'completed'
  const isInProgress  = lessonStatus === 'in_progress'
  const showStatus    = lessonStatus !== undefined

  const formattedDate = new Date(created_at).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
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
        )}>
          <span className={cn('shrink-0 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded', badge)}>
            {label}
          </span>
          <span className="flex-1 min-w-0 text-xs text-muted-foreground truncate">
            {title}
          </span>
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-3 h-3" />
            Done
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground/60">
            {formattedDate}
          </span>
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
          'relative flex flex-col h-full rounded-md border border-border bg-card overflow-hidden',
          'transition-all duration-200 ease-out',
          'group-hover:-translate-y-0.5 group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] dark:group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)]',
          isDeleting && 'opacity-40 pointer-events-none',
        )}
      >
        <div className="flex flex-col flex-1 p-4">

          {/* Top row: type badge + status/actions */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={cn('text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded', badge)}>
              {label}
            </span>

            <div className="flex items-center gap-1.5">
              {/* Status (students only) */}
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

              {/* Actions (coaches/admins) */}
              {showActions && (
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
                    {isDeleting
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />
                    }
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
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1 mb-4">
            {description || 'No description provided.'}
          </p>

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

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                ~{pts} pts
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formattedDate}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
