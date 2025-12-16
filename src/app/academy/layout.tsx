'use client'

import { useState } from 'react'
import AcademySidebar from '@/components/academy/AcademySidebar'

export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex pt-16 min-h-screen bg-gray-50 dark:bg-gray-900">
      <AcademySidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main Content */}
      <div className="flex-1">
        <div className="h-full overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
