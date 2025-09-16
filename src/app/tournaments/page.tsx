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
    <main className="min-h-dvh px-4 py-8 mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold mb-4 text-foreground md:text-3xl lg:text-4xl">Tournaments</h1>
      <div className="mb-4 text-sm text-muted-foreground">
        Showing {tournaments?.length} of {total} tournaments.
      </div>
      <ul className="divide-y divide-border border border-border rounded-md bg-card shadow-sm">
        {(tournaments as Tournament[] | null)?.map((t, index) => (
          <li key={t.id} className="p-4 hover:bg-muted transition-colors duration-200">
            <Link href={`/tournaments/${t.id}`} className="block">
              <div className="flex items-center mb-1">
                <span className="text-sm font-semibold text-muted-foreground mr-2">#{from + index + 1}</span>
                <h2 className="font-bold text-lg text-primary md:text-xl lg:text-2xl tracking-tightest">{t.tournament_name ?? "Untitled Tournament"}</h2>
              </div>
              <p className="text-base text-foreground mb-1">
                <span className="font-semibold">Location:</span> {t.location ?? "Unknown location"}
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                <span className="font-semibold">Chief Arbiter:</span> {t.chief_arbiter ?? "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold">Date:</span> {t.date ?? "Unknown date"}
              </p>
            </Link>
          </li>
        ))}
      </ul>

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
    <div className="flex items-center justify-between mt-4">
      <Link href={`/tournaments?page=${prev}`} className={`text-sm rounded-md border px-3 py-1.5 ${hasPrev ? "" : "pointer-events-none opacity-50"}`}>Prev</Link>
      <span className="text-sm">Page {currentPage} of {totalPages}</span>
      <Link href={`/tournaments?page=${next}`} className={`text-sm rounded-md border px-3 py-1.5 ${hasNext ? "" : "pointer-events-none opacity-50"}`}>Next</Link>
    </div>
  )
}
