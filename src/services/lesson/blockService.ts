import { BLOCK_TYPES, type BlockType } from '@/lib/constants/lessonBlocks'
import { createBlock, getBlockDefinition } from '@/lib/blockRegistry'

export interface BlockData {
  id: string
  type: BlockType
  data: Record<string, unknown>
}

export function generateBlocks(type: BlockType, count: number = 1): BlockData[] {
  const blocks: BlockData[] = []
  for (let i = 0; i < count; i++) {
    const block = createBlock(type)
    blocks.push(block as unknown as BlockData)
  }
  return blocks
}

export function reorderBlocks(blocks: BlockData[], fromIndex: number, toIndex: number): BlockData[] {
  const result = [...blocks]
  const [removed] = result.splice(fromIndex, 1)
  result.splice(toIndex, 0, removed)
  return result
}

export function updateBlockData(
  blocks: BlockData[],
  blockId: string,
  data: Record<string, unknown>
): BlockData[] {
  return blocks.map((block) => {
    if (block.id === blockId) {
      return {
        ...block,
        data: { ...block.data, ...data },
      }
    }
    return block
  })
}

export function removeBlock(blocks: BlockData[], blockId: string): BlockData[] {
  return blocks.filter((block) => block.id !== blockId)
}

export function duplicateBlock(blocks: BlockData[], blockId: string): BlockData[] {
  const blockIndex = blocks.findIndex((b) => b.id === blockId)
  if (blockIndex === -1) return blocks

  const originalBlock = blocks[blockIndex]
  const duplicatedBlock = {
    ...originalBlock,
    id: crypto.randomUUID(),
    data: { ...originalBlock.data },
  }

  const result = [...blocks]
  result.splice(blockIndex + 1, 0, duplicatedBlock)
  return result
}

export function getBlockCountByType(blocks: BlockData[]): Record<BlockType, number> {
  const counts: Record<BlockType, number> = {
    [BLOCK_TYPES.BOARD]: 0,
    [BLOCK_TYPES.BOARD_MOVES]: 0,
    [BLOCK_TYPES.PGN_VIEWER]: 0,
    [BLOCK_TYPES.PUZZLE]: 0,
    [BLOCK_TYPES.MCQ]: 0,
    [BLOCK_TYPES.QA]: 0,
    [BLOCK_TYPES.LICHESS_STUDY]: 0,
    [BLOCK_TYPES.STUDY]: 0,
    [BLOCK_TYPES.INTERACTIVE_STUDY]: 0,
    [BLOCK_TYPES.RICH_TEXT]: 0,
  }

  for (const block of blocks) {
    counts[block.type]++
  }

  return counts
}

export function validateBlocks(blocks: BlockData[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (blocks.length === 0) {
    errors.push('Lesson must have at least one block')
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    if (!block.id) {
      errors.push(`Block ${i + 1}: Missing ID`)
    }

    const definition = getBlockDefinition(block.type)
    if (!definition) {
      errors.push(`Block ${i + 1}: Unknown block type "${block.type}"`)
    }

    if (block.type === BLOCK_TYPES.PUZZLE) {
      const puzzleData = block.data as { fen?: string; solution?: string[] }
      if (!puzzleData.fen) {
        errors.push(`Block ${i + 1} (Puzzle): FEN position is required`)
      }
      if (!puzzleData.solution || puzzleData.solution.length === 0) {
        errors.push(`Block ${i + 1} (Puzzle): Solution moves are required`)
      }
    }

    if (block.type === BLOCK_TYPES.MCQ) {
      const mcqData = block.data as { question?: string; options?: Array<{ isCorrect: boolean }> }
      if (!mcqData.question) {
        errors.push(`Block ${i + 1} (MCQ): Question is required`)
      }
      if (!mcqData.options || mcqData.options.length < 2) {
        errors.push(`Block ${i + 1} (MCQ): At least 2 options are required`)
      }
      const hasCorrect = mcqData.options?.some((o) => o.isCorrect)
      if (!hasCorrect) {
        errors.push(`Block ${i + 1} (MCQ): At least one correct answer is required`)
      }
    }

    if (block.type === BLOCK_TYPES.QA) {
      const qaData = block.data as { question?: string; answer?: string }
      if (!qaData.question) {
        errors.push(`Block ${i + 1} (Q&A): Question is required`)
      }
      if (!qaData.answer) {
        errors.push(`Block ${i + 1} (Q&A): Answer is required`)
      }
    }

    if (block.type === BLOCK_TYPES.LICHESS_STUDY) {
      const studyData = block.data as { studyId?: string; chapterId?: string }
      if (!studyData.studyId) {
        errors.push(`Block ${i + 1} (Lichess Study): Study ID is required`)
      }
      if (!studyData.chapterId) {
        errors.push(`Block ${i + 1} (Lichess Study): Chapter ID is required`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export function getBlockSummary(blocks: BlockData[]): {
  total: number
  byType: Record<string, number>
  interactive: number
} {
  const byType: Record<string, number> = {}
  let interactive = 0

  for (const block of blocks) {
    byType[block.type] = (byType[block.type] || 0) + 1
    
    const isInteractive = block.type === BLOCK_TYPES.PUZZLE || block.type === BLOCK_TYPES.MCQ || block.type === BLOCK_TYPES.QA
    if (isInteractive) {
      interactive++
    }
  }

  return {
    total: blocks.length,
    byType,
    interactive,
  }
}