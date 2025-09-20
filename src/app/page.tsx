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
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/forms"
            className="w-full max-w-md px-4 py-3 bg-green-700 dark:bg-green-600 text-white rounded-sm hover:bg-green-800 dark:hover:bg-green-700 font-semibold text-lg text-center transition"
          >
            Register for Limpopo Chess Academy Open 2025
          </Link>
        </div>
        <p className="text-lg text-muted-foreground sm:text-xl mt-2">
          View <Link href="/tournaments" className="underline text-primary hover:text-primary/80">current tournaments here</Link>.
        </p>
      </div>
    </section>
  );
}
