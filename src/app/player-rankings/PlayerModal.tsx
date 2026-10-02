"use client"

import { useEffect, useRef, type ReactNode } from "react"
import styles from "./rankings.module.css"

/**
 * Player detail modal for the rankings table. Built on the native <dialog>
 * (showModal) so focus trapping, Escape-to-close and top-layer stacking come
 * from the browser — no dialog library on this page. The blurred backdrop is
 * the dialog's ::backdrop. Prev/next walk the current (filtered, sorted) list.
 */
export default function PlayerModal({
  title,
  position,
  onPrev,
  onNext,
  onClose,
  children,
}: {
  title: string
  /** "4 of 120" — rank in the current view; omitted if the player isn't in it. */
  position?: string
  onPrev?: () => void
  onNext?: () => void
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  // Latest callbacks for the once-registered listeners below.
  const handlers = useRef({ onPrev, onNext, onClose })
  handlers.current = { onPrev, onNext, onClose }

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    // Focus the dialog itself (not its first button) so a mouse open shows no
    // focus ring; arrows/Escape still reach the dialog's listeners.
    dialog.focus()
    // showModal doesn't stop the page behind from scrolling.
    const root = document.documentElement
    const prevOverflow = root.style.overflow
    root.style.overflow = "hidden"

    // Escape fires "cancel"; route it through onClose so the URL/history stays in sync.
    const onCancel = (e: Event) => {
      e.preventDefault()
      handlers.current.onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return
      if (e.key === "ArrowLeft") handlers.current.onPrev?.()
      if (e.key === "ArrowRight") handlers.current.onNext?.()
    }
    dialog.addEventListener("cancel", onCancel)
    dialog.addEventListener("keydown", onKey)
    return () => {
      dialog.removeEventListener("cancel", onCancel)
      dialog.removeEventListener("keydown", onKey)
      root.style.overflow = prevOverflow
      if (dialog.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      className={styles.modal}
      aria-label={title}
      tabIndex={-1}
      // A click on the dialog element itself (not its content) is a backdrop click.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={styles.modalInner}>
        <div className={styles.modalBar}>
          <div className={styles.modalNav}>
            <button type="button" className={styles.modalBtn} onClick={onPrev} disabled={!onPrev} aria-label="Previous player">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button type="button" className={styles.modalBtn} onClick={onNext} disabled={!onNext} aria-label="Next player">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
            {position && <span className={styles.modalPos}>#{position}</span>}
          </div>
          <button type="button" className={styles.modalBtn} onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
