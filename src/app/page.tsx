import Link from "next/link"
import type { Metadata } from "next"
import Image from "next/image"
import { BlogCard } from "@/components/home/BlogCard"
import { TournamentsCard } from "@/components/home/TournamentsCard"
import { RankingsCard } from "@/components/home/RankingsCard"
import { TournamentGamesCard } from "@/components/home/TournamentGamesCard"

export const metadata: Metadata = {
  title: "Home",
  description: "Limpopo Chess Academy — welcome page",
}

export default function Home() {
  return (
    <section className="min-h-dvh px-2 sm:px-4 lg:px-6 xl:px-8 py-10 mx-auto max-w-7xl bg-background text-foreground">
      {/* Top hero: left logos, right copy */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-10 items-center mb-12 sm:mb-16">
        {/* Logos - responsive, swap for theme */}
        <div className="w-full md:col-span-2 bg-white dark:bg-slate-950">
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[5/3] lg:aspect-[3/1] md:min-h-[220px] lg:min-h-[260px] xl:min-h-[300px]">
            <Image
              src="/Picture1.png"
              alt="Limpopo Chess Academy logo (light)"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
              className="object-contain block dark:hidden"
            />
            <Image
              src="/lca-cyan-dark-bg-updated.png"
              alt="Limpopo Chess Academy logo (dark)"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
              className="object-contain hidden dark:block"
            />
          </div>
        </div>

        {/* Copy */}
        <div className="space-y-6 text-left md:col-span-3">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-balance">
            Welcome to{" "}
            <span className="text-primary font-extrabold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Limpopo
            </span>{" "}
            <span className="text-muted-foreground">Chess Academy's</span> home on the web
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed">
            Join our community of chess enthusiasts and take your game to the next level
          </p>
        </div>
      </div>

      {/* Feature Cards Grid - Responsive: 1 column on mobile, 2 on larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Tournament Games Card - Auto-replaying board */}
        <TournamentGamesCard />

        {/* Latest Tournament Card */}
        <TournamentsCard />

        {/* Rankings Card - Random category */}
        <RankingsCard />

        {/* Blog Card - Latest post */}
        <BlogCard />
      </div>
    </section>
  )
}
