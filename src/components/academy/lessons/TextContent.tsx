'use client'

import ReactMarkdown from 'react-markdown'

interface TextContentProps {
  content: {
    body: string
    images?: string[]
  }
}

export default function TextContent({ content }: TextContentProps) {
  return (
    <div className="prose prose-gray dark:prose-invert max-w-none">
      <ReactMarkdown>{content.body}</ReactMarkdown>

      {content.images && content.images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {content.images.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`Lesson image ${idx + 1}`}
              className="rounded-lg"
            />
          ))}
        </div>
      )}
    </div>
  )
}
