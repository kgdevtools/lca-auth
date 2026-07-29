'use server'

import { revalidatePath } from 'next/cache'
import {
  createLesson, deleteLesson, assignStudentsToLesson, getStudentsForDropdown,
  getLessonById, updateLesson, bulkDeleteLessons, reassignStudentsForLesson,
  resetLessonProgress, getCoachesForDropdown, getStudentsAssignedToLesson,
} from '@/repositories/lesson/lessonRepository'
import { checkCoachRole, checkAdminRole, getCurrentUserWithProfile } from '@/utils/auth/academyAuth'
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
  published?: boolean
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

interface TimerConfig {
  enabled: boolean
  seconds: number
}

interface BlockMedia {
  type: 'image' | 'board'
  src?: string
  fen?: string
  alt?: string
}

interface McqOption {
  id: string
  text: string
  isCorrect: boolean
}

interface McqQuestion {
  id: string
  question: string
  options: McqOption[]
  explanation?: string
  media?: BlockMedia
  timer?: TimerConfig
}

interface QaCard {
  id: string
  question: string
  answer: string
  media?: BlockMedia
  timer?: TimerConfig
}

export async function createPuzzleLesson(
  lessonInfo: PuzzleLessonInfo,
  puzzles: Array<{ id: string; fen: string; solution: string; description: string; hint?: string; orientation?: 'white' | 'black'; rating?: number | null; timer?: TimerConfig }>,
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
        rating: puzzle.rating ?? null,
        themes: puzzle.description ? puzzle.description.split(',').map((t) => t.trim()) : [],
        orientation: puzzle.orientation ?? 'white',
        ...(puzzle.timer ? { timer: puzzle.timer } : {}),
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
    published: lessonInfo.published ?? true,
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
  timer?: TimerConfig,
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
        ...(timer?.enabled ? { timer } : {}),
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
    published: lessonInfo.published ?? true,
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
  timer: TimerConfig | undefined,
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
          ...(timer?.enabled ? { timer } : {}),
        },
      },
    ] as any,
    difficulty: lessonInfo.difficulty || undefined,
    estimated_duration_minutes: lessonInfo.estimatedDurationMinutes
      ? parseInt(lessonInfo.estimatedDurationMinutes, 10)
      : undefined,
    created_by: profile.id,
    published: lessonInfo.published ?? true,
  })

  revalidatePath('/academy/lessons')
  revalidatePath('/academy')

  if (studentIds.length > 0) {
    await assignStudentsToLesson(lesson.id, studentIds, profile.id)
  }

  return lesson.id
}

export async function createMcqLesson(
  lessonInfo: PuzzleLessonInfo,
  questions: McqQuestion[],
  studentIds: string[] = []
) {
  await checkCoachRole()

  if (!lessonInfo.title?.trim()) {
    throw new Error('Title is required')
  }

  if (!lessonInfo.slug?.trim()) {
    throw new Error('Slug is required')
  }

  if (questions.length === 0) {
    throw new Error('At least one question is required')
  }

  const { profile } = await getCurrentUserWithProfile()
  if (!profile) {
    throw new Error('User profile not found')
  }

  const blocks = questions.map((q, index) => ({
    id: `mcq-${index + 1}`,
    type: 'mcq',
    data: {
      question: q.question,
      options: q.options,
      explanation: q.explanation,
      ...(q.media ? { media: q.media } : {}),
      ...(q.timer?.enabled ? { timer: q.timer } : {}),
    },
  }))

  const categoryId = lessonInfo.categoryId && lessonInfo.categoryId.includes('-') ? lessonInfo.categoryId : undefined

  const lesson = await createLesson({
    title: lessonInfo.title,
    slug: lessonInfo.slug,
    description: lessonInfo.description || undefined,
    category_id: categoryId,
    content_type: 'mcq',
    blocks: blocks as any,
    difficulty: lessonInfo.difficulty || undefined,
    estimated_duration_minutes: lessonInfo.estimatedDurationMinutes
      ? parseInt(lessonInfo.estimatedDurationMinutes, 10)
      : undefined,
    created_by: profile.id,
    published: lessonInfo.published ?? true,
  })

  revalidatePath('/academy/lessons')
  revalidatePath('/academy')

  if (studentIds.length > 0) {
    await assignStudentsToLesson(lesson.id, studentIds, profile.id)
  }

  return lesson.id
}

