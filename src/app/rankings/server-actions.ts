"use server";

import { createClient } from "@/utils/supabase/server";

export interface TournamentEntry {
  raw_name: string;
  tournament_id: string | null;
  tournament_name: string | null;
  player_rating: number | null;
  performance_rating: number | null;
  confidence: string | null;
  tie_breaks: Record<string, number | string>;
  classifications: Record<string, string>;
  created_at: string | null;
}

export interface PlayerRanking {
  name_key: string;
  display_name: string;
  name: string;
  surname: string;
  rating: number | null;
  fed: string | null;
  avg_performance_rating: number | null;
  tournaments_count: number;
  tournaments: TournamentEntry[];
  bdate_raw: string | null;
  age_years: number | null;
  age_group: string | null; // U20/U18/... computed once per player
  sex: string | null;
}

export interface RankingFilters {
  name?: string;
  fed?: string;
  ageGroup?: string;
  rating?: string;
  gender?: string;
  events?: string;
}

function safeNumber(v: any): number | null {
  const n = typeof v === "number" ? v : v == null ? NaN : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

function tryParseJSON<T = any>(v: any, fallback: T): T {
  if (v == null) return fallback;
  if (typeof v === "object") return v as T;
  try {
    return JSON.parse(String(v)) as T;
  } catch {
    return fallback;
  }
}

function normalizeUniqueNo(v: any): string {
  // Use exact UNIQUE_NO semantics with minor trim of surrounding whitespace only
  return String(v ?? "").trim();
}

function normalizeName(first: any, last: any): string {
  const f = String(first ?? "").trim().toLowerCase();
  const l = String(last ?? "").trim().toLowerCase();
  return `${f} ${l}`.trim().replace(/\s+/g, " ");
}

function normalizeDateKey(raw: any): string {
  const d = parseBirthDate(raw);
  if (!d) return "";
  const yyyy = d.getFullYear().toString().padStart(4, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseBirthDate(raw: any): Date | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Try native parse first
  const n = Date.parse(s);
  if (!Number.isNaN(n)) return new Date(n);
  // Try common formats: DD/MM/YYYY, DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) {
    const [_, dd, mm, yyyy] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Try YYYY/MM/DD, YYYY-MM-DD without timezone
  const m2 = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (m2) {
    const [_, yyyy, mm, dd] = m2;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function computeAgeYears(bdateRaw: any, now: Date = new Date()): number | null {
  const d = parseBirthDate(bdateRaw);
  if (!d) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}

function deriveAgeGroup(age: number | null): string | null {
  if (age == null) return null;

  // Assign the most specific age group label for display purposes.
  // The checks are ordered from oldest to youngest.
  if (age >= 60) return 'VET'; // Veterans are 60+
  if (age >= 50) return 'SNR'; // Seniors are 50-59
  if (age >= 20) return 'ADT'; // Adults are 20-49

  // Youth categories with specific, non-overlapping ranges for display.
  if (age >= 17 && age <= 19) return 'U20';
  if (age >= 15 && age <= 16) return 'U18';
  if (age >= 13 && age <= 14) return 'U16';
  if (age >= 11 && age <= 12) return 'U14';
  if (age >= 9 && age <= 10) return 'U12';
  if (age >= 7 && age <= 8) return 'U10';

  return null;
}

async function fetchAllProfilesBatched(supabase: any, pageSize = 1000): Promise<any[]> {
  // PostgREST enforces max-rows per response (commonly 1000). To fetch everything
  // without RPC/migrations, we must page on the server action and aggregate here.
  // This runs ONCE at page load; client filters do not re-invoke it.
  const all: any[] = [];
  let from = 0;
  let requests = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from("active_players_august_2025_profiles")
      .select("*")
      .range(from, to);
    requests++;
    if (error) throw error;
    const batch = (data ?? []) as any[];
    all.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  console.log(`[rankings] fetched all rows in ${requests} request(s). total=${all.length}`);
  return all;
}

async function fetchViaRPC(supabase: any): Promise<any[] | null> {
  try {
    const { data, error } = await supabase.rpc('rankings_aggregate_all');
    if (error) {
      console.warn('[rankings] RPC rankings_aggregate_all failed:', error.message);
      return null;
    }
    // When RPC is available, it already returns one row per player with tournaments aggregated
    if (!Array.isArray(data)) return null;
    // Map RPC rows back to the same row shape used for grouping fallback
    // We'll convert RPC rows into a synthetic "rows" array by expanding tournaments
    const expanded: any[] = [];
    for (const r of data as any[]) {
      const tList = (r.tournaments ?? []) as any[];
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
        });
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
          });
        }
      }
    }
    console.log('[rankings] RPC returned players:', (data as any[]).length, 'expanded rows:', expanded.length);
    return expanded;
  } catch (e) {
    console.warn('[rankings] RPC call threw:', e);
    return null;
  }
}

