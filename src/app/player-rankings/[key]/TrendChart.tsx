"use client"

import { useState } from "react"
import { MONTHS, parseDate, monthOf, yearOf } from "../PerfChart"
import styles from "./profile.module.css"

export interface TrendPoint {
  date: string | null
  perf: number
  /** Event name, shown in the tap/hover callout. */
  name?: string
  /** Final standing in the tournament. */
  rank?: number | null
  /** Points scored in the tournament. */
  points?: number | null
  /** The player's rating going into the tournament (tournament_rating / seed). */
  seed?: number | null
}

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`
}
const fmtPts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** Interactive performance trend — tap/hover a point for an event callout with
 *  rank, points, tournament rating and performance. Oldest → newest. Numbered Y
 *  axis + month X axis (year tagged on change), both with faint gridlines. */
export default function TrendChart({ points, height = 150 }: { points: TrendPoint[]; height?: number }) {
  const [active, setActive] = useState<number | null>(null)
  if (points.length < 2) {
    return <div className={styles.chartEmpty}>Not enough rated events to chart a trend.</div>
  }

  const perfs = points.map((p) => p.perf)
  let lo = Math.min(...perfs)
  let hi = Math.max(...perfs)
  const padY = Math.max(20, Math.round((hi - lo) * 0.18))
  lo = Math.floor((lo - padY) / 10) * 10
  hi = Math.ceil((hi + padY) / 10) * 10
  if (hi === lo) hi = lo + 10

  // More Y gridlines for finer reading of the performance scale.
  const TICKS = 6
  const yTicks = Array.from({ length: TICKS + 1 }, (_, k) => Math.round(lo + (k * (hi - lo)) / TICKS))
  const px = (i: number) => (points.length === 1 ? 50 : (i / (points.length - 1)) * 100)
  const py = (v: number) => (1 - (v - lo) / (hi - lo)) * 100

  // Catmull-Rom → cubic-bézier smoothing; control-point Ys are clamped to the
  // plot box so spikes can't overshoot it. Falls back to the same endpoints.
  const xy = points.map((p, i) => ({ x: px(i), y: py(p.perf) }))
  const cl = (v: number) => Math.min(100, Math.max(0, v))
  let lineD = `M ${xy[0].x.toFixed(2)},${xy[0].y.toFixed(2)}`
  for (let i = 0; i < xy.length - 1; i++) {
    const p0 = xy[i - 1] ?? xy[i], p1 = xy[i], p2 = xy[i + 1], p3 = xy[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = cl(p1.y + (p2.y - p0.y) / 6)
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = cl(p2.y - (p3.y - p1.y) / 6)
    lineD += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`
  }
  const areaD = `${lineD} L 100,100 L 0,100 Z`

  // Denser X axis: aim for ~9 labels, always tagging the last point and the year
  // whenever it changes. Each labelled position also gets a faint vertical grid.
  const step = Math.max(1, Math.ceil(points.length / 9))
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

  const ap = active != null ? points[active] : null
  const callTx =
    active == null ? "" : px(active) < 22 ? "translate(0,-100%)" : px(active) > 78 ? "translate(-100%,-100%)" : "translate(-50%,-100%)"

  // Detail rows for the active callout (skip any value we don't have).
  const details =
    ap == null
      ? []
      : ([
          ["Performance", String(ap.perf)],
          ["Rank", ap.rank != null ? ordinal(ap.rank) : null],
          ["Points", ap.points != null ? fmtPts(ap.points) : null],
          ["Tourn. rating", ap.seed != null ? String(ap.seed) : null],
        ].filter((r) => r[1] != null) as [string, string][])

  return (
    <div className={styles.chart} onMouseLeave={() => setActive(null)}>
      <div className={styles.chartBody}>
        <div className={styles.yAxis} style={{ height }}>
          {[...yTicks].reverse().map((v) => <span key={v} className={styles.yTick}>{v}</span>)}
        </div>
        <div className={styles.plot} style={{ height }}>
          <svg className={styles.svg} viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="pf-spark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {yTicks.map((v) => (
              <line key={v} className={styles.grid} x1="0" y1={py(v)} x2="100" y2={py(v)} vectorEffect="non-scaling-stroke" />
            ))}
            {xLabels.map(({ i }) => (
              <line key={"vg" + i} className={styles.vgrid} x1={px(i)} y1="0" x2={px(i)} y2="100" vectorEffect="non-scaling-stroke" />
            ))}
            <path className={styles.area} d={areaD} />
            <path className={styles.line} d={lineD} vectorEffect="non-scaling-stroke" />
          </svg>
          {ap && <span className={styles.vline} style={{ left: `${px(active!)}%` }} />}
          {points.map((p, i) => (
            <span
              key={i}
              className={styles.dot}
              data-last={i === points.length - 1}
              data-on={i === active}
              style={{ left: `${px(i)}%`, top: `${py(p.perf)}%` }}
            />
          ))}
          {points.map((_p, i) => (
            <span
              key={"h" + i}
              className={styles.hit}
              style={{ left: `${px(i)}%`, width: `${Math.max(11, 100 / points.length)}%` }}
              onMouseEnter={() => setActive(i)}
              onClick={(e) => { e.stopPropagation(); setActive(i) }}
            />
          ))}
          {ap && (
            <div className={styles.call} style={{ left: `${px(active!)}%`, top: `${py(ap.perf)}%`, transform: callTx }}>
              {ap.name && <div className={styles.ev}>{ap.name}</div>}
              <div className={styles.dt}>{monthOf(ap.date)} {yearOf(ap.date)}</div>
              <div className={styles.callGrid}>
                {details.map(([k, v]) => (
                  <span key={k} className={styles.callRow}>
                    <span className={styles.callK}>{k}</span>
                    <span className={styles.callV}>{v}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className={styles.xAxis}>
        {xLabels.map(({ i, label, tx }) => (
          <span key={i} className={styles.xTick} style={{ left: `${px(i)}%`, transform: tx }}>{label}</span>
        ))}
      </div>
    </div>
  )
}
