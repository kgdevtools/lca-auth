/**
 * Best-effort linking of a player to actual PGN games. Games now live in the unified
 * `games` table (one row per game, with white_name/black_name/tournament_name columns),
 * but the link is still intentionally FUZZY — we guess by name, not by a hard key:
 *
 *   1. Keep games whose `tournament_name` shares ≥1 significant token with the
 *      player's tournament names.
 *   2. Among those, keep games whose stored name column (or [White]/[Black] PGN tag,
 *      as a fallback) matches the player's name.
 *
 * Returns an empty array for most players — that's the normal case, not a failure.
 * Fully isolated/defensive so a data hiccup never breaks the profile page.
 */
import { createClient } from '@/utils/supabase/server';

/** The minimal game shape `GameViewer` consumes (title + pgn). */
export interface LinkedGame {
  title: string;
  pgn: string;
}

const STOP = new Set([
  'tournament',
  'tournaments',
  'open',
  'the',
  'and',
  'of',
  'chess',
  'cup',
  'games',
]);

/** Significant lowercase tokens (drops stopwords, short bits, pure punctuation). */
function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((t) => t.length >= 2 && !STOP.has(t)),
  );
}

/** Lowercase, strip accents + punctuation, collapse spaces. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Does the player's name appear as a [White]/[Black] tag in this PGN? */
function pgnNamesMatch(pgn: string, playerNorm: string): boolean {
  if (!playerNorm) return false;
  const tags = pgn.match(/\[(?:White|Black)\s+"([^"]*)"\]/gi) ?? [];
  for (const tag of tags) {
    const m = tag.match(/"([^"]*)"/);
    if (m && norm(m[1]) === playerNorm) return true;
  }
  return false;
}

interface GameRow {
  title: string | null;
  full_pgn: string | null;
  white_name: string | null;
  black_name: string | null;
  tournament_name: string | null;
}

/**
 * Find PGN games for `playerName` across the tournaments they played. Reads the
 * unified `games` table once, then matches FUZZILY (unchanged behaviour): a game
 * counts when its `tournament_name` shares ≥1 significant token with the player's
 * tournaments AND the player's name matches a stored name column (falling back to
 * the PGN [White]/[Black] tags). Best-effort: returns `[]` on error or no match.
 */
export async function findPlayerGames(
  playerName: string,
  tournamentNames: string[],
): Promise<LinkedGame[]> {
  const playerNorm = norm(playerName);
  if (!playerNorm) return [];

  // Token set across all of the player's tournaments (fuzzy tournament guess).
  const wanted = new Set<string>();
  for (const n of tournamentNames) for (const t of tokens(n)) wanted.add(t);
  if (wanted.size === 0) return [];

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('games')
      .select('title, full_pgn, white_name, black_name, tournament_name');
    if (error || !data) return [];

    const out: LinkedGame[] = [];
    for (const g of data as GameRow[]) {
      const pgn = g.full_pgn ?? '';
      if (!pgn) continue;

      // Fuzzy tournament match: any significant-token overlap.
      let overlap = false;
      for (const tok of tokens(g.tournament_name ?? '')) if (wanted.has(tok)) { overlap = true; break; }
      if (!overlap) continue;

      // Name match: stored columns first, PGN tags as a fallback.
      const nameHit =
        (g.white_name != null && norm(g.white_name) === playerNorm) ||
        (g.black_name != null && norm(g.black_name) === playerNorm) ||
        pgnNamesMatch(pgn, playerNorm);
      if (nameHit) out.push({ title: g.title ?? '', pgn });
    }
    return out;
  } catch (err) {
    console.error('[playerGames] lookup failed:', err);
    return [];
  }
}
