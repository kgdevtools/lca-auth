"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { User } from "@supabase/supabase-js";
import {
  getActivePlayerData,
  getPlayerStatistics,
  findPlayerMatches,
  ActivePlayerData,
  MatchResult,
} from "./tournament-actions";
import {
  requestLichessReconnect,
  getLichessConnectionByUserId,
} from "@/repositories/lichessConnectionRepo";
import { getLichessAccount } from "@/services/lichess.service";
import type { LichessConnectionPublic, LichessUser } from "@/types/lichess";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  tournament_fullname: string | null;
  chessa_id: string | null;
  role: string;
  created_at?: string;
}

export interface ProfilePageData {
  user: User;
  profile: Profile | null;
  profileError: string | null;
  activePlayerData: ActivePlayerData[];
  playerStats: Awaited<ReturnType<typeof getPlayerStatistics>>;
  matchResult: MatchResult;
  signOutAction: () => Promise<void>;
  lichessConnection: LichessConnectionPublic | null;
  lichessAccount: LichessUser | null;
}

export async function signOut() {
  const server = await createClient();
  await server.auth.signOut();
  redirect("/login");
}

export async function fetchProfilePageData(
  user: User,
): Promise<ProfilePageData> {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, tournament_fullname, chessa_id, role, created_at",
    )
    .eq("id", user.id)
    .single();

  // Fetch active player data if tournament_fullname exists
  let activePlayerData: ActivePlayerData[] = [];
  let playerStats = null;
  let matchResult: MatchResult = { exactMatch: null, closeMatches: [] };

  if (profile?.tournament_fullname) {
    activePlayerData = await getActivePlayerData(profile.tournament_fullname);
    playerStats = await getPlayerStatistics(profile.tournament_fullname);
    matchResult = await findPlayerMatches(profile.tournament_fullname);
  }

  // Fetch Lichess connection (full record needed to get the access_token for API calls)
  let lichessConnection: LichessConnectionPublic | null = null;
  let lichessAccount: LichessUser | null = null;

  try {
    const fullConnection = await getLichessConnectionByUserId(user.id);

    if (fullConnection) {
      // Strip the access_token before passing to the client
      const { access_token, ...publicFields } = fullConnection;
      lichessConnection = publicFields as LichessConnectionPublic;

      // Only fetch live account data if the connection is active
      if (fullConnection.is_active && fullConnection.status === "active") {
        lichessAccount = await getLichessAccount(access_token).catch((err) => {
          console.error(
            "[fetchProfilePageData] Failed to fetch Lichess account:",
            err,
          );
          return null;
        });
      }
    }
  } catch (err) {
    // Connection fetch failed — continue without it rather than breaking the page
    console.error(
      "[fetchProfilePageData] Lichess connection lookup failed:",
      err,
    );
  }

  return {
    user,
    profile: profile as Profile | null,
    profileError: profileError?.message ?? null,
    activePlayerData,
    playerStats,
    matchResult,
    signOutAction: signOut,
    lichessConnection,
    lichessAccount,
  };
}

// Check if user needs onboarding (missing required fields)
export async function needsOnboarding(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, tournament_fullname")
    .eq("id", user.id)
    .single();

  // Need onboarding if missing full_name or tournament_fullname
  return !profile?.full_name || !profile?.tournament_fullname;
}

// Check if tournament full name is already taken by another user
async function checkTournamentFullNameExists(
  tournamentFullName: string,
  excludeUserId?: string,
): Promise<boolean> {
  try {
    if (!tournamentFullName || !tournamentFullName.trim()) {
      return false;
    }

    const supabase = await createClient();
    let query = supabase
      .from("profiles")
      .select("id")
      .eq("tournament_fullname", tournamentFullName.trim())
      .limit(1);

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data, error } = await query;

    if (error) {
      // If there's a database error, don't block the user - return false
      return false;
    }

    return data !== null && data.length > 0;
  } catch (error) {
    // On any error, don't block the user
    return false;
  }
}

