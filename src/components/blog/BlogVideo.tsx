'use client'

import { Card } from '@/components/ui/card'
import type { VideoConfig } from '@/types/blog-enhancement'

interface BlogVideoProps {
  config: VideoConfig
}

export default function BlogVideo({ config }: BlogVideoProps) {
  const { type, url, title, caption, autoplay, showControls, thumbnail } = config

  const getEmbedUrl = (): string => {
    if (type === 'upload') {
      return url
    }

    if (type === 'youtube') {
      const videoId = extractYouTubeId(url)
      if (!videoId) return url

      const params = new URLSearchParams({
        autoplay: autoplay ? '1' : '0',
        controls: showControls ? '1' : '0',
        modestbranding: '1',
        rel: '0',
      })

      return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
    }

    if (type === 'vimeo') {
      const videoId = extractVimeoId(url)
      if (!videoId) return url

      const params = new URLSearchParams({
        autoplay: autoplay ? '1' : '0',
        controls: showControls ? '1' : '0',
        title: '0',
        byline: '0',
        portrait: '0',
      })

      return `https://player.vimeo.com/video/${videoId}?${params.toString()}`
    }

    return url
  }

  const extractYouTubeId = (videoUrl: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
    ]
    for (const pattern of patterns) {
      const match = videoUrl.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const extractVimeoId = (videoUrl: string): string | null => {
    const pattern = /vimeo\.com\/(?:video\/)?(\d+)/
    const match = videoUrl.match(pattern)
    return match ? match[1] : null
  }

  const embedUrl = getEmbedUrl()

  return (
    <div className="my-8 space-y-4">
      <h3 className="text-2xl font-bold">{title}</h3>
      <Card className="overflow-hidden">
        <div className="relative w-full aspect-video bg-black">
          {type === 'upload' ? (
            <video
              src={embedUrl}
              controls={showControls}
              autoPlay={autoplay}
              muted={autoplay} // Required for autoplay to work in most browsers
              loop={autoplay}
              poster={thumbnail}
              className="w-full h-full"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          ) : (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow={`accelerometer; ${autoplay ? 'autoplay;' : ''} clipboard-write; encrypted-media; gyroscope; picture-in-picture`}
              allowFullScreen
              title={title}
              loading="lazy"
            />
          )}
        </div>
        {caption && (
          <div className="p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {caption}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
