"use server";

import { createClient } from "@/utils/supabase/server";

export interface TournamentEntry {
  raw_name: string;
  tournament_id: string;
  tournament_name: string;
  player_rating: number;
  performance_rating: number | null;
  confidence: string | null;
  tie_breaks: Record<string, number | string>;
  classifications: Record<string, string>;
  created_at: string;
}

export interface PlayerRanking {
  name_key: string;
  display_name: string;
  avg_performance_rating: number | null;
  tournaments: TournamentEntry[];
}

export interface RankingFilters {
  name?: string;
  confidence?: string;
  tournament?: string;
}

export async function getRankings(filters: RankingFilters = {}): Promise<PlayerRanking[]> {
  const supabase = await createClient();

  const { name = "", confidence = "ALL", tournament = "ALL" } = filters;

  const { data, error } = await supabase.rpc("get_player_rankings", {
    search: name && name.length > 0 ? name : null,
    confidence: confidence !== "ALL" ? confidence : null,
    tournament_id: tournament !== "ALL" ? tournament : null,
  });

  if (error) {
    console.error("Error fetching rankings:", error);
    return [];
  }

  // Sort client-side as a safety net (in addition to SQL ordering)
  const rows = (data as any[]).map((row) => ({
    ...row,
    avg_performance_rating: row.avg_performance_rating
      ? parseFloat(row.avg_performance_rating)
      : null,
    tournaments: (row.tournaments ?? []) as TournamentEntry[],
  }));

  return rows.sort(
    (a, b) =>
      (b.avg_performance_rating ?? 0) - (a.avg_performance_rating ?? 0)
  );
}

export async function getTournamentOptions(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("tournaments").select("id, tournament_name");

  if (error) {
    console.error("Error fetching tournaments:", error);
    return [];
  }

  return (data ?? []).map((t: any) => ({
    id: t.id,
    name: t.tournament_name,
  }));
}