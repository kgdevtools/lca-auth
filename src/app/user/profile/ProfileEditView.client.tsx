"use client";
import React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WarningBanner } from "@/components/warning-banner";
import { PlayerSearchCombobox } from "@/components/ui/player-search-combobox";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { ProfilePageData } from "../actions";
import { updateProfile, disconnectLichess } from "../actions";
import type { PlayerSearchResult } from "../tournament-actions";
import {
  Pencil,
  Info,
  ExternalLink,
  Link2,
  Link2Off,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface Props extends ProfilePageData {
  lichessStatus?: string | null;
}

const getRoleColor = (role: string) => {
  switch (role.toLowerCase()) {
    case "admin":
      return "bg-gradient-to-br from-purple-500 to-purple-700";
    case "coach":
      return "bg-gradient-to-br from-blue-500 to-blue-700";
    case "student":
      return "bg-gradient-to-br from-green-500 to-green-700";
    default:
      return "bg-gradient-to-br from-gray-500 to-gray-700";
  }
};

export default function ProfileEditView({
  user,
  profile,
  profileError,
  lichessConnection,
  lichessAccount,
  lichessStatus,
}: Props) {
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : "Unknown";

  const roleColor = profile?.role
    ? getRoleColor(profile.role)
    : getRoleColor("student");
  const chessaIdRef = React.useRef<HTMLInputElement>(null);

  // Show a one-time status banner based on the ?lichess= query param
  const lichessStatusMessage = React.useMemo(() => {
    switch (lichessStatus) {
      case "connected":
        return {
          type: "success",
          text: "Lichess account connected successfully!",
        };
      case "already_connected":
        return {
          type: "info",
          text: "Your Lichess account is already connected.",
        };
      case "pending_approval":
        return {
          type: "warning",
          text: "Your reconnect request is pending admin approval.",
        };
      case "denied":
        return { type: "warning", text: "Lichess connection was cancelled." };
      case "error":
        return {
          type: "error",
          text: "Something went wrong connecting your Lichess account. Please try again.",
        };
      default:
        return null;
    }
  }, [lichessStatus]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <WarningBanner message="Still under development: Some services may not work." />

      {/* Lichess OAuth status banner */}
      {lichessStatusMessage && (
        <div
          className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-md border text-sm font-medium
            ${
              lichessStatusMessage.type === "success"
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
                : lichessStatusMessage.type === "error"
                  ? "bg-destructive/10 border-destructive/20 text-destructive"
                  : "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300"
            }`}
        >
          {lichessStatusMessage.type === "success" && (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          )}
          {lichessStatusMessage.type === "error" && (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          {(lichessStatusMessage.type === "warning" ||
            lichessStatusMessage.type === "info") && (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{lichessStatusMessage.text}</span>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Profile Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile information and preferences
        </p>
      </div>

      {profileError && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{profileError}</p>
          </CardContent>
        </Card>
      )}

      {/* Avatar & Role Card */}
      <Card className={`${roleColor} text-white border-0 mb-6`}>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <Avatar
              name={
                profile?.full_name ||
                profile?.tournament_fullname ||
                user.email ||
                "User"
              }
              size={80}
            />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold">
                {profile?.full_name || profile?.tournament_fullname || "User"}
              </h2>
              <p className="text-white/90 text-sm mt-1">{user.email}</p>
              <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-white/20 text-xs sm:text-sm font-semibold uppercase tracking-wide">
                {profile?.role || "Student"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information Card */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">
            Basic Information
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Your account details (read-only)
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email
              </p>
              <p className="text-sm">{user.email}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Full Name
              </p>
              <p className="text-sm">{profile?.full_name || "—"}</p>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Member Since
              </p>
              <p className="text-sm">{memberSince}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Chess SA Settings */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold tracking-tight">
            Chess SA Settings
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Link your profile to Chess SA active players database
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <PlayerSearchRow
              label="Tournament Name"
              name="tournament_fullname"
              defaultValue={profile?.tournament_fullname ?? ""}
              updateAction={updateProfile}
              chessaIdRef={chessaIdRef}
            />

            <EditableRow
              label="Chess SA ID"
              name="chessa_id"
              defaultValue={profile?.chessa_id ?? ""}
              updateAction={updateProfile}
              ref={chessaIdRef}
            />
          </div>
        </CardContent>
      </Card>

      {/* Lichess Account */}
      <LichessConnectionCard
        connection={lichessConnection ?? null}
        lichessAccount={lichessAccount ?? null}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Lichess Connection Card
// ─────────────────────────────────────────────────────────────────────────────

interface LichessPerfDisplay {
  label: string;
  rating: number | undefined;
  prog: number | undefined;
  games: number | undefined;
}

function RatingBadge({
  label,
  rating,
  prog,
  games,
}: LichessPerfDisplay) {
  if (rating === undefined) return null;
  return (
    <div className="flex flex-col items-center px-3 py-2 bg-muted/50 rounded-lg min-w-[80px]">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </span>
      <span className="text-lg font-bold text-foreground">{rating}</span>
      {prog !== undefined && (
        <span
          className={`text-xs font-medium ${
            prog >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {prog >= 0 ? "+" : ""}
          {prog}
        </span>
      )}
      {games !== undefined && (
        <span className="text-[10px] text-muted-foreground">{games} games</span>
      )}
    </div>
  );
}

function GameCountItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value.toLocaleString()}</span>
    </div>
  );
}

