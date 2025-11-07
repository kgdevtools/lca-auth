'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Trophy,
  Gamepad2,
  UserCircle,
  Menu,
  ChevronLeft,
  Loader2,
} from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'

const sidebarItems = [
  {
    title: 'Overview',
    href: '/user/overview',
    icon: Home,
  },
  {
    title: 'Tournaments',
    href: '/user/tournaments',
    icon: Trophy,
  },
  {
    title: 'Tournament Games',
    href: '/user/tournament-games',
    icon: Gamepad2,
  },
  {
    title: 'Profile',
    href: '/user/profile',
    icon: UserCircle,
  },
]

interface UserSidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function UserSidebar({ collapsed = false, onToggleCollapse }: UserSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isPending, startTransition] = useTransition()
  const [loadingRoute, setLoadingRoute] = useState<string | null>(null)
  const pathname = usePathname()
  const router = useRouter()

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

  // Reset loading state when route changes
  useEffect(() => {
    setLoadingRoute(null)
  }, [pathname])

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="px-3 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between gap-2">
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Logo */}
              <div className="relative w-8 h-8 flex-shrink-0">
                <Image
                  src="/Picture1.png"
                  alt="LCA Logo"
                  fill
                  className="object-contain block dark:hidden"
                  sizes="32px"
                />
                <Image
                  src="/lca-cyan-dark-bg-updated.png"
                  alt="LCA Logo"
                  fill
                  className="object-contain hidden dark:block"
                  sizes="32px"
                />
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tighter leading-tight">
                  Limpopo Chess Academy
                </h1>
                <p className="text-xs text-gray-600 dark:text-gray-400 tracking-tighter leading-tight">
                  My Profile
                </p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="relative w-8 h-8 mx-auto">
              <Image
                src="/Picture1.png"
                alt="LCA Logo"
                fill
                className="object-contain block dark:hidden"
                sizes="32px"
              />
              <Image
                src="/lca-cyan-dark-bg-updated.png"
                alt="LCA Logo"
                fill
                className="object-contain hidden dark:block"
                sizes="32px"
              />
            </div>
          )}
          <button
            onClick={() => {
              setMobileOpen(false)
              onToggleCollapse?.()
            }}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0 hidden lg:block"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
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
          const isLoading = loadingRoute === item.href

          return (
            <button
              key={item.href}
              onClick={() => {
                setMobileOpen(false)
                if (pathname !== item.href) {
                  setLoadingRoute(item.href)
                  startTransition(() => {
                    router.push(item.href)
                  })
                }
              }}
              disabled={isLoading}
              className={`
                w-full flex items-center px-2.5 py-2 rounded-md text-sm font-medium
                transition-all duration-150
                ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }
                ${collapsed ? 'justify-center' : ''}
                ${isLoading ? 'opacity-70 cursor-wait' : ''}
              `}
              title={collapsed ? item.title : undefined}
            >
              {isLoading ? (
                <Loader2
                  className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4 mr-2.5'} animate-spin flex-shrink-0`}
                />
              ) : (
                <Icon
                  className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4 mr-2.5'} ${
                    isActive ? 'text-blue-600 dark:text-blue-400' : ''
                  } flex-shrink-0`}
                />
              )}
              {!collapsed && (
                <span className="tracking-tight leading-tight">{item.title}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User Profile */}
      <div className="px-3 py-3 border-t border-gray-200 dark:border-gray-700">
        <div
          className={`flex items-center gap-2.5 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Avatar
            name={profile?.full_name || user?.email || 'User'}
            size={32}
            className="flex-shrink-0"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate tracking-tight leading-tight">
                {profile?.full_name || 'User'}
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
        className="lg:hidden fixed top-20 left-4 z-40 p-2 rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
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
        fixed top-16 bottom-0 left-0 z-50
        w-72 bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700
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
        fixed top-16 bottom-0 left-0 z-30
        ${collapsed ? 'w-16' : 'w-72'}
        bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-in-out
      `}
      >
        <SidebarContent />
      </div>

      {/* Desktop Sidebar Spacer */}
      <div className={`hidden lg:block ${collapsed ? 'w-16' : 'w-72'} flex-shrink-0 transition-all duration-300`} />
    </>
  )
}
