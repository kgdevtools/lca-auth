'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FlipHorizontal, CheckCircle2 } from 'lucide-react'

interface QaViewerBlockProps {
  data: {
    question?: string
    answer?: string
  }
  onSolved: () => void
}

export default function QaViewerBlock({ data, onSolved }: QaViewerBlockProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [acknowledged, setAcknowledged] = useState(false)

  const question = data.question || ''
  const answer = data.answer || ''

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleGotIt = () => {
    setAcknowledged(true)
    setTimeout(onSolved, 500)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="lg:w-3/5">
        <div className="max-w-md mx-auto">
          <div
            className={`relative transition-all duration-500 cursor-pointer perspective-1000 ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            onClick={handleFlip}
          >
            <Card
              className={`min-h-[300px] flex flex-col justify-center items-center p-8 transition-all ${
                isFlipped ? 'bg-green-50 dark:bg-green-900/30' : 'bg-blue-50 dark:bg-blue-900/30'
              }`}
            >
              <CardContent className="text-center">
                {!isFlipped ? (
                  <>
                    <p className="text-lg font-semibold mb-4">Question</p>
                    <p className="text-2xl">{question}</p>
                    <p className="text-sm text-gray-500 mt-6">Click to reveal answer</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold mb-4 text-green-700">Answer</p>
                    <p className="text-2xl">{answer}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center mt-4 gap-2">
            <Button variant="outline" onClick={handleFlip} className="gap-2">
              <FlipHorizontal className="w-4 h-4" />
              {isFlipped ? 'Show Question' : 'Show Answer'}
            </Button>
          </div>
        </div>
      </div>

      <div className="lg:w-2/5 space-y-4">
        <div>
          <h3 className="font-semibold text-lg">Q&A Flashcard</h3>
          <p className="text-sm text-gray-500">Test your knowledge</p>
        </div>

        {isFlipped && !acknowledged && (
          <Button onClick={handleGotIt} className="w-full gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Got it!
          </Button>
        )}

        {acknowledged && (
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg text-center">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-green-700">Card completed!</p>
          </div>
        )}
      </div>
    </div>
  )
}