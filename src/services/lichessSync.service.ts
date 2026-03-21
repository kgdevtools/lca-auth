import { getLichessConnectionByUserId, updateLastSynced } from '@/repositories/lichessConnectionRepo'
import { getLichessPuzzleActivity, getLichessRecentGames } from '@/services/lichess.service'
import type { LichessSyncResult } from '@/types/lichess'

/**
 * Syncs a student's Lichess activity.
 * Fetches recent puzzle attempts and games from the Lichess API,
 * then updates the last_synced_at timestamp in lichess_connections.
 *
 * Returns early (not an error) if the user has no active Lichess connection.
 * This is the expected state for users who have not yet connected.
 */
export async function syncStudentLichessActivity(
  userId: string
): Promise<LichessSyncResult> {
  // Fetch the user's Lichess connection (includes the access token)
  const connection = await getLichessConnectionByUserId(userId)

  // No connection — normal state, not an error
  if (!connection) {
    return {
      success: false,
      username: null,
      puzzlesSynced: 0,
      gamesSynced: 0,
      syncedAt: new Date().toISOString(),
      error: 'No active Lichess connection found',
    }
  }

  // Connection exists but has been deactivated / is pending reconnect
  if (!connection.is_active || connection.status !== 'active') {
    return {
      success: false,
      username: connection.lichess_username,
      puzzlesSynced: 0,
      gamesSynced: 0,
      syncedAt: new Date().toISOString(),
      error: 'Lichess connection is not active',
    }
  }

  let puzzlesSynced = 0
  let gamesSynced = 0

  try {
    // Fetch recent puzzle activity (last 50 attempts)
    const puzzleActivity = await getLichessPuzzleActivity(connection.access_token, 50)
    puzzlesSynced = puzzleActivity.length

    // Fetch recent games (last 20)
    const games = await getLichessRecentGames(
      connection.lichess_username,
      connection.access_token,
      20
    )
    gamesSynced = games.length

    // Update the last_synced_at timestamp in the database
    await updateLastSynced(userId)

    return {
      success: true,
      username: connection.lichess_username,
      puzzlesSynced,
      gamesSynced,
      syncedAt: new Date().toISOString(),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error'
    console.error('[lichessSync.service] Sync failed for userId:', userId, message)

    return {
      success: false,
      username: connection.lichess_username,
      puzzlesSynced,
      gamesSynced,
      syncedAt: new Date().toISOString(),
      error: message,
    }
  }
}
