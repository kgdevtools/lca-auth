'use client'

interface BlockProgressDotsProps {
  total: number
  current: number
  completed: Set<number>
}

export default function BlockProgressDots({ total, current, completed }: BlockProgressDotsProps) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const isCompleted = completed.has(i)
        const isCurrent = i === current
        
        return (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              isCompleted
                ? 'bg-green-500'
                : isCurrent
                ? 'bg-amber-500'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
            title={`Block ${i + 1}`}
          />
        )
      })}
    </div>
  )
}