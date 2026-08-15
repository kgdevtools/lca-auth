import { Chess } from 'chess.js'

/** Accepts dashed UCI ("h3-g4"), plain UCI ("g7g5"/"e7e8q"), or SAN ("Qf2","Re8","O-O"). */
export function parseSolutionMove(raw: string, fen: string): { from: string; to: string } | null {
  const t = raw.trim()

  if (/^[a-h][1-8]-[a-h][1-8]$/.test(t)) {
    const [f, to] = t.split('-')
    return { from: f, to }
  }

  if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(t)) {
    return { from: t.slice(0, 2), to: t.slice(2, 4) }
  }

  try {
    const g = new Chess(fen)
    const m = g.move(t)
    if (m) return { from: m.from, to: m.to }
  } catch {}

  return null
}
