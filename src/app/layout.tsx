import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import Link from "next/link"
import Image from "next/image"
import { Avatar } from "@/components/ui/avatar"
import { NavLink } from "@/components/nav-links"
import { LogIn } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { MobileNav } from "@/components/mobile-nav"
import { createClient } from "@/utils/supabase/server"
import FooterNav from "@/components/footer-nav"
import { Toaster } from "sonner"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Limpopo Chess Academy",
    template: "%s | Limpopo Chess Academy",
  },
  description:
    "Limpopo Chess Academy — Coaching, tournaments, rankings and registrations in Limpopo, South Africa.",
  icons: {
    icon: [
      { url: '/lca-cyan-dark-bg-updated.png', type: 'image/png' },
      { url: '/lca-cyan-dark-bg-updated.png', sizes: '32x32', type: 'image/png' },
      { url: '/lca-cyan-dark-bg-updated.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/lca-cyan-dark-bg-updated.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'icon',
        url: '/lca-cyan-dark-bg-updated.png',
      },
    ],
  },
  openGraph: {
    title: "Limpopo Chess Academy",
    description: "Limpopo Chess Academy — Coaching, tournaments, rankings and registrations in Limpopo, South Africa.",
    url: "https://limpopochessacademy.co.za",
    siteName: "Limpopo Chess Academy",
    images: [
      {
        url: '/lca-cyan-dark-bg-updated.png',
        width: 1200,
        height: 630,
        alt: 'Limpopo Chess Academy Logo',
      },
    ],
    locale: 'en_ZA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Limpopo Chess Academy",
    description: "Limpopo Chess Academy — Coaching, tournaments, rankings and registrations in Limpopo, South Africa.",
    images: ['/lca-cyan-dark-bg-updated.png'],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user

  // Fetch user role from profiles table
  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    isAdmin = profile?.role === 'admin'
  }

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { var t = localStorage.getItem('theme'); var d = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches); if (d) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); } catch (e) {} })();`,
          }}
        />
        <header className="w-full">
          <nav className="px-1 sm:px-2 h-16 flex items-center justify-between relative">
            <div className="flex items-center gap-2 h-full">
              <Link href="/" className="inline-flex items-center gap-2 h-full p-2" aria-label="Limpopo Chess Academy">
                {/* We've wrapped the images in a div to apply the styles */}
                <div
                  className="relative h-full w-[160px] sm:w-[200px] md:w-[240px]
                             transition-all duration-300 ease-in-out
                             hover:scale-105 
                             shadow-[0_4px_10px_rgba(0,0,0,0.05)]
                             hover:shadow-[0_8px_25px_rgba(0,0,0,0.1)]
                             dark:shadow-[0_4px_10px_rgba(0,0,0,0.2),_0_0_20px_rgba(255,255,255,0.05)]
                             dark:hover:shadow-[0_8px_25px_rgba(0,0,0,0.3),_0_0_30px_rgba(255,255,255,0.1)]
                             rounded-lg" // Optional: gives a slightly softer look
                >
                  <Image
                    src="/Picture1.png"
                    alt="Limpopo Chess Academy"
                    fill
                    priority
                    className="object-contain block dark:hidden rounded-lg"
                    sizes="(min-width: 1024px) 240px, (min-width: 768px) 200px, 160px"
                  />
                  <Image
                    src="/lca-cyan-dark-bg-updated.png"
                    alt="Limpopo Chess Academy"
                    fill
                    priority
                    className="object-contain hidden dark:block rounded-lg"
                    sizes="(min-width: 1024px) 240px, (min-width: 768px) 200px, 160px"
                  />
                </div>
              </Link>
              <div className="hidden md:flex items-center gap-1">

                {user ? (
                  <NavLink href="/user" color="secondary">
                    User Dashboard
                  </NavLink>
                ) : null}
                {isAdmin ? (
                  <NavLink href="/admin/admin-dashboard" color="gray">
                    Admin Dashboard
                  </NavLink>
                ) : null}
                              {user ? (
                  <NavLink href="/add-game" color="gray">
                    Add Game
                  </NavLink>
                ) : null}
                {isAdmin ? (
                  <NavLink href="/admin/upload-tournament" color="gray">
                    Upload Tournament
                  </NavLink>
                ) : null}
                <NavLink href="/tournaments" color="gray">
                  Tournaments
                </NavLink>
                <NavLink href="/rankings" color="gray">
                  Rankings
                </NavLink>
                <NavLink href="/blog" color="gray">
                  Blog
                </NavLink>
                <NavLink href="/forms" color="gray" badge="Register">
                  Forms
                </NavLink>
                
                <NavLink href="/view" color="gray">
                  View Games
                </NavLink>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ThemeToggle />
              <MobileNav isAuthenticated={Boolean(user)} isAdmin={isAdmin} />
              {user ? (
                <form
                  action={async () => {
                    "use server"
                    const server = await createClient()
                    await server.auth.signOut()
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Avatar name={user.email ?? "User"} />
                    <span className="text-sm text-neutral-700 dark:text-neutral-200 hidden lg:inline max-w-32 truncate">
                      {user.email}
                    </span>
                    <button
                      className="text-xs rounded-md border px-2 py-1 hover:bg-neutral-50 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-offset-2 whitespace-nowrap"
                      type="submit"
                    >
                      Sign out
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <span
                    className="text-xs rounded-md border px-2 py-1 opacity-60 cursor-not-allowed select-none inline-flex items-center gap-1 pointer-events-none"
                    aria-disabled="true"
                  >
                    <LogIn className="h-3 w-3" aria-hidden />
                    <span>Login</span>
                  </span>
                  <span
                    className="text-xs rounded-md border px-2 py-1 opacity-60 cursor-not-allowed select-none inline-flex items-center gap-1"
                    aria-disabled="true"
                  >
                    Sign Up
                  </span>
                </>
              )}
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <FooterNav />
        <Toaster />
      </body>
    </html>
  )
}