export async function createQaLesson(
  lessonInfo: PuzzleLessonInfo,
  cards: QaCard[],
  studentIds: string[] = []
) {
  await checkCoachRole()

  if (!lessonInfo.title?.trim()) {
    throw new Error('Title is required')
  }

  if (!lessonInfo.slug?.trim()) {
    throw new Error('Slug is required')
  }

  if (cards.length === 0) {
    throw new Error('At least one flashcard is required')
  }

  const { profile } = await getCurrentUserWithProfile()
  if (!profile) {
    throw new Error('User profile not found')
  }

  const blocks = cards.map((c, index) => ({
    id: `qa-${index + 1}`,
    type: 'qa',
    data: {
      question: c.question,
      answer: c.answer,
      ...(c.media ? { media: c.media } : {}),
      ...(c.timer?.enabled ? { timer: c.timer } : {}),
    },
  }))

  const categoryId = lessonInfo.categoryId && lessonInfo.categoryId.includes('-') ? lessonInfo.categoryId : undefined

  const lesson = await createLesson({
    title: lessonInfo.title,
    slug: lessonInfo.slug,
    description: lessonInfo.description || undefined,
    category_id: categoryId,
    content_type: 'qa',
    blocks: blocks as any,
    difficulty: lessonInfo.difficulty || undefined,
    estimated_duration_minutes: lessonInfo.estimatedDurationMinutes
      ? parseInt(lessonInfo.estimatedDurationMinutes, 10)
      : undefined,
    created_by: profile.id,
    published: lessonInfo.published ?? true,
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
  if (!profile) throw new Error('User profile not found')

  await deleteLesson(lessonId)

  revalidatePath('/academy/lesson')
  revalidatePath('/academy')

  return { success: true }
}

export async function bulkDeleteLessonsAction(lessonIds: string[]) {
  await checkCoachRole()
  if (lessonIds.length === 0) return { success: true }
  await bulkDeleteLessons(lessonIds)
  revalidatePath('/academy/lesson')
  revalidatePath('/academy')
  return { success: true }
}

export async function fetchCoachesForAssignment() {
  await checkAdminRole()
  return getCoachesForDropdown()
}

export async function getLessonForEdit(lessonId: string) {
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) throw new Error('User profile not found')

  const lesson = await getLessonById(lessonId)
  if (!lesson) throw new Error('Lesson not found')

  if (profile.role !== 'admin' && lesson.created_by !== profile.id) {
    throw new Error('Not authorized to edit this lesson')
  }

  const assignedStudentIds = await getStudentsAssignedToLesson(lessonId)
  const coaches = profile.role === 'admin' ? await getCoachesForDropdown() : []

  return { lesson, assignedStudentIds, coaches, isAdmin: profile.role === 'admin' }
}

// ── Update actions (parallel to create, but diff blocks and reset progress if changed) ──

async function applyUpdate(
  lessonId: string,
  lessonInfo: PuzzleLessonInfo,
  blocks: unknown[],
  studentIds: string[],
  assignedTo: string | undefined,
  profile: { id: string; role: string | null }
) {
  const current = await getLessonById(lessonId)
  if (!current) throw new Error('Lesson not found')
  if (profile.role !== 'admin' && current.created_by !== profile.id) {
    throw new Error('Not authorized to edit this lesson')
  }

  const blocksChanged = JSON.stringify(current.blocks) !== JSON.stringify(blocks)
  if (blocksChanged) {
    await resetLessonProgress(lessonId)
  }

  const categoryId = lessonInfo.categoryId && lessonInfo.categoryId.includes('-') ? lessonInfo.categoryId : undefined

  await updateLesson(lessonId, {
    description: lessonInfo.description || undefined,
    category_id: categoryId,
    blocks: blocks as any,
    difficulty: lessonInfo.difficulty || undefined,
    estimated_duration_minutes: lessonInfo.estimatedDurationMinutes
      ? parseInt(lessonInfo.estimatedDurationMinutes, 10)
      : undefined,
    published: lessonInfo.published,
    ...(profile.role === 'admin' && assignedTo ? { created_by: assignedTo } : {}),
  })

  await reassignStudentsForLesson(lessonId, studentIds, profile.id)
  revalidatePath('/academy/lesson')
  revalidatePath(`/academy/lesson/${lessonId}`)
  revalidatePath('/academy')
}

export async function updatePuzzleLesson(
  lessonId: string,
  lessonInfo: PuzzleLessonInfo,
  puzzles: Array<{ id: string; fen: string; solution: string; description: string; hint?: string; orientation?: 'white' | 'black'; rating?: number | null; timer?: TimerConfig }>,
  studentIds: string[] = [],
  assignedTo?: string
) {
  await checkCoachRole()
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) throw new Error('User profile not found')

  const blocks = puzzles.map((puzzle, index) => {
    const solutionMoves = puzzle.solution.trim().split(/\s+/).filter(m => m.length > 0)
    return {
      id: `puzzle-${index + 1}`,
      type: 'puzzle',
      data: {
        fen: puzzle.fen,
        solution: solutionMoves,
        hint: puzzle.hint ?? '',
        rating: puzzle.rating ?? null,
        themes: puzzle.description ? puzzle.description.split(',').map(t => t.trim()) : [],
        orientation: puzzle.orientation ?? 'white',
        ...(puzzle.timer ? { timer: puzzle.timer } : {}),
      },
    }
  })

  await applyUpdate(lessonId, lessonInfo, blocks, studentIds, assignedTo, profile)
  return { success: true }
}

