"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Trophy, TrendingUp, Gamepad2, Newspaper, Database, Shield,
  Upload, Calendar, FileText, UserPlus, ChevronDown, Loader2,
  LayoutDashboard, Plus, Info, Phone,
} from "lucide-react"
import { useState, ReactNode, Fragment } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ── Icon registry ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy:             Trophy,
  trending:           TrendingUp,
  gamepad:            Gamepad2,
  newspaper:          Newspaper,
  database:           Database,
  shield:             Shield,
  upload:             Upload,
  calendar:           Calendar,
  "file-text":        FileText,
  "user-plus":        UserPlus,
  "layout-dashboard": LayoutDashboard,
  plus:               Plus,
  info:               Info,
  phone:              Phone,
}

// ── NavLink ──────────────────────────────────────────────────────────────────

interface NavLinkProps {
  href: string
  children: React.ReactNode
  color?: "primary" | "secondary" | "gray"
  isLoading?: boolean
  icon?: ReactNode
  badge?: string
}

export function NavLink({ href, children, color, isLoading: externalLoading, icon, badge }: NavLinkProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [internalLoading, setInternalLoading] = useState(false)
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href + "/"))
  const isLoading = externalLoading || internalLoading

  const colorClasses: Record<string, string> = {
    primary: isActive
      ? "bg-primary/10 text-primary"
      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
    secondary: isActive
      ? "bg-primary/10 text-primary"
      : "text-primary/80 hover:bg-primary/10 hover:text-primary",
    gray: isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
  }

  const handleClick = (e: React.MouseEvent) => {
    if (isLoading || isActive) { e.preventDefault(); return }
    setInternalLoading(true)
    router.push(href)
    setTimeout(() => setInternalLoading(false), 1500)
  }

  return (
    <div className="relative inline-flex">
      <Link
        href={href}
        className={cn(
          "rounded-sm px-3.5 py-2 font-mono font-semibold tracking-wider text-xs uppercase leading-none transition-colors duration-150 inline-flex items-center gap-1.5",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isLoading && "opacity-60 cursor-not-allowed",
          isActive && "pointer-events-none",
          colorClasses[color || "gray"],
        )}
        aria-disabled={isLoading}
        onClick={handleClick}
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
        {children}
      </Link>
      {badge && (
        <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-sm whitespace-nowrap shadow-sm">
          {badge}
        </span>
      )}
    </div>
  )
}

// ── NavGroup ─────────────────────────────────────────────────────────────────

interface NavGroupItem {
  href: string
  label: string
  icon?: string
  sectionLabel?: string  // renders a sub-header (with divider for all sections after the first)
}

interface NavGroupProps {
  label: string
  groupIcon?: string
  items: NavGroupItem[]
}

export function NavGroup({ label, groupIcon, items }: NavGroupProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const isAnyActive = items.some(
    item => pathname === item.href || pathname.startsWith(item.href + "/"),
  )

  const GroupIconCmp = groupIcon ? ICON_MAP[groupIcon] : null
  const hasSections = items.some(item => item.sectionLabel)

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "rounded-sm px-3.5 py-2 transition-colors duration-150 inline-flex items-center gap-1.5",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            isAnyActive
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
        >
          {GroupIconCmp && <GroupIconCmp className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />}
          <span className="font-mono font-semibold tracking-wider text-xs uppercase leading-none">
            {label}
          </span>
          <ChevronDown
            className={cn(
              "h-3 w-3 opacity-50 transition-transform duration-200 flex-shrink-0",
              isOpen && "rotate-180",
            )}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="min-w-[200px] bg-background border border-border rounded-sm p-1.5 shadow-md"
        sideOffset={8}
      >
        {/* Top group label — only rendered when no per-item section labels are used */}
        {!hasSections && (
          <div className="px-2 pt-1.5 pb-2">
            <p className="text-[10px] font-mono font-bold tracking-widest uppercase text-muted-foreground/50">
              {label}
            </p>
          </div>
        )}

        <div className="space-y-0.5">
          {items.map((item, idx) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const IconCmp = item.icon ? ICON_MAP[item.icon] : null
            const prevHadSection = items.slice(0, idx).some(i => i.sectionLabel)
            const showDivider = item.sectionLabel && prevHadSection
            return (
              <Fragment key={item.href}>
                {item.sectionLabel && (
                  <>
                    {showDivider && <div className="my-1.5 border-t border-border/40" />}
                    <div className="px-2 py-1">
                      <p className="text-[10px] font-mono font-bold tracking-widest uppercase text-muted-foreground/50">
                        {item.sectionLabel}
                      </p>
                    </div>
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-sm px-2.5 py-2 font-mono font-semibold tracking-tight text-[13px] transition-colors w-full cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-accent/50",
                    )}
                  >
                    {IconCmp && <IconCmp className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />}
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              </Fragment>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
