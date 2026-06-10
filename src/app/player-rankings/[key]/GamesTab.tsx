"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Chess } from "chess.js"
import { Chessboard } from "@zoendev/react-chessboard"
import type { LinkedGame } from "@/lib/playerGames"
import { BoardShell } from "@/components/chess-games/BoardShell"
import styles from "./profile.module.css"

// This whole module (chess.js + chessboard + the analysis board/engine) is loaded
// on demand via next/dynamic when the Games tab opens, so it never weighs down the
// profile page's initial bundle. Linked games are fetched from /api/players/games.

/** Read a single PGN tag value, treating "?" / empty as absent. */
function pgnTag(pgn: string, tag: string): string | null {
  const v = pgn.match(new RegExp(`^\\s*\\[${tag}\\s+"([^"]*)"\\]`, "m"))?.[1]?.trim()
  return v && v !== "?" ? v : null
}

const RESULT_LABEL: Record<string, string> = { "1-0": "1–0", "0-1": "0–1", "1/2-1/2": "½–½", "*": "*" }

export default function GamesTab({ playerKey }: { playerKey: string }) {
  const [games, setGames] = useState<LinkedGame[] | null>(null)
  const [sel, setSel] = useState(0)
  // Bumped on a preview click so the board remounts and loads that game; in-board
  // prev/next stepping syncs the highlight back via onGameChange (no remount).
  const [mountKey, setMountKey] = useState(0)

  useEffect(() => {
    let alive = true
    setGames(null)
    fetch(`/api/players/games?key=${encodeURIComponent(playerKey)}`)
      .then((r) => (r.ok ? r.json() : { games: [] }))
      .then((d: { games?: LinkedGame[] }) => { if (alive) setGames(d.games ?? []) })
      .catch(() => { if (alive) setGames([]) })
    return () => { alive = false }
  }, [playerKey])

  if (games === null) return <div className={styles.empty}>Loading games…</div>
  if (games.length === 0) return <div className={styles.empty}>No recorded PGN games matched this player yet.</div>

  const pick = (i: number) => { setSel(i); setMountKey((k) => k + 1) }

  return (
    <>
      <div className={styles.gamesWrap}>
        <BoardShell key={mountKey} games={games} initialIndex={sel} onGameChange={setSel} hideFenBar />
      </div>
      <div className={styles.gamesGrid}>
        {games.map((g, i) => (
          <GamePreview key={i} game={g} active={i === sel} onSelect={() => pick(i)} />
        ))}
      </div>
    </>
  )
}

/** A clickable game card: final-position preview + the game's headers below it. */
function GamePreview({ game, active, onSelect }: { game: LinkedGame; active: boolean; onSelect: () => void }) {
  const fen = useMemo(() => {
    try { const c = new Chess(); c.loadPgn(game.pgn); return c.fen() } catch { return null }
  }, [game.pgn])

  const white = pgnTag(game.pgn, "White") ?? "White"
  const black = pgnTag(game.pgn, "Black") ?? "Black"
  const result = pgnTag(game.pgn, "Result")
  const event = pgnTag(game.pgn, "Event")
  const rawDate = pgnTag(game.pgn, "Date")
  const yr = rawDate?.match(/^(\d{4})/)?.[1]
  const mo = rawDate?.match(/^\d{4}\.(\d{2})/)?.[1]
  const date = yr ? (mo && mo !== "??" ? `${yr}-${mo}` : yr) : null
  const sub = [event, date].filter(Boolean).join(" · ")

  return (
    <button type="button" className={styles.gp} data-active={active} onClick={onSelect}>
      <PreviewBoard fen={fen} />
      <span className={styles.gpInfo}>
        <span className={styles.gpPlayers}>
          <span className={styles.gpName}>{white}</span>
          <span className={styles.gpRes}>{result ? (RESULT_LABEL[result] ?? result) : "–"}</span>
          <span className={styles.gpName}>{black}</span>
        </span>
        {sub && <span className={styles.gpSub}>{sub}</span>}
      </span>
    </button>
  )
}

/** Final-position thumbnail using the SAME board + pieces as the main board.
 *  Measures its container so the read-only Chessboard scales with the card. */
function PreviewBoard({ fen }: { fen: string | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const apply = () => setW(Math.floor(el.getBoundingClientRect().width))
    apply()
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(apply)
      ro.observe(el)
      return () => ro.disconnect()
    }
    window.addEventListener("resize", apply)
    return () => window.removeEventListener("resize", apply)
  }, [])
  return (
    <div ref={ref} className={styles.gpBoard}>
      {w > 0 && fen && (
        <Chessboard
          position={fen}
          boardWidth={w}
          arePiecesDraggable={false}
          areArrowsAllowed={false}
          showBoardNotation={false}
          customBoardStyle={{ borderRadius: "0" }}
        />
      )}
    </div>
  )
}
