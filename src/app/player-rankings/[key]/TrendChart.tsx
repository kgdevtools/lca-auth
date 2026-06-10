"use client"

import { useState } from "react"
import { MONTHS, parseDate, monthOf, yearOf } from "../PerfChart"
import styles from "./profile.module.css"

export interface TrendPoint {
  date: string | null
  perf: number
  /** Event name, shown in the tap/hover callout. */
  name?: string
}

/** Interactive performance trend — tap/hover a point for an event callout.
 *  Oldest → newest. Numbered Y axis + month X axis (year tagged on change). */
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

  const TICKS = 4
  const yTicks = Array.from({ length: TICKS + 1 }, (_, k) => Math.round(lo + (k * (hi - lo)) / TICKS))
  const px = (i: number) => (points.length === 1 ? 50 : (i / (points.length - 1)) * 100)
  const py = (v: number) => (1 - (v - lo) / (hi - lo)) * 100
  const linePts = points.map((p, i) => `${px(i).toFixed(2)},${py(p.perf).toFixed(2)}`).join(" ")
  const areaPts = `0,100 ${linePts} 100,100`

  const step = Math.max(1, Math.ceil(points.length / 6))
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
            <polygon className={styles.area} points={areaPts} />
            <polyline className={styles.line} points={linePts} vectorEffect="non-scaling-stroke" />
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
              <div className={styles.fig}>{ap.perf} <span className={styles.dt}>· {monthOf(ap.date)} {yearOf(ap.date)}</span></div>
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
