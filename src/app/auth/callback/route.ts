import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"

export async function GET(request: NextRequest) {
  const nextUrl = new URL(request.nextUrl)
  const redirectTo = nextUrl.searchParams.get("next") || "/private"

  // Prepare the redirect response first, so we can attach cookies to it
  const response = NextResponse.redirect(new URL(redirectTo, request.url))

  // Create a Supabase server client bound to this request/response to ensure
  // the auth code is exchanged and cookies are set on this response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Explicitly exchange the OAuth code for a session to ensure cookies are set
  const code = nextUrl.searchParams.get('code')
  if (code) {
    const { data: sessionData } = await supabase.auth.exchangeCodeForSession(code)
    
    // Check if this is a signup flow
    const isSignup = request.cookies.get('is_signup')?.value === 'true'
    
    if (isSignup && sessionData?.user) {
      const tournamentFullName = request.cookies.get('signup_tournament_fullname')?.value
      const chessaId = request.cookies.get('signup_chessa_id')?.value
      
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', sessionData.user.id)
        .single()
      
      if (existingProfile) {
        // Update existing profile
        await supabase
          .from('profiles')
          .update({
            tournament_fullname: tournamentFullName || null,
            chessa_id: chessaId || null,
            full_name: sessionData.user.user_metadata?.full_name || sessionData.user.user_metadata?.name || null,
            avatar_url: sessionData.user.user_metadata?.avatar_url || null,
          })
          .eq('id', sessionData.user.id)
      } else {
        // Create new profile
        await supabase
          .from('profiles')
          .insert({
            id: sessionData.user.id,
            tournament_fullname: tournamentFullName || null,
            chessa_id: chessaId || null,
            full_name: sessionData.user.user_metadata?.full_name || sessionData.user.user_metadata?.name || null,
            avatar_url: sessionData.user.user_metadata?.avatar_url || null,
            role: 'student', // default role
          })
      }
      
      // Clear signup cookies
      response.cookies.delete('is_signup')
      response.cookies.delete('signup_tournament_fullname')
      response.cookies.delete('signup_chessa_id')
    } else if (sessionData?.user) {
      // Regular login - just ensure profile exists with basic info
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', sessionData.user.id)
        .single()
      
      if (!existingProfile) {
        // Create basic profile for login flow
        await supabase
          .from('profiles')
          .insert({
            id: sessionData.user.id,
            full_name: sessionData.user.user_metadata?.full_name || sessionData.user.user_metadata?.name || null,
            avatar_url: sessionData.user.user_metadata?.avatar_url || null,
            role: 'student',
          })
      }
    }
  } else {
    // Fallback: trigger user fetch to refresh cookies if already exchanged
    await supabase.auth.getUser()
  }

  return response
}


