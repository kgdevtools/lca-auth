"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import type { PlayerProfile, EventGames } from "@/lib/playerProfileServer"
import { ageGroupOf, isSeniorGroup } from "../FilterBar"
import TrendChart from "./TrendChart"
import { OverviewTab, TournamentsTab, OpponentsTab } from "./ProfileTabs"
import styles from "./profile.module.css"

// The Games tab pulls in chess.js + the chessboard + the analysis board/engine.
// Load it on demand so none of that ships in the profile's initial bundle.
const GamesTab = dynamic(() => import("./GamesTab"), {
  ssr: false,
  loading: () => <div className={styles.empty}>Loading…</div>,
})

const int = (n: number | null) => (n == null ? "—" : String(n))
const signed = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : "−"}${Math.abs(n)}`)
const signedPct = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : "−"}${Math.abs(n)}%`)
const pct = (n: number | null) => (n == null ? "—" : `${n}%`)
const toneOf = (n: number | null): Tone => (n == null ? undefined : n >= 0 ? "pos" : "neg")
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

type Tab = "overview" | "tournaments" | "opponents" | "games"
type Tone = "pos" | "neg" | undefined
type Loc = "all" | "limpopo" | "capricorn"

const IDENTITY_LABEL: Record<string, string> = {
  unique_no: "Verified",
  fide_id: "Matched · FIDE",
  "fuzzy-match": "Fuzzy match",
  name: "Name only",
}

const TIP = {
  avgDiff: "How much they beat (or fell short of) their own rating each event, on average.",
  avgOpp: "The average rating of the opponents they have faced.",
  vsExpected: "Points scored versus expected points (xPoints) from the rating gaps in each game. Positive means they did better than their ratings predicted.",
  winPct: "Points scored as a share of games played — a draw counts as half.",
  podium: "Share of tournaments where they finished in the top three.",
}

// ── Filtered view derivation ─────────────────────────────────────────────────
// The top half of the page recomputes from the player's events under the active
// Period + Location filter, so the average etc. always span the FULL filtered set
// (never a fixed recent window). The bottom tabs keep the unfiltered full history.

const SCORE = { win: 1, draw: 0.5, loss: 0 } as const

