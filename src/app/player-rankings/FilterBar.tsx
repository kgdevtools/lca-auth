"use client"

import { useState } from "react"
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

/** Senior sub-groups by age band (in REF_YEAR): ADT 20–49, SNR 50–59, VET 60+. */
export const SENIOR_GROUPS = ["ADT", "SNR", "VET"] as const
export const SENIOR_GROUP_LABELS: Record<string, string> = {
  ADT: "Adults (ADT)",
  SNR: "Senior (SNR)",
  VET: "Veterans (VET)",
}
/** Is `g` one of the senior age-band codes (vs a junior UNN band)? */
export function isSeniorGroup(g: string): boolean {
  return g === "ADT" || g === "SNR" || g === "VET"
}

// Reference season — Juniors born >= 2006, UNN further requires born >=
// REF_YEAR - NN. Used by the client-side category filter in RankingsView (the
// period filter is applied server-side during aggregation).
export const REF_YEAR = 2026
export const JUNIOR_MIN_BIRTH = 2006

/**
 * Age-group label for a birth year. Juniors (born >= JUNIOR_MIN_BIRTH) map to the
 * 2-year non-overlapping UNN bands used by the category filter (`passesCategory`):
 * UNN covers ages NN-1 and NN in REF_YEAR (e.g. U16 = born 2010–2011). Seniors map
 * to age bands: ADT (20–49), SNR (50–59), VET (60+). Unknown birth year → "—".
 */
export function ageGroupOf(birthYear: number | null | undefined): string {
  if (birthYear == null) return "—"
  const age = REF_YEAR - birthYear
  if (birthYear < JUNIOR_MIN_BIRTH) {
    if (age >= 60) return "VET"
    if (age >= 50) return "SNR"
    return "ADT"
  }
  let nn = age % 2 === 0 ? age : age + 1
  if (nn < 8) nn = 8
  if (nn > 20) nn = 20
  return `U${String(nn).padStart(2, "0")}`
}

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

const REGION_LABEL: Record<string, string> = {
  LIM: "Limpopo",
  RSA: "RSA",
  PLAYED_CAP: "Played in Capricorn",
  PLAYED_LIM: "Played in Limpopo",
}

export const periodLabel = (p: number) => `Oct ${p} – Sep ${p + 1}`

/** The current scope as removable chips — INCLUDING the defaults (Limpopo,
 *  current period, min events), so the page never silently excludes someone.
 *  Each chip's × widens the scope back out. */
function scopeChips(filters: UiFilters, set: (patch: Partial<UiFilters>) => void) {
  const chips: { label: string; clear: () => void }[] = []
  const region = filters.region ?? "all"
  if (region !== "all") chips.push({ label: REGION_LABEL[region] ?? region, clear: () => set({ region: "all" }) })
  if (filters.period != null) {
    const p = filters.period
    chips.push({ label: periodLabel(p), clear: () => set({ period: undefined }) })
  }
  if (filters.category !== "all") {
    chips.push({
      label: filters.category === "juniors" ? "Juniors" : "Seniors",
      clear: () => set({ category: "all", ageGroup: undefined }),
    })
    if (filters.ageGroup && filters.ageGroup !== "all") {
      chips.push({ label: SENIOR_GROUP_LABELS[filters.ageGroup] ?? filters.ageGroup, clear: () => set({ ageGroup: "all" }) })
    }
  }
  if (filters.sex) chips.push({ label: filters.sex === "M" ? "Male" : "Female", clear: () => set({ sex: undefined }) })
  if ((filters.minTournaments ?? 1) > 1) {
    chips.push({ label: `${filters.minTournaments}+ events`, clear: () => set({ minTournaments: 1 }) })
  }
  if (filters.qualifiedOnly) chips.push({ label: "Qualified only", clear: () => set({ qualifiedOnly: undefined }) })
  return chips
}

const MIN_EVENT_PRESETS = [1, 3, 6]

