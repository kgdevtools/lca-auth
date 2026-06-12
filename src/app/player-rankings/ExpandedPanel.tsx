"use client"

import Link from "next/link"
import type { Appearance, RankedSummary } from "@/lib/rankings"
import type { SelectionVerdict } from "@/lib/cdcSelection"
import styles from "./rankings.module.css"
import PerfChart, { monthOf, yearOf } from "./PerfChart"

const f1 = (n: number | null) => (n == null ? "0.0" : n.toFixed(1))

export default function ExpandedPanel({
  p,
  appearances,
  verdict,
  cohort,
  colSpan = 8,
}: {
  p: RankedSummary
  /** Lazily fetched on expand; null while the request is in flight. */
  appearances: Appearance[] | null
  /** CDC verdict for the active cohort, or null when selection doesn't apply. */
  verdict?: SelectionVerdict | null
  /** Cohort the verdict was judged against — frames the selection counts. */
  cohort?: "junior" | "senior"
  /** Columns to span so the panel fills the full table width (see RankingsView). */
  colSpan?: number
}) {
  const loading = appearances === null
  const shown = appearances ?? []
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
        : "Unverified"

  return (
    <td className={styles.expandCell} colSpan={colSpan}>
      <div className={styles.expandPad}>
        {/* profile / summary */}
        <aside className={styles.profile}>
          <Link
            href={`/player-rankings/${encodeURIComponent(p.key)}`}
            className={styles.profileName}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>{p.name}</span>
            <svg
              className={styles.profileNameIcon}
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
          </Link>
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
                {cohort === "senior" ? (
                  <>
                    <span>Counted <strong>{p.juniorTournaments + p.openTournaments}</strong></span>
                    <span>Capricorn <strong>{p.capricornTournaments}</strong></span>
                  </>
                ) : (
                  <>
                    <span>JQ <strong>{p.juniorTournaments}</strong></span>
                    <span>Open <strong>{p.openTournaments}</strong></span>
                    <span>Capricorn <strong>{p.capricornTournaments}</strong></span>
                  </>
                )}
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
          {loading && (
            <div className={styles.skel} aria-hidden="true">
              <div className={styles.skelChart} />
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className={styles.skelRow} />
              ))}
            </div>
          )}
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
