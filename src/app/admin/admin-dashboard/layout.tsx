// src/app/admin/admin-dashboard/layout.tsx
'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  Trophy,
Calculator,
Download,
RefreshCw,
  BarChart3,
  Settings,
  Database,
  Shield,
  Home,
  UserCheck,
  Menu,
  X
} from 'lucide-react'

interface AdminDashboardLayoutProps {
  children: ReactNode
}

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
  title: 'Performance Ratings',
  href: '/admin/admin-dashboard/performance',
  icon: BarChart3
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

export default function AdminDashboardLayout({ children }: AdminDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  return (
    <div className="flex h-screen bg-gray-50">
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
        w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Chess Academy</h1>
            <p className="text-sm text-gray-600">Admin Dashboard</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5 text-gray-600" />
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
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
              >
                <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-blue-600' : ''}`} />
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b px-3 py-2 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-base font-semibold text-gray-800">Dashboard</h1>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <div className="p-3 lg:p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
