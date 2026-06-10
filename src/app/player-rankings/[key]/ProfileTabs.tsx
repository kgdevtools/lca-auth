"use client"

import { useState, type ReactNode } from "react"
import type { PlayerProfile, EventGames, GameEntry, HeadToHead } from "@/lib/playerProfileServer"
import { monthOf, yearOf } from "../PerfChart"
import styles from "./profile.module.css"

const int = (n: number | null) => (n == null ? "—" : String(n))
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
const ord = (n: number | null) => (n == null ? "—" : ordinal(n))
const pctOf = (x: number) => `${Math.round(x * 100)}%`

const PAGE = 5
function usePaged<T>(items: T[]) {
  const [shown, setShown] = useState(PAGE)
  const visible = items.slice(0, shown)
  return { visible, remaining: items.length - visible.length, more: () => setShown((s) => s + PAGE) }
}
function SeeMore({ remaining, onClick }: { remaining: number; onClick: () => void }) {
  if (remaining <= 0) return null
  return (
    <button type="button" className={styles.more} onClick={onClick}>
      See more <span className={styles.c}>({remaining} more)</span>
    </button>
  )
}

const place = (e: EventGames) =>
  e.location ?? [e.appearance.district, e.appearance.province].filter(Boolean).join(", ")

// ── Overview: a concise scout report (no headline number — that's the hero) ──
export function OverviewTab({ profile }: { profile: PlayerProfile }) {
  const { player: p, record: r, metrics: m } = profile
  const wg = r.white.wins + r.white.losses + r.white.draws
  const bg = r.black.wins + r.black.losses + r.black.draws
  const ws = wg ? (r.white.wins + r.white.draws / 2) / wg : null
  const bs = bg ? (r.black.wins + r.black.draws / 2) / bg : null

  let colour: string | null = null
  if (ws != null && bs != null) {
    if (Math.abs(ws - bs) < 0.05) colour = `scores evenly with both colours (${pctOf(ws)} White, ${pctOf(bs)} Black)`
    else if (ws > bs) colour = `stronger with White (${pctOf(ws)} vs ${pctOf(bs)} as Black)`
    else colour = `stronger with Black (${pctOf(bs)} vs ${pctOf(ws)} as White)`
  }

  const trajUp = m.trendSlope != null && m.trendSlope !== 0 ? m.trendSlope > 0 : null

  // Each insight is a prominent figure + a label + supporting prose. The figure
  // carries the stat; the prose stays muted so the two read at a glance.
  const items: { fig: ReactNode; lab: string; note: ReactNode }[] = []
  if (r.bestRank != null) {
    items.push({
      fig: ordinal(r.bestRank),
      lab: "Best finish",
      note: (
        <>
          {r.bestRankCount > 1 ? <>reached <strong>{r.bestRankCount} times</strong></> : "reached once"}
          {m.podiumRate != null ? <> · top-3 in <strong>{m.podiumRate}%</strong> of events</> : null}
        </>
      ),
    })
  }
  items.push({
    fig: r.scorePct != null ? `${r.scorePct}%` : `${r.wins}–${r.losses}–${r.draws}`,
    lab: "Game record",
    note: (
      <>
        <strong>{r.wins}W · {r.losses}L · {r.draws}D</strong>{colour ? ` — ${colour}` : ""}
      </>
    ),
  })
  if (m.strengthOfSchedule != null) {
    items.push({
      fig: m.strengthOfSchedule,
      lab: "Avg opposition",
      note: (
        <>
          scored <strong>{m.expectedDelta == null ? "—" : `${m.expectedDelta >= 0 ? "+" : "−"}${Math.abs(m.expectedDelta)}%`}</strong> vs expected points
        </>
      ),
    })
  }
  if (m.bestWin != null) {
    items.push({ fig: m.bestWin, lab: "Biggest scalp", note: "highest-rated opponent beaten" })
  }
  if (trajUp != null) {
    items.push({
      fig: `${m.trendSlope! > 0 ? "+" : "−"}${Math.abs(m.trendSlope!)}`,
      lab: "Trajectory",
      note: <>rating/year — trending <strong>{trajUp ? "upward" : "downward"}</strong></>,
    })
  }

  return (
    <div className={styles.overview}>
      <p className={styles.overviewLead}>
        A snapshot of <strong>{p.name.split(" ")[0]}</strong>’s record across{" "}
        <strong>{p.ratedTournaments}</strong> rated tournament{p.ratedTournaments === 1 ? "" : "s"}
        {p.totalAppearances !== p.ratedTournaments ? ` (${p.totalAppearances} played in total)` : ""}.
      </p>
      <div className={styles.scout}>
        {items.map((it, i) => (
          <div className={styles.scoutItem} key={i}>
            <span className={styles.scoutFig}>{it.fig}</span>
            <span className={styles.scoutBody}>
              <span className={styles.scoutLab}>{it.lab}</span>
              <span className={styles.scoutNote}>{it.note}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tournaments (accordion: expand a tournament to see its opponents) ─────────
export function TournamentsTab({ byEvent }: { byEvent: EventGames[] }) {
  const { visible, remaining, more } = usePaged(byEvent)
  const [open, setOpen] = useState<string | null>(null)
  if (byEvent.length === 0) return <div className={styles.empty}>No tournaments recorded.</div>
  return (
    <>
      <div className={styles.acc}>
        {visible.map((e) => {
          const a = e.appearance
          const isOpen = open === a.tournamentId
          return (
            <div className={styles.accItem} key={a.tournamentId}>
              <button
                type="button"
                className={styles.accHead}
                data-open={isOpen}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : a.tournamentId)}
              >
                <span className={styles.accChev} data-open={isOpen} aria-hidden="true">›</span>
                <span className={styles.accMain}>
                  <span className={styles.accName}>{a.tournamentName}</span>
                  <span className={styles.accMeta}>{monthOf(a.date)} {yearOf(a.date)}{place(e) ? ` · ${place(e)}` : ""}</span>
                </span>
                <span className={styles.accFigs}>
                  <span className={styles.accFig}><b data-hero="true">{int(a.perf)}</b><i>perf</i></span>
                  <span className={styles.accFig}><b>{ord(a.rank)}</b><i>rank</i></span>
                </span>
              </button>
              {isOpen && (
                <div className={styles.accBody}>
                  {e.rounds.length ? (
                    e.rounds.map((r) => <OppRow key={r.round} r={r} />)
                  ) : (
                    <div className={styles.empty}>No opponents resolved for this tournament.</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <SeeMore remaining={remaining} onClick={more} />
    </>
  )
}

// One opponent row inside an expanded tournament. Rating + federation share the
// result's prominence; the colour disc marks the side the player held.
function OppRow({ r }: { r: GameEntry }) {
  const isBye = r.opponentName === null && (r.result === "bye" || r.result === null)
  const colour = r.color === "white" ? "○" : r.color === "black" ? "●" : "·"
  return (
    <div className={styles.opp}>
      <span className={styles.oppNo}>R{r.round}</span>
      <span className={styles.oppClr} data-c={r.color ?? undefined} title={r.color ?? ""}>{colour}</span>
      <span className={styles.oppName}>
        {isBye ? <span className={styles.rDim}>Bye</span> : (r.opponentName ?? <span className={styles.rDim}>Opponent #{r.opponentRank}</span>)}
      </span>
      <span className={styles.oppRat}>{r.opponentRating ?? "—"}</span>
      <span className={styles.oppFed}>{r.opponentFed ?? "—"}</span>
      <ResultPill result={r.result} bye={isBye} />
    </div>
  )
}

// ── Opponents (frequent opponents, most-played first) ────────────────────────
export function OpponentsTab({ profile }: { profile: PlayerProfile }) {
  const { headToHead: h2h } = profile
  const { visible, remaining, more } = usePaged(h2h)

  if (h2h.length === 0) {
    return <div className={styles.empty}>No opponents resolved yet. The tournament rosters may not be available.</div>
  }

  return (
    <>
      <p className={styles.note}>Most-frequent opponents, with this player&apos;s record against each. Ratings are the opponent&apos;s most recent.</p>

      {/* narrow: cards */}
      <div className={`${styles.cards} ${styles.onlyNarrow}`}>
        {visible.map((h) => {
          const g = h.wins + h.losses + h.draws
          const meta = [h.rating != null ? String(h.rating) : "unrated", h.fed ?? null, `${h.events} event${h.events === 1 ? "" : "s"}`]
            .filter(Boolean)
            .join(" · ")
          return (
            <div className={styles.cardRow} key={h.name}>
              <div className={styles.cMain}>
                <div className={styles.cName}>{h.name}</div>
                <div className={styles.cMeta}>{meta}</div>
                {h.meetings.length > 0 && (
                  <div className={styles.oppTokens}>
                    {h.meetings.map((mt, i) => (
                      <span key={i} className={styles.oppTok} data-r={mt.result} title={`${mt.result}${mt.color ? ` as ${mt.color}` : ""}`}>
                        <i className={styles.sq} data-c={mt.color ?? undefined} />
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.cFigs}>
                <div className={styles.cFig}>
                  <span className={`${styles.figV} ${styles.mono}`}>
                    <span className={styles.pos}>{h.wins}</span>–<span className={styles.neg}>{h.losses}</span>–{h.draws}
                  </span>
                  <span className={styles.figL}>{g} game{g === 1 ? "" : "s"}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* wide: table */}
      <div className={styles.onlyWide}>
        <table className={styles.tbl}>
          <thead>
            <tr>
              <th>Opponent</th>
              <th className={styles.num}>Rating</th><th>Fed</th>
              <th className={styles.num}>W</th><th className={styles.num}>L</th><th className={styles.num}>D</th>
              <th className={styles.num}>Games</th><th className={styles.num}>Events</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((h) => (
              <tr key={h.name}>
                <td className={styles.name}>{h.name}</td>
                <td className={styles.num}>{h.rating ?? "—"}</td>
                <td>{h.fed ?? "—"}</td>
                <td className={styles.num}><span className={`${styles.wld} ${styles.pos}`}>{h.wins}<Discs meetings={h.meetings} result="win" /></span></td>
                <td className={styles.num}><span className={`${styles.wld} ${styles.neg}`}>{h.losses}<Discs meetings={h.meetings} result="loss" /></span></td>
                <td className={styles.num}><span className={styles.wld}>{h.draws}<Discs meetings={h.meetings} result="draw" /></span></td>
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
}

/** Per-result colour squares for the Opponents table (outline = White, filled = Black). */
function Discs({ meetings, result }: { meetings: HeadToHead["meetings"]; result: "win" | "loss" | "draw" }) {
  const cs = meetings.filter((m) => m.result === result)
  if (cs.length === 0) return null
  return (
    <span className={styles.sqs}>
      {cs.map((m, i) => (
        <i key={i} className={styles.sq} data-c={m.color ?? undefined} title={m.color ?? "unknown colour"} />
      ))}
    </span>
  )
}

function ResultPill({ result, bye }: { result: GameEntry["result"]; bye: boolean }) {
  const r = bye ? "bye" : result ?? "bye"
  const label = r === "win" ? "W" : r === "loss" ? "L" : r === "draw" ? "D" : r === "bye" ? "BYE" : "·"
  return <span className={styles.pill} data-r={r}>{label}</span>
}