export default function FilterBar({ filters, onChange }: FilterBarProps) {
  const [open, setOpen] = useState(false)
  const set = (patch: Partial<UiFilters>) => onChange({ ...filters, ...patch })

  const isJuniors = filters.category === "juniors"
  const isSeniors = filters.category === "seniors"
  const chips = scopeChips(filters, set)
  const isDefault =
    filters.category === FILTER_DEFAULTS.category &&
    (filters.region ?? "all") === FILTER_DEFAULTS.region &&
    filters.period === FILTER_DEFAULTS.period &&
    (filters.minTournaments ?? 1) === FILTER_DEFAULTS.minTournaments &&
    !filters.sex && !filters.qualifiedOnly && (!filters.ageGroup || filters.ageGroup === "all")

  return (
    <div className={styles.filters}>
      {/* Primary row — search is the 90% interaction; everything else discloses. */}
      <div className={styles.filterTop}>
        <div className={styles.search}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Search players…"
            value={filters.search ?? ""}
            onChange={(e) => set({ search: e.target.value })}
          />
        </div>
        <button
          type="button"
          className={styles.filterToggle}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 5h18M6 12h12M10 19h4" />
          </svg>
          Filters
          <svg className={styles.toggleChev} data-open={open} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Scope chips — the active view at a glance; × widens it back out. */}
      {chips.length > 0 && (
        <div className={styles.chips}>
          <span className={styles.chipsLab}>Showing</span>
          {chips.map((c) => (
            <button key={c.label} type="button" className={styles.chipBtn} onClick={c.clear} title={`Remove: ${c.label}`}>
              {c.label}
              <span className={styles.chipX} aria-hidden="true">×</span>
            </button>
          ))}
          {!isDefault && (
            <button type="button" className={styles.chipReset} onClick={() => onChange({ ...FILTER_DEFAULTS, search: filters.search })}>
              Reset
            </button>
          )}
        </div>
      )}

      {open && (
        <>
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
                  // Reset the sub-group to "all" when switching cohort so a stale
                  // junior band (e.g. U12) can't leak into the senior filter.
                  set({
                    category: v,
                    ageGroup: v === "all" ? undefined : "all",
                    qualifiedOnly: filters.qualifiedOnly,
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

            {isSeniors && (
              <label className={styles.field}>
                <span>Age group</span>
                <select
                  className={styles.sel}
                  data-active={!!filters.ageGroup && filters.ageGroup !== "all"}
                  value={filters.ageGroup ?? "all"}
                  onChange={(e) => set({ ageGroup: e.target.value })}
                >
                  <option value="all">All seniors</option>
                  {SENIOR_GROUPS.map((g) => (
                    <option key={g} value={g}>{SENIOR_GROUP_LABELS[g]}</option>
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
            <div className={styles.fieldNum}>
              <span>Min events</span>
              <div className={styles.segs}>
                {MIN_EVENT_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={styles.segBtn}
                    data-active={(filters.minTournaments ?? 1) === n}
                    onClick={() => set({ minTournaments: n })}
                  >
                    {n === 1 ? "All" : `${n}+`}
                  </button>
                ))}
              </div>
            </div>
            {/* In the all-players view each player is judged against their own cohort's
                CDC criteria; junior/senior pin a single cohort. Only acts within the
                CDC cycle (the 2025 period) — see selectionMode in RankingsView. */}
            <label className={styles.fieldCheck} data-active={!!filters.qualifiedOnly}>
              <input
                type="checkbox"
                checked={!!filters.qualifiedOnly}
                onChange={(e) => set({ qualifiedOnly: e.target.checked || undefined })}
              />
              <span>Qualified only</span>
            </label>
            {!isDefault && (
              <button type="button" className={styles.clearBtn} onClick={() => onChange({ ...FILTER_DEFAULTS, search: filters.search })}>
                Reset filters
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
