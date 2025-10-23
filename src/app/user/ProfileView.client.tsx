"use client"
import { Avatar } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WarningBanner } from '@/components/warning-banner'
import type { ProfilePageData } from './actions'

interface Props extends ProfilePageData {}

const getRoleColor = (role: string) => {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'bg-gradient-to-br from-purple-500 to-purple-700'
    case 'coach':
      return 'bg-gradient-to-br from-blue-500 to-blue-700'
    case 'student':
      return 'bg-gradient-to-br from-green-500 to-green-700'
    default:
      return 'bg-gradient-to-br from-gray-500 to-gray-700'
  }
}

export default function ProfileView({ user, profile, profileError, signOutAction }: Props) {
  const memberSince = user.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
    : 'Unknown'

  const roleColor = profile?.role ? getRoleColor(profile.role) : getRoleColor('student')

  return (
    <main className="min-h-dvh p-6">
      <WarningBanner message="Still under development: Some services may not work." />
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>
        
        {profileError && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{profileError}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6">
          {/* Avatar & Role Card */}
          <Card className={`${roleColor} text-white border-0`}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Avatar 
                  name={profile?.full_name || profile?.tournament_fullname || user.email || 'User'} 
                  size={64} 
                />
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">
                    {profile?.full_name || profile?.tournament_fullname || 'User'}
                  </h2>
                  <p className="text-white/90 text-sm">{user.email}</p>
                  <div className="mt-2 inline-block px-3 py-1 rounded-full bg-white/20 text-sm font-semibold uppercase">
                    {profile?.role || 'Student'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">Email:</span>
                  <span>{user.email}</span>
                </div>
                
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">Full Name:</span>
                  <span>{profile?.full_name || '—'}</span>
                </div>
                
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">Tournament Name:</span>
                  <span>{profile?.tournament_fullname || '—'}</span>
                </div>
                
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">ChessA ID:</span>
                  <span>{profile?.chessa_id || '—'}</span>
                </div>
                
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">Member Since:</span>
                  <span>{memberSince}</span>
                </div>
                
                <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                  <span className="text-muted-foreground font-medium">User ID:</span>
                  <span className="font-mono text-xs">{user.id}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-full rounded-md bg-destructive text-destructive-foreground px-4 py-2 text-sm font-semibold hover:bg-destructive/90 focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  Sign out
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
