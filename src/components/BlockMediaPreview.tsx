'use client'

import { Chessboard } from 'react-chessboard'

export interface BlockMedia {
  type: 'image' | 'board'
  /** image: URL or data URI. board: ignored. */
  src?: string
  /** board: FEN to preview. image: ignored. */
  fen?: string
  alt?: string
}

/**
 * Optional media (image or board-position preview) attached to a question-style
 * block (MCQ/QA). Sized to its own content — never stretched to fill the panel —
 * and reflows naturally with the rest of the block on mobile (no separate
 * "right panel" concept there, it just stacks in document order).
 */
export default function BlockMediaPreview({ media }: { media?: BlockMedia }) {
  if (!media) return null

  if (media.type === 'board' && media.fen) {
    return (
      <div className="w-full max-w-[300px] mx-auto shrink-0">
        <div className="aspect-square w-full rounded-sm overflow-hidden border border-border shadow-sm">
          <Chessboard
            position={media.fen}
            arePiecesDraggable={false}
            customBoardStyle={{ borderRadius: '4px' }}
          />
        </div>
      </div>
    )
  }

  if (media.type === 'image' && media.src) {
    return (
      <div className="w-full max-w-[300px] mx-auto shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.src}
          alt={media.alt ?? ''}
          className="w-full h-auto max-h-[300px] object-contain rounded-sm border border-border shadow-sm"
        />
      </div>
    )
  }

  return null
}
