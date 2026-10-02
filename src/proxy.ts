import { NextResponse, type NextRequest } from "next/server"

const OPEN_PATHS = [
  "/funding-pause",
  "/forms/contact-us",
  "/forms/register-player",
  "/rankings",
  // Crawler files, so search engines can index /rankings during the pause.
  "/robots.txt",
  "/sitemap.xml",
  // Games tab of the /rankings player profile, and its analysis engine.
  "/api/players/games",
  "/engine",
]

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (OPEN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next()
  }

  const destination = request.nextUrl.clone()
  destination.pathname = "/funding-pause"
  destination.search = ""
  return NextResponse.rewrite(destination, { status: 404 })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
