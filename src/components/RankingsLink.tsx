"use client"

import { useEffect, useState } from "react"
import Link, { useLinkStatus } from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { Loader2, Trophy } from "lucide-react"
import { TAP_SCALE } from "@/components/microinteractions/presets"

const MotionLink = motion.create(Link)

/** Label + icon. Pending comes from the click itself (covers full-page loads,
 *  where useLinkStatus never fires) or from useLinkStatus (must live inside the Link). */
function Inner({ clicked }: { clicked: boolean }) {
  const { pending: navPending } = useLinkStatus()
  const pending = clicked || navPending
  return (
    <span className="inline-flex items-center gap-2" aria-live="polite">
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      ) : (
        <Trophy className="h-4 w-4" aria-hidden="true" />
      )}
      {pending ? "Opening rankings…" : "View rankings"}
    </span>
  )
}

/** The funding-pause page's "View rankings" button: tap down-scale, then the
 *  whole button pulses with a spinner until /rankings' loading skeleton takes over. */
export default function RankingsLink() {
  const reduced = !!useReducedMotion()
  const [clicked, setClicked] = useState(false)

  // Back/forward cache restores the page as it was left; clear the pending state.
  useEffect(() => {
    const reset = () => setClicked(false)
    window.addEventListener("pageshow", reset)
    return () => window.removeEventListener("pageshow", reset)
  }, [])

  return (
    <MotionLink
      href="/rankings"
      onClick={(e: React.MouseEvent) => {
        // Ctrl/Cmd/Shift-click opens a new tab; this page isn't navigating.
        if (!(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)) setClicked(true)
      }}
      aria-busy={clicked}
      whileTap={reduced ? undefined : { scale: TAP_SCALE }}
      animate={clicked && !reduced ? { opacity: [1, 0.65, 1] } : { opacity: 1 }}
      transition={clicked && !reduced ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.1 }}
      className="inline-flex min-h-11 items-center justify-center gap-2 bg-amber-500 px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 aria-busy:cursor-progress"
    >
      <Inner clicked={clicked} />
    </MotionLink>
  )
}
