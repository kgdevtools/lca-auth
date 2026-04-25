export const BLOCK_TYPES = {
  BOARD: 'board',
  BOARD_MOVES: 'board_moves',
  PGN_VIEWER: 'pgn_viewer',
  PUZZLE: 'puzzle',
  MCQ: 'mcq',
  QA: 'qa',
  LICHESS_STUDY: 'lichess_study',
  STUDY: 'study',
  INTERACTIVE_STUDY: 'interactive_study',
  RICH_TEXT: 'rich_text',
} as const

export type BlockType = (typeof BLOCK_TYPES)[keyof typeof BLOCK_TYPES]

export const BLOCK_CATEGORIES = {
  BOARD: 'board',
  INTERACTIVE: 'interactive',
  TEXT: 'text',
  IMPORT: 'import',
} as const

export type BlockCategory = (typeof BLOCK_CATEGORIES)[keyof typeof BLOCK_CATEGORIES]

export const BLOCK_PALETTE: Array<{
  type: BlockType
  label: string
  icon: string
  category: BlockCategory
  description: string
}> = [
  {
    type: BLOCK_TYPES.BOARD,
    label: 'Plain Board',
    icon: '♟',
    category: BLOCK_CATEGORIES.BOARD,
    description: 'Static chess board for display',
  },
  {
    type: BLOCK_TYPES.BOARD_MOVES,
    label: 'Board + Moves',
    icon: '♞',
    category: BLOCK_CATEGORIES.BOARD,
    description: 'Interactive board with move list',
  },
  {
    type: BLOCK_TYPES.PGN_VIEWER,
    label: 'PGN Viewer',
    icon: '📋',
    category: BLOCK_CATEGORIES.BOARD,
    description: 'PGN with annotations, evals, clocks',
  },
  {
    type: BLOCK_TYPES.PUZZLE,
    label: 'Puzzle',
    icon: '🧩',
    category: BLOCK_CATEGORIES.INTERACTIVE,
    description: 'Tactics puzzle for students to solve',
  },
  {
    type: BLOCK_TYPES.MCQ,
    label: 'MCQ',
    icon: '☑',
    category: BLOCK_CATEGORIES.INTERACTIVE,
    description: 'Multiple choice question',
  },
  {
    type: BLOCK_TYPES.QA,
    label: 'Q&A',
    icon: '💬',
    category: BLOCK_CATEGORIES.INTERACTIVE,
    description: 'Question and answer flashcard',
  },
  {
    type: BLOCK_TYPES.LICHESS_STUDY,
    label: 'Lichess Study',
    icon: '📖',
    category: BLOCK_CATEGORIES.IMPORT,
    description: 'Import from Lichess Study',
  },
  {
    type: BLOCK_TYPES.INTERACTIVE_STUDY,
    label: 'Interactive Study',
    icon: '🎯',
    category: BLOCK_CATEGORIES.INTERACTIVE,
    description: 'Study with embedded solve points',
  },
  {
    type: BLOCK_TYPES.RICH_TEXT,
    label: 'Rich Text',
    icon: '📝',
    category: BLOCK_CATEGORIES.TEXT,
    description: 'Formatted text content',
  },
]

export const DEFAULT_BLOCK_DATA: Record<BlockType, Record<string, unknown>> = {
  [BLOCK_TYPES.BOARD]: {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    orientation: 'white',
    size: 'medium',
  },
  [BLOCK_TYPES.BOARD_MOVES]: {
    pgn: '',
    startMove: 0,
    showAnnotations: true,
    showClocks: true,
    orientation: 'white',
  },
  [BLOCK_TYPES.PGN_VIEWER]: {
    pgn: '',
    showEval: true,
    showClocks: true,
    showArrows: true,
    showHighlights: true,
    orientation: 'white',
  },
  [BLOCK_TYPES.PUZZLE]: {
    fen: '',
    solution: [],
    hint: '',
    rating: null,
    themes: [],
  },
  [BLOCK_TYPES.MCQ]: {
    question: '',
    options: [
      { id: '1', text: 'Option A', isCorrect: false },
      { id: '2', text: 'Option B', isCorrect: false },
      { id: '3', text: 'Option C', isCorrect: false },
      { id: '4', text: 'Option D', isCorrect: false },
    ],
    explanation: '',
  },
  [BLOCK_TYPES.QA]: {
    question: '',
    answer: '',
  },
  [BLOCK_TYPES.LICHESS_STUDY]: {
    studyId: '',
    chapterId: '',
    studyName: '',
    chapterName: '',
    pgn: '',
  },
  [BLOCK_TYPES.STUDY]: {
    chapters: [],
    displaySettings: {
      showEval: true,
      showClocks: true,
      showArrows: true,
      showHighlights: true,
    },
  },
  [BLOCK_TYPES.INTERACTIVE_STUDY]: {
    chapters: [],
    displaySettings: {
      showEval: true,
      showClocks: true,
      showArrows: true,
      showHighlights: true,
    },
  },
  [BLOCK_TYPES.RICH_TEXT]: {
    content: '',
  },
}

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'] as const
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number]

export const PGN_ANNOTATION_REGEX = {
  EVAL: /\[%eval ([#+-]?\d+(?:\.\d+)?)\]/g,
  CLOCK: /\[%clk (\d+:\d+:\d+)\]/g,
  ARROWS: /\[%cal ([GRYBOP])([a-h][1-8])([a-h][1-8](?:,[a-h][1-8])*)\]/g,
  HIGHLIGHTS: /\[%csl ([GRYBOP])([a-h][1-8](?:,[a-h][1-8])*)\]/g,
}