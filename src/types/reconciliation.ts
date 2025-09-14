// src/types/reconciliation.ts
export interface UnreconciledPlayer {
  id: string;
  name: string;
  tournament_name: string;
  tournament_date: string;
  player_rating: number | null;
  tie_breaks: any;
  performance_rating: number | null;
  confidence: string;
  status: 'no_performance' | 'weak_match' | 'new_player';
  source: 'players' | 'master_players_duplicate';
  federation?: string;
  title?: string;
  created_at?: string;
  weak_match_value?: string;
  possible_alias?: string;
}

export interface PlayerMatch {
  id: string;
  name: string;
  rating: number | null;
  federation: string | null;
  similarity_score: number;
  source: string;
}

export interface ReconciliationStats {
  total_unreconciled: number;
  no_performance_count: number;
  weak_match_count: number;
  new_player_count: number;
  recent_activity: number;
}

export interface ReconciliationAction {
  playerId: string;
  actionType: 'confirm_performance' | 'calculate_performance' | 'resolve_match' | 'add_player';
  data: any;
}
