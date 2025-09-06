import Link from "next/link"
import { createClient } from "@/utils/supabase/server"

export const dynamic = "force-dynamic"

type Tournament = {
  id: string
  tournament_name: string | null
  location: string | null
  date: string | null
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
    .select("id, tournament_name, location, date", { count: "exact" })
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
      <h1 className="text-2xl font-semibold mb-4">Tournaments</h1>
      <ul className="divide-y border rounded-md">
        {(tournaments as Tournament[] | null)?.map((t) => (
          <li key={t.id} className="p-3">
            <Link href={`/tournaments/${t.id}`} className="hover:underline">
              <div className="font-medium">{t.tournament_name ?? "Untitled Tournament"}</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-300">
                {t.location ?? "Unknown location"} • {t.date ?? "Unknown date"}
              </div>
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
