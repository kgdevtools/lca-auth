'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import type { GalleryConfig } from '@/types/blog-enhancement'
import { cn } from '@/lib/utils'
import Autoplay from 'embla-carousel-autoplay'

interface BlogGalleryProps {
  config: GalleryConfig
}

export default function BlogGallery({ config }: BlogGalleryProps) {
  const { title, images, style } = config

  if (style === 'single') {
    return <SingleImageView title={title} images={images} />
  }

  if (style === 'carousel') {
    return <CarouselView title={title} images={images} />
  }

  if (style === 'grid') {
    return <GridView title={title} images={images} />
  }

  if (style === 'masonry') {
    return <MasonryView title={title} images={images} />
  }

  return null
}

// Single Image View - Large image with description/credits
function SingleImageView({ title, images }: { title: string; images: GalleryConfig['images'] }) {
  const image = images[0]

  if (!image) return null

  return (
    <div className="my-8 space-y-4">
      <h3 className="text-2xl font-bold">{title}</h3>
      <Card className="overflow-hidden">
        <div className="relative w-full">
          <img
            src={image.url}
            alt={image.alt}
            className="w-full h-auto object-cover"
            loading="lazy"
          />
        </div>
        {image.caption && (
          <div className="p-4 bg-muted/30">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {image.caption}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}

// Carousel View - Swipeable carousel with auto-play
function CarouselView({ title, images }: { title: string; images: GalleryConfig['images'] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  return (
    <div className="my-8 space-y-4">
      <h3 className="text-2xl font-bold">{title}</h3>
      <Card className="overflow-hidden p-6">
        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          plugins={[
            Autoplay({
              delay: 5000,
              stopOnInteraction: true,
            }),
          ]}
          className="w-full"
        >
          <CarouselContent>
            {images.map((image, index) => (
              <CarouselItem key={index}>
                <div className="space-y-3">
                  <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.alt}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  {image.caption && (
                    <p className="text-sm text-muted-foreground text-center px-4">
                      {image.caption}
                    </p>
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex justify-center items-center gap-4 mt-4">
            <CarouselPrevious className="static translate-y-0" />
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {images.length}
            </span>
            <CarouselNext className="static translate-y-0" />
          </div>
        </Carousel>
      </Card>
    </div>
  )
}

// Grid View - Responsive grid layout
function GridView({ title, images }: { title: string; images: GalleryConfig['images'] }) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null)

  return (
    <div className="my-8 space-y-4">
      <h3 className="text-2xl font-bold">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image, index) => (
          <Card
            key={index}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
            onClick={() => setSelectedImage(index)}
          >
            <div className="relative aspect-video bg-muted">
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            {image.caption && (
              <div className="p-3">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {image.caption}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage !== null && (
        <Lightbox
          images={images}
          currentIndex={selectedImage}
          onClose={() => setSelectedImage(null)}
          onNavigate={setSelectedImage}
        />
      )}
    </div>
  )
}

// Masonry View - Pinterest-style staggered layout
function MasonryView({ title, images }: { title: string; images: GalleryConfig['images'] }) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null)

  return (
    <div className="my-8 space-y-4">
      <h3 className="text-2xl font-bold">{title}</h3>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {images.map((image, index) => (
          <Card
            key={index}
            className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow break-inside-avoid group"
            onClick={() => setSelectedImage(index)}
          >
            <div className="relative bg-muted">
              <img
                src={image.url}
                alt={image.alt}
                className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            {image.caption && (
              <div className="p-3">
                <p className="text-xs text-muted-foreground">
                  {image.caption}
                </p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage !== null && (
        <Lightbox
          images={images}
          currentIndex={selectedImage}
          onClose={() => setSelectedImage(null)}
          onNavigate={setSelectedImage}
        />
      )}
    </div>
  )
}

// Lightbox Component for Grid and Masonry views
function Lightbox({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: {
  images: GalleryConfig['images']
  currentIndex: number
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  const currentImage = images[currentIndex]

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1)
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) onNavigate(currentIndex + 1)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, images.length, onClose, onNavigate])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 text-4xl font-light leading-none"
        aria-label="Close"
      >
        ×
      </button>

      {/* Previous Button */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(currentIndex - 1)
          }}
          className="absolute left-4 text-white hover:text-gray-300 text-4xl font-light"
          aria-label="Previous"
        >
          ‹
        </button>
      )}

      {/* Next Button */}
      {currentIndex < images.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onNavigate(currentIndex + 1)
          }}
          className="absolute right-4 text-white hover:text-gray-300 text-4xl font-light"
          aria-label="Next"
        >
          ›
        </button>
      )}

      {/* Image */}
      <div
        className="max-w-7xl max-h-[90vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={currentImage.url}
          alt={currentImage.alt}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
        {currentImage.caption && (
          <p className="mt-4 text-white text-sm text-center max-w-2xl">
            {currentImage.caption}
          </p>
        )}
        <p className="mt-2 text-gray-400 text-xs">
          {currentIndex + 1} / {images.length}
        </p>
      </div>
    </div>
  )
}
