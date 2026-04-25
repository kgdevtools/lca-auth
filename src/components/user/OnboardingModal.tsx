"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerSearchCombobox } from "@/components/ui/player-search-combobox";
import { Loader2, ChevronRight, HelpCircle } from "lucide-react";
import { completeOnboarding } from "@/app/user/actions";
import type { PlayerSearchResult } from "@/app/user/tournament-actions";

interface OnboardingModalProps {
  open: boolean;
  userEmail: string;
  onComplete: () => void;
}

function TournamentNameTooltip() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="What is Tournament Full Name?"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {visible && (
        <span className="absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 z-50 w-56 rounded-sm border border-border bg-popover px-3 py-2.5 text-xs text-popover-foreground shadow-md">
          The full name used in official tournaments.{" "}
          <span className="text-muted-foreground">e.g. Dan Kgao Moloto</span>
          <span className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 rotate-45 w-2 h-2 bg-popover border-r border-b border-border" />
        </span>
      )}
    </span>
  );
}

export function OnboardingModal({
  open,
  onComplete,
}: OnboardingModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [tournamentFullName, setTournamentFullName] = useState("");
  const [chessaId, setChessaId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlayerSelect = (player: PlayerSearchResult) => {
    setTournamentFullName(player.name);
    if (player.unique_no) {
      setChessaId(player.unique_no);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!displayName.trim()) {
      setError("Display Name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set("display_name", displayName.trim());
      if (tournamentFullName.trim()) {
        formData.set("tournament_fullname", tournamentFullName.trim());
      }
      if (chessaId.trim()) {
        formData.set("chessa_id", chessaId.trim());
      }

      const result = await completeOnboarding(formData);

      if (result.success) {
        onComplete();
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md mx-4 bg-background border rounded-lg p-6 shadow-lg overflow-hidden">
        <div className="pointer-events-none absolute bottom-0 right-0 w-56 h-56 overflow-hidden opacity-[0.06] select-none translate-x-5 translate-y-5">
          <img src="/pawn_no_bg.png" alt="" className="w-full h-full object-contain" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-xs font-semibold tracking-widest uppercase text-primary">
              Limpopo Chess Academy
            </span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Fill in your details to get started on the platform.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
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
                className="h-10 rounded-sm"
              />
              <p className="text-xs text-muted-foreground">
                How your name will appear across the platform
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tournament_fullname" className="flex items-center gap-1.5 text-sm font-semibold">
                Tournament Full Name
                <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
                <TournamentNameTooltip />
              </Label>
              <PlayerSearchCombobox
                value={tournamentFullName}
                onValueChange={setTournamentFullName}
                onPlayerSelect={handlePlayerSelect}
                placeholder="Search for your tournament name..."
                className="h-10 rounded-sm"
              />
              <p className="text-xs text-muted-foreground">
                As it appears in Chess SA tournament records
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chessa_id" className="text-sm font-semibold">
                Chess SA ID <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="chessa_id"
                name="chessa_id"
                value={chessaId}
                onChange={(e) => setChessaId(e.target.value)}
                placeholder="Enter your Chess SA ID"
                disabled={isSubmitting}
                className="h-10 font-mono rounded-sm"
              />
              <p className="text-xs text-muted-foreground">
                Auto-filled when you select a player above
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-10 px-6 text-sm font-semibold rounded-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    Save & Continue
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}