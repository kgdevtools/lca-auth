"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlayerRanking } from "../server-actions";

interface RankingsTableProps {
  data: PlayerRanking[];
  onSelectPlayer: (player: PlayerRanking) => void;
}

export function RankingsTable({ data, onSelectPlayer }: RankingsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px] text-center">Rank</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="text-center">Player Rating</TableHead>
            <TableHead className="text-center">Avg Performance</TableHead>
            <TableHead className="text-center">Events</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((player, idx) => {
            const latestTournament = player.tournaments[0];
            return (
              <TableRow
                key={player.name_key}
                className="cursor-pointer hover:bg-gray-50"
              >
                <TableCell className="text-sm font-medium text-center">
                  {idx + 1}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => onSelectPlayer(player)}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    {player.display_name}
                  </button>
                </TableCell>
                <TableCell className="text-sm text-center">
                  {latestTournament?.player_rating ?? "-"}
                </TableCell>
                <TableCell className="text-sm font-semibold text-center">
                  {player.avg_performance_rating ?? "-"}
                </TableCell>
                <TableCell className="text-sm text-center">
                  {player.tournaments.length}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}