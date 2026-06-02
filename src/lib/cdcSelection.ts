/**
 * CDC (Capricorn District Chess) selection criteria — framework-agnostic, no I/O.
 * Shared by the rankings pipeline (tournament classification + per-player counts)
 * and the rankings UI (qualification verdict + status comment).
 *
 * Classification here is name-keyword based (the simplest method). Because the
 * ratings DB (sd_tournaments) and the app DB (tournaments) share tournament IDs,
 * this can later be swapped for the curated `tournament_selection_meta` approvals
 * by classifying via a tournament-id map instead — without changing caller shapes.
 */

export type TournamentType = 'junior' | 'open' | 'other';

// Junior-qualifying tournament name keywords. Ported from the admin
// tournament-selection module so both surfaces classify identically.
const JUNIOR_KEYWORDS = [
  'capricorn qualifying',
  'winter games',
  'primary schools league',
  'primary schools',
  'junior trials',
  'high schools league',
  'team practice',
  'team champs',
  'provincial junior',
  'cdc junior qualifiers', 'cdc junior qualifying', 'cdc qualifiers',
  'capricorn junior qualifying', 'capricorn district chess',
  'vhembe district chess junior', 'vhembe district junior',
  'mopani open junior', 'mopani district junior qualifiers', 'mopani open junior qualifying',
  'sekhukhune junior qualifying', 'sekhukhune junior qualifiers',
  'vhembe district junior qualifier', 'waterberg junior',
];

/**
 * Classify a tournament by name. Junior-qualifying keywords win; remaining team
 * events are 'other' (not counted toward selection); everything else is an Open.
 */
export function classifyTournament(name: string | null | undefined): TournamentType {
  const n = (name ?? '').toLowerCase().trim();
  if (!n) return 'other';
  if (JUNIOR_KEYWORDS.some((kw) => n.includes(kw))) return 'junior';
  if (n.includes('team')) return 'other';
  return 'open';
}

/** Per-player counts within a single cycle, consumed by the criteria helpers. */
export interface SelectionCounts {
  junior: number;
  open: number;
  /** Counted (junior/open) tournaments played in Capricorn district. */
  capricorn: number;
  /** At least one OPEN tournament played in Capricorn. */
  hasCapricornOpen: boolean;
}

export interface SelectionVerdict {
  meets: boolean;
  comment: string;
}

/**
 * Junior CDC criteria: 6 counted tournaments, (4 JQ + 2 Open) or (3 JQ + 3 Open),
 * and at least one Open played in Capricorn. Comment uses "JQ + Open" ordering.
 */
export function juniorCriteria(c: SelectionCounts): SelectionVerdict {
  const total = c.junior + c.open;
  const combo42 = c.junior >= 4 && c.open >= 2;
  const combo33 = c.junior >= 3 && c.open >= 3;
  const meets = total >= 6 && (combo42 || combo33) && c.hasCapricornOpen;
  if (meets) return { meets, comment: combo42 ? 'Meets 4 + 2' : 'Meets 3 + 3' };

  // Shortfall hint toward whichever combo is closest (fewest extra tournaments).
  const need42 = Math.max(0, 4 - c.junior) + Math.max(0, 2 - c.open);
  const need33 = Math.max(0, 3 - c.junior) + Math.max(0, 3 - c.open);
  const use42 = need42 <= need33;
  const target = use42 ? '4 + 2' : '3 + 3';
  const needs: string[] = [];
  if (use42) {
    if (c.junior < 4) needs.push(`${4 - c.junior} JQ`);
    if (c.open < 2) needs.push(`${2 - c.open} Open`);
  } else {
    if (c.junior < 3) needs.push(`${3 - c.junior} JQ`);
    if (c.open < 3) needs.push(`${3 - c.open} Open`);
  }
  if (!c.hasCapricornOpen) needs.push('1 Capricorn open');
  return { meets, comment: needs.length ? `Needs ${needs.join(' / ')} for ${target}` : `Needs more for ${target}` };
}

/**
 * Senior (non-junior) CDC open criteria: 6 counted tournaments, at least 4 played
 * in Capricorn, 2 anywhere.
 */
export function seniorCriteria(c: SelectionCounts): SelectionVerdict {
  const total = c.junior + c.open;
  const meets = total >= 6 && c.capricorn >= 4;
  if (meets) return { meets, comment: 'Meets 4 + 2' };

  const needs: string[] = [];
  if (c.capricorn < 4) needs.push(`${4 - c.capricorn} Capricorn`);
  const more = Math.max(0, 6 - total);
  if (more > 0) needs.push(`${more} more`);
  return { meets, comment: needs.length ? `Needs ${needs.join(' / ')} for 4 + 2` : 'Needs more for 4 + 2' };
}
