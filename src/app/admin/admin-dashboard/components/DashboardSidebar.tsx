// src/app/admin/admin-dashboard/components/DashboardSidebar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Users, 
  Trophy, 
  BarChart3, 
  Settings, 
  Database,
  Shield,
  Home,
  UserCheck,
  X
} from 'lucide-react'

const sidebarItems = [
  { 
    title: 'Overview', 
    href: '/admin/admin-dashboard', 
    icon: Home 
  },
  { 
    title: 'Tournaments', 
    href: '/admin/admin-dashboard/tournaments', 
    icon: Trophy 
  },
  { 
    title: 'Players', 
    href: '/admin/admin-dashboard/players', 
    icon: Users 
  },
  { 
    title: 'Analytics', 
    href: '/admin/admin-dashboard/analytics', 
    icon: BarChart3 
  },
  { 
    title: 'User Management', 
    href: '/admin/admin-dashboard/users', 
    icon: UserCheck 
  },
  { 
    title: 'Data Management', 
    href: '/admin/admin-dashboard/data', 
    icon: Database 
  },
  { 
    title: 'Security', 
    href: '/admin/admin-dashboard/security', 
    icon: Shield 
  },
  { 
    title: 'Settings', 
    href: '/admin/admin-dashboard/settings', 
    icon: Settings 
  },
]

export default function DashboardSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30
        w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Chess Academy</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Admin Dashboard</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="mt-6 px-3 pb-4">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-3 py-2.5 mt-1 rounded-lg text-sm font-medium
                  transition-colors duration-200
                  ${isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700 dark:border-blue-400' 
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
                  }
                `}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
