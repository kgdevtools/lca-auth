// Static registration-tournament meta. Two live events; the DB holds only the
// registrations (generic `tournament_registrations`, keyed by these slugs).
// Poster PNGs live in /public/posters (theme-swapped in the header).

export interface RegSection {
  code: string;   // 'A' | 'B' | 'C'
  label: string;  // 'Section A'
  detail: string; // eligibility
  fee: number;    // entry fee (Rands)
}

export interface RegTournament {
  slug: string;
  name: string;
  dateLabel: string;
  posterDark: string;   // /public path
  posterLight: string;
  sections: RegSection[];
  regDeadline: string;  // display only
}

export const TOURNAMENTS: Record<string, RegTournament> = {
  'lca-winter-rapid-0407': {
    slug: 'lca-winter-rapid-0407',
    name: 'LCA Winter Rapid 2026',
    dateLabel: 'Saturday 4 July 2026',
    posterDark: '/posters/lca-winter-rapid-0407-dark.png',
    posterLight: '/posters/lca-winter-rapid-0407-light.png',
    sections: [
      { code: 'A', label: 'Section A', detail: 'Open to all', fee: 200 },
      { code: 'B', label: 'Section B', detail: 'Under 1500 & juniors', fee: 150 },
      { code: 'C', label: 'Section C', detail: 'Beginners & U14', fee: 100 },
    ],
    regDeadline: 'Thursday 2 July, 23:55',
  },
  'lca-weekend-rapidblitz-2706': {
    slug: 'lca-weekend-rapidblitz-2706',
    name: 'LCA Weekend Rapid & Blitz',
    dateLabel: 'Saturday 27 June 2026',
    posterDark: '/posters/lca-weekend-rapidblitz-2706-dark.png',
    posterLight: '/posters/lca-weekend-rapidblitz-2706-light.png',
    sections: [
      { code: 'A', label: 'Section A', detail: 'Open', fee: 100 },
      { code: 'B', label: 'Section B', detail: 'Development', fee: 80 },
    ],
    regDeadline: 'Friday 26 June, 23:55',
  },
};

export function getTournament(slug: string): RegTournament | null {
  return TOURNAMENTS[slug] ?? null;
}
