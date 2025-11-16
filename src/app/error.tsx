'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, RefreshCw } from 'lucide-react'

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
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-background text-foreground">
      <div className="flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-6 sm:space-y-8">
        {/* Error Icon */}
        <div className="relative w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48" aria-hidden="true">
          <div className="absolute inset-0 bg-destructive/10 rounded-full animate-pulse" />
          <div className="absolute inset-4 bg-destructive/20 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
          <div className="absolute inset-8 sm:inset-10 flex items-center justify-center">
            <span className="text-6xl sm:text-7xl md:text-8xl">⚠️</span>
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
            Oops! Something Went Wrong
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
            We encountered an unexpected error. Don't worry, we're working on it!
          </p>

          {/* Error details (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 p-4 bg-muted rounded-lg text-left text-sm">
              <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">
                Error Details (Development Only)
              </summary>
              <pre className="mt-2 text-xs overflow-auto text-destructive">
                {error.message}
              </pre>
              {error.digest && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Error ID: {error.digest}
                </p>
              )}
            </details>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto pt-4">
          <Button
            variant="default"
            size="lg"
            onClick={() => reset()}
            className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </Button>

          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="lg"
              className="w-full sm:w-auto gap-2 hover:bg-accent/70 transition-all duration-200"
            >
              <Home className="w-5 h-5" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Help Text */}
        <p className="text-sm text-muted-foreground/80 pt-4">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  )
}
