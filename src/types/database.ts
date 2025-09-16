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
