'use client'

import { useEffect, useState, useCallback } from 'react'
import { Joyride, STATUS, type Step, type EventData, type Controls } from 'react-joyride'

const SEEN_KEY = 'lca_coach_tour_v1'
/** Dispatch this window event to (re)start the tour, e.g. from a "Take a tour" button. */
export const COACH_TOUR_EVENT = 'lca:coach-tour'

const STEPS: Step[] = [
  {
    target: '[data-tour="dashboard"]',
    title: 'Welcome to the Academy',
    content: 'A quick tour of the tools you use to run classes, set work, and track each student’s progress.',
  },
  {
    target: '[data-tour="students"]',
    title: 'Your students',
    content: 'Assign students, view each one’s progress, award bonus points, and set their tier — which tailors their daily puzzles.',
  },
  {
    target: '[data-tour="lesson/add"]',
    title: 'Create lessons',
    content: 'Build interactive studies, puzzles, and quizzes. Completing them earns students points and moves their academy rating.',
  },
  {
    target: '[data-tour="puzzles"]',
    title: 'Daily puzzles',
    content: 'Publish a daily puzzle pool. Each student automatically gets a slice matched to their rating; solving grants points and updates their live rating.',
  },
  {
    target: '[data-tour="classroom"]',
    title: 'Live classroom',
    content: 'Start a real-time session — a shared board, video, move-by-move teaching, and hand-raising. Share the link and teach live.',
  },
]

export default function CoachOnboardingTour() {
  const [run, setRun] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Auto-start once per coach (per browser); small delay so the sidebar targets paint.
    if (typeof window !== 'undefined' && !localStorage.getItem(SEEN_KEY)) {
      const t = setTimeout(() => setRun(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  // Allow manual re-trigger from anywhere via a window event.
  useEffect(() => {
    const start = () => setRun(true)
    window.addEventListener(COACH_TOUR_EVENT, start)
    return () => window.removeEventListener(COACH_TOUR_EVENT, start)
  }, [])

  const handleEvent = useCallback((data: EventData, _controls: Controls) => {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      try { localStorage.setItem(SEEN_KEY, '1') } catch {}
      setRun(false)
    }
  }, [])

  if (!mounted) return null

  return (
    <Joyride
      run={run}
      continuous
      scrollToFirstStep
      steps={STEPS}
      onEvent={handleEvent}
      locale={{ back: 'Back', close: 'Close', last: 'Done', next: 'Next', skip: 'Skip tour' }}
      options={{
        primaryColor:   '#3b82f6',
        zIndex:         10000,
        overlayColor:   'rgba(2, 6, 23, 0.55)',
        backgroundColor:'var(--card)',
        textColor:      'var(--foreground)',
        arrowColor:     'var(--card)',
        showProgress:   true,
        skipBeacon:     true,
        buttons:        ['skip', 'back', 'primary'],
      }}
    />
  )
}
