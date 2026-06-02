"use client"

import { useState } from "react"
import type { Appearance, RankedSummary } from "@/lib/rankings"
import type { SelectionVerdict } from "@/lib/cdcSelection"
import styles from "./rankings.module.css"

const f1 = (n: number | null) => (n == null ? "0.0" : n.toFixed(1))
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const parseDate = (s: string | null) => {
  if (!s) return null
  const d = new Date(s.replace(/\//g, "-") + "T00:00:00Z")
  return isNaN(d.getTime()) ? null : d
}
const monthOf = (s: string | null) => {
  const d = parseDate(s)
  return d ? MONTHS[d.getUTCMonth()] : "N/A"
}
const yearOf = (s: string | null) => {
  const d = parseDate(s)
  return d ? String(d.getUTCFullYear()) : ""
}

type Region = "all" | "limpopo" | "capricorn"

function inRegion(a: Appearance, region: Region): boolean {
  if (region === "limpopo") return (a.province ?? "").toLowerCase() === "limpopo"
  if (region === "capricorn") return (a.district ?? "").toLowerCase() === "capricorn"
  return true
}

// Performance over time, oldest → newest, with numbered Y axis + month X axis.
function PerfChart({ points }: { points: { date: string | null; perf: number }[] }) {
  if (points.length < 2) {
    return <div className={styles.chartEmpty}>Not enough rated events to chart.</div>
  }

  const perfs = points.map((p) => p.perf)
  let lo = Math.min(...perfs)
  let hi = Math.max(...perfs)
  const padY = Math.max(20, Math.round((hi - lo) * 0.18))
  lo = Math.floor((lo - padY) / 10) * 10
  hi = Math.ceil((hi + padY) / 10) * 10
  if (hi === lo) hi = lo + 10

  const TICKS = 4
  const yTicks = Array.from({ length: TICKS + 1 }, (_, k) => Math.round(lo + (k * (hi - lo)) / TICKS))

  // positions as percentages of the plot box
  const px = (i: number) => (points.length === 1 ? 50 : (i / (points.length - 1)) * 100)
  const py = (v: number) => (1 - (v - lo) / (hi - lo)) * 100

  const linePts = points.map((p, i) => `${px(i).toFixed(2)},${py(p.perf).toFixed(2)}`).join(" ")
  const areaPts = `0,100 ${linePts} 100,100`

  // x labels: cap density to ~7, always include the last point; tag the year when it changes
  const step = Math.max(1, Math.ceil(points.length / 7))
  let lastYear = ""
  const xLabels = points
    .map((p, i) => {
      if (i % step !== 0 && i !== points.length - 1) return null
      const d = parseDate(p.date)
      if (!d) return null
      const yr = String(d.getUTCFullYear())
      const label = MONTHS[d.getUTCMonth()] + (yr !== lastYear ? ` ’${yr.slice(2)}` : "")
      lastYear = yr
      const last = i === points.length - 1
      const tx = i === 0 ? "translateX(0)" : last ? "translateX(-100%)" : "translateX(-50%)"
      return { i, label, tx }
    })
    .filter((v): v is { i: number; label: string; tx: string } => v !== null)

  return (
    <div className={styles.chart}>
      <div className={styles.chartBody}>
        <div className={styles.chartYAxis}>
          {[...yTicks].reverse().map((v) => (
            <span key={v} className={styles.chartYTick}>{v}</span>
          ))}
        </div>
        <div className={styles.chartPlot}>
          <svg className={styles.chartSvg} viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="rk-spark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.26" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {yTicks.map((v) => (
              <line key={v} className={styles.chartGrid} x1="0" y1={py(v)} x2="100" y2={py(v)} vectorEffect="non-scaling-stroke" />
            ))}
            <polygon className={styles.chartArea} points={areaPts} />
            <polyline className={styles.chartLine} points={linePts} vectorEffect="non-scaling-stroke" />
          </svg>
          {points.map((p, i) => (
            <span
              key={i}
              className={styles.chartDot}
              data-last={i === points.length - 1}
              style={{ left: `${px(i)}%`, top: `${py(p.perf)}%` }}
            />
          ))}
        </div>
      </div>
      <div className={styles.chartXAxis}>
        {xLabels.map(({ i, label, tx }) => (
          <span key={i} className={styles.chartXTick} style={{ left: `${px(i)}%`, transform: tx }}>
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function ExpandedPanel({
  p,
  appearances,
  verdict,
}: {
  p: RankedSummary
  /** Lazily fetched on expand; null while the request is in flight. */
  appearances: Appearance[] | null
  /** CDC verdict for the active cohort, or null when selection doesn't apply. */
  verdict?: SelectionVerdict | null
}) {
  const [region, setRegion] = useState<Region>("all")

  const loading = appearances === null
  const shown = (appearances ?? []).filter((a) => inRegion(a, region))
  const ratedShown = shown.filter((a) => a.perf !== null).length
  // appearances are newest-first; chart wants oldest-first
  const chartPoints = [...shown]
    .reverse()
    .filter((a): a is Appearance & { perf: number } => a.perf !== null)
    .map((a) => ({ date: a.date, perf: a.perf }))

  const idKind = p.identityKind === "fuzzy-match" ? "fuzzy" : p.identityKind === "fide_id" ? "fide" : undefined
  const idLabel =
    p.identityKind === "unique_no"
      ? "Verified"
      : p.identityKind === "fide_id"
        ? "Matched · FIDE"
        : p.identityKind === "fuzzy-match"
          ? "Fuzzy match"
          : "Name only"

  return (
    <td className={styles.expandCell} colSpan={8}>
      <div className={styles.expandPad}>
        {/* profile / summary */}
        <aside className={styles.profile}>
          <div className={styles.profileName}>{p.name}</div>
          <div className={styles.profileSub}>
            {p.title && <span className={styles.pfTag} style={{ color: "var(--primary)" }}>{p.title}</span>}
            <span className={styles.pfTag}>{p.federation ?? "N/A"}</span>
            <span className={styles.pfTag}>{p.sex ?? "N/A"}</span>
            <span className={styles.pfTag}>b. {p.birthYear ?? "N/A"}</span>
          </div>

          <div className={styles.profileBig}>
            <span className={styles.val}>{p.avgPerf}</span>
            <span className={styles.lab}>avg<br />performance</span>
          </div>

          <div className={styles.profileStats}>
            <div className={styles.ps}><span className={styles.l}>Best</span><span className={styles.v}>{p.bestPerf}</span></div>
            <div className={styles.ps}><span className={styles.l}>Rated</span><span className={styles.v}>{p.ratedTournaments}</span></div>
            <div className={styles.ps}><span className={styles.l}>Played</span><span className={styles.v}>{p.totalAppearances}</span></div>
            <div className={styles.ps}><span className={styles.l}>Tournament rating</span><span className={styles.v}>{p.tournamentRating ?? 0}</span></div>
            <div className={styles.ps}><span className={styles.l}>FIDE</span><span className={styles.v}>{p.fideRating ?? 0}</span></div>
            <div className={styles.ps}><span className={styles.l}>Chess SA</span><span className={styles.v}>{p.currentRating ?? 0}</span></div>
          </div>

          {verdict && (
            <div className={styles.selBlock} data-meets={verdict.meets}>
              <div className={styles.selHead}>
                <span className={styles.selBadge} data-meets={verdict.meets}>{verdict.meets ? "✓" : "✗"}</span>
                <span className={styles.selComment}>{verdict.comment}</span>
              </div>
              <div className={styles.selCounts}>
                <span>JQ <strong>{p.juniorTournaments}</strong></span>
                <span>Open <strong>{p.openTournaments}</strong></span>
                <span>Capricorn <strong>{p.capricornTournaments}</strong></span>
              </div>
            </div>
          )}

          <div className={styles.idBadge}>
            <span className={styles.idDot} data-kind={idKind} />
            {idLabel}
          </div>
        </aside>

        {/* history */}
        <div>
          <div className={styles.historyHead}>
            <span className={styles.historyTitle}>
              {loading ? "Tournament history" : `Tournament history · ${ratedShown} rated`}
            </span>
            <div className={styles.regBar}>
              {(["all", "limpopo", "capricorn"] as Region[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={styles.regBtn}
                  data-active={region === r}
                  disabled={loading}
                  onClick={() => setRegion(r)}
                >
                  {r === "all" ? "All" : r === "limpopo" ? "Limpopo" : "Capricorn"}
                </button>
              ))}
            </div>
          </div>

          {loading && <div className={styles.chartEmpty}>Loading history…</div>}
          {!loading && <PerfChart points={chartPoints} />}

          {!loading && (
          <div className={styles.histScroll}>
            <table className={styles.hist}>
              <colgroup>
                <col className={styles.histDate} />
                <col />
                <col className={`${styles.histRank} ${styles.hideSm}`} />
                <col className={styles.histPts} />
                <col className={styles.histRating} />
                <col className={styles.histPerf} />
              </colgroup>
              <thead>
                <tr>
                  <th className={styles.l}>Date</th>
                  <th className={styles.l}>Event</th>
                  <th className={styles.hideSm}>Rank</th>
                  <th>Pts</th>
                  <th>Rating</th>
                  <th>Perf</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((a) => (
                  <tr key={a.tournamentId}>
                    <td className={`${styles.l} ${styles.evDateCell}`}>
                      <div className={styles.evMonth}>{monthOf(a.date)}</div>
                      <div className={styles.evYear}>{yearOf(a.date)}</div>
                    </td>
                    <td className={styles.l}>
                      <div className={styles.evName}>{a.tournamentName}</div>
                      {(a.district || a.province) && (
                        <div className={styles.evLoc}>{[a.district, a.province].filter(Boolean).join(", ")}</div>
                      )}
                    </td>
                    <td className={styles.hideSm}>{a.rank ?? 0}</td>
                    <td>{f1(a.points)}</td>
                    <td className={styles.evDate}>{a.seed ?? 0}</td>
                    <td className={styles.evPerf}>{a.perf ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </div>
    </td>
  )
}