export async function updateStudyLesson(
  lessonId: string,
  lessonInfo: PuzzleLessonInfo,
  chapters: StudyChapter[],
  displaySettings: StudyDisplaySettings,
  timer?: TimerConfig,
  moveAnnotations?: Map<string, MoveAnnotation>,
  studentIds: string[] = [],
  assignedTo?: string
) {
  await checkCoachRole()
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) throw new Error('User profile not found')

  const parsedChapters = chapters.map((chapter, index) => {
    let pgn = chapter.pgn
    if (moveAnnotations && moveAnnotations.size > 0) {
      const chapterAnnotations = new Map<string, MoveAnnotation>()
      Array.from(moveAnnotations.entries()).forEach(([key, anno]) => {
        const parts = key.split(':')
        if (parts[0] === String(index)) chapterAnnotations.set(parts[1], anno)
      })
      if (chapterAnnotations.size > 0) pgn = injectAnnotationsIntoPgn(pgn, chapterAnnotations)
    }
    const parsed = parsePgn(pgn)
    return { id: chapter.id || `chapter-${index + 1}`, name: chapter.name, orientation: chapter.orientation || 'white', pgn, headers: parsed.headers, moves: parsed.moves, fullPgn: parsed.fullPgn }
  })

  const blocks = [{
    id: 'study-main', type: 'study',
    data: { chapters: parsedChapters, displaySettings, ...(timer?.enabled ? { timer } : {}) },
  }]

  await applyUpdate(lessonId, lessonInfo, blocks, studentIds, assignedTo, profile)
  return { success: true }
}

export async function updateInteractiveStudyLesson(
  lessonId: string,
  lessonInfo: PuzzleLessonInfo,
  chapters: StudyChapter[],
  displaySettings: StudyDisplaySettings,
  timer: TimerConfig | undefined,
  solveMovesByChapterId: Record<string, SolvePoint[]>,
  moveAnnotations?: Map<string, MoveAnnotation>,
  studentIds: string[] = [],
  assignedTo?: string
) {
  await checkCoachRole()
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) throw new Error('User profile not found')

  const parsedChapters = chapters.map((chapter, index) => {
    let pgn = chapter.pgn
    if (moveAnnotations && moveAnnotations.size > 0) {
      const chapterAnnotations = new Map<string, MoveAnnotation>()
      Array.from(moveAnnotations.entries()).forEach(([key, anno]) => {
        const parts = key.split(':')
        if (parts[0] === String(index)) chapterAnnotations.set(parts[1], anno)
      })
      if (chapterAnnotations.size > 0) pgn = injectAnnotationsIntoPgn(pgn, chapterAnnotations)
    }
    const parsed = parsePgn(pgn)
    const solveMoves = solveMovesByChapterId[chapter.id] || []
    return { id: chapter.id || `chapter-${index + 1}`, name: chapter.name, orientation: chapter.orientation || 'white', pgn, headers: parsed.headers, moves: parsed.moves, fullPgn: parsed.fullPgn, solveMoves: solveMoves.length > 0 ? solveMoves : undefined }
  })

  const blocks = [{
    id: 'interactive-study-main', type: 'interactive_study',
    data: { chapters: parsedChapters, displaySettings, ...(timer?.enabled ? { timer } : {}) },
  }]

  await applyUpdate(lessonId, lessonInfo, blocks, studentIds, assignedTo, profile)
  return { success: true }
}

