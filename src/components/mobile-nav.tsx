"use client";

import * as React from "react";
import { Menu, X, UserPlus, Trophy, Calendar, TrendingUp, Newspaper, Gamepad2, FileText, Shield, Upload } from "lucide-react";
import { NavLink } from "@/components/nav-links";
import { usePathname } from "next/navigation";

interface MobileNavProps {
  isAuthenticated: boolean;
  isAdmin?: boolean;
}

export function MobileNav({
  isAuthenticated,
  isAdmin = false,
}: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside);
    }
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="relative md:hidden" ref={containerRef}>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {open ? (
          <X className="h-4 w-4 text-gray-700 dark:text-gray-300" aria-hidden />
        ) : (
          <Menu className="h-4 w-4 text-gray-700 dark:text-gray-300" aria-hidden />
        )}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-sm border border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md p-2 shadow-lg"
        >
          <div className="flex flex-col gap-0.5">
            {/* User Section */}
            {isAuthenticated ? (
              <NavLink href="/user/overview" color="secondary">
                Dashboard
              </NavLink>
            ) : null}
            
            {/* Main Nav */}
            <div className="px-3 py-1.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1">Chess</p>
              <div className="flex flex-col gap-0.5">
                <NavLink href="/tournaments" color="gray" icon={<Trophy className="h-4 w-4" />}>
                  Tournaments
                </NavLink>
                <NavLink href="/rankings" color="gray" icon={<TrendingUp className="h-4 w-4" />}>
                  Rankings
                </NavLink>
                <NavLink href="/view" color="gray" icon={<Gamepad2 className="h-4 w-4" />}>
                  Games
                </NavLink>
              </div>
            </div>

            <div className="border-t border-gray-100 dark:border-gray-800 my-1" />

            {/* Community */}
            <div className="px-3 py-1.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1">Community</p>
              <div className="flex flex-col gap-0.5">
                <NavLink href="/events" color="gray" icon={<Calendar className="h-4 w-4" />}>
                  Events
                </NavLink>
                <NavLink href="/blog" color="gray" icon={<Newspaper className="h-4 w-4" />}>
                  Blog
                </NavLink>
                <NavLink href="/forms" color="gray" icon={<FileText className="h-4 w-4" />}>
                  Join
                </NavLink>
              </div>
            </div>

            {/* Admin Section */}
            {isAdmin && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                <div className="px-3 py-1.5">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-medium mb-1">Admin</p>
                  <div className="flex flex-col gap-0.5">
                    <NavLink href="/admin/admin-dashboard" color="gray" icon={<Shield className="h-4 w-4" />}>
                      Admin Dashboard
                    </NavLink>
                    <NavLink href="/admin/upload-tournament" color="gray" icon={<Upload className="h-4 w-4" />}>
                      Upload Tournament
                    </NavLink>
                  </div>
                </div>
              </>
            )}

            {/* User Actions */}
            {isAuthenticated && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                <div className="px-3 py-1.5">
                  <div className="flex flex-col gap-0.5">
                    <NavLink href="/add-game" color="gray" icon={<Gamepad2 className="h-4 w-4" />}>
                      Add Game
                    </NavLink>
                  </div>
                </div>
              </>
            )}

            {/* Auth */}
            {!isAuthenticated && (
              <>
                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                <div className="px-3 py-1.5">
                  <span className="flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium text-gray-500 cursor-not-allowed opacity-60">
                    <UserPlus className="h-4 w-4" />
                    Sign Up
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
