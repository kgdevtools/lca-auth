// src/app/view/config.ts

// This is a shared configuration file that can be safely imported by both client and server components.

// Define and export the list of available tournaments
export const TOURNAMENTS = [
    {
      id: 'tournament-games',
      name: 'LCA Launch Open 2025 Juniors',
    },
    {
      id: 'cdc_tournament_3_2025',
      name: 'CDC Tournament 3 2025',
    },
    {
      // CORRECTED: Database table names typically use underscores, not dashes.
      // This is the most likely cause of the "no games" issue for this tournament.
      id: 'cdc_jq_tournament_7_2025_u20_games',
      name: 'Capricorn District Qualifying 7 u20',
    },
  ] as const;
  
  // Create a type for valid tournament IDs from the TOURNAMENTS constant
  export type TournamentId = typeof TOURNAMENTS[number]['id'];
