"use client"

import { useState, useEffect, useCallback } from 'react'
import type { LichessSyncResult } from '@/types/lichess'

export interface UseLichessSyncReturn {
  isSyncing: boolean
  lastSynced: Date | null
  result: LichessSyncResult | null
  error: string | null
  sync: () => Promise<void>
}

/**
 * Client-side hook that calls POST /api/lichess/sync.
 *
 * @param autoSync - If true, triggers a sync automatically on mount.
 *                   Errors are swallowed silently when autoSync=true
 *                   so the page render is never blocked or broken.
 */
export function useLichessSync(autoSync = false): UseLichessSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [result, setResult] = useState<LichessSyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sync = useCallback(async () => {
    if (isSyncing) return

    setIsSyncing(true)
    setError(null)

    try {
      const res = await fetch('/api/lichess/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data: LichessSyncResult = await res.json()

      if (res.ok && data.success) {
        setLastSynced(new Date())
        setResult(data)
      } else if (data.error && data.error !== 'No active Lichess connection found') {
        // "No active Lichess connection found" is a normal state for students
        // who haven't connected yet — do not surface it as an error.
        if (!autoSync) {
          setError(data.error)
        }
      }
    } catch (err) {
      // For auto-sync we silently swallow network errors so the page
      // continues to work even if the sync endpoint is temporarily unavailable.
      if (!autoSync) {
        setError('Failed to sync with Lichess')
      }
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, autoSync])

  useEffect(() => {
    if (autoSync) {
      sync()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { isSyncing, lastSynced, result, error, sync }
}
