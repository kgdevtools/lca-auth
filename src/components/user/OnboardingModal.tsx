"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerSearchCombobox } from "@/components/ui/player-search-combobox";
import { Loader2, Link2, ChevronRight, CheckCircle2 } from "lucide-react";
import { completeOnboarding } from "@/app/user/actions";
import type { PlayerSearchResult } from "@/app/user/tournament-actions";

type OnboardingStep = "profile" | "lichess";

interface OnboardingModalProps {
  open: boolean;
  userEmail: string;
  onComplete: () => void;
}

export function OnboardingModal({
  open,
  userEmail,
  onComplete,
}: OnboardingModalProps) {
  const [step, setStep] = useState<OnboardingStep>("profile");

  // Profile step state
  const [displayName, setDisplayName] = useState("");
  const [tournamentFullName, setTournamentFullName] = useState("");
  const [chessaId, setChessaId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lichess step state
  const [isConnecting, setIsConnecting] = useState(false);

  const handlePlayerSelect = (player: PlayerSearchResult) => {
    setTournamentFullName(player.name);
    if (player.unique_no) {
      setChessaId(player.unique_no);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Display Name is required");
      return;
    }

    if (!tournamentFullName.trim()) {
      setError("Tournament Full Name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("display_name", displayName.trim());
      formData.set("tournament_fullname", tournamentFullName.trim());
      if (chessaId.trim()) {
        formData.set("chessa_id", chessaId.trim());
      }

      const result = await completeOnboarding(formData);

      if (result.success) {
        // Move to the optional Lichess connection step
        setStep("lichess");
      } else {
        setError(
          result.error || "Failed to complete onboarding. Please try again.",
        );
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectLichess = () => {
    setIsConnecting(true);
    // Redirect to the OAuth initiation route; after OAuth completes, send the
    // user to /academy so they land on their dashboard with sync already triggered.
    window.location.href = "/api/auth/lichess?redirect=/academy";
  };

  const handleSkipLichess = () => {
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        size="wide"
        showCloseButton={false}
        className="sm:max-w-2xl"
      >
        {/* ── Step 1: Profile ─────────────────────────────────────────────── */}
        {step === "profile" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                Complete Your Profile
              </DialogTitle>
              <DialogDescription className="text-base">
                Let's get to know you better. Fill in your details to get
                started.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="display_name" className="text-sm font-semibold">
                  Display Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="display_name"
                  name="display_name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  required
                  disabled={isSubmitting}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  This is how your name will appear across the platform
                </p>
              </div>

              {/* Tournament Full Name */}
              <div className="space-y-2">
                <Label
                  htmlFor="tournament_fullname"
                  className="text-sm font-semibold"
                >
                  Tournament Full Name{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <PlayerSearchCombobox
                  value={tournamentFullName}
                  onValueChange={setTournamentFullName}
                  onPlayerSelect={handlePlayerSelect}
                  placeholder="Search for your tournament name..."
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Search for your name as it appears in Chess SA tournament
                  records
                </p>
              </div>

              {/* Chessa ID */}
              <div className="space-y-2">
                <Label htmlFor="chessa_id" className="text-sm font-semibold">
                  Chess SA ID{" "}
                  <span className="text-muted-foreground text-xs">
                    (Optional)
                  </span>
                </Label>
                <Input
                  id="chessa_id"
                  name="chessa_id"
                  value={chessaId}
                  onChange={(e) => setChessaId(e.target.value)}
                  placeholder="Enter your Chess SA ID"
                  disabled={isSubmitting}
                  className="h-11 font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Your unique Chess SA identification number (auto-filled if you
                  select a player above)
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-sm bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">
                    {error}
                  </p>
                </div>
              )}

              {/* Step indicator */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </span>
                <span className="font-medium text-foreground">Profile</span>
                <ChevronRight className="w-3 h-3" />
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs font-bold">
                  2
                </span>
                <span>Lichess (optional)</span>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[140px] h-11 text-base font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}

        {/* ── Step 2: Lichess (optional) ───────────────────────────────────── */}
        {step === "lichess" && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Profile saved!
                </span>
              </div>
              <DialogTitle className="text-2xl font-bold">
                Connect Your Lichess Account
              </DialogTitle>
              <DialogDescription className="text-base">
                Linking Lichess lets your coach track your puzzles and games.
                You can always do this later from your profile settings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Lichess connection card */}
              <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-3">
                <div className="flex items-start gap-3">
                  {/* Simple Lichess-style knight icon */}
                  <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <svg
                      viewBox="0 0 50 50"
                      className="w-5 h-5 fill-primary"
                      aria-hidden="true"
                    >
                      <path d="M38 32c0 0-2-7-8-10l4-8c0 0-6 2-10 6c0 0-2-5-8-5c-4 0-7 3-7 7c0 3 2 5 4 6l-2 4h27z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      What you unlock by connecting:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-none">
                      <li>
                        ✦ Your coach can see your puzzle activity and ratings
                      </li>
                      <li>
                        ✦ Recent games are synced automatically when you visit
                        the academy
                      </li>
                      <li>
                        ✦ Lichess assignments can be tracked and marked complete
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-500 text-white text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
                <span className="text-muted-foreground line-through">
                  Profile
                </span>
                <ChevronRight className="w-3 h-3" />
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </span>
                <span className="font-medium text-foreground">Lichess</span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  onClick={handleConnectLichess}
                  disabled={isConnecting}
                  className="flex-1 h-11 text-base font-semibold"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Redirecting to Lichess…
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Connect Lichess Account
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSkipLichess}
                  disabled={isConnecting}
                  className="flex-1 h-11 text-base"
                >
                  Skip for now
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                You can connect your Lichess account anytime from{" "}
                <span className="font-medium">Profile Settings</span>.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
