"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { User } from "@supabase/supabase-js";
import {
  getActivePlayerData,
  getPlayerStatistics,
  findPlayerMatches,
  ActivePlayerData,
  MatchResult,
} from "./tournament-actions";
import {
  requestLichessReconnect,
  getLichessConnectionByUserId,
} from "@/repositories/lichessConnectionRepo";
import { getLichessAccount } from "@/services/lichess.service";
import type { LichessConnectionPublic, LichessUser } from "@/types/lichess";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  tournament_fullname: string | null;
  chessa_id: string | null;
  role: string;
  created_at?: string;
}

export interface ProfilePageData {
  user: User;
  profile: Profile | null;
  profileError: string | null;
  activePlayerData: ActivePlayerData[];
  playerStats: Awaited<ReturnType<typeof getPlayerStatistics>>;
  matchResult: MatchResult;
  signOutAction: () => Promise<void>;
  lichessConnection: LichessConnectionPublic | null;
  lichessAccount: LichessUser | null;
}

export async function signOut() {
  const server = await createClient();
  await server.auth.signOut();
  redirect("/login");
}

export async function fetchProfilePageData(
  user: User,
): Promise<ProfilePageData> {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, full_name, avatar_url, tournament_fullname, chessa_id, role, created_at",
    )
    .eq("id", user.id)
    .single();

  // Fetch active player data if tournament_fullname exists
  let activePlayerData: ActivePlayerData[] = [];
  let playerStats = null;
  let matchResult: MatchResult = { exactMatch: null, closeMatches: [] };

  if (profile?.tournament_fullname) {
    activePlayerData = await getActivePlayerData(profile.tournament_fullname);
    playerStats = await getPlayerStatistics(profile.tournament_fullname);
    matchResult = await findPlayerMatches(profile.tournament_fullname);
  }

  // Fetch Lichess connection (full record needed to get the access_token for API calls)
  let lichessConnection: LichessConnectionPublic | null = null;
  let lichessAccount: LichessUser | null = null;

  try {
    const fullConnection = await getLichessConnectionByUserId(user.id);

    if (fullConnection) {
      // Strip the access_token before passing to the client
      const { access_token, ...publicFields } = fullConnection;
      lichessConnection = publicFields as LichessConnectionPublic;

      // Only fetch live account data if the connection is active
      if (fullConnection.is_active && fullConnection.status === "active") {
        lichessAccount = await getLichessAccount(access_token).catch((err) => {
          console.error(
            "[fetchProfilePageData] Failed to fetch Lichess account:",
            err,
          );
          return null;
        });
      }
    }
  } catch (err) {
    // Connection fetch failed — continue without it rather than breaking the page
    console.error(
      "[fetchProfilePageData] Lichess connection lookup failed:",
      err,
    );
  }

  return {
    user,
    profile: profile as Profile | null,
    profileError: profileError?.message ?? null,
    activePlayerData,
    playerStats,
    matchResult,
    signOutAction: signOut,
    lichessConnection,
    lichessAccount,
  };
}

// Check if user needs onboarding (missing required fields)
export async function needsOnboarding(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return false;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, tournament_fullname")
    .eq("id", user.id)
    .single();

  // Need onboarding if missing full_name or tournament_fullname
  return !profile?.full_name || !profile?.tournament_fullname;
}

// Check if tournament full name is already taken by another user
async function checkTournamentFullNameExists(
  tournamentFullName: string,
  excludeUserId?: string,
): Promise<boolean> {
  try {
    if (!tournamentFullName || !tournamentFullName.trim()) {
      return false;
    }

    const supabase = await createClient();
    let query = supabase
      .from("profiles")
      .select("id")
      .eq("tournament_fullname", tournamentFullName.trim())
      .limit(1);

    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }

    const { data, error } = await query;

    if (error) {
      // If there's a database error, don't block the user - return false
      return false;
    }

    return data !== null && data.length > 0;
  } catch (error) {
    // On any error, don't block the user
    return false;
  }
}

// Server action to complete onboarding
export async function completeOnboarding(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const displayName = (formData.get("display_name") as string)?.trim() || null;
  const tournamentFullName =
    (formData.get("tournament_fullname") as string)?.trim() || null;
  const chessaId = (formData.get("chessa_id") as string)?.trim() || null;

  if (!displayName || !tournamentFullName) {
    return {
      success: false,
      error: "Display Name and Tournament Full Name are required",
    };
  }

  // Validate input lengths
  if (displayName.length > 100) {
    return {
      success: false,
      error: "Display name must be 100 characters or less",
    };
  }

  if (tournamentFullName.length > 200) {
    return {
      success: false,
      error: "Tournament full name must be 200 characters or less",
    };
  }

  if (chessaId && chessaId.length > 50) {
    return {
      success: false,
      error: "Chess SA ID must be 50 characters or less",
    };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    redirect("/login");
  }

  // Check if tournament full name is already taken
  try {
    const isTaken = await checkTournamentFullNameExists(
      tournamentFullName,
      user.id,
    );
    if (isTaken) {
      return {
        success: false,
        error:
          "This tournament name is already registered to another account. Please use a different name or contact support if this is your name.",
      };
    }
  } catch (error) {
    // If check fails, continue anyway - better to allow than block
  }

  // Update user metadata with display name
  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      display_name: displayName,
      full_name: displayName,
    },
  });

  if (metadataError) {
    return {
      success: false,
      error: "Failed to update user information. Please try again.",
    };
  }

  // Update profile with all onboarding data
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: displayName,
      tournament_fullname: tournamentFullName,
      chessa_id: chessaId || null,
    })
    .eq("id", user.id);

  if (profileError) {
    return {
      success: false,
      error: "Failed to save profile information. Please try again.",
    };
  }

  return { success: true };
}

// Server action to disconnect a Lichess account.
// Sets status to 'pending_reconnect' — an admin must delete the row
// to allow the student to connect again.
export async function disconnectLichess(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    await requestLichessReconnect(user.id);
    return { success: true };
  } catch (error) {
    console.error("[actions] disconnectLichess error:", error);
    return { success: false, error: "Failed to disconnect. Please try again." };
  }
}

// Server action to update editable profile fields from the user page
export async function updateProfile(
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const tournamentFullName =
    (formData.get("tournament_fullname") as string)?.trim() || null;
  const chessaId = (formData.get("chessa_id") as string)?.trim() || null;

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    redirect("/login");
  }

  // Validate input lengths
  if (tournamentFullName && tournamentFullName.length > 200) {
    return {
      success: false,
      error: "Tournament full name must be 200 characters or less",
    };
  }

  if (chessaId && chessaId.length > 50) {
    return {
      success: false,
      error: "Chess SA ID must be 50 characters or less",
    };
  }

  // Check if tournament full name is already taken (only if it's being changed)
  if (tournamentFullName) {
    try {
      const isTaken = await checkTournamentFullNameExists(
        tournamentFullName,
        user.id,
      );
      if (isTaken) {
        return {
          success: false,
          error:
            "This tournament name is already registered to another account. Please use a different name or contact support if this is your name.",
        };
      }
    } catch (error) {
      // If check fails, continue anyway - better to allow than block
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      tournament_fullname: tournamentFullName || null,
      chessa_id: chessaId || null,
    })
    .eq("id", user.id);

  if (error) {
    return {
      success: false,
      error: "Failed to update profile. Please try again.",
    };
  }

  // Return success - let client handle the UI update
  return { success: true };
}
