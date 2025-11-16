'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import '@/styles/animations/chess-piece-404.css'

/**
 * Error Boundary Component
 *
 * Catches runtime errors in the app and displays a friendly error page.
 * This is different from 404 (not-found.tsx) — this handles unexpected errors.
 *
 * Must be a Client Component in Next.js App Router.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-background text-foreground">
      <div className="flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-6 sm:space-y-8">
        {/* Animated Chess Piece with Pulsating Border */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48" aria-hidden="true">
          {/* Pulsating outer rings */}
          <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-primary/15 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
          <div className="absolute inset-4 bg-primary/20 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }} />

          {/* Chess Knight in center */}
          <div className="absolute inset-8 sm:inset-10 flex items-center justify-center">
            <div className="chess-knight-simple relative scale-[0.4] sm:scale-[0.5]">
              <div className="chess-knight-simple-ear"></div>
              <div className="chess-knight-simple-head">
                <div className="chess-knight-eye"></div>
              </div>
              <div className="chess-knight-simple-neck"></div>
              <div className="chess-knight-simple-base"></div>
              <div className="chess-knight-mane"></div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
            Oops! Something Went Wrong
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
            {pathname ? `"${pathname}" not found!` : 'Page not found!'}
          </p>
        </div>
      </div>
    </div>
  )
}
