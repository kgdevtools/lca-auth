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

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  tournament_fullname: string | null;
  tournament_fullname_pending: string | null;
  chessa_id: string | null;
  role: string;
  created_at?: string;
  onboarding_completed: boolean;
}

export interface ProfilePageData {
  user: User;
  profile: Profile | null;
  profileError: string | null;
  activePlayerData: ActivePlayerData[];
  playerStats: Awaited<ReturnType<typeof getPlayerStatistics>>;
  matchResult: MatchResult;
  signOutAction: () => Promise<void>;
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
      "id, full_name, avatar_url, tournament_fullname, tournament_fullname_pending, chessa_id, role, created_at, onboarding_completed",
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

  return {
    user,
    profile: profile as Profile | null,
    profileError: profileError?.message ?? null,
    activePlayerData,
    playerStats,
    matchResult,
    signOutAction: signOut,
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
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  return !profile?.onboarding_completed;
}

// Check if a name is available — exact fullname match OR alias match, excluding own profile
export async function checkNameAvailability(
  name: string,
  excludeProfileId?: string,
): Promise<{ available: boolean }> {
  const trimmed = name.trim()
  if (!trimmed) return { available: true }

  const supabase = await createClient()

  // Case-insensitive exact match on tournament_fullname
  let fnQuery = supabase
    .from('profiles')
    .select('id')
    .ilike('tournament_fullname', trimmed)
    .limit(1)
  if (excludeProfileId) fnQuery = fnQuery.neq('id', excludeProfileId)
  const { data: fnMatch } = await fnQuery
  if (fnMatch?.length) return { available: false }

  // Array-contains check on tournament_aliases
  let aliasQuery = supabase
    .from('profiles')
    .select('id')
    .contains('tournament_aliases', [trimmed])
    .limit(1)
  if (excludeProfileId) aliasQuery = aliasQuery.neq('id', excludeProfileId)
  const { data: aliasMatch } = await aliasQuery
  if (aliasMatch?.length) return { available: false }

  return { available: true }
}

// Check if tournament full name is already taken by another user
async function checkTournamentFullNameExists(
  tournamentFullName: string,
  excludeUserId?: string,
): Promise<boolean> {
  try {
    const trimmed = tournamentFullName?.trim()
    if (!trimmed) return false

    const supabase = await createClient()

    // Extract significant tokens (strip punctuation, keep tokens >= 3 chars)
    const tokens = trimmed
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .map(t => t.toLowerCase())
      .filter(t => t.length >= 3)

    let query = supabase
      .from("profiles")
      .select("id")
      .limit(1)

    if (excludeUserId) {
      query = query.neq("id", excludeUserId)
    }

    if (tokens.length >= 1) {
      // All significant tokens must be present — catches reordering + case variants
      // e.g. "mahomole mahlodi j" matches "Mahlodi Mahomole" or "MAHOMOLE MAHLODI"
      for (const token of tokens) {
        query = query.ilike("tournament_fullname", `%${token}%`)
      }
    } else {
      // No significant tokens (all chars < 3), fall back to full case-insensitive match
      query = query.ilike("tournament_fullname", trimmed)
    }

    const { data, error } = await query

    if (error) return false
    return data !== null && data.length > 0
  } catch {
    return false
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

  if (!displayName) {
    return {
      success: false,
      error: "Display Name is required",
    };
  }

  // Validate input lengths
  if (displayName.length > 100) {
    return {
      success: false,
      error: "Display name must be 100 characters or less",
    };
  }

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

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    redirect("/login");
  }

  // Check if tournament full name is already taken
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
    } catch {
      // If check fails, continue anyway - better to allow than block
    }
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
      onboarding_completed: true,
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

// Update tournament fullname — first-time writes directly, changes go to pending approval
export async function updateTournamentFullname(
  newName: string,
  chessaId?: string | null,
): Promise<{ success: boolean; error?: string; pending: boolean }> {
  const trimmed = newName.trim()

  if (!trimmed) {
    return { success: false, error: 'Tournament name cannot be empty.', pending: false }
  }

  if (trimmed.length > 200) {
    return { success: false, error: 'Tournament name must be 200 characters or less.', pending: false }
  }

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  if (!user) {
    redirect('/login')
  }

  // Availability check — exclude own profile
  const { available } = await checkNameAvailability(trimmed, user.id)
  if (!available) {
    return { success: false, error: 'This name is already linked to another account.', pending: false }
  }

  // Fetch current profile to decide direct-write vs pending
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('tournament_fullname')
    .eq('id', user.id)
    .single()

  const alreadySet = Boolean(currentProfile?.tournament_fullname?.trim())

  const updates: Record<string, unknown> = alreadySet
    ? { tournament_fullname_pending: trimmed }
    : { tournament_fullname: trimmed, tournament_fullname_pending: null }

  if (chessaId !== undefined) updates.chessa_id = chessaId || null

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return { success: false, error: 'Failed to update profile. Please try again.', pending: false }
  }

