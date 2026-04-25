"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Menu, X, Trophy, TrendingUp, Gamepad2, Newspaper,
  Calendar, FileText, Shield, Upload, LayoutDashboard, UserPlus,
  Info, Phone,
} from "lucide-react";

interface MobileNavProps {
  isAuthenticated: boolean;
  isAdmin?: boolean;
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-mono font-bold tracking-widest uppercase text-muted-foreground/60 px-2 mb-1 mt-0.5">
      {children}
    </p>
  );
}

// ── Mobile nav item ──────────────────────────────────────────────────────────

function MobileNavItem({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-sm px-2.5 py-2.5 font-mono font-semibold tracking-tight text-[13px] transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-accent/50",
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0 opacity-70" />
      {children}
    </Link>
  );
}

// ── MobileNav ────────────────────────────────────────────────────────────────

export function MobileNav({ isAuthenticated, isAdmin = false }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Close on escape
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close on outside click
  React.useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Close on navigate
  React.useEffect(() => { setOpen(false); }, [pathname]);

  const close = () => setOpen(false);

  return (
    <div className="relative md:hidden" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-border bg-background/80 backdrop-blur-sm hover:bg-accent/50 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {open
          ? <X    className="h-4 w-4 text-muted-foreground" aria-hidden />
          : <Menu className="h-4 w-4 text-muted-foreground" aria-hidden />
        }
      </button>

      {/* Drawer */}
      {open && (
        <div
          role="menu"
          className="fixed top-20 left-3 right-3 rounded-sm border border-border bg-background/95 backdrop-blur-md shadow-lg z-[200] overflow-hidden"
        >
          <div className="flex flex-col gap-0 p-2.5">

            {/* Dashboard */}
            {isAuthenticated && (
              <>
                <MobileNavItem href="/user/overview" icon={LayoutDashboard} onClick={close}>
                  Dashboard
                </MobileNavItem>
                <div className="my-2 border-t border-border/50" />
              </>
            )}

            {/* LCA DB */}
            <SectionLabel>LCA DB</SectionLabel>
            <div className="space-y-0.5 mb-1">
              <MobileNavItem href="/tournaments" icon={Trophy}     onClick={close}>Tournaments</MobileNavItem>
              <MobileNavItem href="/view"        icon={Gamepad2}   onClick={close}>View Games</MobileNavItem>
              <MobileNavItem href="/rankings"    icon={TrendingUp} onClick={close}>Rankings</MobileNavItem>
              <MobileNavItem href="/blog"        icon={Newspaper}  onClick={close}>Blog</MobileNavItem>
            </div>

            <div className="my-2 border-t border-border/50" />

            {/* Community */}
            <SectionLabel>Community</SectionLabel>
            <div className="space-y-0.5 mb-1">
              <MobileNavItem href="/events"           icon={Calendar}  onClick={close}>Calendar</MobileNavItem>
              <MobileNavItem href="/forms"            icon={FileText}  onClick={close}>Join Us</MobileNavItem>
              <MobileNavItem href="/about"            icon={Info}      onClick={close}>About</MobileNavItem>
              <MobileNavItem href="/forms/contact-us" icon={Phone}     onClick={close}>Contact Us</MobileNavItem>
            </div>

            {/* Admin */}
            {isAdmin && (
              <>
                <div className="my-2 border-t border-border/50" />
                <SectionLabel>Admin</SectionLabel>
                <div className="space-y-0.5 mb-1">
                  <MobileNavItem href="/admin/admin-dashboard"   icon={Shield}          onClick={close}>Dashboard</MobileNavItem>
                  <MobileNavItem href="/add-game"                icon={Gamepad2}        onClick={close}>Add Game</MobileNavItem>
                  <MobileNavItem href="/admin/upload-tournament" icon={Upload}          onClick={close}>Add Tournament</MobileNavItem>
                </div>
              </>
            )}

            {/* Auth CTA — unauthenticated only */}
            {!isAuthenticated && (
              <>
                <div className="my-2 border-t border-border/50" />
                <MobileNavItem href="/signup" icon={UserPlus} onClick={close}>
                  Sign Up
                </MobileNavItem>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
