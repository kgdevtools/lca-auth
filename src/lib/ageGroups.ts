/**
 * Single source of truth for age-group classification, shared by
 * /player-rankings, the home rankings card, and the admin tournament-selection
 * screen.
 *
 * Convention (year-based, birthday-agnostic — matches how CDC/SAJCC sections
 * are run): a player belongs to UNN if they TURN NN-2 or NN-1 during the
 * reference year. E.g. for 2026: U16 = born 2011–2012 (turning 14/15),
 * U18 = born 2009–2010 (turning 16/17), U20 = born 2007–2008 (turning 18/19).
 * Turning 20+ makes you a senior: ADT (20–49), SNR (50–59), VET (60+).
 */

/** Reference year for age computation — the current calendar year. */
export const REF_YEAR = new Date().getFullYear()

/** Juniors are born on/after this year (i.e. turn at most 19 in REF_YEAR). */
export const JUNIOR_MIN_BIRTH = REF_YEAR - 19

/**
 * Age-group label for a birth year. Juniors map to the 2-year non-overlapping
 * UNN bands (UNN = turning NN-2 or NN-1 in REF_YEAR; ≤5-year-olds clamp into
 * U08). Seniors map to ADT/SNR/VET. Unknown birth year → "—".
 */
export function ageGroupOf(birthYear: number | null | undefined): string {
  if (birthYear == null) return "—"
  const age = REF_YEAR - birthYear
  if (birthYear < JUNIOR_MIN_BIRTH) {
    if (age >= 60) return "VET"
    if (age >= 50) return "SNR"
    return "ADT"
  }
  let nn = age % 2 === 0 ? age + 2 : age + 1
  if (nn < 8) nn = 8
  if (nn > 20) nn = 20
  return `U${String(nn).padStart(2, "0")}`
}

/**
 * Inclusive birth-year range for a junior band: UNN = born
 * REF_YEAR-(NN-1) .. REF_YEAR-(NN-2). Used for exact band filtering so age
 * groups never overlap.
 */
export function juniorBandBirthYears(nn: number): { min: number; max: number } {
  return { min: REF_YEAR - (nn - 1), max: REF_YEAR - (nn - 2) }
}
