'use client'

interface VideoContentProps {
  content: {
    url: string
    provider: 'youtube' | 'vimeo'
    transcript?: string
    keyPoints?: string[]
  }
}

export default function VideoContent({ content }: VideoContentProps) {
  const getEmbedUrl = () => {
    if (content.provider === 'youtube') {
      const videoId = content.url.split('v=')[1]?.split('&')[0] || content.url.split('/').pop()
      return `https://www.youtube.com/embed/${videoId}`
    } else if (content.provider === 'vimeo') {
      const videoId = content.url.split('/').pop()
      return `https://player.vimeo.com/video/${videoId}`
    }
    return content.url
  }

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <div className="aspect-video rounded-lg overflow-hidden bg-black">
        <iframe
          src={getEmbedUrl()}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      {/* Key Points */}
      {content.keyPoints && content.keyPoints.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            Key Points
          </h3>
          <ul className="list-disc list-inside space-y-2 text-blue-800 dark:text-blue-200">
            {content.keyPoints.map((point, idx) => (
              <li key={idx}>{point}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Transcript */}
      {content.transcript && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Transcript
          </h3>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {content.transcript}
          </p>
        </div>
      )}
    </div>
  )
}