export async function updateMcqLesson(
  lessonId: string,
  lessonInfo: PuzzleLessonInfo,
  questions: McqQuestion[],
  studentIds: string[] = [],
  assignedTo?: string
) {
  await checkCoachRole()
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) throw new Error('User profile not found')

  const blocks = questions.map((q, index) => ({
    id: `mcq-${index + 1}`,
    type: 'mcq',
    data: {
      question: q.question,
      options: q.options,
      explanation: q.explanation,
      ...(q.media ? { media: q.media } : {}),
      ...(q.timer?.enabled ? { timer: q.timer } : {}),
    },
  }))

  await applyUpdate(lessonId, lessonInfo, blocks, studentIds, assignedTo, profile)
  return { success: true }
}

// ── Puzzle Storm ──────────────────────────────────────────────────────────────
// One lesson, one `puzzle_storm` block holding every puzzle + the shared
// countdown. Puzzle validation/shape mirrors createPuzzleLesson/updatePuzzleLesson
// exactly — same authoring core, just packaged into a single block instead of
// one block per puzzle.

function mapStormPuzzle(puzzle: {
  fen: string; solution: string; description: string; hint?: string
  orientation?: 'white' | 'black'; rating?: number | null; timer?: TimerConfig
}) {
  const solutionMoves = puzzle.solution.trim().split(/\s+/).filter((move) => move.length > 0)
  return {
    fen: puzzle.fen,
    solution: solutionMoves,
    hint: puzzle.hint ?? '',
    rating: puzzle.rating ?? null,
    themes: puzzle.description ? puzzle.description.split(',').map((t) => t.trim()) : [],
    orientation: puzzle.orientation ?? 'white',
    ...(puzzle.timer ? { timer: puzzle.timer } : {}),
  }
}

export async function createPuzzleStormLesson(
  lessonInfo: PuzzleLessonInfo,
  puzzles: Array<{ id: string; fen: string; solution: string; description: string; hint?: string; orientation?: 'white' | 'black'; rating?: number | null }>,
  timeLimit: number,
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

  const blocks = [{
    id: 'storm-1',
    type: 'puzzle_storm',
    data: { timeLimit, puzzles: puzzles.map(mapStormPuzzle) },
  }]

  const categoryId = lessonInfo.categoryId && lessonInfo.categoryId.includes('-') ? lessonInfo.categoryId : undefined

  const lesson = await createLesson({
    title: lessonInfo.title,
    slug: lessonInfo.slug,
    description: lessonInfo.description || undefined,
    category_id: categoryId,
    content_type: 'puzzle_storm',
    blocks: blocks as any,
    difficulty: lessonInfo.difficulty || undefined,
    estimated_duration_minutes: lessonInfo.estimatedDurationMinutes
      ? parseInt(lessonInfo.estimatedDurationMinutes, 10)
      : undefined,
    created_by: profile.id,
    published: lessonInfo.published ?? true,
  })

  revalidatePath('/academy/lessons')
  revalidatePath('/academy')

  if (studentIds.length > 0) {
    await assignStudentsToLesson(lesson.id, studentIds, profile.id)
  }

  return lesson.id
}

export async function updatePuzzleStormLesson(
  lessonId: string,
  lessonInfo: PuzzleLessonInfo,
  puzzles: Array<{ id: string; fen: string; solution: string; description: string; hint?: string; orientation?: 'white' | 'black'; rating?: number | null }>,
  timeLimit: number,
  studentIds: string[] = [],
  assignedTo?: string
) {
  await checkCoachRole()
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) throw new Error('User profile not found')

  const blocks = [{
    id: 'storm-1',
    type: 'puzzle_storm',
    data: { timeLimit, puzzles: puzzles.map(mapStormPuzzle) },
  }]

  await applyUpdate(lessonId, lessonInfo, blocks, studentIds, assignedTo, profile)
  return { success: true }
}

export async function updateQaLesson(
  lessonId: string,
  lessonInfo: PuzzleLessonInfo,
  cards: QaCard[],
  studentIds: string[] = [],
  assignedTo?: string
) {
  await checkCoachRole()
  const { profile } = await getCurrentUserWithProfile()
  if (!profile) throw new Error('User profile not found')

  const blocks = cards.map((c, index) => ({
    id: `qa-${index + 1}`,
    type: 'qa',
    data: {
      question: c.question,
      answer: c.answer,
      ...(c.media ? { media: c.media } : {}),
      ...(c.timer?.enabled ? { timer: c.timer } : {}),
    },
  }))

  await applyUpdate(lessonId, lessonInfo, blocks, studentIds, assignedTo, profile)
  return { success: true }
}
