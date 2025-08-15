import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { Avatar } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { RegistrationsTable } from "@/components/registrations-table"

export const dynamic = "force-dynamic"

export default async function PrivatePage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/login")
  }

  // Fetch player registrations (id, created_at, data_entry)
  const { data: registrations, error: registrationsError } = await supabase
    .from('playerRegistrations')
    .select('id, created_at, data_entry')
    .order('created_at', { ascending: false })
    .limit(50)

  // Optionally list users with Admin API if service role key is present
  let users: { id: string; email: string | null; created_at: string }[] = []
  let usersError: string | null = null
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (serviceKey) {
    try {
      const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
      const { data: usersData, error: usersErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 })
      if (usersErr) {
        usersError = usersErr.message
      } else if (usersData?.users) {
        users = usersData.users.map((u): { id: string; email: string | null; created_at: string } => ({ id: u.id, email: u.email ?? null, created_at: u.created_at }))
      }
    } catch (e) {
      usersError = e instanceof Error ? e.message : 'Failed to load users'
    }
  }

  return (
    <main className="min-h-dvh p-6">
      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar name={data.user.email ?? 'User'} size={40} />
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Signed in as</p>
                <p className="text-base font-medium">{data.user.email}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">User ID</span>
                <span className="font-mono text-[12px]">{data.user.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">Confirmed</span>
                <span className="font-medium">{data.user.email_confirmed_at ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted-foreground)]">Created</span>
                <span className="font-medium">{new Date(data.user.created_at).toLocaleString()}</span>
              </div>
            </div>
            <form className="mt-6" action={async () => {
              'use server'
              const server = await createClient()
              await server.auth.signOut()
              redirect('/login')
            }}>
              <button
                type="submit"
                className="w-full rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 text-sm font-semibold hover:brightness-95 focus-visible:ring-2 focus-visible:ring-offset-2"
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
              <p className="text-sm text-[var(--destructive)]">{registrationsError.message}</p>
            ) : (
              <RegistrationsTable registrations={(registrations as any) ?? []} />
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
                <p className="text-sm text-[var(--destructive)]">{usersError}</p>
              ) : users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-[var(--muted-foreground)]">
                      <tr>
                        <th className="py-2 pr-3">Email</th>
                        <th className="py-2 pr-3">User ID</th>
                        <th className="py-2 pr-3">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-t border-[var(--border)]">
                          <td className="py-2 pr-3">{u.email}</td>
                          <td className="py-2 pr-3 font-mono text-[12px]">{u.id}</td>
                          <td className="py-2 pr-3">{new Date(u.created_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted-foreground)]">No users found.</p>
              )
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">Set SUPABASE_SERVICE_ROLE_KEY to enable listing users.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}


