// Client-side lesson progress persistence (localStorage).
// Saved progress is discarded after the TTL so students get a fresh start
// when they come back much later.

export const PROGRESS_TTL_MS = 60 * 60 * 1000 // 1 hour

export function lessonStorageKey(lessonId: string) {
  return `lca_lesson_${lessonId}`
}

export function blockStorageKey(lessonId: string, blockKey: string) {
  return `lca_lesson_${lessonId}_blk_${blockKey}`
}

/** Parse a saved payload, enforcing the TTL. Returns null (and removes the key) when stale/invalid. */
export function readWithTtl<T extends { savedAt?: unknown }>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as T
    if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > PROGRESS_TTL_MS) {
      localStorage.removeItem(key)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

/** Remove every localStorage key for this lesson (shell + per-block state). */
export function clearLessonStorage(lessonId: string) {
  try {
    const prefix = lessonStorageKey(lessonId)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) localStorage.removeItem(key)
    }
  } catch {}
}
