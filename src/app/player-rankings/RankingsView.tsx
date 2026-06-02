"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import type { Appearance, RankedSummary } from "@/lib/rankings"
import {
  juniorCriteria,
  seniorCriteria,
  type SelectionVerdict,
} from "@/lib/cdcSelection"
import FilterBar, {
  FILTER_DEFAULTS,
  JUNIOR_MIN_BIRTH,
  REF_YEAR,
  type UiFilters,
} from "./FilterBar"
import ExpandedPanel from "./ExpandedPanel"
import styles from "./rankings.module.css"

interface RankingsViewProps {
  /** Ranked summaries for `initialPeriod`, aggregated server-side (no history). */
  initialPlayers: RankedSummary[]
  /** Period the initial pool was aggregated for; matches FILTER_DEFAULTS.period. */
  initialPeriod?: number
}

type SortField =
  | "name"
  | "avgPerf"
  | "bestPerf"
  | "juniorTournaments"
  | "openTournaments"
  | "fideRating"
  | "currentRating"

/** CDC selection mode for the current view — the criteria columns are only
 *  meaningful inside one cycle (the 2025 period) and for a single cohort. */
type SelectionMode = "junior" | "senior" | null

function verdictFor(p: RankedSummary, mode: Exclude<SelectionMode, null>): SelectionVerdict {
  const counts = {
    junior: p.juniorTournaments,
    open: p.openTournaments,
    capricorn: p.capricornTournaments,
    hasCapricornOpen: p.hasCapricornOpen,
  }
  return mode === "junior" ? juniorCriteria(counts) : seniorCriteria(counts)
}

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
  // Federation-based.
  if (region === "LIM") return p.federations.some((c) => LIM_CODES.has(c.toUpperCase()))
  // Location-based: who actually PLAYED in Capricorn / Limpopo, regardless of (or
  // missing) a federation code. Catches RSA/GTP/uncoded players at local events.
  if (region === "PLAYED_CAP") return p.playedCapricorn
  if (region === "PLAYED_LIM") return p.playedLimpopo
  return (p.federation ?? "").toUpperCase() === region
}

// Category is a player-level include/exclude on birth year (it doesn't change a
// player's stats), so it runs client-side over the aggregated pool. The period
// filter, which DOES change the averages, is applied server-side instead.
function passesCategory(p: RankedSummary, f: UiFilters): boolean {
  if (f.category === "juniors") {
    if (p.birthYear == null || p.birthYear < JUNIOR_MIN_BIRTH) return false
    if (f.ageGroup && f.ageGroup !== "all") {
      const n = Number(f.ageGroup.replace(/\D/g, ""))
      // Exact 2-year band so age groups never overlap: a U12 player (born
      // REF_YEAR-12..REF_YEAR-11) is excluded from U14, U16, … and vice-versa.
      if (Number.isFinite(n)) return p.birthYear >= REF_YEAR - n && p.birthYear <= REF_YEAR - n + 1
    }
    return true
  }
  // Senior = any non-junior player (unknown birth year counts as senior).
  if (f.category === "seniors") return p.birthYear == null || p.birthYear < JUNIOR_MIN_BIRTH
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

function CritIcon({ meets }: { meets: boolean }) {
  return (
    <span className={styles.critBadge} data-meets={meets}>
      {meets ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      )}
    </span>
  )
}

