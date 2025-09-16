"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { clsx } from "clsx"
import { Shield, Loader2 } from "lucide-react"

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  color?: 'primary' | 'secondary' | 'gray'; // Added color prop
  isLoading?: boolean; // Added isLoading prop
}

export function NavLink({ href, children, color, isLoading }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  const colorClasses = {
    primary: isActive ? "bg-blue-600 text-white" : "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900",
    secondary: isActive ? "bg-purple-600 text-white" : "text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900",
    gray: isActive ? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200" : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
  };

  return (
    <Link
      href={href}
      className={clsx(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-200 inline-flex items-center justify-center gap-1.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "leading-tight tracking-tightest", // Added for compact text and tight tracking
        isLoading && "opacity-75 cursor-not-allowed", // Dim and disable when loading
        colorClasses[color || 'gray'], // Default to gray if no color specified
      )}
      aria-disabled={isLoading}
      onClick={(e) => {
        if (isLoading) {
          e.preventDefault();
        }
      }}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" /> // Increased icon size
      ) : (
        <Shield className="h-5 w-5" aria-hidden /> // Increased icon size
      )}
      {children}
    </Link>
  )
}


