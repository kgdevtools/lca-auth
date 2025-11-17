"use client"

import React from "react"
import { useState } from "react"
import { ChevronDown, Award, Users } from "lucide-react"

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

export default function PlayersTable({ players }: PlayersTableProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(selectedPlayer?.id === player.id ? null : player)
  }

  // Helper function to find opponent by rank - now works with all players loaded
  const findOpponentByRank = (rankNumber: string | number) => {
    const rank = typeof rankNumber === "string" ? Number.parseInt(rankNumber, 10) : rankNumber
    if (isNaN(rank) || rank <= 0) return null

    return players.find((p) => p.rank === rank)
  }

  // Helper function to get all TB keys dynamically
  const getAllTBKeys = () => {
    const tbKeys = new Set<string>()
    players.forEach((player) => {
      if (player.tie_breaks && typeof player.tie_breaks === "object") {
        Object.keys(player.tie_breaks).forEach((key) => {
          if (key.startsWith("TB")) {
            tbKeys.add(key)
          }
        })
      }
    })
    return Array.from(tbKeys).sort() // Sort TB1, TB2, TB3, etc.
  }

  const tbKeys = getAllTBKeys()

  // Filter out players with rank 0 or invalid ranks
  const validPlayers = players.filter((player) => player.rank > 0)

  // Helper function to parse color with better type handling
  const parseColor = (color: string | any) => {
    if (!color || color === "" || color === null || color === undefined) {
      return { display: "-", class: "bg-muted text-muted-foreground" }
    }

    const colorStr = String(color).toLowerCase()

    if (colorStr === "w" || colorStr === "white") {
      return { display: "white", class: "bg-background text-foreground border border-border" }
    } else if (colorStr === "b" || colorStr === "black") {
      return { display: "black", class: "bg-foreground text-background" }
    }

    // Return "-" if unclear (e.g., from round robin tournaments where color is unknown)
    return { display: "-", class: "bg-muted text-muted-foreground" }
  }

  // Helper function to get the performance rating TB key (e.g., TB3 or whichever contains performance)
  const getPerfValue = (tie_breaks: Record<string, any>) => {
    if (!tie_breaks || typeof tie_breaks !== "object") return null
    // Look for a TB key that looks like performance (e.g., contains 'perf' or 'performance')
    const perfKey = Object.keys(tie_breaks).find(
      (key) => key.toLowerCase().includes("perf") || key.toLowerCase().includes("performance"),
    )
    if (perfKey && tie_breaks[perfKey]) return tie_breaks[perfKey]
    // Fallback: use the highest numeric TB value (regardless of value)
    const tbValues = Object.entries(tie_breaks)
      .filter(([key, val]) => key.startsWith("TB") && typeof val === "number")
      .sort((a, b) => b[1] - a[1])
    if (tbValues.length > 0) return tbValues[0][1]
    return null
  }

  // Helper function to parse result with better type handling
  const parseResult = (result: any) => {
    if (result === null || result === undefined || result === "") {
      // No result, no game played
      return { display: "-", symbol: "", class: "bg-muted text-muted-foreground" }
    }
    const resultStr = String(result).toLowerCase()

    // Handle string results
    if (resultStr === "win" || resultStr === "1" || result === 1) {
      return {
        display: "1",
        symbol: "+",
        class: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
      }
    } else if (resultStr === "loss" || resultStr === "0" || result === 0) {
      return { display: "0", symbol: "-", class: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300" }
    } else if (resultStr === "draw" || resultStr === "0.5" || result === 0.5 || resultStr === "½") {
      return {
        display: "½",
        symbol: "=",
        class: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
      }
    }

    // Default to dash if unclear
    return { display: "-", symbol: "", class: "bg-muted text-muted-foreground" }
  }

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-3">
        {validPlayers.map((player) => (
          <div
            key={player.id}
            className="rounded-lg border border-border bg-card shadow-sm overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer"
              onClick={() => handlePlayerClick(player)}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {player.rank}
                    </span>
                    <h3 className="font-bold text-foreground text-base line-clamp-1">{player.name}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-medium">{player.federation}</span>
                    <span>•</span>
                    <span className="font-semibold text-foreground">{player.rating}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-primary">{player.points}</div>
                  <div className="text-xs text-muted-foreground">pts</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-4 text-xs">
                  {getPerfValue(player.tie_breaks) && (
                    <div className="flex items-center gap-1">
                      <Award className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Perf:</span>
                      <span className="font-semibold text-foreground">{getPerfValue(player.tie_breaks)}</span>
                    </div>
                  )}
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    selectedPlayer?.id === player.id ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {selectedPlayer?.id === player.id && (
              <div className="border-t border-border bg-muted/20 p-4">
                <h4 className="font-semibold text-sm text-foreground mb-3">Round Details</h4>
                <div className="space-y-2">
                  {Array.isArray(player.rounds) &&
                    player.rounds.map((round, index) => {
                      const opponent = findOpponentByRank(round.opponent)
                      const opponentRating = opponent?.rating || round.opponent_rating || "-"
                      const opponentName = opponent?.name || (typeof round.opponent === 'string' ? round.opponent : `Rank ${round.opponent}`)

                      const colorInfo = parseColor(round.color)
                      const resultInfo = parseResult(round.result)

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 rounded-md bg-background border border-border text-xs"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-semibold text-muted-foreground w-6">R{index + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground line-clamp-1">{opponentName}</p>
                              <p className="text-muted-foreground">{opponentRating}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${colorInfo.class}`}>
                              {colorInfo.display}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${resultInfo.class}`}>
                              {resultInfo.display}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        ))}

        {validPlayers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No valid players found (players must have rank &gt; 0)</p>
          </div>
        )}
      </div>
    )
  }

  // Desktop Table View
  return (
    <div className="w-full space-y-6">
      {/* Players Table */}
      <div className="overflow-x-auto rounded-md border border-border shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Rank</th>
              <th className="px-3 py-3 text-left font-semibold text-foreground">Name</th>
              <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Fed</th>
              <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Rating</th>
              <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Pts</th>
              {tbKeys.map((tbKey) => (
                <th key={tbKey} className="px-2 py-3 text-left font-semibold text-xs text-muted-foreground bg-muted/30">
                  {tbKey}
                </th>
              ))}
              <th className="px-3 py-3 text-left font-semibold text-muted-foreground bg-muted/30">Perf</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {validPlayers.map((player, idx) => (
              <React.Fragment key={player.id}>
                <tr
                  className="cursor-pointer transition-colors hover:bg-muted/30"
                  onClick={() => handlePlayerClick(player)}
                >
                  <td className="px-3 py-3 text-muted-foreground">{player.rank}</td>
                  <td className="px-3 py-3 font-semibold text-foreground">
                    <div className="flex items-center">
                      <span className="mr-2 text-primary hover:text-primary/80 transition-colors">{player.name}</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform text-muted-foreground ${
                          selectedPlayer?.id === player.id ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{player.federation}</td>
                  <td className="px-3 py-3 text-foreground font-semibold">{player.rating}</td>
                  <td className="px-3 py-3 font-bold text-foreground">{player.points}</td>
                  {tbKeys.map((tbKey) => (
                    <td key={tbKey} className="px-2 py-3 text-xs text-muted-foreground bg-muted/20">
                      {player.tie_breaks?.[tbKey] ?? "-"}
                    </td>
                  ))}
                  <td className="px-3 py-3 bg-muted/20 font-semibold text-foreground">
                    {getPerfValue(player.tie_breaks) ?? "-"}
                  </td>
                </tr>

                {selectedPlayer?.id === player.id && (
                  <tr>
                    <td colSpan={6 + tbKeys.length} className="p-0 bg-muted/20">
                      <div className="p-4">
                        <div className="mb-3 font-semibold text-foreground">Round Details for {player.name}</div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse border border-border rounded-md">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="px-3 py-2 border border-border text-center font-semibold text-muted-foreground min-w-[60px]">
                                  Round
                                </th>
                                <th className="px-3 py-2 border border-border text-center font-semibold text-muted-foreground min-w-[200px]">
                                  Opponent
                                </th>
                                <th className="px-3 py-2 border border-border text-center font-semibold text-muted-foreground min-w-[80px]">
                                  Rating
                                </th>
                                <th className="px-3 py-2 border border-border text-center font-semibold text-muted-foreground min-w-[70px]">
                                  Color
                                </th>
                                <th className="px-3 py-2 border border-border text-center font-semibold text-muted-foreground min-w-[70px]">
                                  Result
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {Array.isArray(player.rounds) &&
                                player.rounds.map((round, index) => {
                                  const opponent = findOpponentByRank(round.opponent)
                                  const opponentRating = opponent?.rating || round.opponent_rating || "-"
                                  const opponentName = opponent?.name || (typeof round.opponent === 'string' ? round.opponent : `Rank ${round.opponent}`)

                                  const colorInfo = parseColor(round.color)
                                  const resultInfo = parseResult(round.result)

                                  return (
                                    <tr key={index} className="hover:bg-muted/20">
                                      <td className="px-3 py-2 border border-border text-center text-muted-foreground">
                                        {index + 1}
                                      </td>
                                      <td className="px-3 py-2 border border-border font-semibold text-center text-foreground">
                                        {opponentName}
                                      </td>
                                      <td className="px-3 py-2 border border-border text-center text-muted-foreground">
                                        {opponentRating}
                                      </td>
                                      <td className="px-3 py-2 border border-border text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${colorInfo.class}`}>
                                          {colorInfo.display}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 border border-border font-semibold text-center">
                                        <span className={`px-2 py-1 rounded text-xs ${resultInfo.class}`}>
                                          {resultInfo.display}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {validPlayers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p>No valid players found (players must have rank &gt; 0)</p>
        </div>
      )}
    </div>
  )
}
