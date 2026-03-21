import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import {
  generateCodeVerifier,
  generateState,
  generateCodeChallenge,
  buildAuthorizationUrl,
  LICHESS_SCOPES,
} from '@/services/lichessOauth.service'

export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated with Supabase before starting OAuth
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('message', 'Please log in to connect your Lichess account')
      return NextResponse.redirect(loginUrl)
    }

    // Where to send the user after OAuth completes (or fails)
    const redirectTo =
      request.nextUrl.searchParams.get('redirect') || '/user/profile'

    // Check whether this user already has a Lichess connection
    const { data: existing } = await supabase
      .from('lichess_connections')
      .select('status, is_active')
      .eq('user_id', user.id)
      .single()

    if (existing?.is_active && existing?.status === 'active') {
      const url = new URL(redirectTo, request.url)
      url.searchParams.set('lichess', 'already_connected')
      return NextResponse.redirect(url)
    }

    if (existing?.status === 'pending_reconnect') {
      const url = new URL(redirectTo, request.url)
      url.searchParams.set('lichess', 'pending_approval')
      return NextResponse.redirect(url)
    }

    // Derive the app origin from the incoming request so this works in
    // both development (localhost:8008) and production without an extra env var.
    const appOrigin = new URL(request.url).origin
    const redirectUri = `${appOrigin}/api/auth/lichess/callback`
    const clientId = process.env.LICHESS_CLIENT_ID

    if (!clientId) {
      console.error('[api/auth/lichess] LICHESS_CLIENT_ID env var is not set')
      const url = new URL(redirectTo, request.url)
      url.searchParams.set('lichess', 'error')
      return NextResponse.redirect(url)
    }

    // Generate PKCE values
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = generateState()

    // Build the Lichess authorization URL
    const authUrl = buildAuthorizationUrl({
      clientId,
      redirectUri,
      scope: LICHESS_SCOPES,
      codeChallenge,
      state,
    })

    // Redirect to Lichess and set PKCE + state in short-lived HTTP-only cookies
    const response = NextResponse.redirect(authUrl)

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 600, // 10 minutes — long enough for the user to authorize on Lichess
      path: '/',
    }

    response.cookies.set('lichess_code_verifier', codeVerifier, cookieOptions)
    response.cookies.set('lichess_state', state, cookieOptions)

    // Store the post-OAuth redirect destination — not sensitive, so httpOnly=false
    // is fine and makes it easier to read in the callback without special handling.
    response.cookies.set('lichess_redirect', redirectTo, {
      ...cookieOptions,
      httpOnly: false,
    })

    return response
  } catch (error) {
    console.error('[api/auth/lichess] Unexpected error initiating OAuth:', error)
    return NextResponse.redirect(new URL('/user/profile?lichess=error', request.url))
  }
}
