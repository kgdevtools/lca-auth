// src/app/admin/admin-dashboard/page.tsx

import { Suspense } from 'react'
import DashboardOverview from './components/DashboardOverview'
import type { Metadata } from 'next'
import { createClient } from '@/utils/supabase/server'

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Administration panel for Limpopo Chess Academy.',
}

async function getAdminName(): Promise<string> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Admin'
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    return profile?.full_name || user.email?.split('@')[0] || 'Admin'
  } catch {
    return 'Admin'
  }
}

export default async function AdminDashboardPage() {
  const adminName = await getAdminName()

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="pb-6 border-b border-border mb-8 flex items-start justify-between gap-6">
        {/* Left — page identity */}
        <div>
          <h1 className="font-mono font-bold tracking-tighter text-2xl leading-tight text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-[11px] font-mono text-muted-foreground mt-1">
            Limpopo Chess Academy
          </p>
        </div>

        {/* Right — personalised welcome */}
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Welcome back,
          </p>
          <p className="font-mono font-bold tracking-tighter text-lg leading-tight text-foreground mt-0.5">
            {adminName}
          </p>
        </div>
      </div>

      {/* Four-section stats overview */}
      <Suspense
        fallback={
          <div className="space-y-8">
            {[4, 2, 1, 1].map((statCount, s) => (
              <div key={s} className="pb-8 border-b border-border/50 last:border-b-0">
                <div className="h-2.5 w-20 bg-muted animate-pulse rounded-sm mb-4" />
                <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                  {[...Array(statCount)].map((_, i) => (
                    <div key={i}>
                      <div className="h-7 w-10 bg-muted animate-pulse rounded-sm" />
                      <div className="h-2.5 w-16 bg-muted animate-pulse rounded-sm mt-1.5" />
                    </div>
                  ))}
                </div>
                {s < 2 && (
                  <div className="flex gap-3 mt-3">
                    <div className="h-2.5 w-14 bg-muted animate-pulse rounded-sm" />
                    <div className="h-2.5 w-32 bg-muted animate-pulse rounded-sm" />
                    <div className="h-2.5 w-16 bg-muted animate-pulse rounded-sm" />
                  </div>
                )}
              </div>
            ))}
          </div>
        }
      >
        <DashboardOverview />
      </Suspense>
    </div>
  )
}
