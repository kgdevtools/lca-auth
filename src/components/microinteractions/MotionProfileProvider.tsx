'use client'

import { createContext, useContext, useMemo } from 'react'
import { useReducedMotion } from 'framer-motion'
import { SPRING_BOUNCY, SPRING_SNAPPY, type SpringConfig } from './presets'

interface MotionProfile {
  spring: SpringConfig
  reduced: boolean
}

const MotionProfileContext = createContext<MotionProfile>({ spring: SPRING_BOUNCY, reduced: false })

/** Bouncy springs for students, snappy springs for coach/admin — mounted once in
 *  AcademyLayoutClient so every academy screen inherits the same profile. */
export function MotionProfileProvider({
  role,
  children,
}: {
  role: string | null
  children: React.ReactNode
}) {
  const prefersReduced = useReducedMotion()
  const isCoach = role === 'coach' || role === 'admin'

  const value = useMemo<MotionProfile>(
    () => ({
      spring: isCoach ? SPRING_SNAPPY : SPRING_BOUNCY,
      reduced: !!prefersReduced,
    }),
    [isCoach, prefersReduced]
  )

  return <MotionProfileContext.Provider value={value}>{children}</MotionProfileContext.Provider>
}

export function useMotionProfile() {
  return useContext(MotionProfileContext)
}
