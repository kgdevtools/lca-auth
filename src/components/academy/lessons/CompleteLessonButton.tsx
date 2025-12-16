'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Loader2, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { markLessonComplete } from '@/services/progressService'

interface CompleteLessonButtonProps {
  lessonId: string
  lessonTitle: string
  isCompleted?: boolean
}

export function CompleteLessonButton({
  lessonId,
  lessonTitle,
  isCompleted = false,
}: CompleteLessonButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleComplete = async () => {
    if (isCompleted) return

    setIsLoading(true)

    try {
      await markLessonComplete(lessonId)

      toast.success('Lesson Complete! 🎉', {
        description: `Great job finishing "${lessonTitle}"! Keep up the awesome work!`,
      })

      router.refresh()
    } catch (error: any) {
      console.error('Error marking lesson complete:', error)

      toast.error('Oops! Something Went Wrong', {
        description: error.message || 'Could not mark this lesson as complete. Please try again.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isCompleted) {
    return (
      <Button size="lg" disabled className="gap-2">
        <Trophy className="w-5 h-5" />
        Lesson Completed!
      </Button>
    )
  }

  return (
    <Button
      size="lg"
      onClick={handleComplete}
      disabled={isLoading}
      className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Saving Progress...
        </>
      ) : (
        <>
          <CheckCircle2 className="w-5 h-5" />
          Mark as Complete
        </>
      )}
    </Button>
  )
}
