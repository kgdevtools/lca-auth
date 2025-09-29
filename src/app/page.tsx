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
          </p>
        </div>
      </div>
    </section>
  )
}