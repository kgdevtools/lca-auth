import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { pathname } = request.nextUrl;

  // Skip auth check on public auth pages — avoids stale-token refresh errors
  if (pathname === '/login' || pathname.startsWith('/signup')) {
    response.headers.set('x-pathname', pathname)
    return response
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated — redirect protected routes to login
  if (
    (pathname.startsWith("/admin") ||
      pathname.startsWith("/user") ||
      pathname.startsWith("/academy")) &&
    !user
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  // Authenticated but role is null — block /academy, redirect to Join page
  if (user && pathname.startsWith("/academy")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile?.role) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/forms";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  response.headers.set('x-pathname', pathname)
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
