import Link from "next/link"
import { Coffee, Mail, ShieldCheck } from "lucide-react"

const coffeeMessage = encodeURIComponent(
  "Hello Limpopo Chess Academy. I would like to buy you a coffee and support the website initiative.",
)

export default function FundingPausePage() {
  return (
    <main className="min-h-[calc(100vh-8rem)] bg-background px-4 py-12 text-foreground sm:px-6 sm:py-20">
      <section className="mx-auto flex max-w-3xl flex-col border border-border bg-card">
        <div className="border-b border-border px-6 py-5 sm:px-10">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="grid h-9 w-9 place-items-center border border-border bg-background text-primary">
              <span className="text-xl" aria-hidden="true">♟</span>
            </span>
            <span>Limpopo Chess Academy</span>
          </div>
        </div>

        <div className="px-6 py-10 sm:px-10 sm:py-14">
          <p className="mb-4 text-sm font-medium text-primary">Website temporarily unavailable</p>
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            We need a little help to bring the site back.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Unfortunately, we have run out of the funds needed to maintain this website and the
            services that keep it running. If this initiative matters to you, please consider
            buying us a coffee or getting in touch to discuss another way to support it.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={`https://wa.me/27615419367?text=${coffeeMessage}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Coffee className="h-4 w-4" aria-hidden="true" />
              Buy us a coffee
            </a>
            <Link
              href="/forms/contact-us"
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              Contact us
            </Link>
          </div>
        </div>

        <div className="flex items-start gap-3 border-t border-border bg-muted/30 px-6 py-5 text-sm text-muted-foreground sm:px-10">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <p>Player and tournament records remain protected while public access is paused.</p>
        </div>
      </section>
    </main>
  )
}
