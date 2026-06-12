"use client"

import { useState } from "react"
import type { EventGames, GameEntry, HeadToHead } from "@/lib/playerProfileServer"
import styles from "./profile.module.css"

const int = (n: number | null) => (n == null ? "—" : String(n))
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
const ord = (n: number | null) => (n == null ? "—" : ordinal(n))
const fmtPts = (n: number | null) => (n == null ? "—" : Number.isInteger(n) ? String(n) : n.toFixed(1))
/** "2025/03/01" / "2025-03-01" → "2025-03-01"; missing → "—". */
const isoDate = (d: string | null) => (d ? d.trim().replace(/\//g, "-").slice(0, 10) : "—")

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
                  <span className={styles.accMeta}>{isoDate(a.date)}{place(e) ? ` · ${place(e)}` : ""}</span>
                </span>
                <span className={styles.accFigs}>
                  <span className={styles.accFig}><b>{ord(a.rank)}</b><i>rank</i></span>
                  <span className={styles.accFig}><b>{fmtPts(a.points)}</b><i>points</i></span>
                  <span className={styles.accFig}><b>{int(a.seed)}</b><i>rating</i></span>
                  <span className={styles.accFig}><b data-hero="true">{int(a.perf)}</b><i>perf</i></span>
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

// One opponent row inside an expanded tournament. The result is the chess score
// (1 / ½ / 0) on a pill tinted by the colour the player held; grey marks a bye.
function OppRow({ r }: { r: GameEntry }) {
  const isBye = r.opponentName === null && (r.result === "bye" || r.result === null)
  const score = r.result === "win" ? "1" : r.result === "draw" ? "½" : r.result === "loss" ? "0" : "–"
  return (
    <div className={styles.opp}>
      <span className={styles.oppNo}>R{r.round}</span>
      <span className={styles.oppName}>
        {isBye ? <span className={styles.rDim}>Bye</span> : (r.opponentName ?? <span className={styles.rDim}>Opponent #{r.opponentRank}</span>)}
      </span>
      <span className={styles.oppRat}>{r.opponentRating ?? "—"}</span>
      <span className={styles.oppFed}>{r.opponentFed ?? "—"}</span>
      <span
        className={styles.scorePill}
        data-c={isBye ? "bye" : r.color ?? "none"}
        title={isBye ? "Bye" : `${r.result ?? "?"}${r.color ? ` as ${r.color}` : ""}`}
      >
        {isBye ? "–" : score}
      </span>
    </div>
  )
}

// ── Opponents (frequent opponents, most-played first) ────────────────────────
export function OpponentsTab({ h2h }: { h2h: HeadToHead[] }) {
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
          const score = h.wins + h.draws / 2
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
                  <span className={styles.figL}>{fmtPts(score)}/{g} pts</span>
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
              <th className={styles.num}>Score</th><th className={styles.num}>Events</th>
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
                <td className={styles.num}>{fmtPts(h.wins + h.draws / 2)}/{h.wins + h.losses + h.draws}</td>
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

