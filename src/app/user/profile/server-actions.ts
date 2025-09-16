import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { signOut } from "./actions"
import { LocalActivePlayer, Tournament, UserProfile } from '@/types/database'


export interface ProfilePageData {
  user: any;
  profileData: UserProfile;
  registrations: Tournament[];
  registrationsError: any;
  users: LocalActivePlayer[];
  usersError: string | null;
  serviceKey: string | undefined;
  signOutAction: () => Promise<void>;
}

export async function fetchProfilePageData(supabaseUser: any): Promise<ProfilePageData> {
  const supabase = await createClient()
  const user = supabaseUser

  // For now, fetching a random player to act as the user's profile
  const { data: randomPlayers, error: playerError } = await supabase
    .from('local_active_players_duplicate')
    .select('*')
    .limit(1)

  if (playerError) {
    console.error('Error fetching random player:', playerError)
    throw new Error('Failed to fetch player data')
  }

  const player = randomPlayers?.[0] || {} as LocalActivePlayer

  // Fetch random tournaments for registrations
  const { data: registrations, error: registrationsError } = await supabase
    .from('tournaments') // Assuming a 'tournaments' table exists
    .select('id, tournament_name, date, organizer, location, rounds, tournament_type')
    .order('date', { ascending: false })
    .limit(5)

  if (registrationsError) {
    console.error('Error fetching registrations:', registrationsError)
    throw new Error('Failed to fetch registrations data')
  }

  // Fetch random users (players) for admin view
  let users: LocalActivePlayer[] = []
  let usersError: string | null = null
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (serviceKey) {
    const { data: randomUsers, error: randomUsersError } = await supabase
      .from('local_active_players_duplicate')
      .select('id, firstname, surname, cf_rating, created_at, email') // Assuming email for user listing
      .limit(50)

    if (randomUsersError) {
      console.error('Error fetching random users:', randomUsersError)
      usersError = randomUsersError.message
    } else {
      users = randomUsers as LocalActivePlayer[]
    }
  }

  const userProfile: UserProfile = {
    id: player.id || 'mock-user-id',
    name: `${player.firstname || 'Mock'} ${player.surname || 'User'}`,
    email: user.email || `mock.user${Math.floor(Math.random() * 1000)}@example.com`,
    memberSince: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : '2023-01-01',
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
    tournaments: (registrations || []).map(t => ({
      id: t.id,
      name: t.tournament_name || 'Unnamed Tournament',
      date: t.date ? new Date(t.date).toISOString().split('T')[0] : 'N/A',
      placement: 'N/A', // No longer in schema
      score: 'N/A',     // No longer in schema
    })),
    recentActivity: Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      type: 'tournament',
      title: `Participated in ${registrations?.[i]?.tournament_name || 'A Tournament'}`,
      date: registrations?.[i]?.date ? new Date(registrations[i].date!).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    })),
  };

  return {
    user,
    profileData: userProfile,
    registrations: (registrations || []).map(t => ({ // Map registrations for display
      id: t.id,
      name: t.tournament_name || 'Unnamed Tournament',
      date: t.date ? new Date(t.date).toISOString().split('T')[0] : 'N/A',
      placement: 'N/A', // Placeholder as not in schema
      score: 'N/A',     // Placeholder as not in schema
    })),
    registrationsError: registrationsError,
    users: users,
    usersError: usersError,
    serviceKey: serviceKey,
    signOutAction: signOut,
  };
}
