'use client'

import { useState } from 'react'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex pt-16 min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
