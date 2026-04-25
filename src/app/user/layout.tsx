'use client'

import { useState } from 'react'
import { JetBrains_Mono } from 'next/font/google'
import UserSidebar from '@/components/user/UserSidebar'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={`${jetbrainsMono.variable} flex h-screen overflow-hidden bg-background tracking-tighter leading-tight`}
      style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
    >
      <UserSidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />
      <main className="flex-1 pt-20 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
