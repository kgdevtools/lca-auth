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
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const user = data.user

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { var t = localStorage.getItem('theme'); var d = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches); if (d) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); } catch (e) {} })();`,
          }}
        />
        <header className="w-full border-b border-black/10">
          <nav className="px-1 sm:px-2 h-16 flex items-center justify-between relative">
            <div className="flex items-center gap-2 h-full">
              <Link href="/" className="inline-flex items-center gap-2 h-full" aria-label="Limpopo Chess Academy">
                <span className="relative h-full w-[160px] sm:w-[200px] md:w-[240px]">
                  <Image
                    src="/Picture1.png"
                    alt="Limpopo Chess Academy"
                    fill
                    priority
                    className="object-contain block dark:hidden"
                    sizes="(min-width: 1024px) 240px, (min-width: 768px) 200px, 160px"
                  />
                  <Image
                    src="/LCA_Logo_Dark.png"
                    alt="Limpopo Chess Academy"
                    fill
                    priority
                    className="object-contain hidden dark:block"
                    sizes="(min-width: 1024px) 240px, (min-width: 768px) 200px, 160px"
                  />
                </span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                {user ? (
                  <NavLink href="/user/profile" color="primary">
                    My Profile
                  </NavLink>
                ) : null}
                {user ? (
                  <NavLink href="/user/user-dashboard" color="secondary">
                    User Dashboard
                  </NavLink>
                ) : null}
                {user ? (
                  <NavLink href="/admin/admin-dashboard" color="gray">
                    Admin Dashboard
                  </NavLink>
                ) : null}
                {user ? (
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
                <NavLink href="/forms" color="gray">
                  Forms
                </NavLink>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ThemeToggle />
              <MobileNav isAuthenticated={Boolean(user)} />
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
      </body>
    </html>
  )
}
