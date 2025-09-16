'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Trophy,
  User,
  X,
  Menu
} from 'lucide-react'

interface UserDashboardLayoutProps {
  children: ReactNode
}

const sidebarItems = [
  {
    title: 'Dashboard',
    href: '/user/user-dashboard',
    icon: Home
  },
  {
    title: 'My Tournaments',
    href: '/user/user-dashboard/tournaments',
    icon: Trophy
  },
  {
    title: 'Profile',
    href: '/user/user-dashboard/profile',
    icon: User
  },
]

export default function UserDashboardLayout({ children }: UserDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-card shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h1 className="text-lg font-bold text-foreground">Chess Academy</h1>
            <p className="text-sm text-muted-foreground">User Dashboard</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-muted"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-2 pb-3">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-3 py-2 mt-1 rounded-lg text-sm font-medium
                  transition-colors duration-200
                  ${isActive
                    ? 'bg-accent text-accent-foreground border-r-2 border-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-primary' : ''}`} />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden bg-card border-b border-border px-3 py-2 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded-md hover:bg-muted"
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-base font-semibold text-foreground">Dashboard</h1>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="p-3 lg:p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