// Server action to complete onboarding
export async function completeOnboarding(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const displayName = (formData.get("display_name") as string)?.trim() || null;
  const tournamentFullName =
    (formData.get("tournament_fullname") as string)?.trim() || null;
  const chessaId = (formData.get("chessa_id") as string)?.trim() || null;

  if (!displayName || !tournamentFullName) {
    return {
      success: false,
      error: "Display Name and Tournament Full Name are required",
    };
  }

  // Validate input lengths
  if (displayName.length > 100) {
    return {
      success: false,
      error: "Display name must be 100 characters or less",
    };
  }

  if (tournamentFullName.length > 200) {
    return {
      success: false,
      error: "Tournament full name must be 200 characters or less",
    };
  }

  if (chessaId && chessaId.length > 50) {
    return {
      success: false,
      error: "Chess SA ID must be 50 characters or less",
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    redirect("/login");
  }

  // Check if tournament full name is already taken
  try {
    const isTaken = await checkTournamentFullNameExists(
      tournamentFullName,
      user.id,
    );
    if (isTaken) {
      return {
        success: false,
        error:
          "This tournament name is already registered to another account. Please use a different name or contact support if this is your name.",
      };
    }
  } catch (error) {
    // If check fails, continue anyway - better to allow than block
  }

  // Update user metadata with display name
  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      display_name: displayName,
      full_name: displayName,
    },
  });

  if (metadataError) {
    return {
      success: false,
      error: "Failed to update user information. Please try again.",
    };
  }

  // Update profile with all onboarding data
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: displayName,
      tournament_fullname: tournamentFullName,
      chessa_id: chessaId || null,
    })
    .eq("id", user.id);

  if (profileError) {
    return {
      success: false,
      error: "Failed to save profile information. Please try again.",
    };
  }

  return { success: true };
}

// Server action to disconnect a Lichess account.
// Sets status to 'pending_reconnect' — an admin must delete the row
// to allow the student to connect again.
export async function disconnectLichess(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    await requestLichessReconnect(user.id);
    return { success: true };
  } catch (error) {
    console.error("[actions] disconnectLichess error:", error);
    return { success: false, error: "Failed to disconnect. Please try again." };
  }
}

// Server action to update editable profile fields from the user page
export async function updateProfile(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const tournamentFullName =
    (formData.get("tournament_fullname") as string)?.trim() || null;
  const chessaId = (formData.get("chessa_id") as string)?.trim() || null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    redirect("/login");
  }

  // Validate input lengths
  if (tournamentFullName && tournamentFullName.length > 200) {
    return {
      success: false,
      error: "Tournament full name must be 200 characters or less",
    };
  }

  if (chessaId && chessaId.length > 50) {
    return {
      success: false,
      error: "Chess SA ID must be 50 characters or less",
    };
  }

  // Check if tournament full name is already taken (only if it's being changed)
  if (tournamentFullName) {
    try {
      const isTaken = await checkTournamentFullNameExists(
        tournamentFullName,
        user.id,
      );
      if (isTaken) {
        return {
          success: false,
          error:
            "This tournament name is already registered to another account. Please use a different name or contact support if this is your name.",
        };
      }
    } catch (error) {
      // If check fails, continue anyway - better to allow than block
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      tournament_fullname: tournamentFullName || null,
      chessa_id: chessaId || null,
    })
    .eq("id", user.id);

  if (error) {
    return {
      success: false,
      error: "Failed to update profile. Please try again.",
    };
  }

  // Return success - let client handle the UI update
  return { success: true };
}

export type UserGame = {
  id: string
  title: string | null
  pgn: string
  created_at: string | null
  white: string
  black: string
  result: string
  tournament: string
  table_name: string
}

function buildNameFilter(playerName: string): string {
  // Build SQL filter for PGN text containing player name tokens
  const tokens = playerName.trim().split(/\s+/).filter(t => t.length > 1)
  if (tokens.length === 0) return ''
  
  // Create ILIKE filters for each token
  const filters = tokens.map(token => 
    `pgn.ilike.%${token}%`
  ).join(',')

  return filters
}

