import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTournament } from "../tournaments";
import { RegistrationForm } from "./RegistrationForm";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = getTournament(slug);
  return {
    title: t ? `Register · ${t.name} | Limpopo Chess Academy` : "Register | Limpopo Chess Academy",
    description: t ? `Online registration for ${t.name}, ${t.dateLabel}.` : undefined,
  };
}

export default async function RegisterTournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = getTournament(slug);
  if (!tournament) notFound();
  return <RegistrationForm tournament={tournament} />;
}
