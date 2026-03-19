import type { Metadata } from "next";
import Image from "next/image";
import { BlogCardServer } from "@/components/home/BlogCardServer";
import { CompactTournamentsCard } from "@/components/home/CompactTournamentsCard";
import { UpcomingTournamentCardServer } from "@/components/home/UpcomingTournamentCard";
import { RankingsCardServer } from "@/components/home/RankingsCardServer";
import { TournamentGamesCardServer } from "@/components/home/TournamentGamesCardServer";

export const metadata: Metadata = {
  title: "Home",
  description: "Limpopo Chess Academy — welcome page",
};

export default function Home() {
  return (
    <section className="relative min-h-dvh px-2 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-10 mx-auto max-w-7xl text-foreground bg-transparent">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/IMG-20250927-WA0006.jpg"
          alt="Chess tournament"
          fill
          className="object-cover opacity-[0.25] dark:opacity-[0.10]"
          priority
          quality={75}
        />
      </div>

      {/* Hero */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 lg:gap-10 items-center mb-8 sm:mb-12">
        <div className="w-full md:col-span-2 bg-transparent">
          <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] md:aspect-[2/1] lg:aspect-[16/9] md:min-h-[300px] lg:min-h-[360px] xl:min-h-[420px]">
            <Image
              src="/lca-no-bg-1.png"
              alt="Limpopo Chess Academy logo"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
              className="object-contain block dark:hidden"
            />
            <Image
              src="/lca-no-bg-1.png"
              alt="Limpopo Chess Academy logo"
              fill
              priority
              sizes="(min-width: 1024px) 40vw, (min-width: 768px) 50vw, 100vw"
              className="object-contain hidden dark:block"
            />
          </div>
        </div>
        <div className="space-y-4 text-left md:col-span-3 flex flex-col justify-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-balance">
            Welcome to{" "}
            <span className="text-primary font-extrabold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Limpopo
            </span>{" "}
            <span className="text-muted-foreground">Chess Academy's</span> home
            on the web
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
            Join our community of chess enthusiasts and take your game to the
            next level. Follow latest and upcoming chess tournaments.
          </p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Left: board card — NO h-full, sizes to content so board never clips */}
        <div className="flex flex-col">
          <TournamentGamesCardServer />
        </div>

        {/* Right: info cards */}
        <div className="flex flex-col gap-4 sm:gap-6">
          <CompactTournamentsCard />
          <UpcomingTournamentCardServer />
        </div>

        {/* Bottom row */}
        <RankingsCardServer />
        <BlogCardServer />
      </div>
    </section>
  );
}
