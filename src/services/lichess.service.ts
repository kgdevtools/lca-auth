import type {
  LichessUser,
  LichessPuzzleActivityItem,
  LichessGameJson,
  LichessPuzzleDashboard,
} from '@/types/lichess'

const LICHESS_API = 'https://lichess.org'

// ─────────────────────────────────────────────────────────────────────────────
// Account
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated user's Lichess account profile.
 * Requires: preference:read scope
 * Endpoint: GET /api/account
 */
export async function getLichessAccount(accessToken: string): Promise<LichessUser> {
  const response = await fetch(`${LICHESS_API}/api/account`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[lichess.service] getLichessAccount failed:', response.status, text)
    throw new Error(`Failed to fetch Lichess account: ${response.status}`)
  }

  return response.json() as Promise<LichessUser>
}

/**
 * Fetch a public Lichess user profile by username (no auth required).
 * Endpoint: GET /api/user/{username}
 */
export async function getLichessUserByUsername(username: string): Promise<LichessUser> {
  const response = await fetch(`${LICHESS_API}/api/user/${encodeURIComponent(username)}`, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    console.error('[lichess.service] getLichessUserByUsername failed:', response.status)
    throw new Error(`Failed to fetch Lichess user '${username}': ${response.status}`)
  }

  return response.json() as Promise<LichessUser>
}

// ─────────────────────────────────────────────────────────────────────────────
// Puzzle Activity
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the authenticated user's recent puzzle activity (NDJSON stream).
 * Requires: puzzle:read scope
 * Endpoint: GET /api/puzzle/activity
 *
 * @param accessToken - The user's Lichess access token
 * @param max         - Maximum number of puzzle activity items to fetch (default 50)
 * @param before      - Only return activity before this Unix timestamp (ms), optional
 */
export async function getLichessPuzzleActivity(
  accessToken: string,
  max = 50,
  before?: number
): Promise<LichessPuzzleActivityItem[]> {
  const url = new URL(`${LICHESS_API}/api/puzzle/activity`)
  url.searchParams.set('max', String(max))
  if (before !== undefined) {
    url.searchParams.set('before', String(before))
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/x-ndjson',
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[lichess.service] getLichessPuzzleActivity failed:', response.status, text)
    throw new Error(`Failed to fetch puzzle activity: ${response.status}`)
  }

  // The response is NDJSON — one JSON object per line
  const text = await response.text()
  const lines = text.trim().split('\n').filter(Boolean)

  return lines.map((line) => JSON.parse(line) as LichessPuzzleActivityItem)
}

/**
 * Fetch the authenticated user's puzzle dashboard stats.
 * Requires: puzzle:read scope
 * Endpoint: GET /api/puzzle/dashboard/{days}
 *
 * @param accessToken - The user's Lichess access token
 * @param days        - Number of days of history (default 30)
 */
export async function getLichessPuzzleDashboard(
  accessToken: string,
  days = 30
): Promise<LichessPuzzleDashboard> {
  const response = await fetch(`${LICHESS_API}/api/puzzle/dashboard/${days}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    console.error('[lichess.service] getLichessPuzzleDashboard failed:', response.status)
    throw new Error(`Failed to fetch puzzle dashboard: ${response.status}`)
  }

  return response.json() as Promise<LichessPuzzleDashboard>
}

// ─────────────────────────────────────────────────────────────────────────────
// Games
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a user's recent games (NDJSON stream, JSON format).
 * Requires: game:read scope for private games
 * Endpoint: GET /api/games/user/{username}
 *
 * @param username    - Lichess username
 * @param accessToken - The user's Lichess access token (required for private games)
 * @param max         - Maximum number of games to return (default 20)
 * @param since       - Only return games since this Unix timestamp (ms), optional
 */
export async function getLichessRecentGames(
  username: string,
  accessToken: string,
  max = 20,
  since?: number
): Promise<LichessGameJson[]> {
  const url = new URL(`${LICHESS_API}/api/games/user/${encodeURIComponent(username)}`)
  url.searchParams.set('max', String(max))
  url.searchParams.set('opening', 'true')
  url.searchParams.set('pgnInJson', 'false')
  if (since !== undefined) {
    url.searchParams.set('since', String(since))
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/x-ndjson',
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    console.error('[lichess.service] getLichessRecentGames failed:', response.status, text)
    throw new Error(`Failed to fetch games for '${username}': ${response.status}`)
  }

  const text = await response.text()
  const lines = text.trim().split('\n').filter(Boolean)

  return lines.map((line) => JSON.parse(line) as LichessGameJson)
}

/**
 * Fetch a single game by ID (JSON format).
 * No auth required for public games.
 * Endpoint: GET /game/export/{gameId}
 *
 * @param gameId      - The Lichess game ID
 * @param accessToken - Optional access token for private games
 */
export async function getLichessGameById(
  gameId: string,
  accessToken?: string
): Promise<LichessGameJson> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const response = await fetch(`${LICHESS_API}/game/export/${encodeURIComponent(gameId)}`, {
    headers,
  })

  if (!response.ok) {
    console.error('[lichess.service] getLichessGameById failed:', response.status)
    throw new Error(`Failed to fetch game '${gameId}': ${response.status}`)
  }

  return response.json() as Promise<LichessGameJson>
}

// ─────────────────────────────────────────────────────────────────────────────
// Rating History
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch rating history for a user (all time controls).
 * No auth required.
 * Endpoint: GET /api/user/{username}/rating-history
 */
export async function getLichessRatingHistory(
  username: string
): Promise<Array<{ name: string; points: Array<[number, number, number, number]> }>> {
  const response = await fetch(
    `${LICHESS_API}/api/user/${encodeURIComponent(username)}/rating-history`,
    { headers: { Accept: 'application/json' } }
  )

  if (!response.ok) {
    console.error('[lichess.service] getLichessRatingHistory failed:', response.status)
    throw new Error(`Failed to fetch rating history for '${username}': ${response.status}`)
  }

  return response.json()
}
