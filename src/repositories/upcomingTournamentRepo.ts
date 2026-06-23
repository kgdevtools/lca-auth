import { createClient } from "@/utils/supabase/server"
import type { UpcomingTournament, CreateUpcomingTournamentPayload } from "@/types/upcoming-tournament"
import { cache } from "@/utils/cache"
import tournamentsData from "@/data/tournaments.json"

const CACHE_TTL = 300

interface TournamentJson {
  id: number
  name: string
  startDate: string
  endDate: string
  days: number
  rounds: number
  timeControl: string
  venue: string
  town: string
  district: string
  organiser: string
  status: string
}

function jsonToUpcomingTournament(t: TournamentJson): Partial<UpcomingTournament> {
  return {
    id: String(t.id),
    tournament_name: t.name,
    tournament_date: t.startDate,
    location: `${t.venue}, ${t.town}`,
    organizer_name: t.organiser,
    organizer_contact: "",
    registration_form_link: "",
    poster_url: "",
    poster_public_id: "",
    sections: [
      { title: "Venue", content: `${t.venue}, ${t.town}` },
      { title: "Rounds", content: `${t.rounds}` },
      { title: "Time Control", content: t.timeControl },
      { title: "Status", content: t.status },
    ],
    description: `${t.days} day(s) tournament in ${t.district} district`,
    is_active: true,
  }
}

function getUpcomingFromJson(): Partial<UpcomingTournament>[] {
  const now = new Date()
  return (tournamentsData as TournamentJson[])
    .filter(t => new Date(t.startDate) >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .map(jsonToUpcomingTournament)
}

export async function getNextUpcomingTournament(): Promise<UpcomingTournament | null> {
  try {
    const supabase = await createClient()
    const now = new Date()
    
    const cacheKey = `next-upcoming-tournament`
    const cached = cache.get(cacheKey)
    if (cached) return cached
    
    const { data, error } = await supabase
      .from('upcoming_tournaments')
      .select('*')
      .eq('is_active', true)
      .gte('tournament_date', now.toISOString())
      .order('tournament_date', { ascending: true })
      .limit(1)
      
    if (error) {
      console.error('Error fetching next tournament:', error)
      return null
    }
    
    if (data?.[0]) {
      cache.set(cacheKey, data[0], CACHE_TTL)
      return data[0]
    }
    
    const jsonTournaments = getUpcomingFromJson()
    const tournament = jsonTournaments[0] as UpcomingTournament | undefined
    
    if (tournament) {
      cache.set(cacheKey, tournament, CACHE_TTL)
      return tournament
    }
    
    return null
  } catch (error) {
    console.error('Error in getNextUpcomingTournament:', error)
    return null
  }
}

function dayKey(t: Partial<UpcomingTournament>): string {
  return `${t.tournament_name}|${(t.tournament_date || "").slice(0, 10)}`;
}

/**
 * Tournaments for the home carousel: the static Capricorn calendar (tournaments.json)
 * merged with the dynamic `upcoming_tournaments` table, then selected by date — up to
 * 3 soonest upcoming + the most recently completed one. Dynamic rows win on a
 * name+date clash (they carry posters / registration links). Cached briefly.
 */
export async function getCarouselTournaments(): Promise<UpcomingTournament[]> {
  try {
    const cacheKey = "carousel-tournaments";
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: db } = await supabase
      .from("upcoming_tournaments")
      .select("*")
      .eq("is_active", true)
      .gte("tournament_date", today);
    const dbItems = (db ?? []) as UpcomingTournament[];

    // Static calendar mapped into the same shape (no posters/links on these).
    const jsonItems = (tournamentsData as TournamentJson[]).map(jsonToUpcomingTournament);

    const seen = new Set(dbItems.map(dayKey));
    const merged: UpcomingTournament[] = [
      ...dbItems,
      ...(jsonItems.filter((j) => !seen.has(dayKey(j))) as UpcomingTournament[]),
    ];

    const time = (t: UpcomingTournament) => new Date(t.tournament_date).getTime();
    const day = (t: UpcomingTournament) => {
      const d = new Date(t.tournament_date);
      return Number.isFinite(d.getTime()) ? d.setUTCHours(0, 0, 0, 0) : NaN;
    };
    const now = Date.now();
    const upcoming = merged
      .filter((t) => Number.isFinite(time(t)) && time(t) >= now)
      .sort((a, b) => day(a) - day(b))
      .slice(0, 3);
    const past = merged
      .filter((t) => Number.isFinite(time(t)) && time(t) < now)
      .sort((a, b) => day(b) - day(a))
      .slice(0, 1);

    const items = [...upcoming, ...past];
    cache.set(cacheKey, items, CACHE_TTL);
    return items;
  } catch (error) {
    console.error("Error in getCarouselTournaments:", error);
    return [];
  }
}

export async function createUpcomingTournament(data: CreateUpcomingTournamentPayload): Promise<{ success: boolean; error?: string; tournamentId?: string }> {
  try {
    const supabase = await createClient()
    
    const { data: result, error } = await supabase
      .from('upcoming_tournaments')
      .insert([{
        tournament_name: data.tournament_name,
        tournament_date: data.tournament_date,
        location: data.location,
        organizer_name: data.organizer_name,
        organizer_contact: data.organizer_contact,
        registration_form_link: data.registration_form_link,
        poster_url: data.poster_url,
        poster_public_id: data.poster_public_id,
        sections: data.sections || [],
        description: data.description || null,
        is_active: true
      }])
      .select('id')
      .single()
      
    if (error) {
      console.error('Error creating tournament:', error)
      return { success: false, error: error.message }
    }
    
    cache.clear()
    
    return { success: true, tournamentId: result.id }
  } catch (error) {
    console.error('Error in createUpcomingTournament:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function getAllUpcomingTournaments(): Promise<UpcomingTournament[]> {
  try {
    const supabase = await createClient()
    const now = new Date()
    
    const { data, error } = await supabase
      .from('upcoming_tournaments')
      .select('*')
      .eq('is_active', true)
      .gte('tournament_date', now.toISOString())
      .order('tournament_date', { ascending: true })
      
    if (error) {
      console.error('Error fetching tournaments:', error)
      return []
    }
    
    if (data && data.length > 0) {
      return data
    }
    
    return getUpcomingFromJson() as UpcomingTournament[]
  } catch (error) {
    console.error('Error in getAllUpcomingTournaments:', error)
    return []
  }
}

export async function getTournamentById(id: string): Promise<UpcomingTournament | null> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('upcoming_tournaments')
      .select('*')
      .eq('id', id)
      .single()
      
    if (error) {
      console.error('Error fetching tournament:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error in getTournamentById:', error)
    return null
  }
}
