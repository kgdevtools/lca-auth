import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from '@supabase/ssr'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/user'
  
  if (!code) {
    return NextResponse.redirect(new URL('/login?message=No authorization code provided', request.url))
  }

  try {
    // We'll collect cookies set by Supabase so we can apply them to the final redirect response.
    const cookiesToWrite: Array<{ name: string; value: string; options?: any }> = []

    // Create a server client that uses the incoming request cookies and captures any
    // cookies Supabase wants to set (session, refresh token, etc.). We'll apply them
    // to the redirect response so the browser receives them.
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookies) {
            cookies.forEach(({ name, value, options }) => {
              cookiesToWrite.push({ name, value, options })
            })
          },
        },
      }
    )

    // Exchange code for a session
    const { data: { user, session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      return NextResponse.redirect(new URL(`/login?message=${encodeURIComponent(error.message)}`, request.url))
    }

    if (!user || !session) {
      return NextResponse.redirect(new URL('/login?message=Authentication failed', request.url))
    }

    // Check if this is email confirmation (new user without profile)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = profile?.role === 'admin'
    
    // Check user role to determine redirect destination
    let redirectPath = isAdmin ? '/admin/admin-dashboard' : '/user'

    // Check if this is a signup flow
    const cookieStore = request.cookies
    const isSignup = cookieStore.get('is_signup')?.value === 'true'
    
    if (isSignup) {
      const tournamentFullName = cookieStore.get('signup_tournament_fullname')?.value
      const chessaId = cookieStore.get('signup_chessa_id')?.value

      // Update profile with signup-specific fields if provided
      if (tournamentFullName || chessaId) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            tournament_fullname: tournamentFullName || null,
            chessa_id: chessaId || null,
          })
          .eq('id', user.id)

        if (updateError) {
          // Log error but don't block the flow - user can update profile later
        }
      }

      // Build redirect response and apply any Supabase cookies + clear the signup flags
      const response = NextResponse.redirect(new URL(redirectPath, request.url))
      // Debug: log which cookies Supabase wants to set (helps diagnose refresh token issues)
      // eslint-disable-next-line no-console
      console.log('Supabase cookies to write (signup):', cookiesToWrite.map(c => c.name))
      // Apply auth cookies returned by Supabase
      cookiesToWrite.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      // Clear signup helper cookies
      response.cookies.set('is_signup', '', { maxAge: 0 })
      response.cookies.set('signup_tournament_fullname', '', { maxAge: 0 })
      response.cookies.set('signup_chessa_id', '', { maxAge: 0 })
      return response
    }

    // Check if this is a password reset flow
    const isPasswordReset = requestUrl.searchParams.get('type') === 'recovery'
    if (isPasswordReset) {
      const response = NextResponse.redirect(new URL('/reset-password/confirm?' + requestUrl.searchParams, request.url))
      // Debug: log cookies requested during password recovery
      // eslint-disable-next-line no-console
      console.log('Supabase cookies to write (recovery):', cookiesToWrite.map(c => c.name))
      // Apply any Supabase auth cookies so the recovery flow can proceed
      cookiesToWrite.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      return response
    }

    // For regular login, include the auth cookies in the redirect response
    const response = NextResponse.redirect(new URL(redirectPath, request.url))
    // Debug: log cookies requested during regular login
    // eslint-disable-next-line no-console
    console.log('Supabase cookies to write (login):', cookiesToWrite.map(c => c.name))
    cookiesToWrite.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
    return response
    
  } catch (error) {
    return NextResponse.redirect(new URL('/login?message=An unexpected error occurred', request.url))
  }
}