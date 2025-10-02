import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Forms & Registrations",
  description: "Register players and tournaments at Limpopo Chess Academy.",
}

export default function FormsPage() {
  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Forms & Registrations</h1>
        <p className="text-sm text-muted-foreground mt-2">Manage academy and tournament registrations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Academy/Club */}
        <section className="group">
          <div className="relative rounded-lg border border-border bg-card p-5 sm:p-6 transition-colors group-hover:border-primary/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">LCA Academy Registrations</h3>
                <p className="text-sm text-muted-foreground mt-1">Register as a player for the Limpopo Chess Academy.</p>
              </div>
            </div>
            <Link
              href="/forms/register-player"
              className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse-slow"
            >
              LCA Registration
            </Link>
          </div>
        </section>

        {/* Tournaments */}
        <section className="group">
          <div className="relative rounded-lg border border-border bg-card p-5 sm:p-6 transition-colors group-hover:border-secondary/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Tournament Registrations</h3>
                <p className="text-sm text-muted-foreground mt-1">Register for the Limpopo Open 2025 tournament.</p>
              </div>
            </div>
            <Link
              href="/forms/tournament-registration"
              className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-green-600 hover:bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse-slow"
            >
              Limpopo Open 2025 Registration
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
