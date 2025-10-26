"use client"

import * as React from "react"
import { Menu, X, UserPlus } from "lucide-react"
import { NavLink } from "@/components/nav-links"
import { usePathname } from "next/navigation"

interface MobileNavProps {
  isAuthenticated: boolean
  isAdmin?: boolean
}

export function MobileNav({ isAuthenticated, isAdmin = false }: MobileNavProps) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  const containerRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current) return
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside)
    }
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  // Close menu on route change
  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className="relative md:hidden" ref={containerRef}>
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-offset-2"
      >
        {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded-md border bg-white dark:bg-neutral-900 p-2 shadow-md z-50"
        >
          <div className="flex flex-col gap-1 items-start">
            {isAuthenticated ? (
              <NavLink href="/user/profile" color="primary">
                My Profile
              </NavLink>
            ) : null}
            {isAdmin ? (
              <NavLink href="/admin/upload-tournament" color="gray">
                Upload Tournament
              </NavLink>
            ) : null}
            {isAdmin ? (
              <NavLink href="/admin/admin-dashboard" color="gray">
                Admin Dashboard
              </NavLink>
            ) : null}

            {isAuthenticated ? (
              <NavLink href="/game-view" color="gray">
                View Games
              </NavLink>
            ) : null}

            {isAuthenticated ? (
              <NavLink href="/add-game" color="gray">
                Add Game
              </NavLink>
            ) : null}

            {/* {isAuthenticated ? <NavLink href="/user/user-dashboard" color="secondary">User Dashboard</NavLink> : null} */}
            <NavLink href="/tournaments" color="gray">
              Tournaments
            </NavLink>
            {/* Rankings
            <NavLink href="/rankings" color="gray">
              Rankings
            </NavLink> */}
            <NavLink href="/blog" color="gray">
             <span className="absolute -top-1 -right-1 bg-cyan-600 text-white text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-sm whitespace-nowrap shadow-sm">
          Beta
        </span>
              Blog
            </NavLink>
            {/* View Games */}
            <NavLink href="/view" color="gray">
             <span className="absolute -top-1 -right-1 bg-cyan-600 text-white text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-sm whitespace-nowrap shadow-sm">
          Beta
        </span>
              View Games
            </NavLink>
            <NavLink href="/forms" color="gray" badge="Register">
              Join Academy
            </NavLink>
            {!isAuthenticated && (
              <span className="rounded-md px-3 py-1.5 text-sm font-medium opacity-60 cursor-not-allowed select-none inline-flex items-center gap-1">
                <UserPlus className="h-4 w-4" />
                Sign Up
              </span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
