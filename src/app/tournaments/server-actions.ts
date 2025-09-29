"use server"

import { createClient } from "@/utils/supabase/server"

export type Tournament = {
  id: string
  tournament_name: string | null
  location: string | null
  date: string | null
  chief_arbiter: string | null
}

// --- normalize date strings to yyyy-mm-dd ---
function normalizeDate(str: string | null): string | null {
  if (!str) return null
  const slashMatch = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(str)
  if (slashMatch) {
    const [, y, m, d] = slashMatch
    return `${y}-${m}-${d}`
  }
  const dashMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str)
  if (dashMatch) return str
  return str // invalid – left as is
}

function parseValidDate(str: string | null): Date | null {
  const norm = normalizeDate(str)
  if (!norm) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(norm)
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  const date = new Date(y, m - 1, d)
  return isNaN(date.getTime()) ? null : date
}

export async function getTournaments() {
  const supabase = await createClient()
  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("id, tournament_name, location, date, chief_arbiter")

  if (error) {
    throw new Error("Failed to fetch tournaments")
  }

  const tournamentsSorted = (tournaments ?? [])
    .slice()
    .sort((a, b) => {
      const aDate = parseValidDate(a.date)
      const bDate = parseValidDate(b.date)
      if (aDate && bDate) return bDate.getTime() - aDate.getTime()
      if (aDate) return -1
      if (bDate) return 1
      return 0
    })
    .map(t => ({
      ...t,
      date: normalizeDate(t.date),
    }))

  return tournamentsSorted
}