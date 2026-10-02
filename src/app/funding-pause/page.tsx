import FundingPausePage from "@/components/FundingPausePage"

export const metadata = {
  // The root layout's title template appends "| Limpopo Chess Academy".
  title: "Website temporarily unavailable",
  robots: { index: false, follow: false },
}

export default function FundingPauseRoute() {
  return <FundingPausePage />
}
