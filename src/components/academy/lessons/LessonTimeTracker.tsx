'use client'

import { useEffect, useRef } from 'react'
import { updateTimeSpent } from '@/services/progressService'

interface LessonTimeTrackerProps {
  lessonId: string
}

/**
 * Invisible component that tracks time spent on a lesson
 * Updates the server every 30 seconds with accumulated time
 */
export function LessonTimeTracker({ lessonId }: LessonTimeTrackerProps) {
  const startTimeRef = useRef<number>(Date.now())
  const accumulatedTimeRef = useRef<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Reset start time when component mounts
    startTimeRef.current = Date.now()
    accumulatedTimeRef.current = 0

    // Update time spent every 30 seconds
    intervalRef.current = setInterval(async () => {
      const currentTime = Date.now()
      const elapsedSeconds = Math.floor((currentTime - startTimeRef.current) / 1000)

      if (elapsedSeconds > 0) {
        accumulatedTimeRef.current += elapsedSeconds
        startTimeRef.current = currentTime

        // Send to server (don't await to avoid blocking)
        try {
          await updateTimeSpent(lessonId, elapsedSeconds)
        } catch (error) {
          console.error('Error updating time spent:', error)
          // Silent fail - don't interrupt the user experience
        }
      }
    }, 30000) // Update every 30 seconds

    // Save time when user leaves the page
    const handleBeforeUnload = async () => {
      const currentTime = Date.now()
      const elapsedSeconds = Math.floor((currentTime - startTimeRef.current) / 1000)

      if (elapsedSeconds > 0) {
        // Use sendBeacon for reliable delivery during page unload
        const data = JSON.stringify({ lessonId, seconds: elapsedSeconds })

        // Try to send immediately (best effort)
        try {
          await updateTimeSpent(lessonId, elapsedSeconds)
        } catch (error) {
          // Ignore errors on page unload
        }
      }
    }

    // Handle page visibility changes (tab switching)
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // User switched tabs - save current time
        const currentTime = Date.now()
        const elapsedSeconds = Math.floor((currentTime - startTimeRef.current) / 1000)

        if (elapsedSeconds > 0) {
          try {
            await updateTimeSpent(lessonId, elapsedSeconds)
            accumulatedTimeRef.current += elapsedSeconds
          } catch (error) {
            console.error('Error updating time on visibility change:', error)
          }
        }
      } else {
        // User came back - reset start time
        startTimeRef.current = Date.now()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      // Final save before unmount
      const currentTime = Date.now()
      const elapsedSeconds = Math.floor((currentTime - startTimeRef.current) / 1000)

      if (elapsedSeconds > 0) {
        // Fire and forget
        updateTimeSpent(lessonId, elapsedSeconds).catch(() => {})
      }
    }
  }, [lessonId])

  // This component doesn't render anything
  return null
}
