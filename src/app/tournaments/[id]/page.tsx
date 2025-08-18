import { createClient } from "@/utils/supabase/server"

type Player = {
  rank: number | null
  name: string | null
  federation: string | null
  rating: number | null
  points: number | null
}

export const dynamic = "force-dynamic"

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tournament, error: tErr } = await supabase
    .from("tournaments")
    .select("id, tournament_name, location, date")
    .eq("id", id)
    .single()

  if (tErr || !tournament) {
    return (
      <main className="min-h-dvh px-4 py-8 mx-auto max-w-5xl">
        <p className="text-sm text-[var(--destructive)]">Tournament not found</p>
      </main>
    )
  }

  const { data: players, error: pErr } = await supabase
    .from("players")
    .select("rank, name, federation, rating, points")
    .eq("tournament_id", id)
    .order("rank", { ascending: true })

  if (pErr) {
    return (
      <main className="min-h-dvh px-4 py-8 mx-auto max-w-5xl">
        <h1 className="text-2xl font-semibold mb-2">{tournament.tournament_name ?? "Untitled Tournament"}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">{tournament.location ?? "Unknown location"} • {tournament.date ?? "Unknown date"}</p>
        <p className="text-sm text-[var(--destructive)]">Failed to load players</p>
      </main>
    )
  }

  return (
    <main className="min-h-dvh px-4 py-8 mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold mb-2">{tournament.tournament_name ?? "Untitled Tournament"}</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6">{tournament.location ?? "Unknown location"} • {tournament.date ?? "Unknown date"}</p>

      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-900">
            <tr>
              <th className="text-left px-3 py-2 border-b">Rank</th>
              <th className="text-left px-3 py-2 border-b">Name</th>
              <th className="text-left px-3 py-2 border-b">Federation</th>
              <th className="text-left px-3 py-2 border-b">Rating</th>
              <th className="text-left px-3 py-2 border-b">Points</th>
            </tr>
          </thead>
          <tbody>
            {(players as Player[] | null)?.map((p, idx) => (
              <tr key={idx} className="odd:bg-white even:bg-neutral-50 dark:odd:bg-black dark:even:bg-neutral-900">
                <td className="px-3 py-2 border-b">{p.rank ?? ""}</td>
                <td className="px-3 py-2 border-b">{p.name ?? ""}</td>
                <td className="px-3 py-2 border-b">{p.federation ?? ""}</td>
                <td className="px-3 py-2 border-b">{p.rating ?? ""}</td>
                <td className="px-3 py-2 border-b">{p.points ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}


