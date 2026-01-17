// src/app/view/config.ts

// This is a shared configuration file that can be safely imported by both client and server components.

// Static fallback list of tournaments (used if dynamic fetching fails or as a supplement)
export const STATIC_TOURNAMENTS = [
    {
      id: 'lca_launch_open_2025_games',
      name: 'LCA Launch Open 2025 Juniors',
    },
    {
      id: 'cdc_tournament_3_2025_games',
      name: 'CDC Tournament 3 2025 Games',
    },
    
  ] as const;

  // For backwards compatibility
  export const TOURNAMENTS = STATIC_TOURNAMENTS;

  // Create a type for valid tournament IDs
  export type TournamentId = string;
