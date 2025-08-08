import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { Avatar } from "@/components/ui/avatar"

export const dynamic = "force-dynamic"

export default async function PrivatePage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/login")
  }

  return (
    <main className="min-h-dvh p-6 grid place-items-center">
      <div className="w-full max-w-md rounded-xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Avatar name={data.user.email ?? 'User'} size={40} />
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
            <p className="text-sm text-neutral-600">Signed in as</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-600">Email</span>
            <span className="font-medium">{data.user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-600">User ID</span>
            <span className="font-mono text-[12px]">{data.user.id}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-600">Confirmed</span>
            <span className="font-medium">{data.user.email_confirmed_at ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-600">Provider</span>
            <span className="font-medium">Google</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-600">Created</span>
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
      </div>
    </main>
  )
}