  return { success: true, pending: alreadySet }
}

export async function addConfirmedAlias(
  aliasName: string,
): Promise<{ success: boolean; error?: string }> {
  const trimmed = aliasName.trim()
  if (!trimmed) return { success: false, error: 'Alias cannot be empty.' }

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user
  if (!user) redirect('/login')

  const { available } = await checkNameAvailability(trimmed, user.id)
  if (!available) {
    return { success: false, error: 'This name is already linked to another account.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tournament_aliases')
    .eq('id', user.id)
    .single()

  const current: string[] = profile?.tournament_aliases ?? []
  if (current.includes(trimmed)) return { success: true }

  const { error } = await supabase
    .from('profiles')
    .update({ tournament_aliases: [...current, trimmed] })
    .eq('id', user.id)

  if (error) return { success: false, error: 'Failed to save alias.' }
  return { success: true }
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

// ── Dashboard: lesson preview for overview page ────────────────────────────────

export type DashboardLesson = {
  id: string
  title: string
  difficulty: string | null
  content_type: string
  status: 'completed' | 'in_progress' | 'not_started'
  completed_at: string | null
  last_accessed_at: string | null
  assigned_at: string
}

export async function getDashboardLessons(studentId: string): Promise<{
  completed: DashboardLesson[]
  upcoming: DashboardLesson[]
}> {
  const supabase = await createClient()

  const { data: assigned, error: aErr } = await supabase
    .from('lesson_students')
    .select('assigned_at, lesson:lessons(id, title, difficulty, content_type)')
    .eq('student_id', studentId)
    .order('assigned_at', { ascending: false })

  if (aErr || !assigned) return { completed: [], upcoming: [] }

  const lessonIds = (assigned as any[]).map(r => r.lesson?.id).filter(Boolean)

  const { data: progressRows } = lessonIds.length > 0
    ? await supabase
        .from('lesson_progress')
        .select('lesson_id, status, completed_at, last_accessed_at')
        .eq('student_id', studentId)
        .in('lesson_id', lessonIds)
    : { data: [] }

  const progressMap = new Map(
    (progressRows ?? []).map(p => [p.lesson_id, p])
  )

  const rows: DashboardLesson[] = (assigned as any[])
    .filter(r => r.lesson?.id)
    .map(r => {
      const p = progressMap.get(r.lesson.id)
      return {
        id:               r.lesson.id,
        title:            r.lesson.title ?? 'Untitled',
        difficulty:       r.lesson.difficulty ?? null,
        content_type:     r.lesson.content_type ?? '',
        status:           (p?.status ?? 'not_started') as DashboardLesson['status'],
        completed_at:     p?.completed_at ?? null,
        last_accessed_at: p?.last_accessed_at ?? null,
        assigned_at:      r.assigned_at,
      }
    })

  const completed = rows
    .filter(r => r.status === 'completed')
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))
    .slice(0, 3)

  const upcoming = rows
    .filter(r => r.status === 'not_started' || r.status === 'in_progress')
    .sort((a, b) => {
      // in_progress first, then by assigned_at descending
      if (a.status === 'in_progress' && b.status !== 'in_progress') return -1
      if (b.status === 'in_progress' && a.status !== 'in_progress') return 1
      return (b.assigned_at ?? '').localeCompare(a.assigned_at ?? '')
    })
    .slice(0, 3)

  return { completed, upcoming }
}

