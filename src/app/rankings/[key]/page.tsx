import { notFound } from "next/navigation"
import { getPlayerProfile } from "@/lib/playerProfileServer"
import ProfileView from "../../player-rankings/[key]/ProfileView"

export const revalidate = 3600

// Served here (not redirected to /player-rankings) because the funding-pause
// proxy only opens /rankings, and so the profile matches the shadow pool the
// /rankings table is built from.
export default async function ShadowRankingProfilePage({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const { key: rawKey } = await params
  let key = rawKey
  try {
    key = decodeURIComponent(rawKey)
  } catch {
    key = rawKey
  }

  const profile = await getPlayerProfile(key, undefined, "shadow")
  if (!profile) notFound()

  return <ProfileView profile={profile} source="shadow" />
}