function LichessConnectionCard({
  connection,
  lichessAccount,
}: {
  connection: import("@/types/lichess").LichessConnectionPublic | null;
  lichessAccount: import("@/types/lichess").LichessUser | null;
}) {
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [disconnectError, setDisconnectError] = React.useState<string | null>(
    null,
  );
  const [localStatus, setLocalStatus] = React.useState(
    connection?.status ?? null,
  );

  const handleConnect = () => {
    setIsConnecting(true);
    window.location.href = "/api/auth/lichess?redirect=/user/profile";
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you sure? You will need admin approval to reconnect your Lichess account.",
      )
    )
      return;
    setIsDisconnecting(true);
    setDisconnectError(null);
    try {
      const result = await disconnectLichess();
      if (result.success) {
        setLocalStatus("pending_reconnect");
      } else {
        setDisconnectError(result.error ?? "Failed to disconnect");
      }
    } catch {
      setDisconnectError("An unexpected error occurred");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const effectiveStatus = localStatus ?? connection?.status;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {/* Lichess knight icon via SVG — stays consistent without external deps */}
          <div className="w-5 h-5 flex items-center justify-center">
            <svg
              viewBox="0 0 50 50"
              className="w-5 h-5 fill-current"
              aria-hidden="true"
            >
              <path d="M38 32c0 0-2-7-8-10l4-8c0 0-6 2-10 6c0 0-2-5-8-5c-4 0-7 3-7 7c0 3 2 5 4 6l-2 4h27z" />
            </svg>
          </div>
          <CardTitle className="text-base font-semibold tracking-tight">
            Lichess Account
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Connect your Lichess account to unlock coaching features and activity
          tracking
        </p>
      </CardHeader>
      <CardContent>
        {/* Not connected */}
        {!connection && effectiveStatus !== "pending_reconnect" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              No Lichess account connected. Connecting allows your coach to
              track your puzzle activity and games.
            </p>
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting to Lichess…
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Connect Lichess Account
                </>
              )}
            </button>
          </div>
        )}

        {/* Active connection */}
        {connection && effectiveStatus === "active" && (
          <div className="space-y-5">
            {/* Header with username and status */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold">
                    {lichessAccount?.title && (
                      <span className="text-primary mr-1">
                        {lichessAccount.title}
                      </span>
                    )}
                    {connection.lichess_username}
                  </p>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                  {lichessAccount?.online && (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 text-xs">
                      Online
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Connected on{" "}
                  {new Date(connection.connected_at).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </p>
                {connection.last_synced_at && (
                  <p className="text-xs text-muted-foreground">
                    Last synced:{" "}
                    {new Date(connection.last_synced_at).toLocaleString()}
                  </p>
                )}
              </div>
              <a
                href={`https://lichess.org/@/${connection.lichess_username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View profile
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Lichess Profile Info */}
            {lichessAccount?.profile && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Profile
                </h4>
                <div className="flex flex-wrap gap-3 text-sm">
                  {lichessAccount.profile.realName && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">
                        {lichessAccount.profile.realName}
                      </span>
                    </div>
                  )}
                  {lichessAccount.profile.location && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium">
                        {lichessAccount.profile.location}
                      </span>
                    </div>
                  )}
                  {lichessAccount.profile.fideRating && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">FIDE:</span>
                      <span className="font-bold text-primary">
                        {lichessAccount.profile.fideRating}
                      </span>
                    </div>
                  )}
                  {lichessAccount.profile.bio && (
                    <p className="w-full text-xs text-muted-foreground mt-1 italic">
                      {lichessAccount.profile.bio}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Ratings Display */}
            {lichessAccount?.perfs && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Ratings
                </h4>
                <div className="grid grid-cols-4 gap-2">
                  <RatingBadge
                    label="Bullet"
                    rating={lichessAccount.perfs.bullet?.rating}
                    prog={lichessAccount.perfs.bullet?.prog}
                    games={lichessAccount.perfs.bullet?.games}
                  />
                  <RatingBadge
                    label="Blitz"
                    rating={lichessAccount.perfs.blitz?.rating}
                    prog={lichessAccount.perfs.blitz?.prog}
                    games={lichessAccount.perfs.blitz?.games}
                  />
                  <RatingBadge
                    label="Rapid"
                    rating={lichessAccount.perfs.rapid?.rating}
                    prog={lichessAccount.perfs.rapid?.prog}
                    games={lichessAccount.perfs.rapid?.games}
                  />
                  <RatingBadge
                    label="Classical"
                    rating={lichessAccount.perfs.classical?.rating}
                    prog={lichessAccount.perfs.classical?.prog}
                    games={lichessAccount.perfs.classical?.games}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <RatingBadge
                    label="Puzzle"
                    rating={lichessAccount.perfs.puzzle?.rating}
                    prog={lichessAccount.perfs.puzzle?.prog}
                    games={lichessAccount.perfs.puzzle?.games}
                  />
                  <RatingBadge
                    label="Correspondence"
                    rating={lichessAccount.perfs.correspondence?.rating}
                    prog={lichessAccount.perfs.correspondence?.prog}
                    games={lichessAccount.perfs.correspondence?.games}
                  />
                  <RatingBadge
                    label="UltraBullet"
                    rating={lichessAccount.perfs.ultraBullet?.rating}
                    prog={lichessAccount.perfs.ultraBullet?.prog}
                    games={lichessAccount.perfs.ultraBullet?.games}
                  />
                </div>
              </div>
            )}

            {/* Game Statistics */}
            {lichessAccount?.count && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Statistics
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <GameCountItem
                    label="All Games"
                    value={lichessAccount.count.all}
                  />
                  <GameCountItem
                    label="Rated Games"
                    value={lichessAccount.count.rated}
                  />
                  <GameCountItem label="Wins" value={lichessAccount.count.win} />
                  <GameCountItem
                    label="Losses"
                    value={lichessAccount.count.loss}
                  />
                  <GameCountItem
                    label="Draws"
                    value={lichessAccount.count.draw}
                  />
                  {lichessAccount.count.bookmark !== undefined && (
                    <GameCountItem
                      label="Bookmarks"
                      value={lichessAccount.count.bookmark}
                    />
                  )}
                  {lichessAccount.count.import !== undefined && (
                    <GameCountItem
                      label="Imported"
                      value={lichessAccount.count.import}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Play Time */}
            {lichessAccount?.playTime && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Play Time
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium">
                      {Math.round(lichessAccount.playTime.total / 60)}h
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">TV</span>
                    <span className="font-medium">
                      {Math.round(lichessAccount.playTime.tv / 60)}h
                    </span>
                  </div>
                </div>
              </div>
            )}

            {disconnectError && (
              <p className="text-sm text-destructive">{disconnectError}</p>
            )}

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">
                ⚠️ Disconnecting requires admin approval before you can
                reconnect with a different account.
              </p>
              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="inline-flex items-center gap-2 px-3 py-1.5 border border-destructive/30 text-destructive rounded-md text-xs font-medium hover:bg-destructive/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Disconnecting…
                  </>
                ) : (
                  <>
                    <Link2Off className="w-3.5 h-3.5" />
                    Disconnect Account
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Pending reconnect approval */}
        {effectiveStatus === "pending_reconnect" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Pending Admin Approval
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Your request to reconnect your Lichess account is awaiting admin
              approval. Once approved, you will be able to connect a new
              account.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
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
}: {
  label: string;
  name: string;
  defaultValue: string;
  updateAction: (
    formData: FormData,
  ) => Promise<{ success: boolean; error?: string }>;
  chessaIdRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedUniqueNo, setSelectedUniqueNo] = React.useState<string | null>(
    null,
  );
  const [success, setSuccess] = React.useState(false);

  // Update local value when defaultValue changes
  React.useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);

    // Add chessa_id if we have it from player selection
    if (selectedUniqueNo && chessaIdRef.current) {
      formData.set("chessa_id", selectedUniqueNo);
    }

    try {
      const result = await updateAction(formData);
      if (result.success) {
        setEditing(false);
        setSuccess(true);
        // Reload to fetch fresh data
        setTimeout(() => window.location.reload(), 1000);
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
    // Store the UNIQUE_NO for submission
    if (player.unique_no) {
      setSelectedUniqueNo(player.unique_no);
      // Auto-populate Chess SA ID
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
        </div>
        {!editing && (
          <button
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-primary hover:text-primary/80 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
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
                💡 Tip: Select a player from the dropdown to auto-fill Chess SA
                ID
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

  // Update local value when defaultValue changes
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
            className="text-xs text-primary underline hover:text-primary/80"
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
