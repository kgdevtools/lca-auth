"use client"

import { useState, Fragment } from "react"
import { ChevronDown, Users } from "lucide-react"

interface Round {
  opponent: string | number
  opponent_rating?: number
  color: "W" | "B" | "white" | "black" | "White" | "Black" | string
  result: number | string | "win" | "loss" | "draw" | "Win" | "Loss" | "Draw" | "WIN" | "LOSS" | "DRAW"
}

interface Player {
  id: number
  name: string
  federation: string
  rating: number
  points: number
  rank: number
  tie_breaks: Record<string, any>
  rounds: Round[]
}

interface PlayersTableProps {
  players: Player[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseColor(color: string | any) {
  if (!color || color === "" || color == null) {
    return { display: "—", cls: "bg-muted text-muted-foreground" }
  }
  const c = String(color).toLowerCase()
  if (c === "w" || c === "white") return { display: "W", cls: "bg-background text-foreground border border-border" }
  if (c === "b" || c === "black") return { display: "B", cls: "bg-foreground text-background" }
  return { display: "—", cls: "bg-muted text-muted-foreground" }
}

function parseResult(result: any) {
  if (result === null || result === undefined || result === "") {
    return { display: "—", cls: "bg-muted text-muted-foreground" }
  }
  const r = String(result).toLowerCase()
  if (r === "win"  || r === "1"   || result === 1)   return { display: "1",  cls: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" }
  if (r === "loss" || r === "0"   || result === 0)   return { display: "0",  cls: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300" }
  if (r === "draw" || r === "0.5" || result === 0.5 || r === "½")
    return { display: "½", cls: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300" }
  return { display: "—", cls: "bg-muted text-muted-foreground" }
}

function getPerfValue(tie_breaks: Record<string, any>) {
  if (!tie_breaks || typeof tie_breaks !== "object") return null
  const perfKey = Object.keys(tie_breaks).find(k => k.toLowerCase().includes("perf"))
  if (perfKey && tie_breaks[perfKey]) return tie_breaks[perfKey]
  const tbValues = Object.entries(tie_breaks)
    .filter(([k, v]) => k.startsWith("TB") && typeof v === "number")
    .sort((a, b) => (b[1] as number) - (a[1] as number))
  return tbValues.length > 0 ? tbValues[0][1] : null
}

function getAllTBKeys(players: Player[]) {
  const keys = new Set<string>()
  players.forEach(p => {
    if (p.tie_breaks && typeof p.tie_breaks === "object")
      Object.keys(p.tie_breaks).forEach(k => { if (k.startsWith("TB")) keys.add(k) })
  })
  return Array.from(keys).sort()
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PlayersTable({ players }: PlayersTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const tbKeys      = getAllTBKeys(players)
  const validPlayers = players.filter(p => p.rank > 0)

  function toggle(player: Player) {
    setExpandedId(prev => prev === player.id ? null : player.id)
  }

  function findOpponent(rankOrName: string | number) {
    const rank = typeof rankOrName === "string" ? parseInt(rankOrName, 10) : rankOrName
    if (isNaN(rank) || rank <= 0) return null
    return players.find(p => p.rank === rank)
  }

  if (validPlayers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No valid players found (players must have rank &gt; 0)</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border shadow-sm">
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide w-10">
              #
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-foreground uppercase tracking-wide">
              Name
            </th>
            {/* sm+ only */}
            <th className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Fed
            </th>
            <th className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Rating
            </th>
            <th className="px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Pts
            </th>
            {/* lg+ only */}
            {tbKeys.map(k => (
              <th key={k} className="hidden lg:table-cell px-2 py-2 sm:py-3 text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide bg-muted/30">
                {k}
              </th>
            ))}
            <th className="hidden lg:table-cell px-2 sm:px-3 py-2 sm:py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide bg-muted/30">
              Perf
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {validPlayers.map(player => {
            const isExpanded = expandedId === player.id
            const perf = getPerfValue(player.tie_breaks)

            return (
              <Fragment key={player.id}>
                {/* Player row */}
                <tr
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggle(player)}
                >
                  <td className="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-muted-foreground tabular-nums">
                    {player.rank}
                  </td>
                  <td className="px-2 sm:px-3 py-2 sm:py-3">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-sm font-medium text-foreground leading-tight">
                        {player.name}
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </div>
                  </td>
                  {/* sm+ */}
                  <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-muted-foreground">
                    {player.federation || "—"}
                  </td>
                  <td className="hidden sm:table-cell px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-foreground tabular-nums font-medium">
                    {player.rating}
                  </td>
                  <td className="px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-bold text-foreground tabular-nums">
                    {player.points}
                  </td>
                  {/* lg+ */}
                  {tbKeys.map(k => (
                    <td key={k} className="hidden lg:table-cell px-2 py-2 sm:py-3 text-xs text-muted-foreground bg-muted/20 tabular-nums">
                      {player.tie_breaks?.[k] ?? "—"}
                    </td>
                  ))}
                  <td className="hidden lg:table-cell px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm text-foreground font-medium bg-muted/20 tabular-nums">
                    {perf ?? "—"}
                  </td>
                </tr>

                {/* Expanded rounds */}
                {isExpanded && (
                  <tr>
                    <td colSpan={99} className="p-0 bg-muted/10">
                      <div className="px-3 sm:px-4 py-3 space-y-1.5">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                          Rounds — {player.name}
                        </p>
                        {Array.isArray(player.rounds) && player.rounds.length > 0 ? (
                          player.rounds.map((round, i) => {
                            const opp        = findOpponent(round.opponent)
                            const oppName    = opp?.name ?? (typeof round.opponent === "string" ? round.opponent : `Rank ${round.opponent}`)
                            const oppRating  = opp?.rating ?? round.opponent_rating ?? "—"
                            const colorInfo  = parseColor(round.color)
                            const resultInfo = parseResult(round.result)

                            return (
                              <div
                                key={i}
                                className="flex items-center justify-between gap-3 px-3 py-2 rounded-sm bg-background border border-border"
                              >
                                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                                  <span className="text-[10px] sm:text-xs font-bold text-muted-foreground tabular-nums w-6 shrink-0">
                                    R{i + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-xs sm:text-sm font-medium text-foreground truncate leading-tight">
                                      {oppName}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground tabular-nums">{oppRating}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`px-1.5 py-0.5 rounded-sm text-[10px] sm:text-xs font-medium ${colorInfo.cls}`}>
                                    {colorInfo.display}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded-sm text-[10px] sm:text-xs font-semibold ${resultInfo.cls}`}>
                                    {resultInfo.display}
                                  </span>
                                </div>
                              </div>
                            )
                          })
                        ) : (
                          <p className="text-xs text-muted-foreground py-2">No round data available.</p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
