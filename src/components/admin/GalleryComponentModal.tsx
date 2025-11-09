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
import { Skeleton } from '@/components/ui/skeleton'
import { X, Plus, GripVertical, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import type { GalleryConfig, GalleryImage, GalleryStyle } from '@/types/blog-enhancement'

interface GalleryComponentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (config: GalleryConfig) => void
  initialConfig?: GalleryConfig
}

export default function GalleryComponentModal({
  open,
  onOpenChange,
  onSave,
  initialConfig,
}: GalleryComponentModalProps) {
  const [title, setTitle] = useState(initialConfig?.title || '')
  const [style, setStyle] = useState<GalleryStyle>(initialConfig?.style || 'single')
  const [images, setImages] = useState<GalleryImage[]>(
    initialConfig?.images || [{ url: '', alt: '', caption: '' }]
  )
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Reset form when opening with new initial config
  useEffect(() => {
    if (open) {
      setTitle(initialConfig?.title || '')
      setStyle(initialConfig?.style || 'single')
      setImages(
        initialConfig?.images || [{ url: '', alt: '', caption: '' }]
      )
    }
  }, [open, initialConfig])

  const handleAddImage = () => {
    setImages([...images, { url: '', alt: '', caption: '' }])
  }

  const handleRemoveImage = (index: number) => {
    if (images.length === 1) {
      toast.error('Gallery must have at least one image')
      return
    }
    setImages(images.filter((_, i) => i !== index))
  }

  const handleImageChange = (
    index: number,
    field: keyof GalleryImage,
    value: string
  ) => {
    const newImages = [...images]
    newImages[index] = { ...newImages[index], [field]: value }
    setImages(newImages)
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newImages = [...images]
    const draggedImage = newImages[draggedIndex]
    newImages.splice(draggedIndex, 1)
    newImages.splice(index, 0, draggedImage)
    setImages(newImages)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  const handleSave = () => {
    // Validation
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }

    const validImages = images.filter(img => img.url.trim() !== '')
    if (validImages.length === 0) {
      toast.error('Please add at least one image with a URL')
      return
    }

    // Check if all images have alt text
    const missingAlt = validImages.some(img => !img.alt.trim())
    if (missingAlt) {
      toast.error('Please provide alt text for all images (required for accessibility)')
      return
    }

    const config: GalleryConfig = {
      title,
      images: validImages,
      style,
    }

    onSave(config)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  const getStyleDescription = (styleValue: GalleryStyle) => {
    switch (styleValue) {
      case 'single':
        return 'Display one image with title, caption, and credits'
      case 'carousel':
        return 'Swipeable carousel with auto-slide and navigation'
      case 'grid':
        return 'Responsive grid layout (2-3 columns)'
      case 'masonry':
        return 'Pinterest-style staggered layout'
      default:
        return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {style === 'single' ? 'Add Single Image' : 'Add Image Gallery'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Gallery Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={style === 'single' ? 'e.g., Championship Trophy Ceremony' : 'e.g., Tournament Highlights 2025'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="style">Display Style</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as GalleryStyle)}>
                <SelectTrigger id="style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">Single Image</span>
                      <span className="text-xs text-muted-foreground">
                        One image with description/credits
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="carousel">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">Carousel</span>
                      <span className="text-xs text-muted-foreground">
                        Swipeable slideshow
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="grid">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">Grid</span>
                      <span className="text-xs text-muted-foreground">
                        Responsive grid layout
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="masonry">
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">Masonry</span>
                      <span className="text-xs text-muted-foreground">
                        Pinterest-style layout
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getStyleDescription(style)}
              </p>
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">
                {style === 'single' ? 'Image Details' : `Images (${images.length})`}
              </Label>
              {style !== 'single' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddImage}
                  className="h-8"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Image
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {images.map((image, index) => (
                <Card
                  key={index}
                  className="p-4"
                  draggable={style !== 'single'}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="space-y-3">
                    {/* Header with drag handle and remove button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {style !== 'single' && (
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                        )}
                        <span className="text-sm font-semibold">
                          {style === 'single' ? 'Image' : `Image ${index + 1}`}
                        </span>
                      </div>
                      {(style !== 'single' || images.length > 1) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveImage(index)}
                          className="h-7 w-7 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Image Preview */}
                    {image.url && (
                      <div className="relative w-full h-48 bg-muted rounded-md overflow-hidden">
                        <img
                          src={image.url}
                          alt={image.alt || 'Preview'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      </div>
                    )}

                    {/* Image URL */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Image URL *</Label>
                      <Input
                        value={image.url}
                        onChange={(e) => handleImageChange(index, 'url', e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="h-9"
                      />
                    </div>

                    {/* Alt Text */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Alt Text * (for accessibility)</Label>
                      <Input
                        value={image.alt}
                        onChange={(e) => handleImageChange(index, 'alt', e.target.value)}
                        placeholder="Describe the image for screen readers"
                        className="h-9"
                      />
                    </div>

                    {/* Caption/Credits */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {style === 'single' ? 'Description / Credits' : 'Caption (optional)'}
                      </Label>
                      <Textarea
                        value={image.caption || ''}
                        onChange={(e) => handleImageChange(index, 'caption', e.target.value)}
                        placeholder={
                          style === 'single'
                            ? 'Add image description, context, or photo credits...'
                            : 'Optional caption for this image...'
                        }
                        rows={3}
                        className="resize-none"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {style !== 'single' && (
              <p className="text-xs text-muted-foreground">
                💡 Tip: Drag images to reorder them
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {style === 'single' ? 'Insert Image' : 'Insert Gallery'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
