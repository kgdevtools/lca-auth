import { z } from 'zod'
import { BLOCK_TYPES, DIFFICULTY_LEVELS } from './constants/lessonBlocks'

export const boardBlockDataSchema = z.object({
  fen: z.string().default('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
  orientation: z.enum(['white', 'black']).default('white'),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
})

export const boardMovesBlockDataSchema = z.object({
  pgn: z.string().default(''),
  startMove: z.number().int().min(0).default(0),
  showAnnotations: z.boolean().default(true),
  showClocks: z.boolean().default(true),
  orientation: z.enum(['white', 'black']).default('white'),
})

export const pgnViewerBlockDataSchema = z.object({
  pgn: z.string().default(''),
  showEval: z.boolean().default(true),
  showClocks: z.boolean().default(true),
  showArrows: z.boolean().default(true),
  showHighlights: z.boolean().default(true),
  orientation: z.enum(['white', 'black']).default('white'),
})

export const puzzleBlockDataSchema = z.object({
  fen: z.string().min(1),
  solution: z.array(z.string()).min(1),
  hint: z.string().default(''),
  rating: z.number().int().min(0).max(3500).nullable().default(null),
  themes: z.array(z.string()).default([]),
})

export const mcqOptionSchema = z.object({
  id: z.string(),
  text: z.string(),
  isCorrect: z.boolean(),
})

export const mcqBlockDataSchema = z.object({
  question: z.string().min(1),
  options: z.array(mcqOptionSchema).min(2),
  explanation: z.string().default(''),
})

export const qaBlockDataSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
})

export const lichessStudyBlockDataSchema = z.object({
  studyId: z.string().min(1),
  chapterId: z.string().min(1),
  studyName: z.string().default(''),
  chapterName: z.string().default(''),
  pgn: z.string().default(''),
})

export const solvePointSchema = z.object({
  moveIndex: z.number().int().min(0),
  description: z.string().optional(),
  alternatives: z.array(z.string()).optional(),
})

export const studyBlockDataSchema = z.object({
  chapters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    orientation: z.enum(['white', 'black']).default('white'),
    pgn: z.string(),
    headers: z.unknown().optional(),
    moves: z.unknown().optional(),
    fullPgn: z.string().optional(),
  })).optional(),
  displaySettings: z.object({
    showEval: z.boolean().default(true),
    showClocks: z.boolean().default(true),
    showArrows: z.boolean().default(true),
    showHighlights: z.boolean().default(true),
  }).optional(),
})

export const interactiveStudyBlockDataSchema = z.object({
  chapters: z.array(z.object({
    id: z.string(),
    name: z.string(),
    orientation: z.enum(['white', 'black']).default('white'),
    pgn: z.string(),
    solveMoves: z.array(solvePointSchema).optional(),
    headers: z.unknown().optional(),
    moves: z.unknown().optional(),
    fullPgn: z.string().optional(),
  })).optional(),
  displaySettings: z.object({
    showEval: z.boolean().default(true),
    showClocks: z.boolean().default(true),
    showArrows: z.boolean().default(true),
    showHighlights: z.boolean().default(true),
  }).optional(),
})

export const richTextBlockDataSchema = z.object({
  content: z.string().default(''),
})

export const blockDataSchema = z.discriminatedUnion('type', [
  boardBlockDataSchema.extend({ type: z.literal(BLOCK_TYPES.BOARD) }),
  boardMovesBlockDataSchema.extend({ type: z.literal(BLOCK_TYPES.BOARD_MOVES) }),
  pgnViewerBlockDataSchema.extend({ type: z.literal(BLOCK_TYPES.PGN_VIEWER) }),
  puzzleBlockDataSchema.extend({ type: z.literal(BLOCK_TYPES.PUZZLE) }),
  mcqBlockDataSchema.extend({ type: z.literal(BLOCK_TYPES.MCQ) }),
  qaBlockDataSchema.extend({ type: z.literal(BLOCK_TYPES.QA) }),
  lichessStudyBlockDataSchema.extend({ type: z.literal(BLOCK_TYPES.LICHESS_STUDY) }),
  studyBlockDataSchema.extend({ type: z.literal(BLOCK_TYPES.STUDY) }),
  interactiveStudyBlockDataSchema.extend({ type: z.literal(BLOCK_TYPES.INTERACTIVE_STUDY) }),
  richTextBlockDataSchema.extend({ type: z.literal(BLOCK_TYPES.RICH_TEXT) }),
])

export type BlockData = z.infer<typeof blockDataSchema>

export const blockSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(BLOCK_TYPES),
  data: blockDataSchema,
})

export type Block = z.infer<typeof blockSchema>

export const lessonInfoSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  categoryId: z.string().uuid().optional(),
  difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
  estimatedDurationMinutes: z.number().int().min(1).max(480).optional(),
  tags: z.array(z.string()).default([]),
})

export type LessonInfo = z.infer<typeof lessonInfoSchema>

export const lessonCreateSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  category_id: z.string().uuid().optional(),
  content_type: z.enum(['puzzle', 'study', 'interactive_study', 'block']),
  content_data: z.object({}).optional(),
  difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
  estimated_duration_minutes: z.number().int().min(1).max(480).optional(),
  display_order: z.number().int().min(0).default(0),
  published: z.boolean().default(false),
  blocks: z.array(blockSchema).default([]),
})

export type LessonCreateInput = z.infer<typeof lessonCreateSchema>

export const lessonUpdateSchema = lessonCreateSchema.partial().omit({ slug: true })

export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>

export function validateLessonBlocks(blocks: unknown[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const result = blockDataSchema.safeParse(block)
    
    if (!result.success) {
      const issueMessages = result.error.issues.map((issue) => issue.message)
      errors.push(`Block ${i + 1}: ${issueMessages.join(', ')}`)
    }

    const blockObj = block as { type?: string; data?: Record<string, unknown> }
    if (blockObj && typeof blockObj === 'object' && 'type' in blockObj) {
      if (blockObj.type === BLOCK_TYPES.PUZZLE) {
        if (!blockObj.data?.fen) {
          errors.push(`Block ${i + 1} (Puzzle): FEN is required`)
        }
        if (!blockObj.data?.solution || (blockObj.data.solution as unknown[]).length === 0) {
          errors.push(`Block ${i + 1} (Puzzle): Solution is required`)
        }
      }

      if (blockObj.type === BLOCK_TYPES.MCQ) {
        const options = blockObj.data?.options as Array<{ isCorrect?: boolean }> | undefined
        const hasCorrect = options?.some((o) => o.isCorrect === true)
        if (!hasCorrect) {
          errors.push(`Block ${i + 1} (MCQ): At least one correct answer is required`)
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function validateLessonForPublish(info: LessonInfo, blocks: Block[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!info.title?.trim()) {
    errors.push('Title is required')
  }

  if (!info.slug?.trim()) {
    errors.push('Slug is required')
  }

  if (blocks.length === 0) {
    errors.push('At least one block is required')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}