export type LocalActivePlayer = {
  id: string;
  lim_id: string;
  unique_no: string;
  surname: string;
  firstname: string;
  normalized_name: string;
  bdate: string | null;
  sex: string | null;
  federation: string | null;
  cf_rating: number | null;
  title: string | null;
  is_reconciled: boolean;
  performance_stats: any | null; // JSONB type
  performance_stats_resolved: boolean;
  confidence_score: number | null;
  match_type: string | null;
  source_records: string[] | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  avg_performance_rating: number | null;
  performance_count: number | null;
};

export type Tournament = {
  id: string;
  tournament_name: string;
  organizer: string | null;
  federation: string | null;
  tournament_director: string | null;
  chief_arbiter: string | null;
  deputy_chief_arbiter: string | null;
  arbiter: string | null;
  time_control: string | null;
  rate_of_play: string | null;
  location: string | null;
  rounds: number | null;
  tournament_type: string | null;
  rating_calculation: string | null;
  date: string | null;
  average_elo: number | null;
  average_age: number | null;
  source: string | null;
  created_at: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  memberSince: string;
  bio: string;
  currentRating: number;
  performanceStats: {
    avgRating: number;
    highestRating: number;
    gamesPlayed: number;
    winRate: number;
    losses: number;
    draws: number;
  };
  tournaments: Tournament[];
  recentActivity: {
    id: number;
    type: 'tournament' | 'online_game' | 'lesson';
    title: string;
    date: string;
  }[];
};

// =====================================================
// Team Tournament Types
// =====================================================

export type TeamTournament = {
  id: string;
  tournament_name: string;
  organizer: string | null;
  chief_arbiter: string | null;
  deputy_chief_arbiter: string | null;
  tournament_director: string | null;
  arbiter: string | null;
  location: string | null;
  date: string | null;
  rounds: number;
  tournament_type: string;
  source: string | null;
  created_at: string;
  updated_at: string;
};

export type Team = {
  id: string;
  team_tournament_id: string;
  team_name: string;
  rank: number | null;
  match_points: number;
  game_points: number;
  tie_breaks: Record<string, number | null>; // JSONB
  created_at: string;
  updated_at: string;
};

export type TeamPlayer = {
  id: string;
  team_id: string;
  player_name: string;
  rating: number | null;
  title: string | null;
  board_number: number | null;
  games_played: number;
  points: number;
  performance_rating: number | null;
  created_at: string;
  updated_at: string;
};

export type TeamRound = {
  id: string;
  team_tournament_id: string;
  round_number: number;
  round_date: string | null;
  source_file: string | null;
  created_at: string;
};

export type TeamPairing = {
  id: string;
  team_round_id: string;
  pairing_number: string;
  team_white_id: string;
  team_black_id: string;
  team_white_score: number;
  team_black_score: number;
  is_forfeit: boolean;
  created_at: string;
};

export type BoardPairing = {
  id: string;
  team_pairing_id: string;
  board_number: number;
  white_player_id: string | null;
  black_player_id: string | null;
  white_rating: number | null;
  black_rating: number | null;
  result: string;
  white_score: number;
  black_score: number;
  white_result: string;
  black_result: string;
  created_at: string;
};
