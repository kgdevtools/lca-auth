'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { AlertCircle, Youtube, Video as VideoIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { VideoConfig, VideoSource } from '@/types/blog-enhancement'

interface VideoComponentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (config: VideoConfig) => void
  initialConfig?: VideoConfig
}

export default function VideoComponentModal({
  open,
  onOpenChange,
  onSave,
  initialConfig,
}: VideoComponentModalProps) {
  const [type, setType] = useState<VideoSource>(initialConfig?.type || 'youtube')
  const [url, setUrl] = useState(initialConfig?.url || '')
  const [title, setTitle] = useState(initialConfig?.title || '')
  const [caption, setCaption] = useState(initialConfig?.caption || '')
  const [autoplay, setAutoplay] = useState(initialConfig?.autoplay ?? false)
  const [showControls, setShowControls] = useState(initialConfig?.showControls ?? true)
  const [thumbnail, setThumbnail] = useState(initialConfig?.thumbnail || '')

  // Reset form when opening with new initial config
  useEffect(() => {
    if (open) {
      setType(initialConfig?.type || 'youtube')
      setUrl(initialConfig?.url || '')
      setTitle(initialConfig?.title || '')
      setCaption(initialConfig?.caption || '')
      setAutoplay(initialConfig?.autoplay ?? false)
      setShowControls(initialConfig?.showControls ?? true)
      setThumbnail(initialConfig?.thumbnail || '')
    }
  }, [open, initialConfig])

  const extractVideoId = (videoUrl: string, source: VideoSource): string | null => {
    if (source === 'youtube') {
      // Match YouTube URL patterns
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
      ]
      for (const pattern of patterns) {
        const match = videoUrl.match(pattern)
        if (match) return match[1]
      }
    } else if (source === 'vimeo') {
      // Match Vimeo URL patterns
      const pattern = /vimeo\.com\/(?:video\/)?(\d+)/
      const match = videoUrl.match(pattern)
      if (match) return match[1]
    }
    return null
  }

  const getPreviewUrl = (): string | null => {
    if (type === 'upload') {
      return url
    }

    const videoId = extractVideoId(url, type)
    if (!videoId) return null

    if (type === 'youtube') {
      return `https://www.youtube.com/embed/${videoId}`
    } else if (type === 'vimeo') {
      return `https://player.vimeo.com/video/${videoId}`
    }

    return null
  }

  const validateUrl = (): boolean => {
    if (!url.trim()) {
      toast.error('Please enter a video URL')
      return false
    }

    if (type === 'youtube' || type === 'vimeo') {
      const videoId = extractVideoId(url, type)
      if (!videoId) {
        toast.error(`Invalid ${type === 'youtube' ? 'YouTube' : 'Vimeo'} URL format`)
        return false
      }
    } else if (type === 'upload') {
      // Check if URL ends with video extension
      const validExtensions = ['.mp4', '.webm', '.ogg', '.mov']
      const hasValidExtension = validExtensions.some(ext =>
        url.toLowerCase().includes(ext)
      )
      if (!hasValidExtension) {
        toast.error('Upload URL must be a direct link to a video file (.mp4, .webm, .ogg, .mov)')
        return false
      }
    }

    return true
  }

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    if (!validateUrl()) {
      return
    }

    const config: VideoConfig = {
      type,
      url,
      title,
      caption,
      autoplay,
      showControls,
      thumbnail: thumbnail || undefined,
    }

    onSave(config)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const previewUrl = getPreviewUrl()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Add Video Embed</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Source Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Video Source</Label>
            <Select value={type} onValueChange={(v) => setType(v as VideoSource)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">
                  <div className="flex items-center gap-2">
                    <Youtube className="w-4 h-4 text-red-600" />
                    <span>YouTube</span>
                  </div>
                </SelectItem>
                <SelectItem value="vimeo">
                  <div className="flex items-center gap-2">
                    <VideoIcon className="w-4 h-4 text-blue-500" />
                    <span>Vimeo</span>
                  </div>
                </SelectItem>
                <SelectItem value="upload">
                  <div className="flex items-center gap-2">
                    <VideoIcon className="w-4 h-4" />
                    <span>Direct Upload URL</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Video URL */}
          <div className="space-y-2">
            <Label htmlFor="url">Video URL *</Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                type === 'youtube'
                  ? 'https://www.youtube.com/watch?v=...'
                  : type === 'vimeo'
                  ? 'https://vimeo.com/...'
                  : 'https://example.com/video.mp4'
              }
            />
            {type === 'youtube' && (
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Accepts: youtube.com/watch?v=..., youtu.be/..., or youtube.com/embed/...
              </p>
            )}
            {type === 'vimeo' && (
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Accepts: vimeo.com/... or vimeo.com/video/...
              </p>
            )}
            {type === 'upload' && (
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Must be a direct URL to a video file (.mp4, .webm, .ogg, .mov)
              </p>
            )}
          </div>

          {/* Preview */}
          {previewUrl && (
            <Card className="p-4 space-y-2">
              <Label className="text-sm font-semibold">Preview</Label>
              <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                {type === 'upload' ? (
                  <video
                    src={previewUrl}
                    controls={showControls}
                    autoPlay={false}
                    className="w-full h-full"
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )}
              </div>
            </Card>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Championship Final Analysis"
            />
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Add a description or context for this video..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Thumbnail (optional) */}
          {type === 'upload' && (
            <div className="space-y-2">
              <Label htmlFor="thumbnail">Custom Thumbnail (optional)</Label>
              <Input
                id="thumbnail"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
                placeholder="https://example.com/thumbnail.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Thumbnail for direct uploads (defaults to first frame if not provided)
              </p>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3 border-t pt-3">
            <Label className="text-sm font-semibold">Playback Options</Label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoplay}
                  onChange={(e) => setAutoplay(e.target.checked)}
                  className="w-3.5 h-3.5 rounded"
                />
                <span className="text-xs">Auto-play on load</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showControls}
                  onChange={(e) => setShowControls(e.target.checked)}
                  className="w-3.5 h-3.5 rounded"
                />
                <span className="text-xs">Show player controls</span>
              </label>
            </div>
            {autoplay && (
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                Note: Most browsers require videos to be muted for autoplay to work
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Insert Video
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
