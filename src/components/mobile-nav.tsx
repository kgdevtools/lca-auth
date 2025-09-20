"use client"

import * as React from "react"
import { Menu, X } from "lucide-react"
import { NavLink } from "@/components/nav-links"
import { usePathname } from "next/navigation"

interface MobileNavProps {
  isAuthenticated: boolean
}

export function MobileNav({ isAuthenticated }: MobileNavProps) {
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
          <div className="flex flex-col gap-1">
            {isAuthenticated ? <NavLink href="/user/profile" color="primary">My Profile</NavLink> : null}
            {isAuthenticated ? <NavLink href="/admin/upload-tournament" color="gray">Upload Tournament</NavLink> : null}
            {isAuthenticated ? <NavLink href="/admin/admin-dashboard" color="gray">Admin Dashboard Overview</NavLink> : null}
            {isAuthenticated ? <NavLink href="/user/user-dashboard" color="secondary">User Dashboard</NavLink> : null}
            <NavLink href="/tournaments" color="gray">Tournaments</NavLink>
            <NavLink href="/players" color="gray">Players</NavLink>
            <NavLink href="/forms" color="gray">Join Academy</NavLink>
            {!isAuthenticated && <span className="rounded-md px-3 py-1.5 text-sm font-medium opacity-60 cursor-not-allowed select-none">Sign Up</span>}
          </div>
        </div>
      ) : null}
    </div>
  )
}