/** Chess season for a date: period N = Oct N – Sep N+1. null on unparsable date. */
function seasonOf(date: string | null): number | null {
  if (!date) return null
  const d = new Date(date.trim().replace(/\//g, "-") + "T00:00:00Z")
  if (isNaN(d.getTime())) return null
  const y = d.getUTCFullYear()
  return d.getUTCMonth() >= 9 ? y : y - 1
}

function inLoc(a: EventGames["appearance"], loc: Loc): boolean {
  if (loc === "limpopo") return (a.province ?? "").toLowerCase() === "limpopo"
  if (loc === "capricorn") return (a.district ?? "").toLowerCase() === "capricorn"
  return true
}

interface FormGame { result: string; rating: number | null; color: "white" | "black" | null }

interface View {
  rated: number
  avg: number | null
  best: number | null
  worst: number | null
  avgGap: number | null
  strengthOfSchedule: number | null
  expectedDelta: number | null
  recentFinishes: (number | null)[]
  form: FormGame[]
  chart: { date: string | null; perf: number; name?: string; rank: number | null; points: number | null; seed: number | null }[]
  wins: number; losses: number; draws: number; byes: number; games: number
  scorePct: number | null
  white: { wins: number; losses: number; draws: number }
  black: { wins: number; losses: number; draws: number }
  bestRank: number | null; bestRankCount: number
  podiumRate: number | null
}

function mean(xs: number[]): number | null {
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null
}

/** Recompute the headline stats over the events matching the active filter. */
function deriveView(byEvent: EventGames[], period: number | null, loc: Loc): View {
  const evs = byEvent.filter(
    (e) => (period == null || seasonOf(e.appearance.date) === period) && inLoc(e.appearance, loc),
  )

  const perfs = evs.map((e) => e.appearance.perf).filter((v): v is number => v !== null)
  const gaps = evs.map((e) => e.appearance.gap).filter((v): v is number => v !== null)
  const ranks = evs.map((e) => e.appearance.rank).filter((v): v is number => v !== null)

  let wins = 0, losses = 0, draws = 0, byes = 0
  const white = { wins: 0, losses: 0, draws: 0 }
  const black = { wins: 0, losses: 0, draws: 0 }
  const oppRatings: number[] = []
  let expSum = 0, actSum = 0, cGames = 0

  for (const e of evs) {
    const S = e.appearance.seed
    for (const g of e.rounds) {
      const bye = g.opponentName === null && (g.result === "bye" || g.result === null)
      if (bye) { byes += 1; continue }
      if (g.result === "win" || g.result === "loss" || g.result === "draw") {
        const slice = g.color === "white" ? white : g.color === "black" ? black : null
        if (g.result === "win") { wins += 1; if (slice) slice.wins += 1 }
        else if (g.result === "loss") { losses += 1; if (slice) slice.losses += 1 }
        else { draws += 1; if (slice) slice.draws += 1 }
        if (g.opponentRating != null) oppRatings.push(g.opponentRating)
        if (S != null && g.opponentRating != null) {
          expSum += 1 / (1 + 10 ** ((g.opponentRating - S) / 400))
          actSum += SCORE[g.result]
          cGames += 1
        }
      }
    }
  }

  // form: newest results first, up to 10 (byEvent is newest-first)
  const form: FormGame[] = []
  for (const e of evs) {
    for (let i = e.rounds.length - 1; i >= 0; i--) {
      const rr = e.rounds[i]
      const bye = rr.opponentName === null && (rr.result === "bye" || rr.result === null)
      form.push({ result: bye ? "bye" : (rr.result ?? "bye"), rating: rr.opponentRating, color: rr.color })
      if (form.length >= 10) break
    }
    if (form.length >= 10) break
  }

  const chart = [...evs].reverse()
    .map((e) => e.appearance)
    .filter((a): a is typeof a & { perf: number } => a.perf !== null)
    .map((a) => ({ date: a.date, perf: a.perf, name: a.tournamentName, rank: a.rank, points: a.points, seed: a.seed }))

  const games = wins + losses + draws
  const am = mean(perfs)
  const gm = mean(gaps)
  const sos = mean(oppRatings)
  const bestRank = ranks.length ? Math.min(...ranks) : null

  return {
    rated: perfs.length,
    avg: am == null ? null : Math.round(am * 10) / 10,
    best: perfs.length ? Math.max(...perfs) : null,
    worst: perfs.length ? Math.min(...perfs) : null,
    avgGap: gm == null ? null : Math.round(gm),
    strengthOfSchedule: sos == null ? null : Math.round(sos),
    expectedDelta: cGames > 0 ? Math.round(((actSum - expSum) / cGames) * 1000) / 10 : null,
    recentFinishes: evs.slice(0, 3).map((e) => e.appearance.rank),
    form,
    chart,
    wins, losses, draws, byes, games,
    scorePct: games > 0 ? Math.round(((wins + draws / 2) / games) * 1000) / 10 : null,
    white, black,
    bestRank,
    bestRankCount: bestRank === null ? 0 : ranks.filter((r) => r === bestRank).length,
    podiumRate: ranks.length ? Math.round((ranks.filter((r) => r <= 3).length / ranks.length) * 100) : null,
  }
}

// ── UI helpers ───────────────────────────────────────────────────────────────

/** True below 640px — narrow tooltips render as a viewport-pinned bottom sheet. */
function useNarrow() {
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)")
    const on = () => setNarrow(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return narrow
}

/** Small ⓘ. Wide: inline popover. Narrow: bottom-sheet card pinned to the viewport. */
function InfoTip({ label, text }: { label: string; text: string }) {
  const narrow = useNarrow()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [open])
  return (
    <span className={styles.tip}>
      <button
        type="button"
        className={styles.tipBtn}
        aria-label="What this means"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="6.6" /><path d="M8 7.2v3.6" strokeLinecap="round" /><circle cx="8" cy="5.1" r=".5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {open && !narrow && <span className={styles.tipPop} role="tooltip" onClick={(e) => e.stopPropagation()}>{text}</span>}
      {open && narrow && (
        <>
          <span className={styles.tipScrim} onClick={() => setOpen(false)} />
          <span className={styles.tipSheet} onClick={() => setOpen(false)}>
            <span className={styles.tipSheetLab}>{label}</span>
            <span className={styles.tipSheetTxt}>{text}</span>
          </span>
        </>
      )}
    </span>
  )
}

/** A label/value row in a stat group. `tip` = [short label, explanation]. */
function StatRow({ l, v, tone, tip }: { l: string; v: string; tone?: Tone; tip?: [string, string] }) {
  return (
    <div className={styles.statRow}>
      <span className={styles.statL}>{l}{tip && <InfoTip label={tip[0]} text={tip[1]} />}</span>
      <span className={`${styles.statV} ${tone === "pos" ? styles.pos : tone === "neg" ? styles.neg : ""}`}>{v}</span>
    </div>
  )
}

function Bar({ lab, w, d, l }: { lab: string; w: number; d: number; l: number }) {
  const tot = w + d + l
  const p = (n: number) => `${tot ? (n / tot) * 100 : 0}%`
  return (
    <div className={styles.barRow}>
      <div className={styles.barTop}><span className={styles.barLab}>{lab}</span><span className={styles.barFig}>{w}W · {d}D · {l}L</span></div>
      <div className={styles.bar}><i className={styles.w} style={{ width: p(w) }} /><i className={styles.d} style={{ width: p(d) }} /><i className={styles.l} style={{ width: p(l) }} /></div>
    </div>
  )
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h18M6 12h12M10 19h4" />
    </svg>
  )
}

