'use server'

import { createClient } from '@/utils/supabase/server'
import { LocalActivePlayer, Tournament, UserProfile } from '@/types/database'

interface DashboardData {
  userProfile: UserProfile;
  recentTournaments: Tournament[];
  recentActivity: UserProfile['recentActivity'];
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = await createClient()

  // For now, fetching a random player to act as the user's profile
  // In a real scenario, this would be based on the authenticated user ID
  const { data: randomPlayers, error: playerError } = await supabase
    .from('local_active_players_duplicate')
    .select('*')
    .limit(1)

  if (playerError) {
    console.error('Error fetching random player:', playerError)
    throw new Error('Failed to fetch player data')
  }

  const player = randomPlayers?.[0] || {} as LocalActivePlayer

  // Fetch random tournaments
  const { data: tournaments, error: tournamentsError } = await supabase
    .from('tournaments') // Assuming a 'tournaments' table exists
    .select('id, tournament_name, date, organizer, location, rounds, tournament_type') // Adjust columns based on actual table
    .order('date', { ascending: false })
    .limit(5)

  if (tournamentsError) {
    console.error('Error fetching tournaments:', tournamentsError)
    throw new Error('Failed to fetch tournaments data')
  }

  const userProfile: UserProfile = {
    id: player.id || 'mock-user-id',
    name: `${player.firstname || 'Mock'} ${player.surname || 'User'}`,
    email: `mock.user${Math.floor(Math.random() * 1000)}@example.com`,
    memberSince: player.created_at ? new Date(player.created_at).toISOString().split('T')[0] : '2023-01-01',
    bio: 'Passionate chess player with a knack for endgames. Always looking for new challenges and ways to improve.',
    currentRating: player.cf_rating || 1500,
    performanceStats: {
      avgRating: player.avg_performance_rating || 1550,
      highestRating: player.cf_rating ? player.cf_rating + 100 : 1600,
      gamesPlayed: player.performance_count || 80,
      winRate: 0.5 + Math.random() * 0.2, // Random win rate
      losses: Math.floor(player.performance_count ? player.performance_count * 0.3 : 20),
      draws: Math.floor(player.performance_count ? player.performance_count * 0.1 : 10),
    },
    tournaments: (tournaments || []).map(t => ({
      id: t.id,
      name: t.tournament_name || 'Unnamed Tournament',
      date: t.date ? new Date(t.date).toISOString().split('T')[0] : 'N/A',
      placement: 'N/A', // No longer in schema
      score: 'N/A',     // No longer in schema
    })),
    recentActivity: Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      type: 'tournament',
      title: `Participated in ${tournaments?.[i]?.tournament_name || 'A Tournament'}`,
      date: tournaments?.[i]?.date ? new Date(tournaments[i].date!).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    })),
  };

  return {
    userProfile,
    recentTournaments: (tournaments || []).map(t => ({
      id: t.id,
      name: t.tournament_name || 'Unnamed Tournament',
      date: t.date ? new Date(t.date).toISOString().split('T')[0] : 'N/A',
      placement: 'N/A', // No longer in schema
      score: 'N/A',     // No longer in schema
    })),
    recentActivity: userProfile.recentActivity,
  };
}
