'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LessonCard from './LessonCard'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2, CheckSquare, Square } from 'lucide-react'
import { bulkDeleteLessonsAction } from '@/app/academy/lesson/add/actions'

interface LessonItem {
  id: string
  title: string
  description: string | null
  content_type: string
  created_at: string
  created_by: string | null
  creatorName: string
  creatorRole: string | null
  blocks: Array<{ type?: string }> | null
  difficulty: string | null
  lessonStatus?: string
}

export default function LessonListClient({
  activelessons,
  completedLessons,
  isStudent,
  showActions,
}: {
  activelessons: LessonItem[]
  completedLessons: LessonItem[]
  isStudent: boolean
  showActions: boolean
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const allIds = activelessons.map(l => l.id)
  const allSelected = allIds.length > 0 && allIds.every(id => selectedIds.has(id))

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(allIds))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Delete ${selectedIds.size} lesson${selectedIds.size > 1 ? 's' : ''}? This cannot be undone.`)) return
    setIsBulkDeleting(true)
    try {
      await bulkDeleteLessonsAction(Array.from(selectedIds))
      setSelectedIds(new Set())
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete lessons')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const cardProps = (lesson: LessonItem) => ({
    id:           lesson.id,
    title:        lesson.title,
    description:  lesson.description,
    content_type: lesson.content_type,
    created_at:   lesson.created_at,
    created_by:   lesson.created_by || '',
    creatorName:  lesson.creatorName,
    creatorRole:  lesson.creatorRole,
    blocks:       lesson.blocks,
    difficulty:   lesson.difficulty,
    showActions,
    lessonStatus: lesson.lessonStatus,
    isSelected:   selectedIds.has(lesson.id),
    onToggleSelect: showActions && !isStudent ? toggleSelect : undefined,
  })

  return (
    <div className="space-y-6">
      {/* Select all / bulk action toolbar — coaches/admins only */}
      {showActions && !isStudent && activelessons.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {allSelected
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : <Square className="w-4 h-4" />
            }
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          {selectedIds.size > 0 && (
            <span className="text-xs text-muted-foreground">
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* Active lessons grid */}
      {activelessons.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activelessons.map(lesson => (
            <LessonCard key={lesson.id} {...cardProps(lesson)} />
          ))}
        </div>
      )}

      {/* Completed lessons list */}
      {completedLessons.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground/50 mb-2">
            Completed · {completedLessons.length}
          </p>
          <div className="flex flex-col gap-1.5">
            {completedLessons.map(lesson => (
              <LessonCard key={lesson.id} {...cardProps(lesson)} />
            ))}
          </div>
        </div>
      )}

      {/* Floating bulk-action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-lg border border-border bg-background/95 backdrop-blur-sm shadow-xl">
          <span className="text-sm font-medium tabular-nums">
            {selectedIds.size} lesson{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="w-px h-4 bg-border" />
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isBulkDeleting}
            className="gap-1.5"
          >
            {isBulkDeleting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Trash2 className="w-3.5 h-3.5" />
            }
            Delete
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
            disabled={isBulkDeleting}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  )
}
