"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { clsx } from "clsx"
import { Shield, Loader2, Users, Trophy, FileText } from "lucide-react"
import { useState, ReactNode } from "react"

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  color?: 'primary' | 'secondary' | 'gray';
  isLoading?: boolean;
  icon?: ReactNode;
}

export function NavLink({ href, children, color, isLoading: externalLoading, icon }: NavLinkProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [internalLoading, setInternalLoading] = useState(false)
  const isActive = pathname === href
  const isLoading = externalLoading || internalLoading

  const colorClasses = {
    primary: isActive ? "bg-blue-600 text-white" : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900",
    secondary: isActive ? "bg-purple-600 text-white" : "text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900",
    gray: isActive ? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200" : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
  };

  const getDefaultIcon = (href: string) => {
    if (href.includes('/players')) return <Users className="h-4 w-4" />
    if (href.includes('/tournaments')) return <Trophy className="h-4 w-4" />
    if (href.includes('/forms')) return <FileText className="h-4 w-4" />
    return <Shield className="h-4 w-4" />
  }

  const handleClick = (e: React.MouseEvent) => {
    if (isLoading || isActive) {
      e.preventDefault();
      return;
    }
    
    // Show loading state for navigation
    setInternalLoading(true)
    
    // Navigate programmatically
    router.push(href)
    
    // Reset loading state after a delay (navigation should complete)
    setTimeout(() => setInternalLoading(false), 1500)
  }

  return (
    <Link
      href={href}
      className={clsx(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 inline-flex items-center justify-center gap-1.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "leading-tight tracking-tightest",
        isLoading && "opacity-75 cursor-not-allowed",
        isActive && "pointer-events-none", // Disable clicks on active link
        colorClasses[color || 'gray'],
      )}
      aria-disabled={isLoading}
      onClick={handleClick}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        icon || getDefaultIcon(href)
      )}
      {children}
    </Link>
  )
}


