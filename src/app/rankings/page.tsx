"use client"

import * as React from "react"
import Link from "next/link"
import { getRankings, type PlayerRanking, type RankingFilters } from "./server-actions"
import { SearchFilters } from "./components/SearchFilters"

export default function RankingsPage() {
  const [allData, setAllData] = React.useState<Array<PlayerRanking>>([])
  const [data, setData] = React.useState<Array<PlayerRanking>>([])
  const [selected, setSelected] = React.useState<PlayerRanking | null>(null)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  // Fixed federation options as requested
  const FED_OPTIONS = React.useMemo(() => ["LCP", "LMG", "LVT", "LWT", "LSG", "LIM", "CSA", "RSA"], [])

  // Local filter state mirrors Players route behavior
  const [filters, setFilters] = React.useState<RankingFilters>({
    name: "",
    fed: "ALL" as any,
    rating: "ALL" as any,
    gender: "ALL" as any,
    ageGroup: "ALL" as any,
    events: "ALL" as any,
  })

  React.useEffect(() => {
    setLoading(true)
    getRankings()
      .then((rows) => {
        setAllData(rows)
        setData(rows)
      })
      .catch((err) => console.error("Error fetching data", err))
      .finally(() => setLoading(false))
  }, [])

  // Apply client-side filters (no extra network requests)
  React.useEffect(() => {
    let rows = [...allData]
    const { name = "", fed = "ALL", rating = "ALL", gender = "ALL", ageGroup = "ALL", events = "ALL" } = filters

    if (name && name.trim().length > 0) {
      const q = name.trim().toLowerCase()
      rows = rows.filter(
        (p) =>
          p.display_name.toLowerCase().includes(q) ||
          (p.name_key ?? "").toLowerCase().includes(q) ||
          (p.fed ?? "").toLowerCase().includes(q),
      )
    }

    if (fed && fed !== ("ALL" as any)) {
      const want = String(fed)
      if (want === "Limpopo") {
        const LIM_SET = new Set(["LCP", "LMG", "LVT", "LWT", "LSG", "LIM"])
        rows = rows.filter((p) => LIM_SET.has(String(p.fed ?? "").toUpperCase()))
      } else {
        const wantUp = want.toUpperCase()
        rows = rows.filter((p) => (p.fed ?? "").toUpperCase() === wantUp)
      }
    }

    if (rating && rating !== ("ALL" as any)) {
      if (rating === ("RATED" as any)) {
        rows = rows.filter((p) => (p.avg_performance_rating ?? 0) > 0)
      } else {
        rows = rows.filter((p) => (p.avg_performance_rating ?? 0) <= 0)
      }
    }

    if (gender && gender !== ("ALL" as any)) {
      const want = String(gender).toLowerCase()
      rows = rows.filter((p) => {
        const sex = String(p.sex ?? "").toLowerCase()
        if (want === "male") return sex === "m" || sex === "male"
        if (want === "female") return sex === "f" || sex === "female"
        return true
      })
    }

    if (ageGroup && ageGroup !== ("ALL" as any)) {
      rows = rows.filter((p) => {
        const age = p.age_years
        if (age == null) return false

        switch (ageGroup) {
          case "ADT":
            return age >= 20
          case "SNR":
            return age >= 50
          case "VET":
            return age >= 60
          case "U20":
            return age >= 17 && age <= 19
          case "U18":
            return age >= 15 && age <= 16
          case "U16":
            return age >= 13 && age <= 14
          case "U14":
            return age >= 11 && age <= 12
          case "U12":
            return age >= 9 && age <= 10
          case "U10":
            return age >= 7 && age <= 8
          default:
            return true
        }
      })
    }

    if (events && events !== ("ALL" as any)) {
      rows = rows.filter((p) => {
        const count = p.tournaments_count
        switch (events) {
          case "1":
            return count === 1
          case "2+":
            return count >= 2
          case "3+":
            return count >= 3
          case "4+":
            return count >= 4
          case "5+":
            return count >= 5
          case "6+":
            return count >= 6
          default:
            return true
        }
      })
    }

    rows.sort((a, b) => (b.avg_performance_rating ?? 0) - (a.avg_performance_rating ?? 0))
    setData(rows)
  }, [filters, allData])

  const handleSearch = (next: RankingFilters) => {
    setFilters((prev) => ({ ...prev, ...next }))
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="py-6">
        <div className="space-y-6">
          <div className="space-y-2 px-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Player Rankings</h1>
            <p className="text-muted-foreground">View player performance rankings and statistics</p>
            <p className="text-xs text-muted-foreground">
              Tournament data from 1 October 2024 - 30 September 2025. If missing data, or info please contact us{" "}
              <Link href="/forms/contact-us" className="underline text-primary font-semibold">
                here
              </Link>
              .
            </p>
          </div>

          <div className="sticky top-0 z-10 bg-background px-4 py-2 -my-2">
            <SearchFilters onSearch={handleSearch} fedOptions={FED_OPTIONS} />
          </div>

          {/* <RankingsTable
            data={data}
            loading={loading}
            onSelectPlayer={(p) => {
              setSelected(p)
              setOpen(true)
            }}
          /> */}
          <div className="flex flex-col items-center justify-center py-24 px-4">
            <div className="text-center space-y-6 max-w-2xl">
              <div className="text-8xl sm:text-9xl mb-8" role="img" aria-label="hammer">
                🔨
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-balance leading-tight tracking-tight">
                Under Maintenance
              </h2>
              <p className="text-lg sm:text-xl text-muted-foreground text-pretty">
                We're currently updating the rankings system. Please check back soon.
              </p>
            </div>
          </div>

          {/* <PerformanceDetailsModal player={selected} open={open} onClose={() => setOpen(false)} /> */}
        </div>
      </div>
    </div>
  )
}

