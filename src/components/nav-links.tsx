"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { clsx } from "clsx"
import { Shield } from "lucide-react"

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = pathname === href
  return (
    <Link
      href={href}
      className={clsx(
        "text-sm rounded-md px-2 py-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 inline-flex items-center gap-1.5 transition-colors",
        isActive
          ? "bg-primary/10 text-primary-foreground ring-primary dark:bg-primary/20"
          : "text-neutral-700 hover:text-black hover:bg-neutral-50 dark:text-neutral-200 dark:hover:text-white dark:hover:bg-white/10"
      )}
    >
      <Shield className="h-4 w-4" aria-hidden />
      {children}
    </Link>
  )
}


