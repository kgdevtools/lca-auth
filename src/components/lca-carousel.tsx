"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"

export interface CarouselImage {
  src: string
  alt: string
  title?: string
  caption?: string
}

export interface LCACarouselProps {
  images: CarouselImage[]
  className?: string
  autoSlide?: boolean
  autoSlideInterval?: number
  showControls?: boolean
  showDots?: boolean
  aspectRatio?: "video" | "square" | "photo" | "wide"
  objectFit?: "cover" | "contain" | "fill"
  priority?: boolean
}

const aspectRatioClasses = {
  video: "aspect-video", // 16:9
  square: "aspect-square", // 1:1
  photo: "aspect-[4/3]", // 4:3
  wide: "aspect-[21/9]", // Ultra-wide
}

export function LCACarousel({
  images,
  className,
  autoSlide = true,
  autoSlideInterval = 3000,
  showControls = true,
  showDots = true,
  aspectRatio = "video",
  objectFit = "cover",
  priority = false,
}: LCACarouselProps) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)
  const [isHovered, setIsHovered] = React.useState(false)

  React.useEffect(() => {
    if (!api) {
      return
    }

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

  // Auto-slide functionality
  React.useEffect(() => {
    if (!api || !autoSlide || isHovered) return

    const interval = setInterval(() => {
      if (api.canScrollNext()) {
        api.scrollNext()
      } else {
        // Loop back to first slide
        api.scrollTo(0)
      }
    }, autoSlideInterval)

    return () => clearInterval(interval)
  }, [api, autoSlide, autoSlideInterval, isHovered])

  const scrollTo = (index: number) => {
    api?.scrollTo(index)
  }

  if (images.length === 0) {
    return (
      <div className={cn("w-full bg-muted rounded-lg", aspectRatioClasses[aspectRatio], className)}>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">No images to display</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={cn("w-full group", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Carousel 
        setApi={setApi} 
        className="w-full"
        opts={{
          align: "start",
          loop: true,
        }}
      >
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <div className={cn("relative w-full overflow-hidden rounded-lg", aspectRatioClasses[aspectRatio])}>
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className={cn(
                    "transition-transform duration-300 ease-in-out",
                    objectFit === "cover" && "object-cover",
                    objectFit === "contain" && "object-contain",
                    objectFit === "fill" && "object-fill",
                    "group-hover:scale-105"
                  )}
                  sizes="(min-width: 1024px) 1024px, (min-width: 768px) 768px, 100vw"
                  priority={priority && index === 0} // Only prioritize first image
                  quality={85}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {/* Navigation Controls */}
        {showControls && images.length > 1 && (
          <>
            <CarouselPrevious 
              className={cn(
                "left-4 h-10 w-10 bg-white/80 hover:bg-white border-0 shadow-lg",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                "md:left-6 lg:h-12 lg:w-12"
              )}
            />
            <CarouselNext 
              className={cn(
                "right-4 h-10 w-10 bg-white/80 hover:bg-white border-0 shadow-lg",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                "md:right-6 lg:h-12 lg:w-12"
              )}
            />
          </>
        )}
      </Carousel>
      
      {/* Dot indicators */}
      {showDots && images.length > 1 && (
        <div className="flex justify-center mt-4 gap-2">
          {Array.from({ length: count }, (_, index) => (
            <button
              key={index}
              className={cn(
                "h-2 w-2 rounded-full transition-all duration-200",
                "hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                index === current - 1
                  ? "bg-primary w-6"
                  : "bg-muted-foreground hover:bg-foreground"
              )}
              onClick={() => scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
      
      {/* Progress indicator (optional visual enhancement) */}
      {autoSlide && !isHovered && images.length > 1 && (
        <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-100 ease-linear"
            style={{
              width: `${((current - 1) / (count - 1)) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  )
}