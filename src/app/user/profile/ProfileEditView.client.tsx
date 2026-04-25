"use client";
import React from "react";
import { Avatar } from "@/components/ui/avatar";
import { PlayerSearchCombobox } from "@/components/ui/player-search-combobox";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { ProfilePageData } from "../actions";
import { updateProfile, updateTournamentFullname } from "../actions";
import type { PlayerSearchResult } from "../tournament-actions";
import { Pencil, Info, Lock } from "lucide-react";

interface Props extends ProfilePageData {}

export default function ProfileEditView({
  user,
  profile,
  profileError,
}: Props) {
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : "Unknown";

  const chessaIdRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="pb-5 border-b border-border flex items-start gap-4">
          <Avatar
            name={
              profile?.full_name ||
              profile?.tournament_fullname ||
              user.email ||
              "User"
            }
            size={48}
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-mono font-bold tracking-tighter text-2xl leading-tight text-foreground">
              {profile?.full_name || profile?.tournament_fullname || "Profile"}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-mono text-muted-foreground capitalize">
                {profile?.role || "student"}
              </span>
              <span className="text-border">·</span>
              <span className="text-[11px] text-muted-foreground">
                Member since {memberSince}
              </span>
            </div>
          </div>
        </div>

        {profileError && (
          <div className="mt-4 px-4 py-3 rounded-md border border-destructive/30 bg-destructive/10">
            <p className="text-sm text-destructive">{profileError}</p>
          </div>
        )}

        {/* Basic Information */}
        <div className="py-5 border-b border-border">
          <p className="text-[10px] font-mono font-bold tracking-widest uppercase text-muted-foreground mb-4">
            Basic Information
          </p>
          <div className="space-y-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs text-muted-foreground w-28 flex-shrink-0">Email</p>
              <p className="text-sm text-foreground text-right">{user.email}</p>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs text-muted-foreground w-28 flex-shrink-0">Full Name</p>
              <p className="text-sm text-foreground text-right">{profile?.full_name || "—"}</p>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs text-muted-foreground w-28 flex-shrink-0">Member Since</p>
              <p className="text-sm text-foreground text-right">{memberSince}</p>
            </div>
          </div>
        </div>

        {/* Chess SA Settings */}
        <div className="py-5 border-b border-border">
          <p className="text-[10px] font-mono font-bold tracking-widest uppercase text-muted-foreground mb-1">
            Chess SA Settings
          </p>
          <p className="text-xs text-muted-foreground mb-5">
            Link your profile to the Chess SA active players database
          </p>
          <div className="space-y-6">
            <PlayerSearchRow
              label="Tournament Name"
              name="tournament_fullname"
              defaultValue={profile?.tournament_fullname ?? ""}
              updateAction={updateProfile}
              chessaIdRef={chessaIdRef}
              profileId={user.id}
              pendingName={profile?.tournament_fullname_pending}
              onSave={(name, chessaId) => updateTournamentFullname(name, chessaId)}
            />
            <EditableRow
              label="Chess SA ID"
              name="chessa_id"
              defaultValue={profile?.chessa_id ?? ""}
              updateAction={updateProfile}
              ref={chessaIdRef}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Search Row
// ─────────────────────────────────────────────────────────────────────────────

function PlayerSearchRow({
  label,
  name,
  defaultValue,
  updateAction,
  chessaIdRef,
  profileId,
  pendingName,
  onSave,
}: {
  label: string;
  name: string;
  defaultValue: string;
  updateAction: (
    formData: FormData,
  ) => Promise<{ success: boolean; error?: string }>;
  chessaIdRef: React.RefObject<HTMLInputElement | null>;
  profileId?: string;
  pendingName?: string | null;
  onSave?: (name: string, chessaId?: string | null) => Promise<{ success: boolean; error?: string; pending?: boolean }>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedUniqueNo, setSelectedUniqueNo] = React.useState<string | null>(
    null,
  );
  const [success, setSuccess] = React.useState(false);
  const [activePending, setActivePending] = React.useState<string | null>(pendingName ?? null);

  React.useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    if (selectedUniqueNo && chessaIdRef.current) {
      formData.set("chessa_id", selectedUniqueNo);
    }

    try {
      const result = onSave
        ? await onSave(value, selectedUniqueNo)
        : await updateAction(formData);
      if (result.success) {
        setEditing(false);
        if ('pending' in result && result.pending) {
          setActivePending(value);
        } else {
          setSuccess(true);
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        setError(result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  const handlePlayerSelect = (player: PlayerSearchResult) => {
    setValue(player.name);
    if (player.unique_no) {
      setSelectedUniqueNo(player.unique_no);
      if (chessaIdRef.current) {
        chessaIdRef.current.value = player.unique_no;
        const event = new Event("input", { bubbles: true });
        chessaIdRef.current.dispatchEvent(event);
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex text-muted-foreground hover:text-foreground transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs leading-relaxed">
                This is linked to your tournament records in the Chess SA
                database. Editing this will affect your player statistics and
                profile data. Final approval is pending admin review.
              </p>
            </TooltipContent>
          </Tooltip>
          {defaultValue && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex text-amber-500/70">
                  <Lock className="w-3.5 h-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">Changes require admin approval.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {!editing && (
          <button
            className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setEditing(true)}
            type="button"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        )}
      </div>
      <div>
        {!editing ? (
          <div className="space-y-2">
            <p className="text-sm">{value || "—"}</p>
            {activePending && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Pending: <span className="font-medium">{activePending}</span> — awaiting approval
              </p>
            )}
            {success && (
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Updated successfully
              </p>
            )}
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              <PlayerSearchCombobox
                value={value}
                onValueChange={setValue}
                onPlayerSelect={handlePlayerSelect}
                placeholder="Search for a player..."
                className="w-full"
                currentProfileId={profileId}
              />
              <input type="hidden" name={name} value={value} />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 text-sm px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setValue(defaultValue);
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 text-sm px-3 py-2 border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: Select a player from the dropdown to auto-fill Chess SA ID
              </p>
            </form>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}

const EditableRow = React.forwardRef<
  HTMLInputElement,
  {
    label: string;
    name: string;
    defaultValue: string;
    updateAction: (
      formData: FormData,
    ) => Promise<{ success: boolean; error?: string }>;
  }
>(({ label, name, defaultValue, updateAction }, ref) => {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  React.useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await updateAction(formData);
      if (result.success) {
        setEditing(false);
        setSuccess(true);
      } else {
        setError(result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        {!editing && (
          <button
            className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setEditing(true)}
            type="button"
          >
            Edit
          </button>
        )}
      </div>
      <div>
        {!editing ? (
          <div className="space-y-2">
            <p className="text-sm font-mono">{value || "—"}</p>
            {success && (
              <p className="text-sm text-green-600 dark:text-green-400">
                ✓ Updated successfully
              </p>
            )}
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                ref={ref}
                name={name}
                value={value}
                onChange={(e) => setValue(e.currentTarget.value)}
                className="w-full border rounded-md px-3 py-2 bg-background text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
                disabled={isSubmitting}
                placeholder="Enter Chess SA ID"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 text-sm px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setValue(defaultValue);
                    setError(null);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 text-sm px-3 py-2 border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
            {error && <p className="text-sm text-destructive mt-2">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
});

EditableRow.displayName = "EditableRow";
