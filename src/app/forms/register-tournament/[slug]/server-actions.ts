"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";
import { sendRegistrationNotification } from "@/services/email.service";
import { getTournament } from "../tournaments";

export interface RegisterResult {
  success?: boolean;
  error?: string;
}

const MAX_POP_BYTES = 5 * 1024 * 1024;
const POP_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/** Public tournament registration: validates, optionally uploads proof of payment,
 *  inserts the row (service-role; RLS still guards anon reads), and emails the organiser. */
export async function registerForTournament(formData: FormData): Promise<RegisterResult> {
  const slug = String(formData.get("slug") || "");
  const t = getTournament(slug);
  if (!t) return { error: "Unknown tournament." };

  const surname = String(formData.get("surname") || "").trim();
  const names = String(formData.get("names") || "").trim();
  const gender = String(formData.get("gender") || "").trim() || null;
  const chessaId = String(formData.get("chessaId") || "").trim() || null;
  const ratingRaw = String(formData.get("rating") || "").trim();
  const section = String(formData.get("section") || "").trim();
  const contactName = String(formData.get("contactName") || "").trim();
  const contactNumber = String(formData.get("contactNumber") || "").replace(/[\s()-]/g, "");
  const sourceUniqueNo = String(formData.get("sourceUniqueNo") || "").trim() || null;
  const pop = formData.get("pop");

  // ── Validation ───────────────────────────────────────────────────────────────
  if (!surname) return { error: "Surname is required." };
  if (!names) return { error: "Name(s) is required." };
  if (!contactName) return { error: "Contact name is required." };
  if (!/^(?:\+27|0)\d{9}$/.test(contactNumber)) return { error: "Enter a valid South African contact number." };
  if (!section || !t.sections.some((s) => s.code === section)) {
    return { error: "Please choose a section." };
  }
  const rating = ratingRaw && /^\d+$/.test(ratingRaw) ? parseInt(ratingRaw, 10) : null;
  if (rating != null && (rating < 0 || rating > 4000)) return { error: "Rating must be 0–4000." };

  const supabase = createAdminClient();

  // ── Duplicate guard (same person, same tournament) ───────────────────────────
  const { data: dup } = await supabase
    .from("tournament_registrations")
    .select("id")
    .eq("tournament_slug", slug)
    .ilike("surname", surname)
    .ilike("names", names)
    .maybeSingle();
  if (dup) return { error: "You are already registered for this tournament." };

  // ── Proof of payment (optional) ──────────────────────────────────────────────
  let popUrl: string | null = null;
  if (pop instanceof File && pop.size > 0) {
    if (pop.size > MAX_POP_BYTES) return { error: "Proof of payment must be 5MB or smaller." };
    if (pop.type && !POP_TYPES.includes(pop.type)) {
      return { error: "Proof of payment must be a PDF or image (jpg, png, webp)." };
    }
    const ext = (pop.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const safe = `${surname}-${names}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const path = `${slug}/${Date.now()}-${safe}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("pops")
      .upload(path, pop, { contentType: pop.type || undefined, upsert: false });
    if (upErr) return { error: `Could not upload proof of payment: ${upErr.message}` };
    popUrl = path;
  }

  // ── Insert ───────────────────────────────────────────────────────────────────
  const { error } = await supabase.from("tournament_registrations").insert({
    tournament_slug: slug,
    surname,
    names,
    gender,
    chessa_id: chessaId,
    rating,
    section,
    contact_name: contactName,
    contact_number: contactNumber,
    pop_url: popUrl,
    source_unique_no: sourceUniqueNo,
  });
  if (error) {
    if (error.code === "23505") return { error: "You are already registered for this tournament." };
    console.error("[registerForTournament] insert error:", error.message, error.code, error.details, error.hint);
    return { error: "Could not save your registration. Please try again." };
  }

  // ── Notify organiser (best-effort) ───────────────────────────────────────────
  try {
    const { count } = await supabase
      .from("tournament_registrations")
      .select("id", { count: "exact", head: true })
      .eq("tournament_slug", slug);
    await sendRegistrationNotification({
      tournament: t.name,
      slug,
      surname,
      names,
      section,
      count: count ?? 0,
    });
  } catch (e) {
    console.error("[registerForTournament] notify error:", e);
  }

  revalidatePath(`/forms/register-tournament/${slug}`);
  return { success: true };
}
