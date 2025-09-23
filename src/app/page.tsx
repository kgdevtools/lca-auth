import Link from "next/link"
import { WarningBanner } from "@/components/warning-banner"

export default function Home() {
  return (
    <section className="min-h-dvh px-4 py-16 mx-auto max-w-5xl grid place-items-center bg-background text-foreground">
      <div className="text-center space-y-8 animate-fade-in">
        <WarningBanner message="Still under development: Some services may not work." />

        <div className="space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            Welcome to{" "}
            <span className="text-primary font-extrabold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Limpopo
            </span>{" "}
            <span className="text-muted-foreground">Chess Academy's</span> home on the web
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Join our community of chess enthusiasts and take your game to the next level
          </p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <Link
            href="/forms"
            className="group relative w-full max-w-md px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 dark:from-green-500 dark:to-green-600 text-white rounded-lg hover:from-green-700 hover:to-green-800 dark:hover:from-green-600 dark:hover:to-green-700 font-semibold text-lg text-center transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative z-10">Register for Limpopo Chess Academy Open 2025</span>
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-green-400/20 to-green-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </Link>

          <p className="text-base text-muted-foreground">
            View{" "}
            <Link
              href="/tournaments"
              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium underline decoration-primary/30 underline-offset-4 hover:decoration-primary/60 transition-all duration-200"
            >
              current tournaments
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>{" "}
            here.
          </p>

                    <p className="text-base text-muted-foreground">
            View{" "}
            <Link
              href="/rankings"
              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 font-medium underline decoration-primary/30 underline-offset-4 hover:decoration-primary/60 transition-all duration-200"
            >
              current rankings 
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>{" "}
            here.
          </p>
        </div>
      </div>
    </section>
  )
}
