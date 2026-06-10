/**
 * Best-effort linking of a player to actual PGN games. The move data lives only in
 * the MAIN project as per-tournament tables registered in `tournaments_meta`, NOT
 * keyed to any tournament_id/player_id — so linking is necessarily fuzzy:
 *
 *   1. Narrow candidate game-tables by token-overlap between their alias/name and the
 *      player's tournament names (`tournaments_meta` is what makes this tractable).
 *   2. Within each candidate, keep games whose [White]/[Black] PGN tag matches the
 *      player's name.
 *
 * Returns an empty array for most players — that's the normal case, not a failure.
 * Fully isolated/defensive so a main-project hiccup never breaks the profile page.
 */
import { fetchGames, listTournaments } from '@/lib/chess-games/actions';

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

const MAX_TABLES = 6;

/**
 * Find PGN games for `playerName` across the tournaments they played, matching game
 * tables to `tournamentNames` and then PGN tags to the player. Best-effort: returns
 * `[]` on any error or when nothing matches.
 */
export async function findPlayerGames(
  playerName: string,
  tournamentNames: string[],
): Promise<LinkedGame[]> {
  const playerNorm = norm(playerName);
  if (!playerNorm) return [];

  try {
    const { tournaments, error } = await listTournaments();
    if (error || tournaments.length === 0) return [];

    // Token set across all of the player's tournaments.
    const wanted = new Set<string>();
    for (const n of tournamentNames) for (const t of tokens(n)) wanted.add(t);
    if (wanted.size === 0) return [];

    // Score each game-table by how well its alias/name overlaps the wanted tokens.
    const candidates = tournaments
      .map((t) => {
        const label = `${t.alias ?? ''} ${t.display_name ?? ''} ${t.name}`;
        let score = 0;
        for (const tok of tokens(label)) if (wanted.has(tok)) score += 1;
        return { name: t.name, score };
      })
      .filter((c) => c.score > 0 && /^[a-z0-9_]+$/.test(c.name))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_TABLES);

    // Fetch the candidate tables concurrently — they're independent reads, so this
    // turns ~6 sequential round-trips into one wave (the Games tab loads on demand).
    const batches = await Promise.all(
      candidates.map(async (c) => {
        try {
          const { games, error: gErr } = await fetchGames(c.name);
          return gErr || !games ? [] : games;
        } catch (err) {
          console.error(`[playerGames] fetch ${c.name} failed:`, err);
          return [];
        }
      }),
    );

    const out: LinkedGame[] = [];
    for (const games of batches) {
      for (const g of games) {
        if (g.pgn && pgnNamesMatch(g.pgn, playerNorm)) {
          out.push({ title: g.title, pgn: g.pgn });
        }
      }
    }
    return out;
  } catch (err) {
    console.error('[playerGames] lookup failed:', err);
    return [];
  }
}
