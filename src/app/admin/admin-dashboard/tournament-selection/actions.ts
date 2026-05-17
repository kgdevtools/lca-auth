"use server"

import { createClient } from "@/utils/supabase/server"

export interface TournamentSelectionMeta {
  id: string
  tournament_id: string | null
  tournament_name: string
  tournament_type: 'open' | 'junior_qualifying' | 'other'
  age_category: 'U10' | 'U12' | 'U14' | 'U16' | 'U18' | 'U20' | 'Open' | 'Multiple'
  player_count: number | null
  avg_top_seeds: number | null
  rating_threshold: number | null
  meets_criteria: boolean
  is_capricorn: boolean
  approved: boolean
  approved_by: string | null
  approved_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Tournament {
  id: string
  tournament_name: string
  location: string | null
  tournament_type: string | null
  date: string | null
}

// Keywords for detecting junior qualifying tournaments
// Derived from actual tournament calendar data patterns
const juniorQualifyingKeywords = [
  // Primary: Capricorn Qualifying Tournaments (1-8)
  "capricorn qualifying",
  // Other CDC/Club junior events
  "winter games",
  "primary schools league",
  "primary schools",
  "junior trials",
  "high schools league",
  "team practice",
  "team champs",
  "provincial junior",
  // Legacy patterns from original spec
  "cdc junior qualifiers", "cdc junior qualifying", "cdc qualifiers",
  "capricorn junior qualifying", "capricorn district chess",
  "vhembe district chess junior", "vhembe district junior",
  "mopani open junior", "mopani district junior qualifiers", "mopani open junior qualifying",
  "sekhukhune junior qualifying", "sekhukhune junior qualifiers",
  "vhembe district junior qualifier", "waterberg junior"
]

// Keywords for detecting Capricorn/Limpopo region
// Expanded to include: town names, venues, and inference from tournament name patterns
const limpopoKeywords = [
  // Explicit region names
  "capricorn", "limpopo", "vhembe", "mopani", "sekhukhune", "waterberg",
  // Major towns/cities in Limpopo
  "polokwane", "seshego", "tzaneen", "mokopane", "modimolle", "mookgopong",
  "dendron", "senwabarwana", "ga-machaba", "musina", "thabazimbi",
  // Venues and institutions
  "northern academy", "university of limpopo", "turfloop", "capricorn tvet",
  "flora park", "hans strijdom", "bela-bela", "tshakhuma", "seshego",
  // Legacy keywords
  "tzaneen", "polokwane", "northern academy", "mokopane", "limpopo",
  "modimolle", "mookgopong", "seshego", "capricorn", "vhembe",
  "mopani", "sekhukhune", "hans strijdom", "bela-bela", "tshakhuma",
  "turfloop", "university of limp", "capricorn tvet", "flora park", "waterberg"
]

function isJuniorQualifying(name: string): boolean {
  const lower = name.toLowerCase()
  return juniorQualifyingKeywords.some(kw => lower.includes(kw))
}

function isCapricorn(name: string, location: string | null): boolean {
  // Check name first - many tournaments explicitly mention location in name
  const lowerName = name.toLowerCase()
  const nameMatch = limpopoKeywords.some(kw => lowerName.includes(kw))
  if (nameMatch) return true
  
  // Then check location field
  if (location) {
    const lowerLoc = location.toLowerCase()
    return limpopoKeywords.some(kw => lowerLoc.includes(kw))
  }
  
  // Inference: If name contains certain patterns, likely in Limpopo
  // e.g., "Polokwane Open", "Limpopo Open", "Seshego Easter"
  const inferencePatterns = [
    /\bpolokwane\b/i, /\blimpopo\b/i, /\bseshego\b/i, 
    /\btzaneen\b/i, /\bmokopane\b/i, /\bdendron\b/i
  ]
  return inferencePatterns.some(pattern => pattern.test(name))
}

export async function getTournaments(): Promise<Tournament[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tournaments')
    .select('id, tournament_name, location, tournament_type, date')
    .order('date', { ascending: false })
  
  if (error) {
    console.error('Error fetching tournaments:', error)
    return []
  }
  
  return (data || []) as Tournament[]
}

export async function getSelectionMeta(): Promise<TournamentSelectionMeta[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tournament_selection_meta')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching selection meta:', error)
    return []
  }
  
  return (data || []) as TournamentSelectionMeta[]
}

