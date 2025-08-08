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
    await supabase.auth.exchangeCodeForSession(code)
  } else {
    // Fallback: trigger user fetch to refresh cookies if already exchanged
    await supabase.auth.getUser()
  }

  return response
}


