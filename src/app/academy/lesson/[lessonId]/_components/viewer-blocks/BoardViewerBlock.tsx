'use client'

import { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'

interface BoardViewerBlockProps {
  data: {
    fen?: string
    orientation?: 'white' | 'black'
    size?: 'small' | 'medium' | 'large'
  }
  onSolved: () => void
}

const SIZES = {
  small: 280,
  medium: 360,
  large: 440,
}

export default function BoardViewerBlock({ data, onSolved }: BoardViewerBlockProps) {
  const fen = data.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const orientation = data.orientation || 'white'
  const size = SIZES[data.size || 'medium']

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="lg:w-3/5 flex justify-center">
        <div style={{ width: size, height: size }}>
          <Chessboard
            position={fen}
            boardOrientation={orientation}
            arePiecesDraggable={false}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          />
        </div>
      </div>
      <div className="lg:w-2/5 space-y-4">
        <div>
          <h3 className="font-semibold text-lg">Board Position</h3>
          <p className="text-sm text-gray-500">Study this position</p>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">{fen}</p>
        </div>
        <Button onClick={onSolved} className="w-full gap-2">
          Next Block
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}