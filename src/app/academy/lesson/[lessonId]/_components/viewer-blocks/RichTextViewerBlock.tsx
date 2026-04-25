'use client'

import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface RichTextViewerBlockProps {
  data: {
    content?: string
  }
  onSolved: () => void
}

export default function RichTextViewerBlock({ data, onSolved }: RichTextViewerBlockProps) {
  const content = data.content || ''

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className="lg:w-3/5">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
      <div className="lg:w-2/5 space-y-4">
        <div>
          <h3 className="font-semibold text-lg">Text Content</h3>
          <p className="text-sm text-gray-500">Read through the content</p>
        </div>

        <div className="pt-4">
          <Button onClick={onSolved} className="w-full gap-2">
            Continue
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}