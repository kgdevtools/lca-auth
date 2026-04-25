import { Suspense } from 'react'
import { ProfilesTable } from './components/ProfilesTable'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Profiles | Admin Dashboard',
}

export default function ProfilesPage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="pb-5 border-b border-border mb-6">
        <h1 className="font-mono font-bold tracking-tighter text-2xl leading-tight text-foreground">
          User Profiles
        </h1>
        <p className="text-[11px] font-mono text-muted-foreground mt-1">
          Manage accounts, roles, and profile information
        </p>
      </div>

      <Suspense
        fallback={
          <div className="space-y-0">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4 py-3 border-b border-border/50">
                <div className="h-4 bg-muted animate-pulse rounded-sm w-1/3" />
                <div className="h-4 bg-muted animate-pulse rounded-sm w-1/4" />
                <div className="h-4 bg-muted animate-pulse rounded-sm w-1/6" />
              </div>
            ))}
          </div>
        }
      >
        <ProfilesTable />
      </Suspense>
    </div>
  )
}
