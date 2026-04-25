import { BLOCK_TYPES, BLOCK_CATEGORIES, DEFAULT_BLOCK_DATA, type BlockType, type BlockCategory } from './constants/lessonBlocks'

export interface BlockDefinition {
  type: BlockType
  label: string
  icon: string
  category: BlockCategory
  description: string
  defaultData: Record<string, unknown>
}

export const BLOCK_REGISTRY: Record<BlockType, BlockDefinition> = {
  [BLOCK_TYPES.BOARD]: {
    type: BLOCK_TYPES.BOARD,
    label: 'Plain Board',
    icon: '♟',
    category: BLOCK_CATEGORIES.BOARD,
    description: 'Static chess board for display',
    defaultData: DEFAULT_BLOCK_DATA[BLOCK_TYPES.BOARD],
  },
  [BLOCK_TYPES.BOARD_MOVES]: {
    type: BLOCK_TYPES.BOARD_MOVES,
    label: 'Board + Moves',
    icon: '♞',
    category: BLOCK_CATEGORIES.BOARD,
    description: 'Interactive board with move list',
    defaultData: DEFAULT_BLOCK_DATA[BLOCK_TYPES.BOARD_MOVES],
  },
  [BLOCK_TYPES.PGN_VIEWER]: {
    type: BLOCK_TYPES.PGN_VIEWER,
    label: 'PGN Viewer',
    icon: '📋',
    category: BLOCK_CATEGORIES.BOARD,
    description: 'PGN with annotations, evals, clocks',
    defaultData: DEFAULT_BLOCK_DATA[BLOCK_TYPES.PGN_VIEWER],
  },
  [BLOCK_TYPES.PUZZLE]: {
    type: BLOCK_TYPES.PUZZLE,
    label: 'Puzzle',
    icon: '🧩',
    category: BLOCK_CATEGORIES.INTERACTIVE,
    description: 'Tactics puzzle for students to solve',
    defaultData: DEFAULT_BLOCK_DATA[BLOCK_TYPES.PUZZLE],
  },
  [BLOCK_TYPES.MCQ]: {
    type: BLOCK_TYPES.MCQ,
    label: 'MCQ',
    icon: '☑',
    category: BLOCK_CATEGORIES.INTERACTIVE,
    description: 'Multiple choice question',
    defaultData: DEFAULT_BLOCK_DATA[BLOCK_TYPES.MCQ],
  },
  [BLOCK_TYPES.QA]: {
    type: BLOCK_TYPES.QA,
    label: 'Q&A',
    icon: '💬',
    category: BLOCK_CATEGORIES.INTERACTIVE,
    description: 'Question and answer flashcard',
    defaultData: DEFAULT_BLOCK_DATA[BLOCK_TYPES.QA],
  },
  [BLOCK_TYPES.LICHESS_STUDY]: {
    type: BLOCK_TYPES.LICHESS_STUDY,
    label: 'Lichess Study',
    icon: '📖',
    category: BLOCK_CATEGORIES.IMPORT,
    description: 'Import from Lichess Study',
    defaultData: DEFAULT_BLOCK_DATA[BLOCK_TYPES.LICHESS_STUDY],
  },
  [BLOCK_TYPES.STUDY]: {
    type: BLOCK_TYPES.STUDY,
    label: 'Study',
    icon: '📚',
    category: BLOCK_CATEGORIES.BOARD,
    description: 'Study lesson with chapters and moves',
    defaultData: DEFAULT_BLOCK_DATA[BLOCK_TYPES.STUDY],
  },
  [BLOCK_TYPES.INTERACTIVE_STUDY]: {
    type: BLOCK_TYPES.INTERACTIVE_STUDY,
    label: 'Interactive Study',
    icon: '🎯',
    category: BLOCK_CATEGORIES.INTERACTIVE,
    description: 'Study with embedded solve points',
    defaultData: DEFAULT_BLOCK_DATA[BLOCK_TYPES.INTERACTIVE_STUDY],
  },
  [BLOCK_TYPES.RICH_TEXT]: {
    type: BLOCK_TYPES.RICH_TEXT,
    label: 'Rich Text',
    icon: '📝',
    category: BLOCK_CATEGORIES.TEXT,
    description: 'Formatted text content',
    defaultData: DEFAULT_BLOCK_DATA[BLOCK_TYPES.RICH_TEXT],
  },
}

export function getBlockDefinition(type: BlockType): BlockDefinition {
  return BLOCK_REGISTRY[type]
}

export function getBlocksByCategory(category: BlockCategory): BlockDefinition[] {
  return Object.values(BLOCK_REGISTRY).filter((block) => block.category === category)
}

export function getAllBlocks(): BlockDefinition[] {
  return Object.values(BLOCK_REGISTRY)
}

export type { BlockType, BlockCategory }

export function createBlock(type: BlockType): { id: string; type: BlockType; data: Record<string, unknown> } {
  const definition = getBlockDefinition(type)
  return {
    id: crypto.randomUUID(),
    type,
    data: { ...definition.defaultData },
  }
}