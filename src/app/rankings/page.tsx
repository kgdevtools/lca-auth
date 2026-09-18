import Link from "next/link"
import { getShadowSummaries } from "@/lib/rankingsServer"
import RankingsView from "../player-rankings/RankingsView"
import { DEFAULT_PERIOD } from "../player-rankings/constants"

export const revalidate = 3600

export default async function IncrementalRankingsPreviewPage() {
  const initialPlayers = await getShadowSummaries(DEFAULT_PERIOD)

  return (
    <>
      <div className="mx-auto mt-5 max-w-[1200px] border border-amber-500/40 bg-amber-500/10 px-4 py-4 text-sm leading-6 text-foreground">
        <p className="font-semibold">Can&apos;t find your name?</p>
        <p className="mt-1">One of the following may apply:</p>
        <ol className="mt-1 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>You have played fewer than three events in the selected period.</li>
          <li>Your federation code is not registered under Limpopo: LCP, LVT, LWM, LSG or LMG.</li>
          <li>
            We may not yet have captured eligible Open tournaments you played outside Limpopo or
            Capricorn.
          </li>
        </ol>
        <p className="mt-2 text-muted-foreground">
          Try adjusting the filters first. If your name is still missing, contact your coach, the
          Capricorn District administrator, or the{" "}
          <Link href="/forms/contact-us" className="font-bold text-blue-400 hover:text-blue-300 hover:underline">
            site administrator
          </Link>
          .
        </p>
      </div>
      <RankingsView
        initialPlayers={initialPlayers}
        initialPeriod={DEFAULT_PERIOD}
        dataPath="/rankings/data"
        profileBasePath="/player-rankings"
      />
    </>
  )
}
