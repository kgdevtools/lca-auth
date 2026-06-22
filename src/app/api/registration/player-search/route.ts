// Typeahead source for the tournament registration form. Reads the Ratings DB's
// anon-readable `rs_local_active_players` (via ratingsClient) and returns distinct
// players for autofill. Query matches name (substring) or, for numeric input,
// the CHESSA unique_no.
import { NextRequest, NextResponse } from 'next/server';
import { ratings } from '@/lib/ratingsClient';

interface Row {
  name: string | null;
  unique_no: string | number | null;
  sex: string | null;
  current_rating: number | null;
  fide_rating: number | null;
  fide_id: string | number | null;
}

export interface PlayerSuggestion {
  surname: string;
  names: string;
  gender: string | null;
  chessaId: string | null;
  rating: number | null;
  uniqueNo: string | null;
  label: string; // what the dropdown shows
}

/** Split "Surname, Names" (or "Surname Names") into parts. */
function splitName(full: string): { surname: string; names: string } {
  const s = (full || '').trim();
  if (!s) return { surname: '', names: '' };
  if (s.includes(',')) {
    const [sur, ...rest] = s.split(',');
    return { surname: sur.trim(), names: rest.join(',').trim() };
  }
  const parts = s.split(/\s+/);
  if (parts.length === 1) return { surname: parts[0], names: '' };
  return { surname: parts[0], names: parts.slice(1).join(' ') };
}

export async function GET(request: NextRequest) {
  const q = (new URL(request.url).searchParams.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ players: [] });

  const cols = 'name, unique_no, sex, current_rating, fide_rating, fide_id';
  const isNumeric = /^\d+$/.test(q);

  try {
    const builder = ratings.from('rs_local_active_players').select(cols);
    const { data, error } = isNumeric
      ? await builder.or(`unique_no.eq.${q},name.ilike.%${q}%`).limit(60)
      : await builder.ilike('name', `%${q}%`).limit(60);

    if (error) {
      console.error('[player-search] error:', error.message);
      return NextResponse.json({ players: [] });
    }

    // Distinct by unique_no (fallback name) — the view has one row per appearance.
    const seen = new Set<string>();
    const players: PlayerSuggestion[] = [];
    for (const r of (data ?? []) as Row[]) {
      const key = (r.unique_no != null ? String(r.unique_no) : '') || (r.name ?? '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      const { surname, names } = splitName(r.name ?? '');
      players.push({
        surname,
        names,
        gender: r.sex ?? null,
        chessaId: r.unique_no != null ? String(r.unique_no) : null,
        // Chess SA (national) current rating — never the FIDE rating.
        rating: r.current_rating ?? null,
        uniqueNo: r.unique_no != null ? String(r.unique_no) : null,
        label: `${r.name ?? '?'}${r.current_rating != null ? ` · ${r.current_rating}` : ''}`,
      });
      if (players.length >= 12) break;
    }
    return NextResponse.json({ players });
  } catch (e) {
    console.error('[player-search] unexpected:', e);
    return NextResponse.json({ players: [] });
  }
}
