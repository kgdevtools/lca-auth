"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import type { Appearance, RankedSummary } from "@/lib/rankings"
import FilterBar, {
  FILTER_DEFAULTS,
  JUNIOR_MIN_BIRTH,
  REF_YEAR,
  type UiFilters,
} from "./FilterBar"
import ExpandedPanel from "./ExpandedPanel"
import styles from "./rankings.module.css"

interface RankingsViewProps {
  /** All-time ranked summaries, aggregated server-side (no appearance history). */
  initialPlayers: RankedSummary[]
}

type SortField =
  | "name"
  | "avgPerf"
  | "bestPerf"
  | "ratedTournaments"
  | "totalAppearances"
  | "tournamentRating"
  | "fideRating"
  | "currentRating"

interface Sort {
  field: SortField
  dir: "asc" | "desc"
}

const cx = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ")

// Limpopo grouping — "LIM" matches any of its sub-union federation codes.
const LIM_CODES = new Set(["LCP", "LMG", "LSG", "LVT", "CSA", "LWT"])

// Player-federation "region" filter. Matches against the full federations array
// so a player who has EVER played under a local union counts as local — RSA only
// matches players with no local code (their derived p.federation falls back to
// RSA). See pickFederation.
function passesRegion(p: RankedSummary, region: string): boolean {
  if (region === "all") return true
  if (region === "LIM") return p.federations.some((c) => LIM_CODES.has(c.toUpperCase()))
  return (p.federation ?? "").toUpperCase() === region
}

// Category is a player-level include/exclude on birth year (it doesn't change a
// player's stats), so it runs client-side over the aggregated pool. The period
// filter, which DOES change the averages, is applied server-side instead.
function passesCategory(p: RankedSummary, f: UiFilters): boolean {
  if (f.category === "juniors") {
    let minBirth = JUNIOR_MIN_BIRTH
    if (f.ageGroup && f.ageGroup !== "all") {
      const n = Number(f.ageGroup.replace(/\D/g, ""))
      if (Number.isFinite(n)) minBirth = Math.max(minBirth, REF_YEAR - n)
    }
    return p.birthYear != null && p.birthYear >= minBirth
  }
  return true
}

function sortPlayers(list: RankedSummary[], { field, dir }: Sort): RankedSummary[] {
  const mul = dir === "asc" ? 1 : -1
  const val = (p: RankedSummary): string | number => {
    const v = p[field]
    if (field === "name") return (v as string).toLowerCase()
    return v == null ? -Infinity : (v as number)
  }
  return [...list].sort((a, b) => {
    const va = val(a)
    const vb = val(b)
    if (va < vb) return -1 * mul
    if (va > vb) return 1 * mul
    return b.avgPerf - a.avgPerf
  })
}

function SortTh({
  field,
  label,
  sort,
  onSort,
  className,
}: {
  field: SortField
  label: string
  sort: Sort
  onSort: (f: SortField) => void
  className?: string
}) {
  const active = sort.field === field
  return (
    <th className={cx(styles.sortable, className)} onClick={() => onSort(field)}>
      {label}
      {active && <span className={styles.arr}>{sort.dir === "desc" ? "▼" : "▲"}</span>}
    </th>
  )
}

function PlayerRow({
  p,
  rank,
  open,
  appearances,
  onToggle,
}: {
  p: RankedSummary
  rank: number
  open: boolean
  /** Lazily-loaded history; null while the expand fetch is in flight. */
  appearances: Appearance[] | null
  onToggle: () => void
}) {
  return (
    <Fragment>
      <tr
        className={styles.row}
        data-even={rank % 2 === 0}
        data-open={open}
        data-medal={rank <= 3 ? rank : undefined}
        onClick={onToggle}
      >
        <td className={styles.cRank}>
          <span className={styles.rankN}>{rank}</span>
        </td>
        <td className={styles.cName}>
          <div className={styles.nameWrap}>
            <svg className={styles.caret} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
            <div className={styles.nameMain}>
              <div className={styles.nameLine}>
                <span className={styles.pname}>{p.name}</span>
                {p.title && <span className={styles.titleBadge}>{p.title}</span>}
              </div>
              <div className={styles.nameMeta}>
                <span className={styles.fed}>{p.federation ?? "N/A"}</span>
                <span className={styles.dot}>·</span>
                <span>{p.sex ?? "N/A"}</span>
              </div>
            </div>
          </div>
        </td>
        <td className={cx(styles.numCell, styles.hero)}>{p.avgPerf}</td>
        <td className={cx(styles.numCell, styles.dim)}>{p.bestPerf}</td>
        <td className={cx(styles.numCell, styles.hideSm)}>{p.ratedTournaments}</td>
        <td className={cx(styles.numCell, styles.dim, styles.hideSm)}>{p.totalAppearances}</td>
        <td className={cx(styles.numCell, styles.dim, styles.hideSm)}>{p.tournamentRating ?? 0}</td>
        <td className={cx(styles.numCell, styles.dim, styles.hideSm)}>{p.fideRating ?? 0}</td>
        <td className={cx(styles.numCell, styles.dim, styles.hideSm)}>{p.currentRating ?? 0}</td>
      </tr>
      {open && (
        <tr>
          <ExpandedPanel p={p} appearances={appearances} />
        </tr>
      )}
    </Fragment>
  )
}

