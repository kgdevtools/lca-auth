import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'
import '@/styles/animations/chess-piece-404.css'

/**
 * 404 Not Found Page
 *
 * Displayed when a user navigates to a route that doesn't exist.
 * Features an animated chess knight piece with a friendly message.
 *
 * This page is automatically shown by Next.js for all unmatched routes.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-background text-foreground">
      <div className="flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-6 sm:space-y-8">
        {/* Animated Chess Knight */}
        <div className="chess-knight-simple mb-4 sm:mb-6" aria-hidden="true">
          <div className="chess-knight-simple-ear"></div>
          <div className="chess-knight-simple-head">
            <div className="chess-knight-eye"></div>
          </div>
          <div className="chess-knight-simple-neck"></div>
          <div className="chess-knight-simple-base"></div>
          <div className="chess-knight-mane"></div>
        </div>

        {/* Error Code */}
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight text-foreground">
          404
        </h1>

        {/* Error Message */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground">
            Page Not Found
          </h2>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
            The page you're looking for has moved to a different square on the board.
          </p>

          <p className="text-sm sm:text-base text-muted-foreground/80 max-w-sm mx-auto">
            Don't worry — even knights take unexpected moves sometimes!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto pt-4">
          <Link href="/" className="w-full sm:w-auto">
            <Button
              variant="default"
              size="lg"
              className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Home className="w-5 h-5" />
              Back to Home
            </Button>
          </Link>

          <Button
            variant="outline"
            size="lg"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto gap-2 hover:bg-accent/70 transition-all duration-200"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </Button>
        </div>

        {/* Optional: Popular Pages */}
        <div className="pt-8 border-t border-border w-full">
          <p className="text-sm font-medium text-muted-foreground mb-4">
            Or try one of these pages:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/view">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Games Database
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Dashboard
              </Button>
            </Link>
            <Link href="/tournaments">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Tournaments
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
