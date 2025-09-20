import Link from "next/link"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

type Tournament = {
  id: string
  tournament_name: string | null
  location: string | null
  date: string | null
  chief_arbiter: string | null
}

export default async function TournamentsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = (await searchParams) ?? {}
  const pageParam = Array.isArray(sp.page) ? sp.page[0] : sp.page
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1)
  const pageSize = 10
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createClient()
  const { data: tournaments, error, count } = await supabase
    .from("tournaments")
    .select("id, tournament_name, location, date, chief_arbiter", { count: "exact" })
    .order("date", { ascending: false })
    .range(from, to)

  if (error) {
    return (
      <main className="min-h-dvh px-4 py-8 mx-auto max-w-3xl">
        <p className="text-sm text-[var(--destructive)]">Failed to load tournaments</p>
      </main>
    )
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <main className="min-h-dvh p-4 sm:p-6 lg:p-8 mx-auto max-w-[90rem]">
      <div className="mb-6 sm:mb-8 lg:mb-10">
        <h1 className="text-2xl font-bold text-foreground md:text-3xl lg:text-4xl xl:text-5xl tracking-tight">
          Tournaments
        </h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">
          Showing {tournaments?.length} of {total} tournaments
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
        {(tournaments as Tournament[] | null)?.map((t, index) => (
          <Link 
            key={t.id}
            href={`/tournaments/${t.id}`}
            className="group relative flex flex-col h-full rounded-lg border border-border bg-card shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:bg-accent/50"
          >
            <div className="p-3 sm:p-4 flex flex-col h-full">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="font-bold tracking-tightest text-base sm:text-lg text-foreground group-hover:text-primary line-clamp-2 leading-tight">
                  {t.tournament_name ?? "Untitled Tournament"}
                </h2>
                <span className="shrink-0 text-xs font-medium text-muted-foreground px-2 py-1 rounded-full border border-border">
                  #{from + index + 1}
                </span>
              </div>

              <div className="space-y-1 flex-grow">
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="shrink-0 w-16 text-xs font-medium text-foreground">Location</span>
                  <span className="line-clamp-1">{t.location ?? "Unknown location"}</span>
                </p>
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="shrink-0 w-16 text-xs font-medium text-foreground">Arbiter</span>
                  <span className="line-clamp-1">{t.chief_arbiter ?? "N/A"}</span>
                </p>
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="shrink-0 w-16 text-xs font-medium text-foreground">Date</span>
                  <span className="text-primary text-xs font-medium">{t.date ?? "Unknown date"}</span>
                </p>
              </div>
            </div>

            <div className="absolute inset-0 rounded-lg transition-opacity duration-200 opacity-0 group-hover:opacity-100 pointer-events-none">
              <div className="absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <div className="absolute inset-y-0 -right-px w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
            </div>
          </Link>
        ))}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} />
    </main>
  )
}

function Pagination({ currentPage, totalPages }: { currentPage: number; totalPages: number }) {
  const prev = Math.max(1, currentPage - 1)
  const next = Math.min(totalPages, currentPage + 1)
  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages
  return (
    <div className="flex items-center justify-between mt-6 sm:mt-8 lg:mt-10">
      <Link 
        href={`/tournaments?page=${prev}`} 
        className={`inline-flex items-center justify-center text-sm font-medium h-9 px-4 py-2 rounded-md border shadow-sm transition-colors
          ${hasPrev 
            ? "bg-card hover:bg-accent hover:text-accent-foreground" 
            : "pointer-events-none opacity-50"
          }`}
      >
        Previous
      </Link>
      <span className="text-sm font-medium text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
      <Link 
        href={`/tournaments?page=${next}`} 
        className={`inline-flex items-center justify-center text-sm font-medium h-9 px-4 py-2 rounded-md border shadow-sm transition-colors
          ${hasNext 
            ? "bg-card hover:bg-accent hover:text-accent-foreground" 
            : "pointer-events-none opacity-50"
          }`}
      >
        Next
      </Link>
    </div>
  )
}