export async function getDetectedTournaments(): Promise<Tournament[]> {
  const supabase = await createClient()
  
  const { data: allTournaments, error } = await supabase
    .from('tournaments')
    .select('id, tournament_name, location, tournament_type, date')
    .order('date', { ascending: false })
  
  if (error) {
    console.error('Error fetching tournaments for detection:', error)
    return []
  }
  
  // Filter to only tournaments that meet detection criteria
  const detected = (allTournaments || []).filter(t => {
    const name = t.tournament_name || ""
    const location = t.location
    return isJuniorQualifying(name) || isCapricorn(name, location)
  })
  
  return detected as Tournament[]
}

export async function saveSelectionMeta(
  items: Partial<TournamentSelectionMeta>[],
  approvedBy: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  
  try {
    // For each item, upsert into the table
    for (const item of items) {
      if (!item.tournament_name) continue
      
      const payload = {
        ...item,
        approved: item.approved ?? false,
        approved_by: item.approved ? approvedBy : null,
        approved_at: item.approved ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }
      
      if (item.id) {
        // Update existing
        const { error } = await supabase
          .from('tournament_selection_meta')
          .update(payload)
          .eq('id', item.id)
        
        if (error) throw error
      } else {
        // Insert new
        const { error } = await supabase
          .from('tournament_selection_meta')
          .insert([payload])
        
        if (error) throw error
      }
    }
    
    return { success: true, error: null }
  } catch (err: any) {
    console.error('Error saving selection meta:', err)
    return { success: false, error: err.message }
  }
}

export async function deleteSelectionMeta(
  id: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('tournament_selection_meta')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting selection meta:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, error: null }
}