export default function RankingsView({ initialPlayers }: RankingsViewProps) {
  const [filters, setFilters] = useState<UiFilters>(FILTER_DEFAULTS)
  const [sort, setSort] = useState<Sort>({ field: "avgPerf", dir: "desc" })
  const [openKey, setOpenKey] = useState<string | null>(null)

  // Server-aggregated summary pools, cached per period (the only filter that
  // changes the stats). Seeded with the all-time pool from the initial render.
  const periodKey = String(filters.period ?? "all")
  const [pools, setPools] = useState<Record<string, RankedSummary[]>>({ all: initialPlayers })
  const [loadingPool, setLoadingPool] = useState(false)
  // Per-player history, fetched when a row is expanded. Keyed by period+playerKey.
  const [history, setHistory] = useState<Record<string, Appearance[]>>({})

  // Fetch a period's pool on demand (all-time is already present).
  useEffect(() => {
    if (pools[periodKey]) return
    let cancelled = false
    setLoadingPool(true)
    fetch(`/player-rankings/data?period=${periodKey}`)
      .then((r) => r.json())
      .then((d: { players: RankedSummary[] }) => {
        if (!cancelled) setPools((prev) => ({ ...prev, [periodKey]: d.players }))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingPool(false)
      })
    return () => {
      cancelled = true
    }
  }, [periodKey, pools])

  // Fetch the open player's appearance history on demand.
  const historyKey = openKey ? `${periodKey}:${openKey}` : null
  useEffect(() => {
    if (!openKey || !historyKey || history[historyKey]) return
    let cancelled = false
    fetch(`/player-rankings/data?period=${periodKey}&key=${encodeURIComponent(openKey)}`)
      .then((r) => r.json())
      .then((d: { appearances: Appearance[] }) => {
        if (!cancelled) setHistory((prev) => ({ ...prev, [historyKey]: d.appearances }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [openKey, periodKey, historyKey, history])

  const players = useMemo(() => {
    const pool = pools[periodKey] ?? []
    const q = (filters.search ?? "").trim().toLowerCase()
    const region = filters.region ?? "all"
    const minT = filters.minTournaments ?? 1
    const sex = filters.sex
    let list = pool.filter(
      (p) =>
        passesRegion(p, region) &&
        passesCategory(p, filters) &&
        (!sex || (p.sex ?? "").toUpperCase() === sex) &&
        p.ratedTournaments >= minT &&
        (!q || p.name.toLowerCase().includes(q)),
    )
    list = sortPlayers(list, sort)
    return list.slice(0, filters.limit ?? 50)
  }, [pools, periodKey, filters, sort])

  const onSort = (field: SortField) =>
    setSort((s) =>
      s.field === field
        ? { field, dir: s.dir === "desc" ? "asc" : "desc" }
        : { field, dir: field === "name" ? "asc" : "desc" },
    )

  return (
    <div className={styles.page}>
      <FilterBar filters={filters} onChange={setFilters} />

      {players.length === 0 ? (
        <p className={styles.empty}>
          {loadingPool && !pools[periodKey]
            ? "Loading rankings…"
            : "No players match the current filters."}
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <div className={cx(styles.tableScroll, styles.scrollX)}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.grp}>
                  <th className={cx(styles.gl, styles.spacer)} colSpan={2} />
                  <th colSpan={2}>Performance</th>
                  <th className={styles.hideSm} colSpan={2}>No. Tournaments</th>
                  <th className={styles.hideSm} colSpan={1}>Tournament Rating</th>
                  <th className={styles.hideSm} colSpan={2}>Rating</th>
                </tr>
                <tr className={styles.col}>
                  <th className={cx(styles.gl, styles.cRank)}>#</th>
                  <SortTh field="name" label="Player" sort={sort} onSort={onSort} className={cx(styles.gl, styles.cName)} />
                  <SortTh field="avgPerf" label="Avg" sort={sort} onSort={onSort} />
                  <SortTh field="bestPerf" label="Best" sort={sort} onSort={onSort} />
                  <SortTh field="ratedTournaments" label="Rated" sort={sort} onSort={onSort} className={styles.hideSm} />
                  <SortTh field="totalAppearances" label="Played" sort={sort} onSort={onSort} className={styles.hideSm} />
                  <SortTh field="tournamentRating" label="First" sort={sort} onSort={onSort} className={styles.hideSm} />
                  <SortTh field="fideRating" label="FIDE" sort={sort} onSort={onSort} className={styles.hideSm} />
                  <SortTh field="currentRating" label="Chess SA" sort={sort} onSort={onSort} className={styles.hideSm} />
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <PlayerRow
                    key={p.key}
                    p={p}
                    rank={i + 1}
                    open={openKey === p.key}
                    appearances={openKey === p.key ? history[`${periodKey}:${p.key}`] ?? null : null}
                    onToggle={() => setOpenKey((k) => (k === p.key ? null : p.key))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
