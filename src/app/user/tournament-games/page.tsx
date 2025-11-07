import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WarningBanner } from '@/components/warning-banner'
import { Gamepad2 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tournament Games',
  description: 'View your individual tournament games',
}

export default async function TournamentGamesPage() {
  const supabase = await createClient()

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <WarningBanner message="Still under development: Some services may not work." />

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Tournament Games</h1>
        <p className="text-sm text-muted-foreground mt-1">View detailed game-by-game results from your tournaments</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Tournament Games Feature Coming Soon
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                We're working on bringing you detailed game-by-game analysis, move history, and performance insights for each tournament game you've played.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
