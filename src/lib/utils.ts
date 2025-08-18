import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateTimeUTC(input: string | number | Date | null | undefined): string {
  if (!input) return "—"
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return "—"
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  const mm = pad(d.getUTCMonth() + 1)
  const dd = pad(d.getUTCDate())
  const HH = pad(d.getUTCHours())
  const MM = pad(d.getUTCMinutes())
  const SS = pad(d.getUTCSeconds())
  return `${yyyy}/${mm}/${dd}, ${HH}:${MM}:${SS}`
}