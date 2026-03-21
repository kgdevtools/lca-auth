import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { exchangeCodeForToken } from '@/services/lichessOauth.service'
import { getLichessAccount } from '@/services/lichess.service'
import { upsertLichessConnection } from '@/repositories/lichessConnectionRepo'

// ─────────────────────────────────────────────────────────────────────────────
// Cookie names (must match the initiation route)
// ─────────────────────────────────────────────────────────────────────────────

const COOKIE_CODE_VERIFIER = 'lichess_code_verifier'
const COOKIE_STATE = 'lichess_state'
const COOKIE_REDIRECT = 'lichess_redirect'

const DEFAULT_REDIRECT = '/user/profile'

// ─────────────────────────────────────────────────────────────────────────────
// Helper — clears all PKCE cookies and redirects
// ─────────────────────────────────────────────────────────────────────────────

function clearCookiesAndRedirect(
  request: NextRequest,
  destination: string
): NextResponse {
  const response = NextResponse.redirect(new URL(destination, request.url))
  const expired = { maxAge: 0, path: '/' }
  response.cookies.set(COOKIE_CODE_VERIFIER, '', expired)
  response.cookies.set(COOKIE_STATE, '', expired)
  response.cookies.set(COOKIE_REDIRECT, '', expired)
  return response
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/lichess/callback
// Lichess redirects here after the user authorises (or denies) the request.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  // Where to send the user after we're done (stored as a non-httpOnly cookie
  // so we can read it here even though it was written by the initiation route)
  const redirectTo = request.cookies.get(COOKIE_REDIRECT)?.value ?? DEFAULT_REDIRECT

  // ── 1. Handle user-denied or other OAuth-level errors ──────────────────────
  if (oauthError) {
    console.warn('[api/auth/lichess/callback] OAuth error from Lichess:', oauthError)
    return clearCookiesAndRedirect(request, `${redirectTo}?lichess=denied`)
  }

  // ── 2. Validate required query params ─────────────────────────────────────
  if (!code || !state) {
    console.error('[api/auth/lichess/callback] Missing code or state param')
    return clearCookiesAndRedirect(request, `${redirectTo}?lichess=error`)
  }

  // ── 3. CSRF check — state must match what we stored ──────────────────────
  const storedState = request.cookies.get(COOKIE_STATE)?.value
  if (!storedState || storedState !== state) {
    console.error('[api/auth/lichess/callback] State mismatch — possible CSRF')
    return clearCookiesAndRedirect(request, `${redirectTo}?lichess=error`)
  }

  // ── 4. Retrieve PKCE code verifier ────────────────────────────────────────
  const codeVerifier = request.cookies.get(COOKIE_CODE_VERIFIER)?.value
  if (!codeVerifier) {
    console.error('[api/auth/lichess/callback] Missing code_verifier cookie')
    return clearCookiesAndRedirect(request, `${redirectTo}?lichess=error`)
  }

  // ── 5. Verify Supabase session — user must be logged in ───────────────────
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.warn('[api/auth/lichess/callback] No authenticated Supabase user')
    return clearCookiesAndRedirect(request, '/login')
  }

  // ── 6. Build redirect URI (must exactly match the one used in the auth URL) ─
  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/api/auth/lichess/callback`

  const clientId = process.env.LICHESS_CLIENT_ID
  if (!clientId) {
    console.error('[api/auth/lichess/callback] LICHESS_CLIENT_ID env var is not set')
    return clearCookiesAndRedirect(request, `${redirectTo}?lichess=error`)
  }

  try {
    // ── 7. Exchange authorization code for access token ─────────────────────
    const tokenData = await exchangeCodeForToken({
      code,
      codeVerifier,
      redirectUri,
      clientId,
    })

    // ── 8. Fetch the Lichess account to get the username ────────────────────
    const lichessUser = await getLichessAccount(tokenData.access_token)

    // ── 9. Persist the connection in Supabase ───────────────────────────────
    await upsertLichessConnection({
      user_id: user.id,
      lichess_username: lichessUser.username,
      access_token: tokenData.access_token,
      token_type: tokenData.token_type ?? 'Bearer',
      scope: tokenData.scope ?? '',
      expires_in: tokenData.expires_in ?? null,
    })

    // ── 10. Success — clear cookies and redirect ─────────────────────────────
    return clearCookiesAndRedirect(request, `${redirectTo}?lichess=connected`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[api/auth/lichess/callback] Unexpected error:', message)
    return clearCookiesAndRedirect(request, `${redirectTo}?lichess=error`)
  }
}