/** Filters control to the right of the name — Period + Location, in a dropdown. */
function FiltersMenu({
  period, setPeriod, loc, setLoc, periods, active,
}: {
  period: number | null
  setPeriod: (p: number | null) => void
  loc: Loc
  setLoc: (l: Loc) => void
  periods: number[]
  active: boolean
}) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [open])

  return (
    <div className={styles.fmWrap}>
      <button
        type="button"
        className={styles.fmBtn}
        data-active={active}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
      >
        <FilterIcon />
        Filters
        {active && <span className={styles.fmDot} aria-hidden="true" />}
      </button>
      {open && (
        <div className={styles.fmPanel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.fmField}>
            <span className={styles.fmLab}>Period</span>
            <select
              className={styles.fmSel}
              value={period ?? "all"}
              onChange={(e) => setPeriod(e.target.value === "all" ? null : Number(e.target.value))}
            >
              <option value="all">All time</option>
              {periods.map((pp) => (
                <option key={pp} value={pp}>Oct {pp} – Sep {pp + 1}</option>
              ))}
            </select>
          </div>
          <div className={styles.fmField}>
            <span className={styles.fmLab}>Location</span>
            <div className={styles.fmSeg}>
              {(["all", "limpopo", "capricorn"] as Loc[]).map((l) => (
                <button key={l} type="button" className={styles.fmSegBtn} data-active={loc === l} onClick={() => setLoc(l)}>
                  {l === "all" ? "All" : l === "limpopo" ? "Limpopo" : "Capricorn"}
                </button>
              ))}
            </div>
          </div>
          {active && (
            <button type="button" className={styles.fmReset} onClick={() => { setPeriod(null); setLoc("all") }}>
              Reset filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProfileView({
  profile,
}: {
  profile: PlayerProfile
}) {
  const { player: p, byEvent, headToHead } = profile
  const [tab, setTab] = useState<Tab>("overview")
  const [period, setPeriod] = useState<number | null>(null)
  const [loc, setLoc] = useState<Loc>("all")

  const periods = useMemo(
    () => [...new Set(byEvent.map((e) => seasonOf(e.appearance.date)).filter((v): v is number => v !== null))].sort((a, b) => b - a),
    [byEvent],
  )
  const view = useMemo(() => deriveView(byEvent, period, loc), [byEvent, period, loc])
  const filterActive = period !== null || loc !== "all"
  const category = ageGroupOf(p.birthYear)

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "tournaments", label: "Tournaments", count: p.appearances.length },
    { id: "opponents", label: "Opponents", count: headToHead.length },
    { id: "games", label: "Games" },
  ]

  return (
    <div className={styles.page}>
      <Link href="/player-rankings" className={styles.back}>‹ Back to rankings</Link>

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.nameRow}>
          <h1 className={styles.name}>{p.name}</h1>
          {p.title && <span className={styles.titleBadge}>{p.title}</span>}
          {category !== "—" && <span className={styles.cat} data-sen={isSeniorGroup(category)}>{category}</span>}
          <span className={styles.headSpacer} />
          <FiltersMenu period={period} setPeriod={setPeriod} loc={loc} setLoc={setLoc} periods={periods} active={filterActive} />
        </div>
        <div className={styles.meta}>
          <span className={styles.chip} data-id="true">
            <span className={styles.idDot} />{IDENTITY_LABEL[p.identityKind] ?? p.identityKind}
          </span>
          {p.federation && <span className={styles.metaItem}>{p.federation}</span>}
          {p.sex && <span className={styles.metaItem}>{p.sex === "M" ? "Male" : p.sex === "F" ? "Female" : p.sex}</span>}
        </div>
        <div className={styles.ratings}>
          <span className={styles.rat}>
            <span className={styles.ratL}>FIDE</span>
            <span className={styles.ratV}>{int(p.fideRating)}</span>
            {p.fideId && <span className={styles.ratId}>#{p.fideId}</span>}
          </span>
          <span className={styles.rat}>
            <span className={styles.ratL}>Chess SA</span>
            <span className={styles.ratV}>{int(p.currentRating)}</span>
            {p.uniqueNo && <span className={styles.ratId}>#{p.uniqueNo}</span>}
          </span>
          {p.federations.length > 1 && (
            <span className={styles.rat}>
              <span className={styles.ratL}>Feds</span>
              <span className={styles.ratV}>{p.federations.join(", ")}</span>
            </span>
          )}
        </div>
      </header>

      {filterActive && (
        <div className={styles.filterBanner}>
          Showing {period == null ? "all time" : `Oct ${period} – Sep ${period + 1}`}
          {loc !== "all" ? ` · ${loc === "limpopo" ? "Limpopo" : "Capricorn"}` : ""}
          {" · "}{view.rated} rated event{view.rated === 1 ? "" : "s"}
        </div>
      )}

      {/* Hero: headline performance + recent form | trend */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.heroFig}>
            <span className={styles.bigNum}>{view.avg == null ? "—" : view.avg.toFixed(1)}</span>
            <span className={styles.bigCap}><b>Avg performance</b>across {view.rated} rated events</span>
          </div>
          <div className={styles.heroForm}>
            <div className={styles.head}>Recent form <span className={styles.hint}>newest first</span></div>
            {view.form.length ? (
              <div className={styles.ribbon}>
                {view.form.map((g, i) => (
                  <div key={i} className={styles.ribCol}>
                    <span className={styles.rib} data-r={g.result}>
                      {g.result === "win" ? "W" : g.result === "loss" ? "L" : g.result === "draw" ? "D" : "·"}
                    </span>
                    <span className={styles.ribRat}>{g.rating ?? "—"}</span>
                    <span className={styles.ribClr} data-c={g.color ?? undefined} />
                  </div>
                ))}
              </div>
            ) : <div className={styles.empty}>No round-by-round results in this view.</div>}
          </div>
        </div>
        <div className={styles.chartCol}>
          <div className={styles.head}>Performance trend <span className={styles.hint}>tap a point</span></div>
          <TrendChart points={view.chart} />
        </div>
      </div>

      {/* Grouped stats — no number repeats the hero */}
      <div className={styles.groups}>
        <div>
          <div className={styles.groupTitle}>Range &amp; form</div>
          <StatRow l="Best performance" v={int(view.best)} />
          <StatRow l="Worst performance" v={int(view.worst)} />
          <div className={styles.statRow}>
            <span className={styles.statL}>Last 3 finishes</span>
            <span className={styles.finish}>
              {view.recentFinishes.length === 0
                ? <span className={styles.finishPill} data-tone="plain">—</span>
                : view.recentFinishes.map((f, i) => (
                    <span
                      key={i}
                      className={styles.finishPill}
                      data-tone={f == null ? "plain" : f === 1 ? "gold" : f <= 3 ? "podium" : "plain"}
                    >
                      {f == null ? "—" : ordinal(f)}
                    </span>
                  ))}
            </span>
          </div>
        </div>
        <div>
          <div className={styles.groupTitle}>Versus the field</div>
          <StatRow l="Avg Rating to Tourn Rating" v={signed(view.avgGap)} tone={toneOf(view.avgGap)} tip={["avg rating to tourn rating", TIP.avgDiff]} />
          <StatRow l="Avg opponent" v={int(view.strengthOfSchedule)} tip={["avg opponent", TIP.avgOpp]} />
          <StatRow l="Points vs xPoints" v={signedPct(view.expectedDelta)} tone={toneOf(view.expectedDelta)} tip={["points vs xpoints", TIP.vsExpected]} />
        </div>
      </div>

      {/* Record — bars | list */}
      <section className={styles.section}>
        <div className={styles.head}>Record <span className={styles.hint}>{view.games} games</span></div>
        <div className={styles.recordB}>
          <div className={styles.bars}>
            <Bar lab="Overall" w={view.wins} d={view.draws} l={view.losses} />
            <Bar lab="as White" w={view.white.wins} d={view.white.draws} l={view.white.losses} />
            <Bar lab="as Black" w={view.black.wins} d={view.black.draws} l={view.black.losses} />
            <div className={styles.legend}>
              <span><i style={{ background: "var(--rk-pos)" }} />Win</span>
              <span><i style={{ background: "color-mix(in srgb,var(--rk-muted) 38%,transparent)" }} />Draw</span>
              <span><i style={{ background: "var(--rk-neg)" }} />Loss</span>
            </div>
          </div>
          <div className={styles.recList}>
            <div className={styles.statRow}>
              <span className={styles.statL}>Top tournament ranking</span>
              <span className={styles.statV}>{view.bestRank == null ? "—" : ordinal(view.bestRank)}{view.bestRankCount > 1 && <span style={{ color: "var(--rk-accent)", fontSize: 12, marginLeft: 4 }}>×{view.bestRankCount}</span>}</span>
            </div>
            <StatRow l="Win percentage" v={view.scorePct == null ? "—" : `${view.scorePct}%`} tip={["win %", TIP.winPct]} />
            <StatRow l="Top-3 finishes" v={pct(view.podiumRate)} tip={["podium", TIP.podium]} />
            <StatRow l="Games played" v={String(view.games)} />
            <StatRow l="Byes" v={String(view.byes)} />
          </div>
        </div>
      </section>

      {/* Full history (unaffected by the filters above) */}
      <div className={styles.fullHist}>
        <h2 className={styles.fullHistTitle}>Full Tournament History</h2>
        <p className={styles.fullHistSub}>Complete career record — not affected by the filters above.</p>
      </div>

      {/* Tabs */}
      <div className={styles.tabsWrap}>
        <div className={styles.tabs}>
          {tabs.map((t) => (
            <button key={t.id} type="button" className={styles.tab} data-active={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}{t.count != null && <span className={styles.tabCount}>{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && <OverviewTab profile={profile} />}
      {tab === "tournaments" && <TournamentsTab byEvent={byEvent} />}
      {tab === "opponents" && <OpponentsTab profile={profile} />}
      {tab === "games" && <GamesTab playerKey={p.key} />}
    </div>
  )
}
