import Link from "next/link"
import { Mail, ShieldCheck } from "lucide-react"

const dataRequestMessage = encodeURIComponent(
  "Hello Limpopo Chess Academy. I would like to request access to my data.",
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
            We&rsquo;re resolving technical issues and improving the site.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            We&rsquo;re currently addressing technical challenges while refining and enhancing the
            services offered through this website. All user data remains securely stored and
            protected. If you need access to your data, you may request it and we will provide it.
            We apologize for the inconvenience and appreciate your patience while our development
            team works hard to restore the site.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href={`https://wa.me/27615419367?text=${dataRequestMessage}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Request data access
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
          <div>
            <p>Player and tournament records remain secure while public access is temporarily paused.</p>
            <p className="mt-2 text-xs">
              If you would like to support the site, please get in touch with us.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