function PlayerRow({
  p,
  rank,
  open,
  appearances,
  selectionMode,
  verdict,
  onToggle,
}: {
  p: RankedSummary
  rank: number
  open: boolean
  /** Lazily-loaded history; null while the expand fetch is in flight. */
  appearances: Appearance[] | null
  /** Active cohort, or null when CDC selection columns don't apply. */
  selectionMode: SelectionMode
  /** CDC verdict for the active cohort, or null when selection doesn't apply. */
  verdict: SelectionVerdict | null
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
        {selectionMode ? (
          <>
            <td className={cx(styles.numCell, styles.hideTablet)}>{p.juniorTournaments}</td>
            <td className={cx(styles.numCell, styles.dim, styles.hideTablet)}>{p.openTournaments}</td>
            <td className={cx(styles.critCell, styles.hideMobile)}>
              {verdict ? <CritIcon meets={verdict.meets} /> : <span className={styles.naDash}>—</span>}
            </td>
            <td className={cx(styles.commentCell, styles.hideMobile)}>
              {verdict ? (
                <span className={styles.commentText} data-meets={verdict.meets}>{verdict.comment}</span>
              ) : (
                <span className={styles.naDash}>—</span>
              )}
            </td>
          </>
        ) : (
          <>
            <td className={cx(styles.numCell, styles.hideMobile)}>{p.juniorTournaments}</td>
            <td className={cx(styles.numCell, styles.dim, styles.hideMobile)}>{p.openTournaments}</td>
            <td className={cx(styles.numCell, styles.dim, styles.hideTablet)}>{p.fideRating ?? 0}</td>
            <td className={cx(styles.numCell, styles.dim, styles.hideTablet)}>{p.currentRating ?? 0}</td>
          </>
        )}
      </tr>
      {open && (
        <tr>
          <ExpandedPanel p={p} appearances={appearances} verdict={verdict} />
        </tr>
      )}
    </Fragment>
  )
}

