'use server'

import { revalidatePath } from 'next/cache'
import { createLesson, deleteLesson, assignStudentsToLesson, getStudentsForDropdown } from '@/repositories/lesson/lessonRepository'
import { checkCoachRole, getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
import { parsePgn, injectAnnotationsIntoPgn, type MoveAnnotation } from '@/lib/pgnParser'

export async function fetchStudentsForAssignment() {
  await checkCoachRole()
  return getStudentsForDropdown()
}

interface PuzzleLessonInfo {
  title: string
  slug: string
  description?: string | undefined
  categoryId?: string | undefined
  difficulty?: string | undefined
  estimatedDurationMinutes?: string | undefined
  tags: string[]
}

interface StudyChapter {
  id: string
  name: string
  pgn: string
  orientation?: 'white' | 'black'
}

interface StudyDisplaySettings {
  showEval: boolean
  showClocks: boolean
  showArrows: boolean
  showHighlights: boolean
}

interface SolvePoint {
  moveIndex: number
  description?: string
  alternatives?: string[]
}

export async function createPuzzleLesson(
  lessonInfo: PuzzleLessonInfo,
  puzzles: Array<{ id: string; fen: string; solution: string; description: string; hint?: string; orientation?: 'white' | 'black' }>,
  studentIds: string[] = []
) {
  await checkCoachRole()

  if (!lessonInfo.title?.trim()) {
    throw new Error('Title is required')
  }

  if (!lessonInfo.slug?.trim()) {
    throw new Error('Slug is required')
  }

  if (puzzles.length === 0) {
    throw new Error('At least one puzzle is required')
  }

  const { profile } = await getCurrentUserWithProfile()
  if (!profile) {
    throw new Error('User profile not found')
  }

  const blocks = puzzles.map((puzzle, index) => {
    const solutionMoves = puzzle.solution
      .trim()
      .split(/\s+/)
      .filter((move) => move.length > 0)

    return {
      id: `puzzle-${index + 1}`,
      type: 'puzzle',
      data: {
        fen: puzzle.fen,
        solution: solutionMoves,
        hint: puzzle.hint ?? '',
        rating: null,
        themes: puzzle.description ? puzzle.description.split(',').map((t) => t.trim()) : [],
        orientation: puzzle.orientation ?? 'white',
      },
    }
  })

  const categoryId = lessonInfo.categoryId && lessonInfo.categoryId.includes('-') ? lessonInfo.categoryId : undefined

  const lesson = await createLesson({
    title: lessonInfo.title,
    slug: lessonInfo.slug,
    description: lessonInfo.description || undefined,
    category_id: categoryId,
    content_type: 'puzzle',
    blocks: blocks as any,
    difficulty: lessonInfo.difficulty || undefined,
    estimated_duration_minutes: lessonInfo.estimatedDurationMinutes
      ? parseInt(lessonInfo.estimatedDurationMinutes, 10)
      : undefined,
    created_by: profile.id,
  })

  revalidatePath('/academy/lessons')
  revalidatePath('/academy')

  if (studentIds.length > 0) {
    await assignStudentsToLesson(lesson.id, studentIds, profile.id)
  }

  return lesson.id
}

export async function createStudyLesson(
  lessonInfo: PuzzleLessonInfo,
  chapters: StudyChapter[],
  displaySettings: StudyDisplaySettings,
  moveAnnotations?: Map<string, MoveAnnotation>,
  studentIds: string[] = []
) {
  await checkCoachRole()

  if (!lessonInfo.title?.trim()) {
    throw new Error('Title is required')
  }

  if (!lessonInfo.slug?.trim()) {
    throw new Error('Slug is required')
  }

  if (chapters.length === 0) {
    throw new Error('At least one chapter is required')
  }

  const { profile } = await getCurrentUserWithProfile()
  if (!profile) {
    throw new Error('User profile not found')
  }

  const parsedChapters = chapters.map((chapter, index) => {
    let pgn = chapter.pgn

    if (moveAnnotations && moveAnnotations.size > 0) {
      const chapterAnnotations = new Map<string, MoveAnnotation>()
      Array.from(moveAnnotations.entries()).forEach(([key, anno]) => {
        const parts = key.split(':')
        const chapterIdx = parts[0]
        if (chapterIdx === String(index)) {
          chapterAnnotations.set(parts[1], anno)
        }
      })
      if (chapterAnnotations.size > 0) {
        pgn = injectAnnotationsIntoPgn(pgn, chapterAnnotations)
      }
    }

    const parsed = parsePgn(pgn)
    return {
      id: chapter.id || `chapter-${index + 1}`,
      name: chapter.name,
      orientation: chapter.orientation || 'white',
      pgn,
      headers: parsed.headers,
      moves: parsed.moves,
      fullPgn: parsed.fullPgn,
    }
  })

  const blocks = [
    {
      id: 'study-main',
      type: 'study',
      data: {
        chapters: parsedChapters,
        displaySettings: {
          showEval: displaySettings.showEval ?? true,
          showClocks: displaySettings.showClocks ?? true,
          showArrows: displaySettings.showArrows ?? true,
          showHighlights: displaySettings.showHighlights ?? true,
        },
      },
    },
  ]

  const categoryId = lessonInfo.categoryId && lessonInfo.categoryId.includes('-') ? lessonInfo.categoryId : undefined

  const lesson = await createLesson({
    title: lessonInfo.title,
    slug: lessonInfo.slug,
    description: lessonInfo.description || undefined,
    category_id: categoryId,
    content_type: 'study',
    blocks: blocks as any,
    difficulty: lessonInfo.difficulty || undefined,
    estimated_duration_minutes: lessonInfo.estimatedDurationMinutes
      ? parseInt(lessonInfo.estimatedDurationMinutes, 10)
      : undefined,
    created_by: profile.id,
  })

  revalidatePath('/academy/lessons')
  revalidatePath('/academy')

  if (studentIds.length > 0) {
    await assignStudentsToLesson(lesson.id, studentIds, profile.id)
  }

  return lesson.id
}

export async function createInteractiveStudyLesson(
  lessonInfo: PuzzleLessonInfo,
  chapters: StudyChapter[],
  displaySettings: StudyDisplaySettings,
  solveMovesByChapterId: Record<string, SolvePoint[]>,
  moveAnnotations?: Map<string, MoveAnnotation>,
  studentIds: string[] = []
) {
  await checkCoachRole()

  if (!lessonInfo.title?.trim()) {
    throw new Error('Title is required')
  }

  if (!lessonInfo.slug?.trim()) {
    throw new Error('Slug is required')
  }

  if (chapters.length === 0) {
    throw new Error('At least one chapter is required')
  }

  const { profile } = await getCurrentUserWithProfile()
  if (!profile) {
    throw new Error('User profile not found')
  }

  const parsedChapters = chapters.map((chapter, index) => {
    let pgn = chapter.pgn

    if (moveAnnotations && moveAnnotations.size > 0) {
      const chapterAnnotations = new Map<string, MoveAnnotation>()
      Array.from(moveAnnotations.entries()).forEach(([key, anno]) => {
        const parts = key.split(':')
        if (parts[0] === String(index)) {
          chapterAnnotations.set(parts[1], anno)
        }
      })
      if (chapterAnnotations.size > 0) {
        pgn = injectAnnotationsIntoPgn(pgn, chapterAnnotations)
      }
    }

    const parsed = parsePgn(pgn)
    const solveMoves = solveMovesByChapterId[chapter.id] || []

    return {
      id: chapter.id || `chapter-${index + 1}`,
      name: chapter.name,
      orientation: chapter.orientation || 'white',
      pgn,
      headers: parsed.headers,
      moves: parsed.moves,
      fullPgn: parsed.fullPgn,
      solveMoves: solveMoves.length > 0 ? solveMoves : undefined,
    }
  })

  const categoryId = lessonInfo.categoryId && lessonInfo.categoryId.includes('-') ? lessonInfo.categoryId : undefined

  const lesson = await createLesson({
    title: lessonInfo.title,
    slug: lessonInfo.slug,
    description: lessonInfo.description || undefined,
    category_id: categoryId,
    content_type: 'interactive_study',
    blocks: [
      {
        id: 'interactive-study-main',
        type: 'interactive_study',
        data: {
          chapters: parsedChapters,
          displaySettings: {
            showEval: displaySettings.showEval ?? true,
            showClocks: displaySettings.showClocks ?? true,
            showArrows: displaySettings.showArrows ?? true,
            showHighlights: displaySettings.showHighlights ?? true,
          },
        },
      },
    ] as any,
    difficulty: lessonInfo.difficulty || undefined,
    estimated_duration_minutes: lessonInfo.estimatedDurationMinutes
      ? parseInt(lessonInfo.estimatedDurationMinutes, 10)
      : undefined,
    created_by: profile.id,
  })

  revalidatePath('/academy/lessons')
  revalidatePath('/academy')

  if (studentIds.length > 0) {
    await assignStudentsToLesson(lesson.id, studentIds, profile.id)
  }

  return lesson.id
}

export async function deleteLessonAction(lessonId: string) {
  await checkCoachRole()

  const { profile } = await getCurrentUserWithProfile()
  if (!profile) {
    throw new Error('User profile not found')
  }

  await deleteLesson(lessonId)

  revalidatePath('/academy/lesson')
  revalidatePath('/academy')

  return { success: true }
}
