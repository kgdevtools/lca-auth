"use server";
import { createClient } from "@/utils/supabase/server";

export async function registerPlayer(form: any) {
  const supabase = await createClient();
  const { error, data } = await supabase.from("playerRegistrations").insert([
    { data_entry: form }
  ]);
  if (error) return { error: error.message };
  return { success: true, player: data?.[0] };
}
