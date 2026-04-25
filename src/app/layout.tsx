import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { Avatar } from "@/components/ui/avatar";
import { NavGroup } from "@/components/nav-links";
import { LogIn } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { createClient } from "@/utils/supabase/server";
import FooterNav from "@/components/footer-nav";
import { Toaster } from "sonner";
import AutoSyncProvider from "@/components/AutoSyncProvider";
import HeaderMobileNav from "@/components/HeaderMobileNav";
import { ScrollNavbar } from "@/components/ScrollNavbar";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: "Limpopo Chess Academy",
    template: "%s | Limpopo Chess Academy",
  },
  description:
    "Limpopo Chess Academy — Coaching, tournaments, rankings and registrations in Limpopo, South Africa.",
  icons: {
    icon: [
      { url: "/lca-cyan-dark-bg-updated.png", type: "image/png" },
      {
        url: "/lca-cyan-dark-bg-updated.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/lca-cyan-dark-bg-updated.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/lca-cyan-dark-bg-updated.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    other: [
      {
        rel: "icon",
        url: "/lca-cyan-dark-bg-updated.png",
      },
    ],
  },
  openGraph: {
    title: "Limpopo Chess Academy",
    description:
      "Limpopo Chess Academy — Coaching, tournaments, rankings and registrations in Limpopo, South Africa.",
    url: "https://limpopochessacademy.co.za",
    siteName: "Limpopo Chess Academy",
    images: [
      {
        url: "/lca-cyan-dark-bg-updated.png",
        width: 1200,
        height: 630,
        alt: "Limpopo Chess Academy Logo",
      },
    ],
    locale: "en_ZA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Limpopo Chess Academy",
    description:
      "Limpopo Chess Academy — Coaching, tournaments, rankings and registrations in Limpopo, South Africa.",
    images: ["/lca-cyan-dark-bg-updated.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';
  const isAuthPage = pathname === '/login' || pathname.startsWith('/signup');
  const isProtectedPage = pathname.startsWith('/user') || pathname.startsWith('/admin') || pathname.startsWith('/academy');

  let user = null;
  let isAdmin = false;

  if (!isAuthPage) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      isAdmin = profile?.role === "admin";
    }
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { var t = localStorage.getItem('theme'); var d = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches); if (d) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark'); } catch (e) {} })();`,
          }}
        />

        {isAuthPage && (
          <div className="fixed top-4 right-4 z-10">
            <ThemeToggle />
          </div>
        )}

        {!isAuthPage && (
          <ScrollNavbar>
            <header className="w-full backdrop-blur-md bg-background/60 dark:bg-background/95 shadow-sm">
              <nav className="px-1 sm:px-2 h-20 flex items-center relative gap-2">
                {/* Logo — far left */}
                <Link
                  href="/"
                  className="inline-flex items-center h-full px-1 flex-shrink-0"
                  aria-label="Limpopo Chess Academy"
                >
                  <div className="relative h-[68px] w-[84px] transition-all duration-300 ease-in-out hover:scale-105">
                    <Image
                      src="/lca_pawn_light_bg.png"
                      alt="Limpopo Chess Academy"
                      fill
                      priority
                      className="object-contain block dark:hidden"
                      sizes="84px"
                    />
                    <Image
                      src="/lca_pawn_dark_bg.png"
                      alt="Limpopo Chess Academy"
                      fill
                      priority
                      className="object-contain hidden dark:block"
                      sizes="84px"
                    />
                  </div>
                </Link>

                {/* Spacer — pushes nav links right */}
                <div className="flex-1" />

                {/* Nav links — right of center */}
                <div className="hidden md:flex items-center gap-0.5">
                  <NavGroup
                    label="LCA DB"
                    groupIcon="database"
                    items={[
                      { href: "/tournaments", label: "Tournaments", icon: "trophy"    },
                      { href: "/view",        label: "View Games",  icon: "gamepad"   },
                      { href: "/rankings",    label: "Rankings",    icon: "trending"  },
                      { href: "/blog",        label: "Blog",        icon: "newspaper" },
                    ]}
                  />
                  <NavGroup
                    label="Community"
                    groupIcon="user-plus"
                    items={[
                      { href: "/events",           label: "Calendar",   icon: "calendar",   sectionLabel: "Events"     },
                      { href: "/forms",            label: "Join Us",    icon: "user-plus",  sectionLabel: "Membership" },
                      { href: "/about",            label: "About",      icon: "info",       sectionLabel: "Info"       },
                      { href: "/forms/contact-us", label: "Contact Us", icon: "phone"                                  },
                    ]}
                  />
                  {isAdmin && (
                    <>
                      <div className="w-px h-5 bg-border mx-1" />
                      <NavGroup
                        label="Admin"
                        groupIcon="shield"
                        items={[
                          { href: "/admin/admin-dashboard",   label: "Dashboard",      icon: "layout-dashboard" },
                          { href: "/add-game",                label: "Add Game",       icon: "gamepad"          },
                          { href: "/admin/upload-tournament", label: "Add Tournament", icon: "upload"           },
                        ]}
                      />
                    </>
                  )}
                </div>

                {/* Right section */}
                <div className="flex items-center gap-2 flex-shrink-0 pr-2 sm:pr-4">
                  <ThemeToggle />
                  <HeaderMobileNav isAuthenticated={Boolean(user)} isAdmin={isAdmin} />
                  {user ? (
                    <form
                      action={async () => {
                        "use server";
                        const server = await createClient();
                        await server.auth.signOut();
                        redirect("/login");
                      }}
                      className="flex items-center gap-2"
                    >
                      {/* Avatar doubles as dashboard link */}
                      <Link
                        href="/user/overview"
                        className="rounded-full ring-2 ring-transparent hover:ring-primary/40 transition-all"
                        aria-label="Go to dashboard"
                      >
                        <Avatar name={user.email ?? "User"} />
                      </Link>
                      <button
                        className="hidden md:block font-mono font-semibold tracking-wider text-xs uppercase rounded-sm border border-border px-3 py-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors whitespace-nowrap"
                        type="submit"
                      >
                        Sign out
                      </button>
                    </form>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="font-mono font-semibold tracking-wider text-xs uppercase rounded-sm border border-border px-3 py-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors inline-flex items-center gap-1.5"
                      >
                        <LogIn className="h-3.5 w-3.5" aria-hidden />
                        Login
                      </Link>
                      <Link
                        href="/signup"
                        className="font-mono font-semibold tracking-wider text-xs uppercase rounded-sm border border-border px-3 py-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-colors"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </header>
          </ScrollNavbar>
        )}

        <main className={isAuthPage ? "flex-1" : "flex-1 pt-20"}>{children}</main>

        {!isAuthPage && !isProtectedPage && <FooterNav />}
        {!isAuthPage && <AutoSyncProvider />}
        <Toaster />
      </body>
    </html>
  );
}