export default function RankingsView({ initialPlayers, initialPeriod }: RankingsViewProps) {
  const [filters, setFilters] = useState<UiFilters>(FILTER_DEFAULTS)
  const [sort, setSort] = useState<Sort>({ field: "avgPerf", dir: "desc" })
  const [openKey, setOpenKey] = useState<string | null>(null)
  // Collapsible info panels (tap to expand — works on touch, unlike hover).
  const [showInfo, setShowInfo] = useState(false)
  const [showCriteria, setShowCriteria] = useState(false)

  // Server-aggregated summary pools, cached per period (the only filter that
  // changes the stats). Seeded with the DEFAULT-period pool from the initial
  // render so the first paint needs no client fetch.
  const periodKey = String(filters.period ?? "all")
  const [pools, setPools] = useState<Record<string, RankedSummary[]>>({
    [String(initialPeriod ?? "all")]: initialPlayers,
  })
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

  // CDC selection columns are only meaningful within a single cycle (the 2025
  // period) and for one cohort (juniors or seniors).
  const selectionMode: SelectionMode =
    filters.period !== 2025
      ? null
      : filters.category === "juniors"
        ? "junior"
        : filters.category === "seniors"
          ? "senior"
          : null

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
    // Qualified-only (QF): keep players meeting the active cohort's criteria.
    if (filters.qualifiedOnly && selectionMode) {
      list = list.filter((p) => verdictFor(p, selectionMode).meets)
    }
    list = sortPlayers(list, sort)
    return list.slice(0, filters.limit ?? 50)
  }, [pools, periodKey, filters, sort, selectionMode])

  const onSort = (field: SortField) =>
    setSort((s) =>
      s.field === field
        ? { field, dir: s.dir === "desc" ? "asc" : "desc" }
        : { field, dir: field === "name" ? "asc" : "desc" },
    )

  return (
    <div className={styles.page}>
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Prominent, collapsible disclaimer + "can't find your name" guidance. */}
      <div className={styles.notice} data-open={showInfo}>
        <button
          type="button"
          className={styles.noticeHead}
          onClick={() => setShowInfo((v) => !v)}
          aria-expanded={showInfo}
        >
          <svg className={styles.noticeIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <span className={styles.noticeTitle}>About these rankings — please read</span>
          <svg className={styles.noticeChevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {showInfo && (
          <div className={styles.noticeBody}>
            <p>
              These rankings are compiled independently for general information only. They
              are <strong>not an official list, and are not endorsed or recognised by
              Capricorn District Chess or Chess Limpopo</strong>.
            </p>
            <p>
              <strong>Don&rsquo;t see your name?</strong> Players are grouped by the
              federation recorded on their registration. If you are not yet registered
              with Capricorn District Chess or Chess South Africa — or your profile still
              carries a different or generic federation code — your name may not appear
              under the <em>Limpopo</em> region. Set the <strong>Region</strong> filter to{" "}
              <strong>&ldquo;All regions&rdquo;</strong> to locate your profile, which may
              be listed under another federation code.
            </p>
          </div>
        )}
      </div>

      {players.length === 0 ? (
        <p className={styles.empty}>
          {loadingPool || !pools[periodKey]
            ? "Loading rankings…"
            : "No players match the current filters."}
        </p>
      ) : (
        <div className={styles.tableWrap}>
          {selectionMode === "junior" && (
            <div className={styles.legendBar} data-open={showCriteria}>
              <button
                type="button"
                className={styles.legendToggle}
                onClick={() => setShowCriteria((v) => !v)}
                aria-expanded={showCriteria}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                <span>What do &ldquo;4 + 2&rdquo; and &ldquo;3 + 3&rdquo; mean?</span>
                <svg className={styles.legendChevron} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {showCriteria && (
                <div className={styles.legendPanel}>
                  <p><strong>4 + 2</strong> = 4 Junior Qualifying + 2 Open. &nbsp; <strong>3 + 3</strong> = 3 Junior Qualifying + 3 Open.</p>
                  <p>To qualify: 6 counted tournaments as 4 + 2 or 3 + 3, including at least one Open played in Capricorn.</p>
                </div>
              )}
            </div>
          )}
          {selectionMode === "senior" && (
            <div className={styles.legendBar}>
              <span className={styles.legendText}>
                Qualify: 6 counted tournaments, with at least 4 played in Capricorn.
              </span>
            </div>
          )}
          <div className={cx(styles.tableScroll, styles.scrollX)}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.grp}>
                  <th className={cx(styles.gl, styles.spacer)} colSpan={2} />
                  <th colSpan={2}>Performance</th>
                  {selectionMode ? (
                    <>
                      <th className={styles.hideTablet} colSpan={2}>No. Tournaments</th>
                      <th className={styles.hideMobile} colSpan={2}>Selection</th>
                    </>
                  ) : (
                    <>
                      <th className={styles.hideMobile} colSpan={2}>No. Tournaments</th>
                      <th className={styles.hideTablet} colSpan={2}>Rating</th>
                    </>
                  )}
                </tr>
                <tr className={styles.col}>
                  <th className={cx(styles.gl, styles.cRank)}>#</th>
                  <SortTh field="name" label="Player" sort={sort} onSort={onSort} className={cx(styles.gl, styles.cName)} />
                  <SortTh field="avgPerf" label="Avg" sort={sort} onSort={onSort} />
                  <SortTh field="bestPerf" label="Best" sort={sort} onSort={onSort} />
                  {selectionMode ? (
                    <>
                      <SortTh field="juniorTournaments" label="Junior" sort={sort} onSort={onSort} className={styles.hideTablet} />
                      <SortTh field="openTournaments" label="Open" sort={sort} onSort={onSort} className={styles.hideTablet} />
                      <th className={cx(styles.critHead, styles.hideMobile)}>Meets</th>
                      <th className={cx(styles.gl, styles.commentHead, styles.hideMobile)}>Comment</th>
                    </>
                  ) : (
                    <>
                      <SortTh field="juniorTournaments" label="Junior" sort={sort} onSort={onSort} className={styles.hideMobile} />
                      <SortTh field="openTournaments" label="Open" sort={sort} onSort={onSort} className={styles.hideMobile} />
                      <SortTh field="fideRating" label="FIDE" sort={sort} onSort={onSort} className={styles.hideTablet} />
                      <SortTh field="currentRating" label="Chess SA" sort={sort} onSort={onSort} className={styles.hideTablet} />
                    </>
                  )}
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
                    selectionMode={selectionMode}
                    verdict={selectionMode ? verdictFor(p, selectionMode) : null}
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
