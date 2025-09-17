'use client'

import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RegistrationsTable } from '@/components/registrations-table'
import { formatDateTimeUTC } from '@/lib/utils'
import { User } from '@supabase/supabase-js' // Keep this for now, as `user.id` is still used.
import { WarningBanner } from '@/components/warning-banner'
import { LocalActivePlayer, Tournament, UserProfile } from '@/types/database'
import { ProfilePageData } from './actions' // Import the new interface

interface UserDisplay {
  id: string;
  email: string;
  created_at: string;
}

interface ProfilePageProps extends ProfilePageData {}

export default function ProfilePage({
  profileData,
  registrations,
  registrationsError,
  users,
  usersError,
  serviceKey,
  signOutAction,
  user,
}: ProfilePageProps) {
  return (
    <main className="min-h-dvh p-6">
      <WarningBanner message="Still under development: Some services may not work." />
      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar name={profileData.name ?? 'User'} size={40} />
              <div>
                <p className="text-sm text-muted-foreground">Signed in as</p>
                <p className="text-base font-medium">{profileData.email}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-[12px]">{profileData.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Member Since</span>
                <span className="font-medium">{profileData.memberSince}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Rating</span>
                <span className="font-medium">{profileData.currentRating}</span>
              </div>
            </div>
            <form className="mt-6" action={signOutAction}>
              <button
                type="submit"
                className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:brightness-95 focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                Sign out
              </button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Player Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            {registrationsError ? (
              <p className="text-sm text-destructive">{registrationsError}</p>
            ) : (
              <RegistrationsTable registrations={registrations ?? []} />
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            {serviceKey ? (
              usersError ? (
                <p className="text-sm text-destructive">{usersError}</p>
              ) : users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-3">Email</th>
                        <th className="py-2 pr-3">User ID</th>
                        <th className="py-2 pr-3">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u: UserDisplay) => (
                        <tr key={u.id} className="border-t border-border">
                          <td className="py-2 pr-3">{u.email}</td>
                          <td className="py-2 pr-3 font-mono text-[12px]">{u.id}</td>
                          <td className="py-2 pr-3">{formatDateTimeUTC(u.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No users found.</p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">Set SUPABASE_SERVICE_ROLE_KEY to enable listing users.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
