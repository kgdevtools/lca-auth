"use client"

import { useState } from "react"
import type { PlayerProfile, EventGames, GameEntry } from "@/lib/playerProfileServer"
import type { LinkedGame } from "@/lib/playerGames"
import GameViewer from "@/components/game-viewer"
import { monthOf, yearOf } from "../PerfChart"
import styles from "./profile.module.css"

const f1 = (n: number | null) => (n == null ? "—" : n.toFixed(1))
const int = (n: number | null) => (n == null ? "—" : String(n))
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
const pctOf = (x: number) => `${Math.round(x * 100)}%`

const PAGE = 5

/** Paginated slice with a "see more" control. */
function usePaged<T>(items: T[]) {
  const [shown, setShown] = useState(PAGE)
  const visible = items.slice(0, shown)
  const remaining = items.length - visible.length
  return { visible, remaining, more: () => setShown((s) => s + PAGE) }
}

function SeeMore({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  if (remaining <= 0) return null
  return (
    <button type="button" className={styles.seeMore} onClick={onClick}>
      See more <span className={styles.seeMoreCount}>({remaining} more)</span>
    </button>
  )
}

// ── Overview ────────────────────────────────────────────────────────────────
export function OverviewTab({ profile }: { profile: PlayerProfile }) {
  const { player: p, record, metrics: m } = profile

  const whiteGames = record.white.wins + record.white.losses + record.white.draws
  const blackGames = record.black.wins + record.black.losses + record.black.draws
  const whiteScore = whiteGames ? (record.white.wins + record.white.draws / 2) / whiteGames : null
  const blackScore = blackGames ? (record.black.wins + record.black.draws / 2) / blackGames : null

  let colourPhrase: string | null = null
  if (whiteScore != null && blackScore != null) {
    if (Math.abs(whiteScore - blackScore) < 0.05) colourPhrase = `Scores evenly with both colours (${pctOf(whiteScore)} White, ${pctOf(blackScore)} Black).`
    else if (whiteScore > blackScore) colourPhrase = `Stronger with White — ${pctOf(whiteScore)} vs ${pctOf(blackScore)} as Black.`
    else colourPhrase = `Stronger with Black — ${pctOf(blackScore)} vs ${pctOf(whiteScore)} as White.`
  }

  const trajectory =
    m.trendSlope == null || m.trendSlope === 0
      ? null
      : m.trendSlope > 0
        ? `trending upward (about +${m.trendSlope} rating/year)`
        : `trending downward (about ${m.trendSlope} rating/year)`

  return (
    <div className={styles.overview}>
      <p className={styles.overviewLead}>
        <strong className={styles.overviewBig}>{p.avgPerf}</strong>
        average performance across <strong>{p.ratedTournaments}</strong> rated
        tournament{p.ratedTournaments === 1 ? "" : "s"}
        {p.totalAppearances !== p.ratedTournaments ? ` (${p.totalAppearances} played)` : ""}.
      </p>
      <ul className={styles.overviewPoints}>
        {record.bestRank != null && (
          <li>
            <strong>Best finish {ordinal(record.bestRank)}</strong>
            {record.bestRankCount > 1 ? ` — achieved ${record.bestRankCount} times` : ""}
            {m.podiumRate != null ? `, with a top-3 finish in ${m.podiumRate}% of events.` : "."}
          </li>
        )}
        <li>
          Game record <strong>{record.wins}W–{record.losses}L–{record.draws}D</strong>
          {record.scorePct != null ? ` (${record.scorePct}% win rate)` : ""}
          {colourPhrase ? `. ${colourPhrase}` : "."}
        </li>
        {m.bestWin != null && (
          <li>Biggest scalp: beat a <strong>{m.bestWin}</strong>-rated opponent.</li>
        )}
        {trajectory && <li>Recent form is {trajectory}.</li>}
      </ul>
    </div>
  )
}

// ── Tournaments ─────────────────────────────────────────────────────────────
export function TournamentsTab({ byEvent }: { byEvent: EventGames[] }) {
  const { visible, remaining, more } = usePaged(byEvent)
  if (byEvent.length === 0) return <div className={styles.empty}>No tournaments recorded.</div>
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th><th>Event</th>
              <th className={styles.num}>Rank</th><th className={styles.num}>Pts</th>
              <th className={styles.num}>Rating</th><th className={styles.num}>Perf</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ appearance: a, location, arbiter }) => {
              const place = location ?? [a.district, a.province].filter(Boolean).join(", ")
              const meta = [place, arbiter].filter(Boolean).join(" · ")
              return (
                <tr key={a.tournamentId}>
                  <td className={styles.dim}>{monthOf(a.date)} {yearOf(a.date)}</td>
                  <td>
                    <div className={styles.evName}>{a.tournamentName}</div>
                    {meta && <div className={styles.evMeta}>{meta}</div>}
                  </td>
                  <td className={styles.num}>{int(a.rank)}</td>
                  <td className={styles.num}>{f1(a.points)}</td>
                  <td className={styles.num}>{int(a.seed)}</td>
                  <td className={styles.num}>{int(a.perf)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <SeeMore remaining={remaining} onClick={more} />
    </>
  )
}

// ── Opponents ───────────────────────────────────────────────────────────────
export function OpponentsTab({ profile }: { profile: PlayerProfile }) {
  const [view, setView] = useState<"h2h" | "event">("h2h")
  const { headToHead, byEvent } = profile
  const { visible, remaining, more } = usePaged(headToHead)

  return (
    <>
      <nav className={styles.tabs} style={{ marginTop: -4 }}>
        <button type="button" className={styles.tab} data-active={view === "h2h"} onClick={() => setView("h2h")}>Head-to-head</button>
        <button type="button" className={styles.tab} data-active={view === "event"} onClick={() => setView("event")}>By event</button>
      </nav>

      {view === "h2h" ? (
        headToHead.length === 0 ? (
          <div className={styles.empty}>No opponents resolved. The tournament rosters may not be available yet.</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Opponent</th>
                    <th className={styles.num}>W</th><th className={styles.num}>L</th><th className={styles.num}>D</th>
                    <th className={styles.num}>Games</th><th className={styles.num}>Events</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((h) => (
                    <tr key={h.name}>
                      <td className={styles.evName}>{h.name}</td>
                      <td className={`${styles.num} ${styles.pos}`}>{h.wins}</td>
                      <td className={`${styles.num} ${styles.neg}`}>{h.losses}</td>
                      <td className={styles.num}>{h.draws}</td>
                      <td className={styles.num}>{h.wins + h.losses + h.draws}</td>
                      <td className={styles.num}>{h.events}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SeeMore remaining={remaining} onClick={more} />
          </>
        )
      ) : (
        <EventBreakdown byEvent={byEvent} />
      )}
    </>
  )
}

// ── Games ───────────────────────────────────────────────────────────────────
export function GamesTab({ byEvent, games }: { byEvent: EventGames[]; games: LinkedGame[] }) {
  return (
    <>
      <p className={styles.sectionNote}>
        Round-by-round results below.{" "}
        {games.length > 0
          ? `${games.length} recorded game${games.length === 1 ? "" : "s"} matched and are playable.`
          : "No recorded PGN games matched this player (most players have none — results still show)."}
      </p>
      {games.length > 0 && (
        <div className={styles.gamesWrap}>
          <GameViewer games={games} />
        </div>
      )}
      <div className={styles.gamesWrap}>
        <EventBreakdown byEvent={byEvent} />
      </div>
    </>
  )
}

// ── Shared: per-event round breakdown ───────────────────────────────────────
function EventBreakdown({ byEvent }: { byEvent: EventGames[] }) {
  const withRounds = byEvent.filter((e) => e.rounds.length > 0)
  const { visible, remaining, more } = usePaged(withRounds)
  if (withRounds.length === 0) {
    return <div className={styles.empty}>No round data resolved for these tournaments.</div>
  }
  return (
    <>
      {visible.map(({ appearance: a, rounds }) => (
        <section key={a.tournamentId} className={styles.event}>
          <div className={styles.eventHead}>
            <span className={styles.eventName}>{a.tournamentName}</span>
            <span className={styles.eventMeta}>{monthOf(a.date)} {yearOf(a.date)} · rank {int(a.rank)} · {f1(a.points)} pts</span>
          </div>
          <div className={styles.rounds}>
            {rounds.map((r) => <RoundRow key={r.round} r={r} />)}
          </div>
        </section>
      ))}
      <SeeMore remaining={remaining} onClick={more} />
    </>
  )
}

function RoundRow({ r }: { r: GameEntry }) {
  const isBye = r.opponentName === null && (r.result === "bye" || r.result === null)
  const colour = r.color === "white" ? "○" : r.color === "black" ? "●" : ""
  return (
    <div className={styles.round}>
      <span className={styles.roundNo}>R{r.round}</span>
      <span className={styles.color} title={r.color ?? ""}>{colour}</span>
      <span className={styles.oppName}>
        {isBye ? <span className={styles.dim}>Bye</span> : r.opponentName ?? <span className={styles.dim}>Opponent #{r.opponentRank}</span>}
        {r.opponentRating != null && <span className={styles.oppMeta}> · {r.opponentRating}{r.opponentFed ? ` ${r.opponentFed}` : ""}</span>}
      </span>
      <ResultPill result={r.result} bye={isBye} />
    </div>
  )
}

function ResultPill({ result, bye }: { result: GameEntry["result"]; bye: boolean }) {
  if (bye) return <span className={`${styles.pill} ${styles.pillBye}`}>BYE</span>
  if (result === "win") return <span className={`${styles.pill} ${styles.pillWin}`}>W</span>
  if (result === "loss") return <span className={`${styles.pill} ${styles.pillLoss}`}>L</span>
  if (result === "draw") return <span className={`${styles.pill} ${styles.pillDraw}`}>D</span>
  return <span className={`${styles.pill} ${styles.pillBye}`}>·</span>
}
