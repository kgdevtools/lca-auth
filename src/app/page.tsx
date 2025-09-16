import Link from "next/link"
import { WarningBanner } from '@/components/warning-banner'

export default function Home() {
  return (
    <section className="min-h-dvh px-4 py-16 mx-auto max-w-5xl grid place-items-center bg-background text-foreground">
      <div className="text-center space-y-6">
        <WarningBanner message="Still under development: Some services may not work." />
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter">
          Welcome to <span className="text-primary font-extrabold tracking-tightest">Limpopo</span> <span className="text-muted-foreground">Chess Academy's</span> home on the web
        </h1>
        <p className="text-lg text-muted-foreground sm:text-xl">
          Sign in to access your private dashboard, or <Link href="/tournaments" className="underline text-primary hover:text-primary/80">view current tournaments here</Link>.
        </p>
      </div>
    </section>
  );
}
