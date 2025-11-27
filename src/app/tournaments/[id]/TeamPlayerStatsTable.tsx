"use client"

import React, { useState } from "react"
import { ChevronDown, Award } from "lucide-react"
import type { PlayerPerformance } from "./team-server-actions"

interface TeamPlayerStatsTableProps {
  players: PlayerPerformance[]
  totalRounds: number
}

export default function TeamPlayerStatsTable({ players, totalRounds }: TeamPlayerStatsTableProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)

  const togglePlayer = (playerId: string) => {
    setSelectedPlayer(selectedPlayer === playerId ? null : playerId)
  }

  // Group players by board number
  const groupedByBoard = React.useMemo(() => {
    const groups: { [board: number]: PlayerPerformance[] } = {}

    players.forEach((player) => {
      const board = player.board_number || 999 // Use 999 for unassigned boards
      if (!groups[board]) {
        groups[board] = []
      }
      groups[board].push(player)
    })

    // Sort players within each board by:
    // 1. Points (descending)
    // 2. Performance rating (descending)
    // 3. Rating (descending)
    Object.keys(groups).forEach((board) => {
      groups[Number(board)].sort((a, b) => {
        // Sort by points first
        if (b.points !== a.points) return b.points - a.points
        // Then by performance rating
        const aPerfRating = a.performance_rating || 0
        const bPerfRating = b.performance_rating || 0
        if (bPerfRating !== aPerfRating) return bPerfRating - aPerfRating
        // Finally by rating
        const aRating = a.rating || 0
        const bRating = b.rating || 0
        return bRating - aRating
      })
    })

    // Return sorted board numbers (1, 2, 3, ..., then 999 for unassigned)
    const sortedBoards = Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b)

    return sortedBoards.map((board) => ({
      board,
      players: groups[board],
    }))
  }, [players])

  // Helper to parse result into score
  const getResultScore = (result: string): number => {
    const r = result.toLowerCase()
    if (r === "win") return 1
    if (r === "draw") return 0.5
    return 0
  }

  // Helper to parse result display
  const getResultDisplay = (result: string): { text: string; class: string } => {
    const r = result.toLowerCase()
    if (r === "win") return { text: "1", class: "text-green-600 dark:text-green-400 font-bold" }
    if (r === "draw") return { text: "½", class: "text-yellow-600 dark:text-yellow-400" }
    return { text: "0", class: "text-red-600 dark:text-red-400" }
  }

  // Helper to parse color
  const getColorDisplay = (color: string): { text: string; class: string } => {
    if (color === "B")
      return {
        text: "B",
        class: "bg-background text-foreground border border-border px-1 rounded",
      }
    return { text: "W", class: "bg-foreground text-background px-1 rounded" }
  }

  return (
    <div className="space-y-6">
      {/* Desktop View */}
      <div className="hidden md:block space-y-6">
        {groupedByBoard.map(({ board, players: boardPlayers }) => (
          <div key={board} className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground px-2">
              {board === 999 ? "Unassigned Board" : `Board ${board}`}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b-2 border-border">
                    <th className="text-center p-3 text-sm font-semibold w-12">#</th>
                    <th className="text-left p-3 text-sm font-semibold">Player</th>
                    <th className="text-left p-3 text-sm font-semibold">Team</th>
                    <th className="text-center p-3 text-sm font-semibold">Rating</th>
                    <th className="text-center p-3 text-sm font-semibold">Games</th>
                    <th className="text-center p-3 text-sm font-semibold">Points</th>
                    <th className="text-center p-3 text-sm font-semibold">Perf</th>
                    <th className="text-center p-3 text-sm font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {boardPlayers.map((player, idx) => (
                    <React.Fragment key={player.id}>
                      <tr
                        className={`border-b border-border hover:bg-muted/30 cursor-pointer transition-colors ${
                          selectedPlayer === player.id ? "bg-muted/50" : ""
                        }`}
                        onClick={() => togglePlayer(player.id)}
                      >
                        <td className="p-3 text-sm text-center font-bold text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="p-3 text-sm">
                          {player.title && (
                            <span className="text-primary font-semibold mr-1">{player.title}</span>
                          )}
                          <span className="font-medium">{player.player_name}</span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{player.team_name}</td>
                        <td className="p-3 text-sm text-center">{player.rating || 0}</td>
                        <td className="p-3 text-sm text-center">{player.games_played}</td>
                        <td className="p-3 text-sm text-center font-semibold">
                          {player.points.toFixed(1)}
                        </td>
                        <td className="p-3 text-sm text-center text-muted-foreground">
                          N/A
                        </td>
                        <td className="p-3 text-center">
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              selectedPlayer === player.id ? "rotate-180" : ""
                            }`}
                          />
                        </td>
                      </tr>
                      {selectedPlayer === player.id && (
                        <tr>
                          <td colSpan={8} className="p-0">
                      <div className="bg-muted/20 p-4 border-b border-border">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          Round-by-Round Results
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-center p-2">Round</th>
                                <th className="text-center p-2">Board</th>
                                <th className="text-center p-2">Color</th>
                                <th className="text-left p-2">Opponent</th>
                                <th className="text-center p-2">Opp Rating</th>
                                <th className="text-center p-2">Result</th>
                              </tr>
                            </thead>
                            <tbody>
                              {player.rounds.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                                    No games played
                                  </td>
                                </tr>
                              ) : (
                                player.rounds.map((round, idx) => {
                                  const resultDisplay = getResultDisplay(round.result)
                                  const colorDisplay = getColorDisplay(round.color)
                                  return (
                                    <tr key={idx} className="border-b border-border/50">
                                      <td className="p-2 text-center font-semibold">
                                        {round.round_number}
                                      </td>
                                      <td className="p-2 text-center">{round.board_number}</td>
                                      <td className="p-2 text-center">
                                        <span className={colorDisplay.class}>
                                          {colorDisplay.text}
                                        </span>
                                      </td>
                                      <td className="p-2">{round.opponent_name}</td>
                                      <td className="p-2 text-center">
                                        {round.opponent_rating || 0}
                                      </td>
                                      <td className="p-2 text-center">
                                        <span className={resultDisplay.class}>
                                          {resultDisplay.text}
                                        </span>
                                      </td>
                                    </tr>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="mt-3 text-xs text-muted-foreground">
                          <p>
                            <strong>Score:</strong> {player.points.toFixed(1)} /{" "}
                            {player.games_played} ={" "}
                            {player.games_played > 0
                              ? ((player.points / player.games_played) * 100).toFixed(0)
                              : 0}
                            %
                          </p>
                          {player.performance_rating && (
                            <p>
                              <strong>Performance Rating:</strong> {player.performance_rating}
                            </p>
                          )}
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
      </div>
    ))}
  </div>

  {/* Mobile View */}
  <div className="md:hidden space-y-6">
    {groupedByBoard.map(({ board, players: boardPlayers }) => (
      <div key={board} className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground px-2">
          {board === 999 ? "Unassigned Board" : `Board ${board}`}
        </h3>
        {boardPlayers.map((player, idx) => (
          <div
            key={player.id}
            className="border border-border rounded-lg bg-card shadow-sm overflow-hidden"
          >
            <div className="p-4 cursor-pointer" onClick={() => togglePlayer(player.id)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-xl font-bold text-muted-foreground min-w-[2rem]">
                    #{idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-semibold mb-1">
                      {player.title && (
                        <span className="text-primary mr-1">{player.title}</span>
                      )}
                      {player.player_name}
                    </div>
                    <div className="text-sm text-muted-foreground">{player.team_name}</div>
                  </div>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
                    selectedPlayer === player.id ? "rotate-180" : ""
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Rating</p>
                  <p className="text-sm font-semibold">{player.rating || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Performance</p>
                  <p className="text-sm font-semibold text-muted-foreground">
                    N/A
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Games</p>
                  <p className="text-sm font-semibold">{player.games_played}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Points</p>
                  <p className="text-sm font-semibold">{player.points.toFixed(1)}</p>
                </div>
              </div>
            </div>

            {selectedPlayer === player.id && (
              <div className="border-t border-border bg-muted/20 p-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Round-by-Round Results
                </h4>
                <div className="space-y-2">
                  {player.rounds.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No games played
                    </p>
                  ) : (
                    player.rounds.map((round, idx) => {
                      const resultDisplay = getResultDisplay(round.result)
                      const colorDisplay = getColorDisplay(round.color)
                      return (
                        <div key={idx} className="bg-card p-3 rounded border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">
                                Round {round.round_number}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Board {round.board_number}
                              </span>
                            </div>
                            <span className={resultDisplay.class + " text-lg font-bold"}>
                              {resultDisplay.text}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className={colorDisplay.class + " text-xs"}>
                              {colorDisplay.text}
                            </span>
                            <span className="flex-1">{round.opponent_name}</span>
                            <span className="text-muted-foreground text-xs">
                              ({round.opponent_rating || 0})
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="mt-3 text-xs text-muted-foreground border-t border-border pt-2">
                  <p>
                    <strong>Score:</strong> {player.points.toFixed(1)} /{" "}
                    {player.games_played} ={" "}
                    {player.games_played > 0
                      ? ((player.points / player.games_played) * 100).toFixed(0)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    ))}
  </div>
</div>
  )
}
