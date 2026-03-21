"use client"

import { useLichessSync } from '@/hooks/useLichessSync'

/**
 * Silent sync trigger rendered inside /academy page.
 * Mounts invisibly and fires a non-blocking Lichess sync in the background.
 * Only renders for students — the parent server component conditionally includes it.
 */
export default function LichessSyncTrigger() {
  useLichessSync(true)
  return null
}
