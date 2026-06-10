import { notFound } from "next/navigation"
import { getPlayerProfile } from "@/lib/playerProfileServer"
import ProfileView from "./ProfileView"

// Mirror the rankings page's cache window — the underlying pool is cached per-period.
export const revalidate = 3600

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const { key: rawKey } = await params
  // Next may hand the segment back still-encoded; decode defensively (a stray '%'
  // in a name would otherwise throw) and fall back to the raw value.
  let key = rawKey
  try {
    key = decodeURIComponent(rawKey)
  } catch {
    key = rawKey
  }

  // Defaults to the all-time pool; the profile shows the player's full history.
  // Linked PGN games are fetched on demand by the Games tab (see /api/players/games)
  // so the page doesn't block on the fuzzy PGN matching.
  const profile = await getPlayerProfile(key)
  if (!profile) notFound()

  return <ProfileView profile={profile} />
}
