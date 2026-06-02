"use client"

import styles from "./rankings.module.css"
import { DEFAULT_PERIOD } from "./constants"

export type Category = "all" | "juniors" | "seniors"

export interface UiFilters {
  search?: string
  category: Category
  ageGroup?: string
  /** Player-federation grouping: "all" | "LIM" | "RSA". */
  region?: string
  /** Registry sex. */
  sex?: "M" | "F"
  /** Chess season START year: 2024 = Oct 2024–Sep 2025, 2025 = Oct 2025–Sep 2026. */
  period?: number
  minTournaments?: number
  limit?: number
  /** CDC selection: keep only players who meet the cohort criteria. */
  qualifiedOnly?: boolean
}

export const FILTER_DEFAULTS: UiFilters = {
  category: "all",
  region: "LIM",
  period: DEFAULT_PERIOD,
  minTournaments: 3,
  limit: 50,
}

const AGE_GROUPS = ["U08", "U10", "U12", "U14", "U16", "U18", "U20"]

// Reference season — Juniors born >= 2006, UNN further requires born >=
// REF_YEAR - NN. Used by the client-side category filter in RankingsView (the
// period filter is applied server-side during aggregation).
export const REF_YEAR = 2026
export const JUNIOR_MIN_BIRTH = 2006

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
}

interface FilterBarProps {
  filters: UiFilters
  onChange: (next: UiFilters) => void
}

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const set = (patch: Partial<UiFilters>) => onChange({ ...filters, ...patch })

  const numPatch = (key: "minTournaments" | "limit", raw: string) => {
    if (raw.trim() === "") return set({ [key]: undefined })
    const n = Number(raw)
    if (Number.isFinite(n)) set({ [key]: n })
  }

  const isJuniors = filters.category === "juniors"
  const active =
    !!filters.search?.length ||
    filters.category !== "all" ||
    (!!filters.region && filters.region !== "all") ||
    !!filters.sex ||
    filters.period != null ||
    (!!filters.ageGroup && filters.ageGroup !== "all") ||
    !!filters.qualifiedOnly

  return (
    <div className={styles.filters}>
      {/* Primary control — search, full width and prominent. */}
      <div className={styles.search}>
        <SearchIcon />
        <input
          type="text"
          placeholder="Search players…"
          value={filters.search ?? ""}
          onChange={(e) => set({ search: e.target.value })}
        />
      </div>

      {/* Scope controls — stacked labels, responsive grid. */}
      <div className={styles.filterGrid}>
        <label className={styles.field}>
          <span>Category</span>
          <select
            className={styles.sel}
            data-active={filters.category !== "all"}
            value={filters.category}
            onChange={(e) => {
              const v = e.target.value as Category
              set({
                category: v,
                ageGroup: v === "juniors" ? (filters.ageGroup ?? "all") : undefined,
                qualifiedOnly: v === "all" ? undefined : filters.qualifiedOnly,
              })
            }}
          >
            <option value="all">All players</option>
            <option value="juniors">Juniors</option>
            <option value="seniors">Seniors</option>
          </select>
        </label>

        {isJuniors && (
          <label className={styles.field}>
            <span>Age group</span>
            <select
              className={styles.sel}
              data-active={!!filters.ageGroup && filters.ageGroup !== "all"}
              value={filters.ageGroup ?? "all"}
              onChange={(e) => set({ ageGroup: e.target.value })}
            >
              <option value="all">All juniors</option>
              {AGE_GROUPS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
        )}

        <label className={styles.field}>
          <span>Region</span>
          <select
            className={styles.sel}
            data-active={(filters.region ?? "all") !== "all"}
            value={filters.region ?? "all"}
            onChange={(e) => set({ region: e.target.value })}
          >
            <option value="all">All regions</option>
            <optgroup label="By federation">
              <option value="LIM">Limpopo (LIM)</option>
              <option value="RSA">RSA</option>
            </optgroup>
            <optgroup label="By tournaments played">
              <option value="PLAYED_CAP">Played in Capricorn</option>
              <option value="PLAYED_LIM">Played in Limpopo</option>
            </optgroup>
          </select>
        </label>

        <label className={styles.field}>
          <span>Gender</span>
          <select
            className={styles.sel}
            data-active={!!filters.sex}
            value={filters.sex ?? "all"}
            onChange={(e) => set({ sex: e.target.value === "all" ? undefined : (e.target.value as "M" | "F") })}
          >
            <option value="all">All genders</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Period</span>
          <select
            className={styles.sel}
            data-active={filters.period != null}
            value={filters.period ?? "all"}
            onChange={(e) => set({ period: e.target.value === "all" ? undefined : Number(e.target.value) })}
          >
            <option value="all">All time</option>
            <option value="2024">Oct 2024 – Sep 2025</option>
            <option value="2025">Oct 2025 – Sep 2026</option>
          </select>
        </label>
      </div>

      {/* Display controls + reset. */}
      <div className={styles.filterFoot}>
        <label className={styles.fieldNum}>
          <span>Min events</span>
          <input
            className={styles.num}
            data-active={(filters.minTournaments ?? 1) !== 1}
            type="number"
            inputMode="numeric"
            value={filters.minTournaments ?? ""}
            placeholder="1"
            onChange={(e) => numPatch("minTournaments", e.target.value)}
          />
        </label>
        <label className={styles.fieldNum}>
          <span>Show rows</span>
          <input
            className={styles.num}
            type="number"
            inputMode="numeric"
            value={filters.limit ?? ""}
            placeholder="50"
            onChange={(e) => numPatch("limit", e.target.value)}
          />
        </label>
        {filters.category !== "all" && (
          <label className={styles.fieldCheck} data-active={!!filters.qualifiedOnly}>
            <input
              type="checkbox"
              checked={!!filters.qualifiedOnly}
              onChange={(e) => set({ qualifiedOnly: e.target.checked || undefined })}
            />
            <span>Qualified only</span>
          </label>
        )}
        {active && (
          <button type="button" className={styles.clearBtn} onClick={() => onChange({ ...FILTER_DEFAULTS })}>
            Reset filters
          </button>
        )}
      </div>
    </div>
  )
}
