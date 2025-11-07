'use client'

import { useState } from 'react'
import UserSidebar from '@/components/user/UserSidebar'

export default function UserLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex pt-16 min-h-screen bg-gray-50 dark:bg-gray-900">
      <UserSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
