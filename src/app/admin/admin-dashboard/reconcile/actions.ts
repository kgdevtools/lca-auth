'use server';

import { createClient } from '@/utils/supabase/server';
import { UnreconciledPlayer, ReconciliationStats, PlayerMatch } from '@/types/reconciliation';

export async function getUnreconciledPlayers(): Promise<UnreconciledPlayer[]> {
  const supabase = await createClient();

  try {
    // Get players without performance ratings (limited to 100 for performance)
    const { data: noPerformancePlayers, error: perfError } = await supabase
      .from('players')
      .select(`
        id,
        name,
        rating,
        federation,
        tie_breaks,
        created_at,
        tournament:tournament_id (tournament_name, date)
      `)
      .is('tie_breaks', null)
      .order('created_at', { ascending: false })
      .limit(100);

    if (perfError) throw perfError;

    // Get players with weak matches (limited to 100 for performance)
    const { data: weakMatchPlayers, error: weakError } = await supabase
      .from('master_players_duplicate')
      .select(`
        id,
        source_name,
        cf_rating,
        fed,
        title,
        confidence_score,
        weak_match,
        possible_alias,
        created_at
      `)
      .or('confidence_score.lt.0.6,confidence_score.is.null')
      .order('created_at', { ascending: false })
      .limit(100);

    if (weakError) throw weakError;

    // Transform data into consistent format
    const unreconciled: UnreconciledPlayer[] = [
      ...(noPerformancePlayers?.map(p => ({
        id: p.id,
        name: p.name,
        tournament_name: p.tournament?.[0]?.tournament_name || 'Unknown',
        tournament_date: p.tournament?.[0]?.date || '',
        player_rating: p.rating,
        federation: p.federation,
        tie_breaks: p.tie_breaks,
        performance_rating: null,
        confidence: 'LOW',
        status: 'no_performance' as const,
        source: 'players' as const,
        created_at: p.created_at
      })) || []),
      
      ...(weakMatchPlayers?.map(p => ({
        id: p.id,
        name: p.source_name,
        tournament_name: 'Multiple Tournaments',
        tournament_date: '',
        player_rating: p.cf_rating,
        federation: p.fed,
        tie_breaks: null,
        performance_rating: null,
        confidence: p.confidence_score?.toString() || 'LOW',
        status: 'weak_match' as const,
        source: 'master_players_duplicate' as const,
        weak_match_value: p.weak_match,
        possible_alias: p.possible_alias,
        created_at: p.created_at
      })) || [])
    ];

    return unreconciled;

  } catch (error) {
    console.error('Error fetching unreconciled players:', error);
    throw new Error('Failed to fetch unreconciled players');
  }
}

export async function getPlayerMatches(playerName: string): Promise<PlayerMatch[]> {
  const supabase = await createClient();

  try {
    // Get top 3 matches from chessa_cfplay using text search
    const { data: matches, error } = await supabase
      .from('chessa_cfplay')
      .select(`
        UNIQUE_NO,
        SURNAME,
        FIRSTNAME,
        RATING,
        FED,
        norm_sf
      `)
      .ilike('norm_sf', `%${playerName.toLowerCase().replace(/[^a-z]/g, '')}%`)
      .limit(3);

    if (error) throw error;

    return matches?.map(match => ({
      id: match.UNIQUE_NO?.toString() || '',
      name: `${match.SURNAME || ''}, ${match.FIRSTNAME || ''}`,
      rating: match.RATING,
      federation: match.FED,
      similarity_score: 0.7,
      source: 'chessa_cfplay'
    })) || [];
    
  } catch (error) {
    console.error('Error fetching player matches:', error);
    return [];
  }
}

export async function getReconciliationStats(): Promise<ReconciliationStats> {
  const supabase = await createClient();

  try {
    const [
      { count: noPerformanceCount },
      { count: weakMatchCount },
      { count: recentActivity }
    ] = await Promise.all([
      supabase.from('players').select('*', { count: 'exact', head: true }).is('tie_breaks', null),
      supabase.from('master_players_duplicate').select('*', { count: 'exact', head: true }).or('confidence_score.lt.0.6,confidence_score.is.null'),
      supabase.from('players').select('*', { count: 'exact', head: true }).gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    return {
      total_unreconciled: (noPerformanceCount || 0) + (weakMatchCount || 0),
      no_performance_count: noPerformanceCount || 0,
      weak_match_count: weakMatchCount || 0,
      new_player_count: 0,
      recent_activity: recentActivity || 0
    };

  } catch (error) {
    console.error('Error fetching reconciliation stats:', error);
    throw new Error('Failed to fetch reconciliation statistics');
  }
}

export async function exportReconciliationReport() {
  'use server';

  try {
    const supabase = await createClient();
    const players = await getUnreconciledPlayers();
    
    // Here you would implement your export logic
    // For example, convert to CSV, PDF, or trigger a download
    console.log('Exporting report for', players.length, 'players');

    // Return some data that can be used by the client
    return { success: true, count: players.length };
  } catch (error) {
    console.error('Export failed:', error);
    return { success: false, error: 'Export failed' };
  }
}
