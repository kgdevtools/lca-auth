"use server";

import { createClient } from "@/utils/supabase/server";

// Fetch full players that need reconciliation
export async function getPlayersNeedingReconciliation() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("local_active_players_duplicate")
    .select("*")
    .is("unique_no", null)
    .is("surname", null)
    .is("firstname", null);

  if (error) {
    console.error("Error fetching players needing reconciliation:", error);
    throw new Error("Failed to fetch players needing reconciliation");
  }

  return data;
}

// Get stats for reconciliation and totals
export async function getPlayerStats() {
  const supabase = await createClient();

  // Total count
  const { count: totalCount, error: totalError } = await supabase
    .from("local_active_players_duplicate")
    .select("*", { count: "exact", head: true });

  if (totalError) {
    console.error("Error fetching total count:", totalError);
    throw new Error("Failed to fetch total count");
  }

  // Reconciliation-needed count
  const { count: reconciliationNeededCount, error: reconciliationError } =
    await supabase
      .from("local_active_players_duplicate")
      .select("*", { count: "exact", head: true })
      .is("unique_no", null)
      .is("surname", null)
      .is("firstname", null);

  if (reconciliationError) {
    console.error(
      "Error fetching reconciliation-needed count:",
      reconciliationError
    );
    throw new Error("Failed to fetch reconciliation-needed count");
  }

  return {
    total_count: totalCount ?? 0,
    reconciliation_needed_count: reconciliationNeededCount ?? 0,
  };
}