export async function getUserGames(
  playerName: string,
  limit: number = 10
): Promise<UserGame[]> {
  if (!playerName) return []

  const supabase = await createClient()
  const { enhancedFuzzyScore } = await import('@/services/pgnService')

  // Get tournaments meta - only get recent ones first
  const { data: tournamentsMeta } = await supabase
    .from('tournaments_meta')
    .select('id, name, alias')
    .order('name', { ascending: false })
    .limit(20)

  if (!tournamentsMeta || tournamentsMeta.length === 0) return []

  const tableNameRegex = /^[a-z0-9_]+$/
  const allGames: UserGame[] = []
  const nameFilter = buildNameFilter(playerName)

  for (const t of tournamentsMeta) {
    if (!t.name || !tableNameRegex.test(t.name)) continue
    if (allGames.length >= limit * 2) break

    try {
      // Use SQL filter to pre-filter rows containing player name
      let query = supabase
        .from(t.name)
        .select('id, title, pgn, created_at')
        .order('created_at', { ascending: false })

      // Apply name filter if we have tokens
      if (nameFilter) {
        query = query.or(nameFilter, { referencedTable: 'undefined' })
      }

      const { data: rows, error } = await query.limit(50) // Reduced limit since we're filtering

      if (error || !rows || rows.length === 0) continue

      for (const r of rows) {
        let white = '', black = '', result = ''
        
        if (typeof r.pgn === 'string') {
          const whiteMatch = r.pgn.match(/\[White\s+"([^"]+)"\]/)
          const blackMatch = r.pgn.match(/\[Black\s+"([^"]+)"\]/)
          const resultMatch = r.pgn.match(/\[Result\s+"([^"]+)"\]/)
          white = whiteMatch?.[1] || ''
          black = blackMatch?.[1] || ''
          result = resultMatch?.[1] || ''
        }

        // Precise fuzzy match
        const scoreW = enhancedFuzzyScore(white, playerName)
        const scoreB = enhancedFuzzyScore(black, playerName)
        const best = Math.max(scoreW, scoreB)

        if (best >= 0.6) {
          allGames.push({
            id: String(r.id),
            title: r.title || null,
            pgn: r.pgn,
            created_at: r.created_at || null,
            white,
            black,
            result,
            tournament: t.alias || t.name.replace(/_games$/, '').replace(/_/g, ' '),
            table_name: t.name,
          })
        }
      }
    } catch (e) {
      continue
    }
  }

  return allGames
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    })
    .slice(0, limit)
}

export async function getTotalGamesCount(playerName: string): Promise<number> {
  if (!playerName) return 0

  const supabase = await createClient()
  const { enhancedFuzzyScore } = await import('@/services/pgnService')

  // Only check recent tournaments for performance
  const { data: tournamentsMeta } = await supabase
    .from('tournaments_meta')
    .select('name')
    .order('name', { ascending: false })
    .limit(30)

  if (!tournamentsMeta) return 0

  let totalGames = 0
  const tableNameRegex = /^[a-z0-9_]+$/
  const nameFilter = buildNameFilter(playerName)

  for (const t of tournamentsMeta) {
    if (!t.name || !tableNameRegex.test(t.name)) continue

    try {
      let query = supabase
        .from(t.name)
        .select('pgn')

      // Apply SQL filter for faster pre-filtering
      if (nameFilter) {
        query = query.or(nameFilter, { referencedTable: 'undefined' })
      }

      const { data: rows } = await query.limit(100)

      if (!rows || rows.length === 0) continue

      for (const r of rows) {
        let white = '', black = ''
        if (typeof r.pgn === 'string') {
          const whiteMatch = r.pgn.match(/\[White\s+"([^"]+)"\]/)
          const blackMatch = r.pgn.match(/\[Black\s+"([^"]+)"\]/)
          white = whiteMatch?.[1] || ''
          black = blackMatch?.[1] || ''
        }
        const best = Math.max(enhancedFuzzyScore(white, playerName), enhancedFuzzyScore(black, playerName))
        if (best >= 0.6) totalGames++
      }
    } catch {
      continue
    }
  }

  return totalGames
}

export type PlayerProfile = {
  unique_no: string | null
  name: string | null
  rating: string | null
  fed: string | null
  title: string | null
  bdate: string | null
  sex: string | null
}

export type PlayerMatch = {
  name: string
  unique_no: string | null
  rating: string | null
  fed: string | null
  title: string | null
  score: number
}

