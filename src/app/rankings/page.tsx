"use client";

import * as React from "react";
import {
  getRankings,
  getTournamentOptions,
  type PlayerRanking,
  type RankingFilters,
} from "./server-actions";
import { RankingsTable } from "./components/RankingsTable";
import { PerformanceDetailsModal } from "./components/PerformanceDetailsModal";
import { SearchFilters } from "./components/SearchFilters";

export default function RankingsPage() {
  // allow null for avg_performance_rating without error
  const [data, setData] = React.useState<Array<PlayerRanking>>([]);
  const [selected, setSelected] = React.useState<PlayerRanking | null>(null);
  const [open, setOpen] = React.useState(false);
  const [tournaments, setTournaments] = React.useState<{ id: string; name: string }[]>([]);

  React.useEffect(() => {
    getRankings({})
      .then((rows) => setData(rows))
      .catch((err) => console.error("Error fetching rankings", err));

    getTournamentOptions()
      .then((opts) => setTournaments(opts))
      .catch((err) => console.error("Error fetching tournaments", err));
  }, []);

  const handleSearch = (filters: RankingFilters) => {
    getRankings(filters)
      .then((rows) => setData(rows))
      .catch((err) => console.error("Error fetching rankings", err));
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Player Rankings</h1>

      <SearchFilters onSearch={handleSearch} tournamentOptions={tournaments} />

      <RankingsTable
        data={data}
        onSelectPlayer={(p) => {
          setSelected(p);
          setOpen(true);
        }}
      />

      <PerformanceDetailsModal
        player={selected}
        open={open}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}