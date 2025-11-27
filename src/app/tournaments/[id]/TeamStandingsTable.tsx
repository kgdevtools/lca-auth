"use client"

import React, { useState } from "react"
import { ChevronDown, Users, Trophy } from "lucide-react"
import type { TeamWithPlayers } from "./team-server-actions"

interface TeamStandingsTableProps {
  teams: TeamWithPlayers[]
  totalRounds: number
}

export default function TeamStandingsTable({ teams, totalRounds }: TeamStandingsTableProps) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)

  const toggleTeam = (teamId: string) => {
    setExpandedTeam(expandedTeam === teamId ? null : teamId)
  }

  // Get all TB keys from teams
  const getAllTBKeys = () => {
    const tbKeys = new Set<string>()
    teams.forEach((team) => {
      if (team.tie_breaks && typeof team.tie_breaks === "object") {
        Object.keys(team.tie_breaks).forEach((key) => {
          if (key.startsWith("TB") || key === "Buchholz" || key === "Sonneborn") {
            tbKeys.add(key)
          }
        })
      }
    })
    return Array.from(tbKeys).sort()
  }

  const tbKeys = getAllTBKeys()

  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 border-b-2 border-border">
              <th className="text-left p-3 text-sm font-semibold">Rank</th>
              <th className="text-left p-3 text-sm font-semibold">Team Name</th>
              <th className="text-center p-3 text-sm font-semibold">MP</th>
              <th className="text-center p-3 text-sm font-semibold">GP</th>
              {tbKeys.map((tb) => (
                <th key={tb} className="text-center p-3 text-sm font-semibold">
                  {tb}
                </th>
              ))}
              <th className="text-center p-3 text-sm font-semibold">Players</th>
              <th className="text-center p-3 text-sm font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {teams.map((team, idx) => (
              <React.Fragment key={team.id}>
                <tr
                  className={`border-b border-border hover:bg-muted/30 cursor-pointer transition-colors ${
                    expandedTeam === team.id ? "bg-muted/50" : ""
                  }`}
                  onClick={() => toggleTeam(team.id)}
                >
                  <td className="p-3 text-sm font-semibold">
                    {team.rank !== null ? team.rank : idx + 1}
                  </td>
                  <td className="p-3 text-sm font-semibold">{team.team_name}</td>
                  <td className="p-3 text-sm text-center">
                    {team.match_points.toFixed(1)}
                  </td>
                  <td className="p-3 text-sm text-center">
                    {team.game_points.toFixed(1)}
                  </td>
                  {tbKeys.map((tb) => (
                    <td key={tb} className="p-3 text-sm text-center">
                      {team.tie_breaks?.[tb] !== null && team.tie_breaks?.[tb] !== undefined
                        ? typeof team.tie_breaks[tb] === "number"
                          ? team.tie_breaks[tb].toFixed(1)
                          : team.tie_breaks[tb]
                        : "-"}
                    </td>
                  ))}
                  <td className="p-3 text-sm text-center">
                    {team.team_players?.length || 0}
                  </td>
                  <td className="p-3 text-center">
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        expandedTeam === team.id ? "rotate-180" : ""
                      }`}
                    />
                  </td>
                </tr>
                {expandedTeam === team.id && team.team_players && (
                  <tr>
                    <td colSpan={6 + tbKeys.length} className="p-0">
                      <div className="bg-muted/20 p-4 border-b border-border">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Team Roster
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left p-2">Board</th>
                                <th className="text-left p-2">Player</th>
                                <th className="text-center p-2">Rating</th>
                                <th className="text-center p-2">Played</th>
                                <th className="text-center p-2">Points</th>
                                <th className="text-center p-2">Perf</th>
                              </tr>
                            </thead>
                            <tbody>
                              {team.team_players
                                .sort((a, b) => (a.board_number || 99) - (b.board_number || 99))
                                .map((player) => (
                                  <tr key={player.id} className="border-b border-border/50">
                                    <td className="p-2">
                                      {player.board_number !== null ? player.board_number : "-"}
                                    </td>
                                    <td className="p-2 font-medium">
                                      {player.title && (
                                        <span className="text-primary font-semibold mr-1">
                                          {player.title}
                                        </span>
                                      )}
                                      {player.player_name}
                                    </td>
                                    <td className="p-2 text-center">
                                      {player.rating || 0}
                                    </td>
                                    <td className="p-2 text-center">
                                      {player.games_played}
                                    </td>
                                    <td className="p-2 text-center font-semibold">
                                      {player.points.toFixed(1)}
                                    </td>
                                    <td className="p-2 text-center text-muted-foreground">
                                      N/A
                                    </td>
                                  </tr>
                                ))}
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

      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        {teams.map((team, idx) => (
          <div
            key={team.id}
            className="border border-border rounded-lg bg-card shadow-sm overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer"
              onClick={() => toggleTeam(team.id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-primary">
                      #{team.rank !== null ? team.rank : idx + 1}
                    </span>
                    <h3 className="text-base font-semibold">{team.team_name}</h3>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {team.team_players?.length || 0} players
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform ${
                    expandedTeam === team.id ? "rotate-180" : ""
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Match Points</p>
                  <p className="text-sm font-semibold">{team.match_points.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Game Points</p>
                  <p className="text-sm font-semibold">{team.game_points.toFixed(1)}</p>
                </div>
                {tbKeys.slice(0, 2).map((tb) => (
                  <div key={tb}>
                    <p className="text-xs text-muted-foreground">{tb}</p>
                    <p className="text-sm font-semibold">
                      {team.tie_breaks?.[tb] !== null && team.tie_breaks?.[tb] !== undefined
                        ? typeof team.tie_breaks[tb] === "number"
                          ? team.tie_breaks[tb].toFixed(1)
                          : team.tie_breaks[tb]
                        : "-"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {expandedTeam === team.id && team.team_players && (
              <div className="border-t border-border bg-muted/20 p-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Roster
                </h4>
                <div className="space-y-2">
                  {team.team_players
                    .sort((a, b) => (a.board_number || 99) - (b.board_number || 99))
                    .map((player) => (
                      <div
                        key={player.id}
                        className="bg-card p-3 rounded border border-border"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="text-sm font-semibold">
                              {player.title && (
                                <span className="text-primary mr-1">{player.title}</span>
                              )}
                              {player.player_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Board {player.board_number !== null ? player.board_number : "-"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">
                              {player.points.toFixed(1)} pts
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {player.games_played} games
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">Rating:</span>{" "}
                            <span className="font-medium">{player.rating || 0}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Perf:</span>{" "}
                            <span className="font-medium text-muted-foreground">
                              N/A
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="text-xs text-muted-foreground border-t border-border pt-3">
        <p className="font-semibold mb-1">Legend:</p>
        <p>MP = Match Points (Win: 2, Draw: 1, Loss: 0)</p>
        <p>GP = Game Points (Total board scores)</p>
        {tbKeys.length > 0 && <p>TB = Tie-break criteria</p>}
      </div>
    </div>
  )
}
