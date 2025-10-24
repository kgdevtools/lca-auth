import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/utils/supabase/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/user'
  
  if (!code) {
    return NextResponse.redirect(new URL('/login?message=No authorization code provided', request.url))
  }

  try {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL(`/login?message=${encodeURIComponent(error.message)}`, request.url))
    }

    if (!user) {
      return NextResponse.redirect(new URL('/login?message=Authentication failed', request.url))
    }

    // Check user role to determine redirect destination
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    const isAdmin = profile?.role === 'admin'
    const redirectPath = isAdmin ? '/admin/admin-dashboard' : '/user'

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
          console.error('Error updating profile with signup data:', updateError)
        }
      }
      
      // Clear signup cookies by setting them with maxAge: 0
      const response = NextResponse.redirect(new URL(redirectPath, request.url))
      response.cookies.set('is_signup', '', { maxAge: 0 })
      response.cookies.set('signup_tournament_fullname', '', { maxAge: 0 })
      response.cookies.set('signup_chessa_id', '', { maxAge: 0 })
      return response
    }

    // For regular login, redirect based on user role
    return NextResponse.redirect(new URL(redirectPath, request.url))
    
  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    return NextResponse.redirect(new URL('/login?message=An unexpected error occurred', request.url))
  }
}