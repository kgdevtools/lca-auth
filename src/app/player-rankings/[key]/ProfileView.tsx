"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import type { PlayerProfile } from "@/lib/playerProfileServer"
import type { LinkedGame } from "@/lib/playerGames"
import PerfChart from "../PerfChart"
import { OverviewTab, TournamentsTab, OpponentsTab, GamesTab } from "./ProfileTabs"
import styles from "./profile.module.css"

const int = (n: number | null) => (n == null ? "—" : String(n))
/** Signed integer with explicit + (e.g. +45, −65). */
const signed = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : "−"}${Math.abs(n)}`)
const pct = (n: number | null) => (n == null ? "—" : `${n}%`)
const signedPct = (n: number | null) => (n == null ? "—" : `${n >= 0 ? "+" : "−"}${Math.abs(n)}%`)
const toneOf = (n: number | null): Tone => (n == null ? undefined : n >= 0 ? "pos" : "neg")
/** 1 → "1st", 36 → "36th", etc. */
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}

// ── Plain-language phrasing for the analytics metrics ─────────────────────────
/** Consistency from σ (lower = steadier). */
function consistencyWord(sigma: number | null): string | null {
  if (sigma == null) return null
  if (sigma < 60) return "Very consistent"
  if (sigma < 110) return "Fairly consistent"
  if (sigma <= 180) return "Somewhat erratic"
  return "Unpredictable"
}
/** Trajectory from recent form (last-3 perf − career avg, rating points). */
function trajectoryWord(form: number | null): string | null {
  if (form == null) return null
  if (form > 40) return "On a tear"
  if (form >= 15) return "On the rise"
  if (form > -15) return "Holding steady"
  if (form >= -40) return "Cooling off"
  return "In a slump"
}
const trajectoryTone = (form: number | null): Tone =>
  form == null || Math.abs(form) <= 15 ? undefined : form > 0 ? "pos" : "neg"
/** Giant-killer tier from upset rate; only when ≥5 games vs higher-rated. */
function upsetWord(rate: number | null, sample: number): string | null {
  if (rate == null || sample < 5) return null
  if (rate >= 50) return "Giant-killer"
  if (rate >= 30) return "Punches up"
  if (rate >= 15) return "Occasional upsets"
  return "Plays to rating"
}

const TIP = {
  avgGap: "How much they beat (or fell short of) their own rating each event, on average.",
  avgOpp: "The average rating of the opponents they have faced.",
  vsExpected: "How they scored versus what the rating gaps predicted. Positive means over-performing.",
  consistency: "How much their results swing between tournaments. Steadier means more predictable.",
  trajectory: "Whether their recent results are above or below their career average.",
  upsets: "How often they beat opponents rated higher than themselves.",
}

type Tab = "overview" | "tournaments" | "opponents" | "games"
type Tone = "pos" | "neg" | undefined

const IDENTITY_LABEL: Record<string, string> = {
  unique_no: "Verified",
  fide_id: "Matched · FIDE",
  "fuzzy-match": "Fuzzy match",
  name: "Name only",
}

/** Small ⓘ that toggles a plain-language popover. Tap-friendly (closes on outside tap). */
function InfoTip({ text }: { text: string }) {
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
        ⓘ
      </button>
      {open && <span className={styles.tipPop} role="tooltip">{text}</span>}
    </span>
  )
}

/** Value-first stat cell: headline value + caption (optional sub-figure + info tip). */
function Stat({ v, l, sub, tip, tone }: { v: ReactNode; l: string; sub?: string; tip?: string; tone?: Tone }) {
  return (
    <div className={styles.stat}>
      <span className={`${styles.statV} ${tone === "pos" ? styles.pos : tone === "neg" ? styles.neg : ""}`}>{v}</span>
      <span className={styles.statL}>
        {sub != null && <><span className={styles.statSub}>{sub}</span> · </>}
        {l}
        {tip && <InfoTip text={tip} />}
      </span>
    </div>
  )
}

export default function ProfileView({
  profile,
  games,
}: {
  profile: PlayerProfile
  games: LinkedGame[]
}) {
  const { player: p, byEvent, headToHead, record, metrics: m } = profile
  const [tab, setTab] = useState<Tab>("overview")

  // appearances are newest-first; the trend chart wants oldest-first
  const chartPoints = [...p.appearances]
    .reverse()
    .filter((a): a is typeof a & { perf: number } => a.perf !== null)
    .map((a) => ({ date: a.date, perf: a.perf }))

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "tournaments", label: "Tournaments", count: p.appearances.length },
    { id: "opponents", label: "Opponents", count: headToHead.length },
    { id: "games", label: "Games", count: games.length || undefined },
  ]

  return (
    <div className={styles.page}>
      <Link href="/player-rankings" className={styles.back}>← Back to rankings</Link>

      <header className={styles.header}>
        <div className={styles.headTop}>
          <h1 className={styles.name}>{p.name}</h1>
          <div className={styles.tags}>
            {p.title && <span className={`${styles.tag} ${styles.tagAccent}`}>{p.title}</span>}
            <span className={styles.tag}>{p.federation ?? "N/A"}</span>
            {p.sex && <span className={styles.tag}>{p.sex}</span>}
            {p.birthYear && <span className={styles.tag}>b. {p.birthYear}</span>}
            <span className={styles.tag}>{IDENTITY_LABEL[p.identityKind] ?? p.identityKind}</span>
          </div>
          {m.bestWin != null && <span className={styles.bestTag}>★ best win {m.bestWin}</span>}
        </div>
        <div className={styles.identityLine}>
          <span>FIDE <strong>{int(p.fideRating)}</strong>{p.fideId ? ` · id ${p.fideId}` : ""}</span>
          <span>Chess SA <strong>{int(p.currentRating)}</strong>{p.uniqueNo ? ` · no. ${p.uniqueNo}` : ""}</span>
          {p.federations.length > 1 && <span>Feds <strong>{p.federations.join(", ")}</strong></span>}
        </div>
      </header>

      {/* Performance ‖ Trend */}
      <div className={styles.band}>
        <section className={styles.block}>
          <div className={styles.blockHead}>Performance</div>
          <div className={styles.metricGrid}>
            <Stat v={int(p.avgPerf)} l="avg perf" />
            <Stat v={int(p.bestPerf)} l="best" />
            <Stat v={int(p.worstPerf)} l="worst" />
            <Stat v={signed(p.avgGap)} l="avg gap" tone={toneOf(p.avgGap)} tip={TIP.avgGap} />
            <Stat
              v={consistencyWord(m.consistency) ?? "—"}
              sub={m.consistency == null ? undefined : `±${m.consistency}`}
              l="consistency"
              tip={TIP.consistency}
            />
            <Stat v={int(m.strengthOfSchedule)} l="avg opponent" tip={TIP.avgOpp} />
            <Stat v={signedPct(m.expectedDelta)} l="vs expected" tone={toneOf(m.expectedDelta)} tip={TIP.vsExpected} />
            <div className={styles.stat}>
              <span className={styles.finishes}>
                {m.recentFinishes.length === 0
                  ? "—"
                  : m.recentFinishes.map((r, i) => (
                      <span key={i}>
                        {i > 0 && <span className={styles.finishSep}>·</span>}
                        {r == null ? <span className={styles.finishMuted}>—</span> : <span className={styles.finish}>{ordinal(r)}</span>}
                      </span>
                    ))}
              </span>
              <span className={styles.statL}>last 3 finishes</span>
            </div>
            <Stat
              v={trajectoryWord(m.recentForm) ?? "—"}
              sub={m.recentForm == null ? undefined : signed(m.recentForm)}
              l="trajectory"
              tone={trajectoryTone(m.recentForm)}
              tip={TIP.trajectory}
            />
            {(() => {
              const word = upsetWord(m.upsetRate, m.upsetSampleSize)
              const fraction = m.upsetSampleSize > 0 ? `${m.upsetWins} of ${m.upsetSampleSize}` : "—"
              return (
                <Stat
                  v={word ?? fraction}
                  sub={word ? fraction : undefined}
                  l="vs stronger"
                  tip={TIP.upsets}
                />
              )
            })()}
          </div>
        </section>

        <section className={styles.block}>
          <div className={styles.blockHead}>Trend</div>
          <PerfChart points={chartPoints} />
        </section>
      </div>

      {/* Record — metrics (40%) ‖ W/L/D table (60%) */}
      <section className={styles.block}>
        <div className={styles.blockHead}>Record</div>
        <div className={styles.band}>
          <div className={styles.recSummaryCol}>
            <div className={styles.recStat}>
              <span className={styles.statL}>Top tournament ranking</span>
              <span>
                <span className={styles.topRank}>{record.bestRank == null ? "—" : ordinal(record.bestRank)}</span>
                {record.bestRankCount > 1 && <span className={styles.topRankCount}>×{record.bestRankCount}</span>}
              </span>
            </div>
            <div className={styles.recStat}>
              <span className={styles.statL}>Win percentage</span>
              <span className={styles.statV}>{record.scorePct == null ? "—" : `${record.scorePct}%`}</span>
            </div>
            <div className={styles.recStat}>
              <span className={styles.statL}>Top-3 finishes</span>
              <span className={styles.statV}>{pct(m.podiumRate)}</span>
            </div>
            <div className={styles.recStat}>
              <span className={styles.statL}>Games played</span>
              <span className={styles.statV}>{record.games}</span>
            </div>
            <div className={styles.recStat}>
              <span className={styles.statL}>Byes</span>
              <span className={styles.statV}>{record.byes}</span>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.wld}>
              <thead>
                <tr><th></th><th>W</th><th>L</th><th>D</th></tr>
              </thead>
              <tbody>
                <tr className={styles.wldTotal}>
                  <td>Overall</td><td className={styles.pos}>{record.wins}</td><td className={styles.neg}>{record.losses}</td><td>{record.draws}</td>
                </tr>
                <tr>
                  <td>White</td><td>{record.white.wins}</td><td>{record.white.losses}</td><td>{record.white.draws}</td>
                </tr>
                <tr>
                  <td>Black</td><td>{record.black.wins}</td><td>{record.black.losses}</td><td>{record.black.draws}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className={styles.tabs}>
        {tabs.map((t) => (
          <button key={t.id} type="button" className={styles.tab} data-active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            {t.count != null && <span className={styles.tabCount}>{t.count}</span>}
          </button>
        ))}
      </nav>

      {tab === "overview" && <OverviewTab profile={profile} />}
      {tab === "tournaments" && <TournamentsTab byEvent={byEvent} />}
      {tab === "opponents" && <OpponentsTab profile={profile} />}
      {tab === "games" && <GamesTab byEvent={byEvent} games={games} />}
    </div>
  )
}