export async function getRankings(): Promise<PlayerRanking[]> {
  const supabase = await createClient();

  let rows: any[] = [];
  // Prefer RPC (one call, pre-aggregated). Fallback to full-table fetch if RPC is not present.
  const rpcRows = await fetchViaRPC(supabase);
  if (rpcRows) {
    rows = rpcRows;
  } else {
    try {
      rows = await fetchAllProfilesBatched(supabase);
    } catch (e) {
      console.error("[rankings] Error fetching all rows from active_players_august_2025_profiles:", e);
      return [];
    }
  }
  console.log("[rankings] total rows fetched:", rows.length);

  // Group strictly by UNIQUE_NO
  const groups = new Map<string, any[]>();
  for (const r of rows) {
    const key = normalizeUniqueNo(r["UNIQUE_NO"]);
    if (!key) continue; // as per requirement: all players have a UNIQUE_NO
    const arr = groups.get(key);
    if (arr) arr.push(r); else groups.set(key, [r]);
  }
  console.log("[rankings] total groups by UNIQUE_NO:", groups.size);

  // Debug: target UNIQUE_NO
  const TARGET = '2170314942';
  const preMatches = rows.filter((r) => normalizeUniqueNo(r["UNIQUE_NO"]) === TARGET);
  console.log(`[rankings][debug] UNIQUE_NO ${TARGET} pre-group rows:`, preMatches.length);
  if (preMatches.length > 0) {
    const names = Array.from(new Set(preMatches.map((r) => `${r["FIRSTNAME"] ?? ''} ${r["SURNAME"] ?? ''}`.trim())));
    const tn = preMatches.map((r) => r["tournament_name"]).filter(Boolean);
    console.log(`[rankings][debug] ${TARGET} names:`, names);
    console.log(`[rankings][debug] ${TARGET} tournaments:`, tn);
  }

  const groupKeys = Array.from(groups.keys());
  if (groups.has(TARGET)) {
    console.log(`[rankings][debug] ${TARGET} grouped rows:`, groups.get(TARGET)!.length);
  } else {
    console.log(`[rankings][debug] ${TARGET} not found in groups`);
  }

  // Aggregate each group into a single player record (one instance)
  const players: PlayerRanking[] = groupKeys.map((key) => {
    const gr = groups.get(key)!;

    // Build per-tournament entries (keep raw rows for the details modal)
    const tournaments: TournamentEntry[] = gr.map((r) => ({
      raw_name: String(r["name"] ?? ""),
      tournament_id: (r["tournament_id"] ?? null) as string | null,
      tournament_name: (r["tournament_name"] ?? null) as string | null,
      player_rating: safeNumber(r["player_rating"]) ?? safeNumber(r["RATING"]),
      performance_rating: safeNumber(r["performance_rating"]) ?? 0, // treat null as 0
      confidence: (r["confidence"] ?? null) as string | null,
      tie_breaks: tryParseJSON<Record<string, number | string>>(r["tie_breaks"], {}),
      classifications: tryParseJSON<Record<string, string>>(r["classifications"], {}),
      created_at: (r["created_at"] ?? null) as string | null,
    }));

    // Sort tournaments by created_at descending when available
    tournaments.sort((a, b) => {
      const at = a.created_at ? Date.parse(a.created_at) : 0;
      const bt = b.created_at ? Date.parse(b.created_at) : 0;
      return bt - at;
    });

    // Derive top-level fields from most recent group row
    const latestRow = gr
      .slice()
      .sort((a, b) => {
        const at = a["created_at"] ? Date.parse(String(a["created_at"])) : 0;
        const bt = b["created_at"] ? Date.parse(String(b["created_at"])) : 0;
        return bt - at;
      })[0] ?? gr[0];

    const first = String(latestRow["FIRSTNAME"] ?? "");
    const last = String(latestRow["SURNAME"] ?? "");

    // Average performance rating: include 0 for nulls, divide by ALL instances
    const perfSum = tournaments.reduce((sum, t) => sum + (t.performance_rating ?? 0), 0);
    const avgPerf = Number((perfSum / (tournaments.length || 1)).toFixed(2));

    const ageYears = computeAgeYears(latestRow["BDATE"]);
    const ageGroup = deriveAgeGroup(ageYears);

    const p: PlayerRanking = {
      name_key: key,
      display_name: `${first} ${last}`.trim(),
      name: first,
      surname: last,
      rating: tournaments[0]?.player_rating ?? safeNumber(latestRow["RATING"]) ?? null,
      fed: (latestRow["FED"] ?? null) as string | null,
      avg_performance_rating: avgPerf,
      tournaments_count: tournaments.length,
      tournaments,
      bdate_raw: (latestRow["BDATE"] ?? null) as string | null,
      age_years: ageYears,
      age_group: ageGroup,
      sex: (latestRow["SEX"] ?? null) as string | null,
    };

    return p;
  });

  console.log("[rankings] aggregated players:", players.length);

  // Additional debug: aggregated view for target
  const targetAgg = players.find((p) => p.name_key === '2170314942');
  if (targetAgg) {
    console.log('[rankings][debug] aggregated target:', {
      key: targetAgg.name_key,
      name: targetAgg.display_name,
      tournaments_count: targetAgg.tournaments_count,
      tournaments: targetAgg.tournaments.map((t) => t.tournament_name).filter(Boolean),
      avg_performance_rating: targetAgg.avg_performance_rating,
    });
  }

  // Sort by average TP (APR) descending
  const sorted = players.sort(
    (a, b) => (b.avg_performance_rating ?? 0) - (a.avg_performance_rating ?? 0)
  );

  return sorted;
}
