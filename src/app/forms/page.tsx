import Link from "next/link"

export default function FormsPage() {
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight text-center mb-8 text-foreground">
        Forms & Registrations
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border-2 border-border rounded shadow-sm p-6 flex flex-col min-h-[200px] transition-all hover:shadow-md hover:border-primary/20">
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-semibold mb-2 text-foreground tracking-tight leading-tight">
              LCA Academy Registrations
            </h2>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              Register as a player for the Limpopo Chess Academy.
            </p>
          </div>
          <Link
            href="/forms/register-player"
            className="mt-4 w-full block px-4 py-3 bg-primary text-primary-foreground rounded font-medium text-sm md:text-base text-center transition-all hover:bg-primary/90 hover:shadow-sm"
          >
            Register Player
          </Link>
        </div>

        <div className="bg-card border-2 border-border rounded shadow-sm p-6 flex flex-col min-h-[200px] transition-all hover:shadow-md hover:border-secondary/20">
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-semibold mb-2 text-foreground tracking-tight leading-tight">
              Tournament Registrations
            </h2>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              Register for the Limpopo Chess Academy Open 2025 tournament.
            </p>
          </div>
          <Link
            href="/forms/tournament-registration"
            className="mt-4 w-full block px-4 py-3 bg-secondary text-secondary-foreground rounded font-medium text-sm md:text-base text-center transition-all hover:bg-secondary/80 hover:shadow-sm"
          >
            LCA Open 2025 Registration
          </Link>
        </div>
      </div>
    </div>
  )
}
