'use server'

import { createClient } from '@/utils/supabase/server'

export async function getPlayersWithPerformanceStats() {
  try {
    const supabase = await createClient()
    
    // First get players with non-null ratings (sorted)
    const { data: playersWithRating, error: ratingError } = await supabase
      .from('local_active_players_duplicate')
      .select('id, lim_id, surname, firstname, normalized_name, unique_no, federation, cf_rating, avg_performance_rating, performance_count, sex, bdate, performance_stats')
      .not('avg_performance_rating', 'is', null)
      .order('avg_performance_rating', { ascending: false })

    if (ratingError) {
      console.error('Error fetching players with ratings:', ratingError)
      return { data: null, error: ratingError.message }
    }

    // Then get players with null ratings
    const { data: playersWithoutRating, error: noRatingError } = await supabase
      .from('local_active_players_duplicate')
      .select('id, lim_id, surname, firstname, normalized_name, unique_no, federation, cf_rating, avg_performance_rating, performance_count, sex, bdate, performance_stats')
      .is('avg_performance_rating', null)

    if (noRatingError) {
      console.error('Error fetching players without ratings:', noRatingError)
      return { data: null, error: noRatingError.message }
    }

    // Combine the results (players with ratings first, then players without ratings)
    const combinedData = [...(playersWithRating || []), ...(playersWithoutRating || [])]

    return { data: combinedData, error: null }
  } catch (error) {
    console.error('Unexpected error in getPlayersWithPerformanceStats:', error)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

export async function getPlayerPerformanceDetails(playerId: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('local_active_players_duplicate')
      .select('performance_stats, avg_performance_rating, performance_count, sex, bdate')
      .eq('id', playerId)
      .single()

    if (error) {
      console.error('Error fetching player performance:', error)
      return { data: null, error: error.message }
    }

    // Parse performance_stats if it's a string (JSONB might come as string)
    let performanceStats = data.performance_stats
    if (typeof performanceStats === 'string') {
      try {
        performanceStats = JSON.parse(performanceStats)
      } catch (parseError) {
        console.error('Error parsing performance_stats:', parseError)
        performanceStats = []
      }
    }

    // Ensure it's an array and handle potential null/undefined
    const parsedStats = Array.isArray(performanceStats) ? performanceStats : []

    return {
      data: {
        ...data,
        performance_stats: parsedStats
      },
      error: null
    }
  } catch (error) {
    console.error('Unexpected error in getPlayerPerformanceDetails:', error)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

export async function getPerformanceStatsSummary() {
  try {
    const supabase = await createClient()

    // Count players who have performance data (non-null avg_performance_rating)
    const { count: playersWithStats, error: countError } = await supabase
      .from('local_active_players_duplicate')
      .select('*', { count: 'exact', head: true })
      .not('avg_performance_rating', 'is', null)

    if (countError) {
      console.error('Error counting players with performance stats:', countError)
      return { data: null, error: countError.message }
    }

    // Get average of all performance ratings
    const { data: avgData, error: avgError } = await supabase
      .from('local_active_players_duplicate')
      .select('avg_performance_rating')
      .not('avg_performance_rating', 'is', null)

    if (avgError) {
      console.error('Error calculating average:', avgError)
      return { data: null, error: avgError.message }
    }

    let averageRating = null
    if (avgData && avgData.length > 0) {
      const totalAvg = avgData.reduce((sum, item) => sum + item.avg_performance_rating, 0) / avgData.length
      averageRating = Math.round(totalAvg * 10) / 10 // Round to 1 decimal place
    }

    return {
      data: {
        playersWithStats: playersWithStats || 0,
        averageRating
      },
      error: null
    }
  } catch (error) {
    console.error('Unexpected error in getPerformanceStatsSummary:', error)
    return { data: null, error: 'Unexpected error occurred' }
  }
}
