import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About",
  description: "About Limpopo Chess Academy — who we are, our team, and what we offer.",
}

const SERVICES: [string, string][] = [
  ["Chess coaching", "From 6 years to adults — personalised instruction for all skill levels."],
  ["Arbiters training course", "Professional certification for tournament officials."],
  ["Coaches / trainers course", "Develop the next generation of chess instructors."],
  ["Tournament organising", "Professional tournament management and coordination."],
  ["Swiss Manager training", "Master tournament pairing software and management systems."],
  ["Capacity building", "Strengthen chess organisations and community programmes."],
  ["Seminars & workshops", "Educational events and specialised training sessions."],
]

const TEAM = [
  {
    name: "Coach Kgaogelo",
    photo: "https://i.ibb.co/GzyZvGj/20250512-215848.jpg",
    cert: "https://i.ibb.co/Vck1JPrY/IMG-20250610-WA0012.jpg",
  },
  {
    name: "Coach Tebogo",
    photo: "https://i.ibb.co/kV317DXj/IMG-20250613-WA0001.jpg",
    cert: "https://i.ibb.co/DHSHwH4B/IMG-20250610-WA0014.jpg",
  },
  {
    name: "Coach Joe",
    photo: "https://i.ibb.co/RTDZx7fc/Screenshot-20250609-224422-You-Tube.jpg",
    cert: "https://i.ibb.co/Nnb9MXSF/IMG-20250610-WA0006.jpg",
  },
]

function SectionHead({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 pb-2 mb-5 border-b border-border">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-12">
        {/* Who we are */}
        <header className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tighter text-balance">
            About Limpopo Chess Academy
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-prose">
            Limpopo Chess Academy is a chess hub based in Polokwane, dedicated to growing
            young minds into focused, exceptional future leaders. Our sessions range from
            relaxed, interactive lessons — encouraging independent, structured thinking and
            that creative spark — to challenging, tournament-ready programs, nurturing
            talent from grassroots to elite levels across the province.
          </p>
        </header>

        {/* Our team — the page's real content: real names, faces, certificates */}
        <section>
          <SectionHead title="Our team" hint="Tap a badge to view the certificate" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {TEAM.map((coach) => (
              <div key={coach.name} className="bg-card border border-border rounded overflow-hidden">
                <div className="relative w-full aspect-square overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coach.photo}
                    alt={coach.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <a
                    href={coach.cert}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 w-16 h-16 rounded overflow-hidden border-2 border-primary bg-card shadow-lg hover:scale-110 transition-transform duration-200 z-10"
                    title="View certificate"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={coach.cert}
                      alt={`${coach.name} certificate`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </a>
                </div>
                <div className="py-4 text-center">
                  <h3 className="text-lg font-bold tracking-tighter text-foreground">{coach.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What we offer — compact text list, no icon chrome */}
        <section>
          <SectionHead title="What we offer" />
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
            {SERVICES.map(([title, blurb]) => (
              <div key={title}>
                <dt className="text-sm font-semibold text-foreground">{title}</dt>
                <dd className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{blurb}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* One real CTA */}
        <section className="border-t border-border pt-8">
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-prose mb-4">
            Whether you&apos;re enrolling a beginner, preparing for tournaments, or
            organising chess in your community — we&apos;d like to hear from you.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Link
              href="/forms/contact-us"
              className="inline-flex items-center px-4 py-2 rounded text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get in touch
            </Link>
            <Link
              href="/forms"
              className="inline-flex items-center px-4 py-2 rounded text-sm font-semibold border border-border text-foreground hover:border-muted-foreground/60 hover:bg-muted/30 transition-colors"
            >
              Join us
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
