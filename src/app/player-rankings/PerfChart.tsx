"use client"

import styles from "./rankings.module.css"

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export const parseDate = (s: string | null) => {
  if (!s) return null
  const d = new Date(s.replace(/\//g, "-") + "T00:00:00Z")
  return isNaN(d.getTime()) ? null : d
}
export const monthOf = (s: string | null) => {
  const d = parseDate(s)
  return d ? MONTHS[d.getUTCMonth()] : "N/A"
}
export const yearOf = (s: string | null) => {
  const d = parseDate(s)
  return d ? String(d.getUTCFullYear()) : ""
}

// Performance over time, oldest → newest, with numbered Y axis + month X axis.
export default function PerfChart({ points }: { points: { date: string | null; perf: number }[] }) {
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
