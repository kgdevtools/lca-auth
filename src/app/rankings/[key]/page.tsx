import { redirect } from "next/navigation"

export const revalidate = 3600

export default async function ShadowRankingProfileRedirect({
  params,
}: {
  params: Promise<{ key: string }>
}) {
  const { key } = await params
  redirect(`/player-rankings/${encodeURIComponent(key)}`)
}
