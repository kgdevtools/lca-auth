'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Users,
  Trophy,
  Home,
  UserCircle,
  Menu,
  X,
  ChevronLeft,
  Star,
  Database,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { createClient } from '@/utils/supabase/client'

const sidebarItems = [
  {
    title: 'Overview',
    href: '/admin/admin-dashboard',
    icon: Home,
  },
  {
    title: 'Tournaments',
    href: '/admin/admin-dashboard/tournaments',
    icon: Trophy,
  },
  {
    title: 'Active Players',
    href: '/admin/admin-dashboard/active-players',
    icon: Star,
  },
  {
    title: 'All Players',
    href: '/admin/admin-dashboard/all-players',
    icon: Users,
  },
  {
    title: 'Profiles',
    href: '/admin/admin-dashboard/profiles',
    icon: UserCircle,
  },
]

interface AdminSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function AdminSidebar({ collapsed = false, onToggleCollapse }: AdminSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const pathname = usePathname()

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(profileData)
      }
    }
    fetchUser()
  }, [])

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="px-3 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className={`${collapsed ? 'hidden' : 'block'}`}>
            <h1 className="text-base font-bold text-gray-800 dark:text-gray-100 tracking-tighter leading-tight">
              Chess Academy
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400 tracking-tight leading-tight">
              Admin Dashboard
            </p>
          </div>
          <button
            onClick={() => {
              setMobileOpen(false)
              onToggleCollapse?.()
            }}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {collapsed ? (
              <Menu className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`
                flex items-center px-2.5 py-2 rounded-md text-sm font-medium
                transition-all duration-150
                ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? item.title : undefined}
            >
              <Icon
                className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4 mr-2.5'} ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : ''
                } flex-shrink-0`}
              />
              {!collapsed && (
                <span className="tracking-tight leading-tight">{item.title}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700">
        <div
          className={`flex items-center gap-2.5 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Avatar
            name={profile?.full_name || user?.email || 'Admin'}
            size={32}
            className="flex-shrink-0"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate tracking-tight leading-tight">
                {profile?.full_name || 'Admin'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 truncate tracking-tight leading-tight">
                {user?.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`
        fixed inset-y-0 left-0 z-50
        w-64 bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700
        transform transition-transform duration-300 ease-in-out
        lg:hidden flex flex-col
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      >
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div
        className={`
        hidden lg:flex lg:flex-col
        fixed inset-y-0 left-0 z-30
        ${collapsed ? 'w-16' : 'w-64'}
        bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-in-out
      `}
      >
        <SidebarContent />
      </div>

      {/* Desktop Sidebar Spacer */}
      <div className={`hidden lg:block ${collapsed ? 'w-16' : 'w-64'} flex-shrink-0`} />
    </>
  )
}
