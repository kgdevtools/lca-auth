"use server";
import { createClient } from "@/utils/supabase/server";

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
  console.log("[registerLcaOpen2025] Registration success:", data[0]);
  return { success: true, player: data[0] };
}