export async function getPlayerProfile(playerName: string): Promise<PlayerProfile | null> {
  if (!playerName) return null

  const supabase = await createClient()
  const { enhancedFuzzyScore } = await import('@/services/pgnService')

  const tokens = playerName.trim().split(/\s+/).filter(t => t.length > 1)
  
  let query = supabase
    .from('active_players_august_2025_profiles')
    .select('UNIQUE_NO, name, RATING, FED, TITLE, BDATE, SEX')

  if (tokens.length > 0) {
    const nameFilter = tokens.map(token => 
      `name.ilike.%${token}%`
    ).join(',')
    query = query.or(nameFilter, { referencedTable: 'undefined' })
  }

  const { data: rows } = await query.limit(20)

  if (!rows || rows.length === 0) return null

  let bestMatch: typeof rows[0] | null = null
  let bestScore = 0

  for (const row of rows) {
    const score = enhancedFuzzyScore(row.name || '', playerName)
    if (score > bestScore && score >= 0.8) {
      bestScore = score
      bestMatch = row
    }
  }

  if (!bestMatch) return null

  return {
    unique_no: bestMatch.UNIQUE_NO,
    name: bestMatch.name,
    rating: bestMatch.RATING,
    fed: bestMatch.FED,
    title: bestMatch.TITLE,
    bdate: bestMatch.BDATE,
    sex: bestMatch.SEX,
  }
}

export async function findClosePlayerMatches(playerName: string): Promise<PlayerMatch[]> {
  if (!playerName) return []

  const supabase = await createClient()
  const { enhancedFuzzyScore, normalizeName } = await import('@/services/pgnService')

  const tokens = playerName.trim().split(/\s+/).filter(t => t.length > 1)
  
  let query = supabase
    .from('active_players_august_2025_profiles')
    .select('UNIQUE_NO, name, RATING, FED, TITLE')

  if (tokens.length > 0) {
    const nameFilter = tokens.map(token => 
      `name.ilike.%${token}%`
    ).join(',')
    query = query.or(nameFilter, { referencedTable: 'undefined' })
  }

  const { data: rows } = await query.limit(50)

  if (!rows) return []

  const matches: PlayerMatch[] = []
  const seenNames = new Set<string>()

  for (const row of rows) {
    const name = row.name || ''
    const normalizedName = normalizeName(name)
    
    // Skip if we've already seen this normalized name
    if (seenNames.has(normalizedName)) continue
    seenNames.add(normalizedName)

    const score = enhancedFuzzyScore(name, playerName)
    
    // Include matches with score >= 0.5 (close matches)
    if (score >= 0.5) {
      matches.push({
        name,
        unique_no: row.UNIQUE_NO,
        rating: row.RATING,
        fed: row.FED,
        title: row.TITLE,
        score,
      })
    }
  }

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score).slice(0, 5)
}

export type AcademyProgress = {
  total: number
  completed: number
  inProgress: number
  totalTimeMinutes: number
  averageQuizScore: number
}

export async function getAcademyProgress(): Promise<AcademyProgress> {
  const supabase = await createClient()
  const { profile } = await import('@/utils/auth/academyAuth').then(m => m.getCurrentUserWithProfile())

  const { data: allProgress, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('student_id', profile.id)

  if (error || !allProgress) {
    return { total: 0, completed: 0, inProgress: 0, totalTimeMinutes: 0, averageQuizScore: 0 }
  }

  const completed = allProgress.filter(p => p.status === 'completed').length
  const inProgress = allProgress.filter(p => p.status === 'in_progress').length
  const totalTime = allProgress.reduce((sum, p) => sum + (p.time_spent_seconds || 0), 0)
  const scoredProgress = allProgress.filter(p => p.quiz_score !== null)
  const averageScore = scoredProgress.length > 0
    ? scoredProgress.reduce((sum, p) => sum + (p.quiz_score || 0), 0) / scoredProgress.length
    : 0

  return {
    total: allProgress.length,
    completed,
    inProgress,
    totalTimeMinutes: Math.round(totalTime / 60),
    averageQuizScore: Math.round(averageScore),
  }
}
