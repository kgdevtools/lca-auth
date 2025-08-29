// src/app/tournaments/[id]/PlayersTable.tsx

"use client"

import React from "react";
import { useState } from "react"

interface Round {
  opponent: string | number
  opponent_rating?: number
  color: 'W' | 'B' | 'white' | 'black' | 'White' | 'Black' | string
  result: number | string | 'win' | 'loss' | 'draw' | 'Win' | 'Loss' | 'Draw' | 'WIN' | 'LOSS' | 'DRAW'
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
    const rank = typeof rankNumber === 'string' ? parseInt(rankNumber, 10) : rankNumber;
    if (isNaN(rank) || rank <= 0) return null;

    return players.find(p => p.rank === rank);
  }

  // Helper function to get all TB keys dynamically
  const getAllTBKeys = () => {
    const tbKeys = new Set<string>();
    players.forEach(player => {
      if (player.tie_breaks && typeof player.tie_breaks === 'object') {
        Object.keys(player.tie_breaks).forEach(key => {
          if (key.startsWith('TB')) {
            tbKeys.add(key);
          }
        });
      }
    });
    return Array.from(tbKeys).sort(); // Sort TB1, TB2, TB3, etc.
  }

  const tbKeys = getAllTBKeys();

  // Filter out players with rank 0 or invalid ranks
  const validPlayers = players.filter(player => player.rank > 0);

  // Helper function to parse color with better type handling
  const parseColor = (color: string | any) => {
    if (!color) return { display: 'black', class: 'bg-black text-white' };

    const colorStr = String(color).toLowerCase();

    if (colorStr === 'w' || colorStr === 'white') {
      return { display: 'white', class: 'bg-white text-black border border-gray-400' };
    } else if (colorStr === 'b' || colorStr === 'black') {
      return { display: 'black', class: 'bg-black text-white' };
    }

    // Default to black if unclear
    return { display: 'black', class: 'bg-black text-white' };
  };

  // Helper function to parse result with better type handling
  const parseResult = (result: any) => {
    if (result === null || result === undefined) {
      return { display: '½', symbol: '=', class: 'bg-yellow-100 text-yellow-800' };
    }

    const resultStr = String(result).toLowerCase();

    // Handle string results
    if (resultStr === 'win' || resultStr === '1' || result === 1) {
      return { display: '1', symbol: '+', class: 'bg-green-100 text-green-800' };
    } else if (resultStr === 'loss' || resultStr === '0' || result === 0) {
      return { display: '0', symbol: '-', class: 'bg-red-100 text-red-800' };
    } else if (resultStr === 'draw' || resultStr === '0.5' || result === 0.5 || resultStr === '½') {
      return { display: '½', symbol: '=', class: 'bg-yellow-100 text-yellow-800' };
    }

    // Default to draw if unclear
    return { display: '½', symbol: '=', class: 'bg-yellow-100 text-yellow-800' };
  };

  return (
    <div className="w-full space-y-6">
      {/* Players Table */}
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Rank</th>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Fed</th>
              <th className="px-4 py-3 text-left font-semibold">Rating</th>
              <th className="px-4 py-3 text-left font-semibold">Pts</th>
              {tbKeys.map(tbKey => (
                <th key={tbKey} className="px-2 py-3 text-left font-semibold text-xs bg-blue-50 dark:bg-blue-900">{tbKey}</th>
              ))}
              <th className="px-4 py-3 text-left font-semibold bg-green-100 dark:bg-green-900">Perf</th>
            </tr>
          </thead>
          <tbody>
            {validPlayers.map((player, idx) => (
              <React.Fragment key={player.id}>
                <tr
                  className="cursor-pointer transition-colors hover:bg-muted/50 even:bg-muted/30"
                  onClick={() => handlePlayerClick(player)}
                >
                  <td className="px-4 py-2 border-b">{player.rank}</td>
                  <td className="px-4 py-2 border-b font-medium">
                    <div className="flex items-center">
                      <span className="mr-2">{player.name}</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          selectedPlayer?.id === player.id ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </td>
                  <td className="px-4 py-2 border-b">{player.federation}</td>
                  <td className="px-4 py-2 border-b">{player.rating}</td>
                  <td className="px-4 py-2 border-b font-bold">{player.points}</td>
                  {tbKeys.map(tbKey => (
                    <td key={tbKey} className="px-2 py-2 border-b text-xs bg-blue-50/50 dark:bg-blue-900/50">
                      {player.tie_breaks?.[tbKey] || '-'}
                    </td>
                  ))}
                  <td className="px-4 py-2 border-b bg-green-100 dark:bg-green-900">
                    -
                  </td>
                </tr>

                {selectedPlayer?.id === player.id && (
                  <tr>
                    <td colSpan={6 + tbKeys.length} className="p-0 bg-gray-50 dark:bg-gray-900">
                      <div className="p-4">
                        <div className="mb-3 font-semibold">Round Details for {player.name}</div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-200 dark:bg-gray-700">
                                <th className="px-3 py-2 border border-gray-300 text-center font-semibold min-w-[60px]">Round</th>
                                <th className="px-3 py-2 border border-gray-300 text-center font-semibold min-w-[200px]">Opponent</th>
                                <th className="px-3 py-2 border border-gray-300 text-center font-semibold min-w-[80px]">Rating</th>
                                <th className="px-3 py-2 border border-gray-300 text-center font-semibold min-w-[70px]">Color</th>
                                <th className="px-3 py-2 border border-gray-300 text-center font-semibold min-w-[70px]">Result</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.isArray(player.rounds) && player.rounds.map((round, index) => {
                                const opponent = findOpponentByRank(round.opponent);
                                const opponentRating = opponent?.rating || round.opponent_rating || '-';
                                const opponentName = opponent?.name || `Player ${round.opponent}`;

                                const colorInfo = parseColor(round.color);
                                const resultInfo = parseResult(round.result);

                                return (
                                  <tr key={index} className="even:bg-gray-50 dark:even:bg-gray-800">
                                    <td className="px-3 py-1 border border-gray-300 text-center">{index + 1}</td>
                                    <td className="px-3 py-1 border border-gray-300 font-medium text-center">{opponentName}</td>
                                    <td className="px-3 py-1 border border-gray-300 text-center">{opponentRating}</td>
                                    <td className="px-3 py-1 border border-gray-300 text-center">
                                      <span className={`px-2 py-1 rounded text-xs font-semibold ${colorInfo.class}`}>
                                        {colorInfo.display}
                                      </span>
                                    </td>
                                    <td className="px-3 py-1 border border-gray-300 font-bold text-center">
                                      <span className={`px-2 py-1 rounded ${resultInfo.class}`}>
                                        {resultInfo.display}
                                      </span>
                                    </td>
                                  </tr>
                                );
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
        <div className="text-center py-8 text-gray-500">
          No valid players found (players must have rank &gt; 0)
        </div>
      )}
    </div>
  )
}