export async function addTournamentToSelection(
  tournament: Tournament
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()
  
  const name = tournament.tournament_name || ""
  const location = tournament.location
  
  const isJuniorQual = isJuniorQualifying(name)
  const isCapricornRegion = isCapricorn(name, location)
  
  // Determine tournament type
  let tournamentType: 'open' | 'junior_qualifying' | 'other' = 'other'
  if (isJuniorQual) {
    tournamentType = 'junior_qualifying'
  } else if (tournamentType !== 'other') {
    tournamentType = 'open'
  }
  
  const payload = {
    tournament_id: tournament.id,
    tournament_name: name,
    tournament_type: tournamentType,
    age_category: 'Open' as const,
    is_capricorn: isCapricornRegion,
    meets_criteria: isJuniorQual || (tournamentType === 'open' && isCapricornRegion),
    approved: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
  
  const { error } = await supabase
    .from('tournament_selection_meta')
    .insert([payload])
  
  if (error) {
    console.error('Error adding tournament to selection:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true, error: null }
}

export async function getTournamentStats(tournamentId: string): Promise<{ playerCount: number; avgTopSeeds: number | null }> {
  const supabase = await createClient()
  
  console.log('[getTournamentStats] Querying for tournament_id:', tournamentId)
  
  // Get all players for this tournament using tournament_id
  const { data: players, error } = await supabase
    .from('players')
    .select('rating')
    .eq('tournament_id', tournamentId)
  
  console.log('[getTournamentStats] Error:', error)
  console.log('[getTournamentStats] Players found:', players?.length)
  console.log('[getTournamentStats] Sample:', players?.slice(0, 3))
  
  if (error || !players || players.length === 0) {
    console.log('[getTournamentStats] No players found with tournament_id')
    return { playerCount: 0, avgTopSeeds: null }
  }

  // Filter valid ratings and sort descending
  const ratings = players
    .filter(p => p.rating && p.rating > 0)
    .map(p => p.rating as number)
    .sort((a, b) => b - a)
  
  const playerCount = players.length
  const topN = playerCount <= 40 ? 10 : 15
  const topRatings = ratings.slice(0, topN)
  
  const avgTopSeeds = topRatings.length > 0 
    ? Number((topRatings.reduce((sum, r) => sum + r, 0) / topRatings.length).toFixed(1))
    : null

  console.log('[getTournamentStats] Result:', { playerCount, avgTopSeeds, validRatings: ratings.length })
  
  return { playerCount, avgTopSeeds }
}

// ============ Junior Player Qualification Stats ============

export interface PlayerTournamentDetail {
  id: string
  tournament_name: string
  date: string | null
  location: string | null
  type: 'junior_qualifying' | 'open' | 'other'
  isCapricorn: boolean
  isIncluded: boolean
}

export interface JuniorPlayerStats {
  name_key: string
  display_name: string
  name: string
  surname: string
  rating: number | null
  fed: string | null
  age_group: string | null
  age_years: number | null
  totalTournaments: number
  openTournaments: number
  juniorTournaments: number
  hasCapricornOpen: boolean
  meetsCriteria: boolean
  tournaments: PlayerTournamentDetail[]
  criteriaNeeded: {
    total: { current: number; required: number; met: boolean }
    open: { current: number; required: number; met: boolean }
    junior: { current: number; required: number; met: boolean }
    capricorn: { met: boolean }
  }
}

const JUNIOR_AGE_GROUPS = ['U20', 'U18', 'U16', 'U14', 'U12', 'U10']

function computeAgeYears(bdateRaw: any, now: Date = new Date()): number | null {
  if (!bdateRaw) return null
  const s = String(bdateRaw).trim()
  if (!s) return null
  
  const n = Date.parse(s)
  if (!Number.isNaN(n)) {
    const d = new Date(n)
    let age = now.getFullYear() - d.getFullYear()
    const m = now.getMonth() - d.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
    return age >= 0 ? age : null
  }
  
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
  if (m) {
    const [_, dd, mm, yyyy] = m
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
    return Number.isNaN(d.getTime()) ? null : now.getFullYear() - d.getFullYear()
  }
  
  const m2 = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/)
  if (m2) {
    const [_, yyyy, mm, dd] = m2
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
    return Number.isNaN(d.getTime()) ? null : now.getFullYear() - d.getFullYear()
  }
  
  return null
}

function deriveAgeGroup(age: number | null): string | null {
  if (age == null) return null
  if (age >= 60) return 'VET'
  if (age >= 50) return 'SNR'
  if (age >= 20) return 'ADT'
  if (age >= 17 && age <= 19) return 'U20'
  if (age >= 15 && age <= 16) return 'U18'
  if (age >= 13 && age <= 14) return 'U16'
  if (age >= 11 && age <= 12) return 'U14'
  if (age >= 9 && age <= 10) return 'U12'
  if (age >= 7 && age <= 8) return 'U10'
  return null
}

function safeNumber(v: any): number | null {
  const n = typeof v === "number" ? v : v == null ? NaN : Number(String(v))
  return Number.isFinite(n) ? n : null
}

function tryParseJSON<T = any>(v: any, fallback: T): T {
  if (v == null) return fallback
  if (typeof v === "object") return v as T
  try {
    return JSON.parse(String(v)) as T
  } catch {
    return fallback
  }
}

async function fetchAllProfilesBatched(supabase: any, pageSize = 1000): Promise<any[]> {
  const all: any[] = []
  let from = 0
  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from("active_players_august_2025_profiles")
      .select("*")
      .range(from, to)
    if (error) throw error
    const batch = (data ?? []) as any[]
    all.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }
  return all
}

async function fetchViaRPC(supabase: any): Promise<any[] | null> {
  try {
    const { data, error } = await supabase.rpc('rankings_aggregate_all')
    if (error) return null
    if (!Array.isArray(data)) return null
    
    const expanded: any[] = []
    for (const r of data as any[]) {
      const tList = (r.tournaments ?? []) as any[]
      if (tList.length === 0) {
        expanded.push({
          UNIQUE_NO: r.unique_no,
          FIRSTNAME: r.firstname,
          SURNAME: r.surname,
          FED: r.fed,
          SEX: r.sex,
          BDATE: r.bdate,
          name: null,
          tournament_id: null,
          tournament_name: null,
          player_rating: null,
          performance_rating: r.avg_performance_rating,
          confidence: null,
          tie_breaks: null,
          classifications: null,
          created_at: null,
        })
      } else {
        for (const t of tList) {
          expanded.push({
            UNIQUE_NO: r.unique_no,
            FIRSTNAME: r.firstname,
            SURNAME: r.surname,
            FED: r.fed,
            SEX: r.sex,
            BDATE: r.bdate,
            name: t.raw_name ?? null,
            tournament_id: t.tournament_id ?? null,
            tournament_name: t.tournament_name ?? null,
            player_rating: t.player_rating ?? null,
            performance_rating: t.performance_rating ?? null,
            confidence: t.confidence ?? null,
            tie_breaks: t.tie_breaks ?? null,
            classifications: t.classifications ?? null,
            created_at: t.created_at ?? null,
          })
        }
      }
    }
    return expanded
  } catch (e) {
    return null
  }
}

async function getApprovedTournamentsMap(supabase: any): Promise<Map<string, { type: 'junior_qualifying' | 'open' | 'other'; isCapricorn: boolean }>> {
  const { data, error } = await supabase
    .from('tournament_selection_meta')
    .select('tournament_id, tournament_type, is_capricorn')
    .eq('approved', true)
  
  if (error || !data) return new Map()
  
  const map = new Map<string, { type: 'junior_qualifying' | 'open' | 'other'; isCapricorn: boolean }>()
  for (const row of data) {
    if (row.tournament_id) {
      map.set(row.tournament_id, {
        type: row.tournament_type || 'other',
        isCapricorn: row.is_capricorn || false
      })
    }
  }
  return map
}

export async function getJuniorPlayersWithStats(period?: string): Promise<JuniorPlayerStats[]> {
  const supabase = await createClient()
  
  const approvedTournaments = await getApprovedTournamentsMap(supabase)
  console.log('[junior-stats] Approved tournaments count:', approvedTournaments.size)
  
  // Fetch player data
  let rows: any[] = []
  const rpcRows = await fetchViaRPC(supabase)
  if (rpcRows) {
    rows = rpcRows
  } else {
    try {
      rows = await fetchAllProfilesBatched(supabase)
    } catch (e) {
      console.error("[junior-stats] Error fetching profiles:", e)
      return []
    }
  }
  
  // Fetch tournament details
  const tournamentIds = Array.from(new Set(
    rows.map(r => r["tournament_id"]).filter((id): id is string => id != null && id !== "")
  ))
  
  const tournamentDetailsMap = new Map<string, { id: string; tournament_name: string | null; location: string | null; tournament_type: string | null; date: string | null }>()
  
  if (tournamentIds.length > 0) {
    const { data: tournamentData } = await supabase
      .from("tournaments")
      .select("id, tournament_name, location, tournament_type, date")
      .in("id", tournamentIds)
    
    const { data: teamTournamentData } = await supabase
      .from("team_tournaments")
      .select("id, tournament_name, location, tournament_type, date")
      .in("id", tournamentIds)
    
    if (tournamentData) {
      for (const t of tournamentData) {
        if (t.id) {
          tournamentDetailsMap.set(t.id, {
            id: t.id,
            tournament_name: t.tournament_name ?? null,
            location: t.location ?? null,
            tournament_type: t.tournament_type ?? null,
            date: t.date ?? null,
          })
        }
      }
    }
    if (teamTournamentData) {
      for (const t of teamTournamentData) {
        if (t.id && !tournamentDetailsMap.has(t.id)) {
          tournamentDetailsMap.set(t.id, {
            id: t.id,
            tournament_name: t.tournament_name ?? null,
            location: t.location ?? null,
            tournament_type: t.tournament_type ?? null,
            date: t.date ?? null,
          })
        }
      }
    }
  }
  
  // Group by UNIQUE_NO
  const groups = new Map<string, any[]>()
  for (const r of rows) {
    const key = String(r["UNIQUE_NO"] ?? "").trim()
    if (!key) continue
    const arr = groups.get(key)
    if (arr) arr.push(r)
    else groups.set(key, [r])
  }
  
  // Period filtering
  const PERIODS: Record<string, { start: string; end: string }> = {
    '2024-2025': { start: '2024-10-01', end: '2025-09-30' },
    '2025-2026': { start: '2025-10-01', end: '2026-09-30' },
  }
  
  const isInPeriod = (dateStr: string | null) => {
    if (!period || !PERIODS[period]) return true
    if (!dateStr) return false
    const d = dateStr.split('T')[0]
    const { start, end } = PERIODS[period]
    return d >= start && d <= end
  }
  
  // Process each player
  const juniorPlayers: JuniorPlayerStats[] = []
  
  for (const [, gr] of groups) {
    // Build tournament entries
    const tournaments = gr.map((r) => {
      const tournamentId = r["tournament_id"] as string | null
      const tournamentDetails = tournamentId ? tournamentDetailsMap.get(tournamentId) : null
      
      return {
        raw_name: String(r["name"] ?? ""),
        tournament_id: tournamentId,
        tournament_name: tournamentDetails?.tournament_name ?? (r["tournament_name"] ?? null),
        tournament_type: tournamentDetails?.tournament_type ?? null,
        tournament_date: tournamentDetails?.date ?? null,
        location: tournamentDetails?.location ?? null,
        tie_breaks: tryParseJSON<Record<string, number | string>>(r["tie_breaks"], {}),
      }
    })
    
    // Filter by period
    const filteredTournaments = tournaments.filter(t => isInPeriod(t.tournament_date))
    
    // Get latest row for player info
    const latestRow = gr.slice().sort((a, b) => {
      const at = a["created_at"] ? Date.parse(String(a["created_at"])) : 0
      const bt = b["created_at"] ? Date.parse(String(b["created_at"])) : 0
      return bt - at
    })[0] ?? gr[0]
    
    const ageYears = computeAgeYears(latestRow["BDATE"])
    const ageGroup = deriveAgeGroup(ageYears)
    
    // Only include juniors
    if (!ageGroup || !JUNIOR_AGE_GROUPS.includes(ageGroup)) continue
    
    // Filter played tournaments (with valid tie_breaks)
    const playedTournaments = filteredTournaments.filter(t => {
      const tieBreaks = t.tie_breaks || {}
      return Object.values(tieBreaks).some(v => v !== null && v !== undefined && v !== "" && v !== 0)
    })
    
    // Categorize - with fallback to keyword-based detection when no approved tournaments
    const juniorTournaments: typeof filteredTournaments = []
    const openTournaments: typeof filteredTournaments = []
    
    const limpopoKeywords = [
      "tzaneen", "polokwane", "northern academy", "mokopane", "limpopo", 
      "modimolle", "mookgopong", "seshego", "capricorn", "vhembe", 
      "mopani", "sekhukhune", "hans strijdom", "bela-bela", "tshakhuma",
      "turfloop", "university of limp", "capricorn tvet", "flora park", "waterberg"
    ]
    
    const isJuniorQualifyingTournament = (t: typeof playedTournaments[0]): boolean => {
      const name = t.tournament_name?.toLowerCase() ?? ""
      const keywords = [
        "cdc junior qualifiers", "cdc junior qualifying", "cdc qualifiers",
        "capricorn junior qualifying", "capricorn district chess",
        "vhembe district chess junior", "vhembe district junior",
        "mopani open junior", "mopani district junior qualifiers", "mopani open junior qualifying",
        "sekhukhune junior qualifying", "sekhukhune junior qualifiers",
        "vhembe district junior qualifier", "waterberg junior"
      ]
      return keywords.some(kw => name.includes(kw))
    }
    
    const isLimpopoTournament = (t: typeof playedTournaments[0]): boolean => {
      const name = t.tournament_name?.toLowerCase() ?? ""
      const loc = t.location?.toLowerCase() ?? ""
      return limpopoKeywords.some(kw => name.includes(kw) || loc.includes(kw))
    }
    
    if (approvedTournaments.size > 0) {
      // Use approved tournaments from tournament_selection_meta
      for (const t of playedTournaments) {
        const meta = t.tournament_id ? approvedTournaments.get(t.tournament_id) : null
        if (meta?.type === 'junior_qualifying') {
          juniorTournaments.push(t)
        } else if (meta?.type === 'open') {
          openTournaments.push(t)
        }
      }
    } else {
      // Fallback to keyword-based detection (old logic)
      for (const t of playedTournaments) {
        if (isJuniorQualifyingTournament(t)) {
          juniorTournaments.push(t)
        } else {
          const type = t.tournament_name?.toLowerCase() ?? ""
          // Use tournament_name for fallback
          if (!type.includes("junior") && !type.includes("team")) {
            openTournaments.push(t)
          }
        }
      }
    }
    
    // Check criteria
    const totalRequired = 6
    const minOpenRequired = 2
    const minJuniorRequired = 4
    
    let hasCapricornOpen = false
    if (approvedTournaments.size > 0) {
      hasCapricornOpen = openTournaments.some(t => {
        const meta = t.tournament_id ? approvedTournaments.get(t.tournament_id) : null
        return meta?.isCapricorn === true
      })
    } else {
      hasCapricornOpen = openTournaments.some(t => isLimpopoTournament(t))
    }
    
    const meetsTotal = playedTournaments.length >= totalRequired
    const meetsOpenAndJuniorCombo = 
      (openTournaments.length >= 2 && juniorTournaments.length >= 4) ||
      (openTournaments.length >= 3 && juniorTournaments.length >= 3)
    const meetsCriteria = meetsTotal && meetsOpenAndJuniorCombo && hasCapricornOpen
    
    // Build tournament details for display
    const tournamentDetails: PlayerTournamentDetail[] = playedTournaments.map(t => {
      const meta = t.tournament_id ? approvedTournaments.get(t.tournament_id) : null
      let type: 'junior_qualifying' | 'open' | 'other' = 'other'
      let isCapricorn = false
      
      if (approvedTournaments.size > 0 && meta) {
        type = meta.type as 'junior_qualifying' | 'open' | 'other'
        isCapricorn = meta.isCapricorn
      } else {
        // Fallback: use keyword detection
        if (isJuniorQualifyingTournament(t)) {
          type = 'junior_qualifying'
        } else {
          const nameLower = t.tournament_name?.toLowerCase() ?? ""
          if (!nameLower.includes("junior") && !nameLower.includes("team")) {
            type = 'open'
          }
        }
        isCapricorn = isLimpopoTournament(t)
      }
      
      return {
        id: t.tournament_id || '',
        tournament_name: t.tournament_name || t.raw_name || '',
        date: t.tournament_date,
        location: t.location,
        type,
        isCapricorn,
        isIncluded: type === 'junior_qualifying' || type === 'open'
      }
    })
    
    // Calculate rating from latest tournament
    const rating = filteredTournaments[0]?.tie_breaks 
      ? safeNumber(filteredTournaments[0].tie_breaks['tp']) || null 
      : null
    
    juniorPlayers.push({
      name_key: String(latestRow["UNIQUE_NO"] ?? "").trim(),
      display_name: `${String(latestRow["FIRSTNAME"] ?? "").trim()} ${String(latestRow["SURNAME"] ?? "").trim()}`.trim(),
      name: String(latestRow["FIRSTNAME"] ?? "").trim(),
      surname: String(latestRow["SURNAME"] ?? "").trim(),
      rating,
      fed: latestRow["FED"] as string | null,
      age_group: ageGroup,
      age_years: ageYears,
      totalTournaments: playedTournaments.length,
      openTournaments: openTournaments.length,
      juniorTournaments: juniorTournaments.length,
      hasCapricornOpen,
      meetsCriteria,
      tournaments: tournamentDetails,
      criteriaNeeded: {
        total: { current: playedTournaments.length, required: totalRequired, met: meetsTotal },
        open: { current: openTournaments.length, required: minOpenRequired, met: openTournaments.length >= minOpenRequired },
        junior: { current: juniorTournaments.length, required: minJuniorRequired, met: juniorTournaments.length >= minJuniorRequired },
        capricorn: { met: hasCapricornOpen }
      }
    })
  }
  
  // Sort by meetsCriteria (qualified first), then by total tournaments
  juniorPlayers.sort((a, b) => {
    if (a.meetsCriteria !== b.meetsCriteria) return b.meetsCriteria ? 1 : -1
    return b.totalTournaments - a.totalTournaments
  })
  
  return juniorPlayers
}