'use client'

import Link from 'next/link'
import { WarningBanner } from '@/components/warning-banner'

export default function PrivatePage() {
  return (
    <div className="min-h-screen p-6 bg-background flex flex-col items-center justify-center">
      <WarningBanner message="Still under development: This page is under construction." />
      <div className="mt-8 text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4">Welcome to the Private Area!</h1>
        <p className="text-lg text-muted-foreground mb-6">
          You've reached a private section of the application.
          Please navigate to one of the dashboards or explore tournaments:
        </p>
        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          <Link href="/user/user-dashboard" className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
            Go to User Dashboard
          </Link>
          <Link href="/admin/admin-dashboard" className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-secondary text-secondary-foreground hover:bg-secondary/80 h-10 px-4 py-2">
            Go to Admin Dashboard
          </Link>
          <Link href="/tournaments" className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            Browse Tournaments
          </Link>
        </div>
      </div>
    </div>
  )
}
