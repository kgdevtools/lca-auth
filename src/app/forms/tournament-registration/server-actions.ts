// src/app/forms/tournament-registration/server-actions.ts

"use server";
import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

interface PlayerRegistration {
  id: string;
  surname: string;
  names: string;
  section: string;
  chessa_id: string | null;
  federation: string | null;
  rating: number | null;
  sex: string | null;
  created_at: string;
  phone: string;
  dob: string;
  emergency_name: string;
  emergency_phone: string;
  comments?: string;
  gender?: string | null;
  club?: string | null;
  city?: string | null;
}

export async function getAllPlayers(): Promise<PlayerRegistration[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lca_open_2025_registrations")
    .select("*")
    .order("section", { ascending: true })
    .order("rating", { ascending: false, nullsFirst: false });
    
  if (error) {
    console.error("[getAllPlayers] Fetch error:", error);
    return [];
  }
  
  return data || [];
}

export async function getSectionPlayers(section: string): Promise<PlayerRegistration[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lca_open_2025_registrations")
    .select("*")
    .eq("section", section)
    .order("rating", { ascending: false, nullsFirst: false });
    
  if (error) {
    console.error("[getSectionPlayers] Fetch error:", error);
    return [];
  }
  
  return data || [];
}

export async function registerLcaOpen2025(form: {
  surname: string;
  names: string;
  phone: string;
  dob: string;
  chessaId?: string;
  rating?: string;
  section: string;
  emergencyName: string;
  emergencyPhone: string;
  comments?: string;
  gender?: string;
  club?: string;
  city?: string;
}) {
  const supabase = await createClient();
  // Check for duplicate (surname + names)
  const { data: existing, error: dupError } = await supabase
    .from("lca_open_2025_registrations")
    .select("id")
    .eq("surname", form.surname.trim())
    .eq("names", form.names.trim())
    .maybeSingle();
    
  if (dupError) {
    console.error("[registerLcaOpen2025] Duplicate check error:", dupError);
    return { error: "Error checking for duplicates." };
  }
  
  if (existing) {
    console.error("[registerLcaOpen2025] Duplicate found for:", form.surname, form.names);
    return { error: "A registration with this Surname and Name(s) already exists." };
  }

  try {
    const { error, data } = await supabase
      .from("lca_open_2025_registrations")
      .insert([
        {
          surname: form.surname.trim(),
          names: form.names.trim(),
          phone: form.phone.trim(),
          dob: form.dob,
          chessa_id: form.chessaId?.trim() || null,
          rating: form.rating ? parseInt(form.rating, 10) : null,
          section: form.section,
          emergency_name: form.emergencyName.trim(),
          emergency_phone: form.emergencyPhone.trim(),
          comments: form.comments?.trim() || null,
          gender: form.gender?.trim() || null,
          club: form.club?.trim() || null,
          city: form.city?.trim() || null,
        },
      ])
      .select();

    if (error) {
      console.error("[registerLcaOpen2025] Insert error:", error);
      return { error: error.message };
    }
    
    if (!data || !data[0]) {
      console.error("[registerLcaOpen2025] Insert returned no data:", data);
      return { error: "Registration failed: no data returned." };
    }

    revalidatePath("/forms/tournament-registration");
    return { success: true, player: data[0] as PlayerRegistration };
    
  } catch (error) {
    console.error("[registerLcaOpen2025] Unexpected error:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
}