// ── Dashboard: gamification summary ──────────────────────────────────────────

export type GamificationSummary = {
  total_points: number
  level: number
  current_streak_days: number
}

export async function getGamificationSummary(studentId: string): Promise<GamificationSummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('student_progress_summary')
    .select('total_points, level, current_streak_days')
    .eq('student_id', studentId)
    .single()

  if (error || !data) return null
  return {
    total_points:        data.total_points        ?? 0,
    level:               data.level               ?? 1,
    current_streak_days: data.current_streak_days ?? 0,
  }
}

// ── Dashboard: coach preview data ─────────────────────────────────────────────

export type CoachDashboardStudent = {
  id: string
  full_name: string | null
  last_active_at: string | null
  lessons_completed: number
  points: number
}

export type CoachDashboardLesson = {
  id: string
  title: string
  difficulty: string | null
  content_type: string
  created_at: string
}

export async function getCoachDashboardData(coachId: string): Promise<{
  students: CoachDashboardStudent[]
  createdLessons: CoachDashboardLesson[]
}> {
  const supabase = await createClient()

  const [studentsRes, lessonsRes] = await Promise.all([
    supabase
      .from('coach_students')
      .select('student_id, student:profiles(id, full_name)')
      .eq('coach_id', coachId)
      .limit(5),
    supabase
      .from('lessons')
      .select('id, title, difficulty, content_type, created_at')
      .eq('created_by', coachId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const studentIds = ((studentsRes.data ?? []) as any[])
    .map(r => r.student?.id)
    .filter(Boolean)

  let progressMap = new Map<string, { last_active_at: string | null; lessons_completed: number; points: number }>()

  if (studentIds.length > 0) {
    const [progressRes, summaryRes] = await Promise.all([
      supabase
        .from('lesson_progress')
        .select('student_id, status, last_accessed_at')
        .in('student_id', studentIds),
      supabase
        .from('student_progress_summary')
        .select('student_id, total_points')
        .in('student_id', studentIds),
    ])

    const summaryByStudent = new Map(
      ((summaryRes.data ?? []) as any[]).map(s => [s.student_id, s.total_points ?? 0])
    )
    const progressByStudent = new Map<string, any[]>()
    ;((progressRes.data ?? []) as any[]).forEach(p => {
      const list = progressByStudent.get(p.student_id) ?? []
      list.push(p)
      progressByStudent.set(p.student_id, list)
    })

    studentIds.forEach(id => {
      const rows = progressByStudent.get(id) ?? []
      const lastActive = rows
        .map(r => r.last_accessed_at)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null
      progressMap.set(id, {
        last_active_at:    lastActive,
        lessons_completed: rows.filter(r => r.status === 'completed').length,
        points:            summaryByStudent.get(id) ?? 0,
      })
    })
  }

  const students: CoachDashboardStudent[] = ((studentsRes.data ?? []) as any[])
    .filter(r => r.student?.id)
    .map(r => {
      const p = progressMap.get(r.student.id)
      return {
        id:                r.student.id,
        full_name:         r.student.full_name ?? null,
        last_active_at:    p?.last_active_at ?? null,
        lessons_completed: p?.lessons_completed ?? 0,
        points:            p?.points ?? 0,
      }
    })

  const createdLessons: CoachDashboardLesson[] = ((lessonsRes.data ?? []) as any[]).map(l => ({
    id:           l.id,
    title:        l.title ?? 'Untitled',
    difficulty:   l.difficulty ?? null,
    content_type: l.content_type ?? '',
    created_at:   l.created_at,
  }))

  return { students, createdLessons }
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
