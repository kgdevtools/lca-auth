"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface CountdownTimerProps {
  targetDate: string
  initialTimeLeft?: {
    days: number
    hours: number
    minutes: number
    seconds: number
    isExpired: boolean
  }
}

export function CountdownTimer({ targetDate, initialTimeLeft }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialTimeLeft)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)

    const calculateTimeLeft = () => {
      const tournamentDate = new Date(targetDate)
      const now = new Date()
      const timeDiff = tournamentDate.getTime() - now.getTime()

      if (timeDiff <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        }
      }

      return {
        days: Math.floor(timeDiff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((timeDiff % (1000 * 60)) / 1000),
        isExpired: false,
      }
    }

    // Update immediately when client loads
    setTimeLeft(calculateTimeLeft())

    // Then update every second
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate])

  if (!isClient || !timeLeft) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Link href="/forms/tournament-registration" className="block">
          <div className="group relative w-full px-6 py-6 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-500 dark:to-green-600 text-white rounded-lg shadow-lg hover:from-green-700 hover:to-green-800 dark:hover:from-green-600 dark:hover:to-green-700 transition-all duration-200 hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
            <div className="text-center space-y-2">
              <div className="text-xl font-extrabold leading-tight">Register for Limpopo Chess Academy Open 2025</div>
              <div className="grid grid-cols-4 gap-0.5">
                <div className="text-center">
                  <div className="h-8 bg-white/20 rounded animate-pulse"></div>
                </div>
                <div className="text-center">
                  <div className="h-8 bg-white/20 rounded animate-pulse"></div>
                </div>
                <div className="text-center">
                  <div className="h-8 bg-white/20 rounded animate-pulse"></div>
                </div>
                <div className="text-center">
                  <div className="h-8 bg-white/20 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    )
  }

  if (timeLeft.isExpired) {
    return (
      <div className="w-full max-w-md mx-auto">
        <Link href="/forms/tournament-registration" className="block">
          <div className="group relative w-full px-6 py-6 bg-gradient-to-r from-red-600 to-red-700 dark:from-red-500 dark:to-red-600 text-white rounded-lg hover:from-red-700 hover:to-red-800 dark:hover:from-red-600 dark:hover:to-red-700 font-semibold text-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
            <div className="space-y-2">
              <div className="text-xl font-extrabold leading-tight">Register for Limpopo Chess Academy Open 2025</div>

              <div className="text-xl font-bold tracking-tightest leading-none">Tournament Started!</div>
            </div>

            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-red-400/20 to-red-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <Link href="/forms/tournament-registration" className="block">
        <div className="group relative w-full px-6 py-6 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-500 dark:to-green-600 text-white rounded-lg hover:from-green-700 hover:to-green-800 dark:hover:from-green-600 dark:hover:to-green-700 font-semibold text-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
          <div className="space-y-2">
            <div className="text-xl font-extrabold leading-tight">Register for Limpopo Chess Academy Open 2025</div>

            <div className="grid grid-cols-4 gap-0.5">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tightest leading-none">
                  {timeLeft.days}
                </div>
                <div className="text-xs sm:text-sm font-medium uppercase tracking-tightest leading-tight opacity-90 mt-1">
                  Days
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tightest leading-none">
                  {timeLeft.hours}
                </div>
                <div className="text-xs sm:text-sm font-medium uppercase tracking-tightest leading-tight opacity-90 mt-1">
                  Hours
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tightest leading-none">
                  {timeLeft.minutes}
                </div>
                <div className="text-xs sm:text-sm font-medium uppercase tracking-tightest leading-tight opacity-90 mt-1">
                  Min
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tightest leading-none">
                  {timeLeft.seconds}
                </div>
                <div className="text-xs sm:text-sm font-medium uppercase tracking-tightest leading-tight opacity-90 mt-1">
                  Sec
                </div>
              </div>
            </div>
          </div>

          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-green-400/20 to-green-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        </div>
      </Link>
    </div>
  )
}
