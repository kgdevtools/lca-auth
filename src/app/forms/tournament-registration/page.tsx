import TournamentRegistrationForm from "./TournamentRegistrationForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tournament Registration",
  description: "Register for Limpopo Chess Academy tournaments.",
};

export default function TournamentRegistrationPage() {
  return <TournamentRegistrationForm />;
}
