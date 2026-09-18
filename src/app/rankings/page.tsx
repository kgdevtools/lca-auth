import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { getShadowSummaries } from "@/lib/rankingsServer"
import RankingsView from "../player-rankings/RankingsView"
import { DEFAULT_PERIOD } from "../player-rankings/constants"

export const revalidate = 3600

export default async function IncrementalRankingsPreviewPage() {
  const initialPlayers = await getShadowSummaries(DEFAULT_PERIOD)

  return (
    <>
      <details className="group mx-auto mt-5 max-w-[1200px] border border-amber-500/40 bg-amber-500/10 text-sm leading-6 text-foreground">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400 [&::-webkit-details-marker]:hidden">
          <span>Can&apos;t find your name?</span>
          <span className="flex shrink-0 items-center gap-2 text-xs font-medium text-amber-500">
            View possible reasons
            <ChevronDown
              className="h-4 w-4 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </span>
        </summary>
        <div className="border-t border-amber-500/30 px-4 py-4">
          <p>One of the following may apply:</p>
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
      </details>
      <RankingsView
        initialPlayers={initialPlayers}
        initialPeriod={DEFAULT_PERIOD}
        dataPath="/rankings/data"
        profileBasePath="/player-rankings"
      />
    </>
  )
}
