"use client"

import React from "react"
import { useState } from "react"

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
    if (!color) return { display: "black", class: "bg-foreground text-background" }

    const colorStr = String(color).toLowerCase()

    if (colorStr === "w" || colorStr === "white") {
      return { display: "white", class: "bg-background text-foreground border border-border" }
    } else if (colorStr === "b" || colorStr === "black") {
      return { display: "black", class: "bg-foreground text-background" }
    }

    // Default to black if unclear
    return { display: "black", class: "bg-foreground text-background" }
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

  return (
    <div className="w-full space-y-6">
      {/* Players Table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Rank</th>
              <th className="px-3 py-2 text-left font-medium text-foreground">Name</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Fed</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Rating</th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Pts</th>
              {tbKeys.map((tbKey) => (
                <th key={tbKey} className="px-2 py-2 text-left font-medium text-xs text-muted-foreground bg-muted/30">
                  {tbKey}
                </th>
              ))}
              <th className="px-3 py-2 text-left font-medium text-muted-foreground bg-muted/30">Perf</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {validPlayers.map((player, idx) => (
              <React.Fragment key={player.id}>
                <tr
                  className="cursor-pointer transition-colors hover:bg-muted/30"
                  onClick={() => handlePlayerClick(player)}
                >
                  <td className="px-3 py-2 text-muted-foreground">{player.rank}</td>
                  <td className="px-3 py-2 font-medium text-foreground">
                    <div className="flex items-center">
                      <span className="mr-2 text-primary hover:text-primary/80 transition-colors">{player.name}</span>
                      <svg
                        className={`w-4 h-4 transition-transform text-muted-foreground ${
                          selectedPlayer?.id === player.id ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{player.federation}</td>
                  <td className="px-3 py-2 text-foreground font-medium">{player.rating}</td>
                  <td className="px-3 py-2 font-medium text-foreground">{player.points}</td>
                  {tbKeys.map((tbKey) => (
                    <td key={tbKey} className="px-2 py-2 text-xs text-muted-foreground bg-muted/20">
                      {player.tie_breaks?.[tbKey] ?? "-"}
                    </td>
                  ))}
                  <td className="px-3 py-2 bg-muted/20 font-medium text-foreground">
                    {getPerfValue(player.tie_breaks) ?? "-"}
                  </td>
                </tr>

                {selectedPlayer?.id === player.id && (
                  <tr>
                    <td colSpan={6 + tbKeys.length} className="p-0 bg-muted/20">
                      <div className="p-4">
                        <div className="mb-3 font-medium text-foreground">Round Details for {player.name}</div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse border border-border rounded-md">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="px-3 py-2 border border-border text-center font-medium text-muted-foreground min-w-[60px]">
                                  Round
                                </th>
                                <th className="px-3 py-2 border border-border text-center font-medium text-muted-foreground min-w-[200px]">
                                  Opponent
                                </th>
                                <th className="px-3 py-2 border border-border text-center font-medium text-muted-foreground min-w-[80px]">
                                  Rating
                                </th>
                                <th className="px-3 py-2 border border-border text-center font-medium text-muted-foreground min-w-[70px]">
                                  Color
                                </th>
                                <th className="px-3 py-2 border border-border text-center font-medium text-muted-foreground min-w-[70px]">
                                  Result
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {Array.isArray(player.rounds) &&
                                player.rounds.map((round, index) => {
                                  const opponent = findOpponentByRank(round.opponent)
                                  const opponentRating = opponent?.rating || round.opponent_rating || "-"
                                  const opponentName = opponent?.name || `Player ${round.opponent}`

                                  const colorInfo = parseColor(round.color)
                                  const resultInfo = parseResult(round.result)

                                  return (
                                    <tr key={index} className="hover:bg-muted/20">
                                      <td className="px-3 py-1 border border-border text-center text-muted-foreground">
                                        {index + 1}
                                      </td>
                                      <td className="px-3 py-1 border border-border font-medium text-center text-foreground">
                                        {opponentName}
                                      </td>
                                      <td className="px-3 py-1 border border-border text-center text-muted-foreground">
                                        {opponentRating}
                                      </td>
                                      <td className="px-3 py-1 border border-border text-center">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${colorInfo.class}`}>
                                          {colorInfo.display}
                                        </span>
                                      </td>
                                      <td className="px-3 py-1 border border-border font-medium text-center">
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
        <div className="text-center py-8 text-muted-foreground">
          No valid players found (players must have rank &gt; 0)
        </div>
      )}
    </div>
  )
}
