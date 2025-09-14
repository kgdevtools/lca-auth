import { createClient } from '@/utils/supabase/client';

export interface OpponentDetails {
  id: string;
  full_name?: string;
  rating?: number;
  rank: number;
  federation?: string;
  tournament_points?: number;
}

export class OpponentLookupService {
  private cache = new Map<string, Map<number, OpponentDetails>>();

  /**
   * Get all players in a tournament indexed by rank
   */
  async getTournamentPlayersByRank(tournamentId: string): Promise<Map<number, OpponentDetails>> {
    // Check cache first
    if (this.cache.has(tournamentId)) {
      return this.cache.get(tournamentId)!;
    }

    try {
      const supabase = createClient(); // REMOVE await - this is browser client
      const { data: players, error } = await supabase
        .from('players')
        .select(`
          id,
          full_name,
          rating,
          rank,
          federation,
          tournament_points
        `)
        .eq('tournament_id', tournamentId)
        .not('rank', 'is', null)
        .order('rank', { ascending: true });

      if (error) throw error;

      // Create a map for lookup by rank
      const playerMap = new Map<number, OpponentDetails>();

      players?.forEach(player => {
        if (player.rank !== null) {
          playerMap.set(player.rank, {
            id: player.id,
            full_name: player.full_name,
            rating: player.rating,
            rank: player.rank,
            federation: player.federation,
            tournament_points: player.tournament_points
          });
        }
      });

      // Cache for future lookups
      this.cache.set(tournamentId, playerMap);

      return playerMap;
    } catch (error) {
      console.error('Error fetching tournament players:', error);
      return new Map();
    }
  }

  /**
   * Get opponent details by rank number
   */
  async getOpponentByRank(
    tournamentId: string,
    opponentRank: number
  ): Promise<OpponentDetails | null> {
    try {
      const playerMap = await this.getTournamentPlayersByRank(tournamentId);
      return playerMap.get(opponentRank) || null;
    } catch (error) {
      console.error('Error looking up opponent by rank:', error);
      return null;
    }
  }

  /**
   * Clear cache for a specific tournament or all tournaments
   */
  clearCache(tournamentId?: string) {
    if (tournamentId) {
      this.cache.delete(tournamentId);
    } else {
      this.cache.clear();
    }
  }
}

export const opponentLookupService = new OpponentLookupService();
