/**
 * Infer each team player's per-round opponent from the Team Composition results
 * alone — no round-pairing files needed.
 *
 * In team chess, round R pairs team A vs team B board-for-board, so paired teams'
 * board results are complementary (win↔loss, draw↔draw) and their board players
 * face each other (board N of A ↔ board N of B). We reconstruct the round pairings
 * by matching complementary board-result vectors (greedy, unique-first), then read
 * off opponents. Validated at 100% on real data (2b6eb403 + Mzansi U20). Forfeit
 * boards (+/-) and unresolved/ambiguous rounds yield no opponent (recorded as a
 * result with opponentName = null).
 */
import type { TeamPlayerPerformance } from "@/services/teamSummaryParser";

export interface OpponentGame {
  round: number;
  board: number | null;
  result: "win" | "loss" | "draw" | null;
  opponentName: string | null;
  opponentRating: number | null;
  opponentFed: string | null;
}

/** Per-round result token → W/D/L/F (forfeit) / "" (no game). */
function tokenChar(tok: string | null | undefined): "W" | "D" | "L" | "F" | "" {
  const x = (tok ?? "").trim();
  if (x === "1") return "W";
  if (x === "0") return "L";
  if (x === "½" || x === "0.5") return "D";
  if (x === "+" || x === "-") return "F";
  return "";
}
function tokenResult(tok: string | null | undefined): "win" | "loss" | "draw" | null {
  const x = (tok ?? "").trim();
  if (x === "1" || x === "+") return "win";
  if (x === "0" || x === "-") return "loss";
  if (x === "½" || x === "0.5") return "draw";
  return null;
}
const complement = (c: string) => (c === "W" ? "L" : c === "L" ? "W" : c);

/**
 * Mutates each player, attaching `opponents` (one entry per round they had a
 * result). Returns a small stats object for logging/QA.
 */
export function inferOpponents(players: TeamPlayerPerformance[]): {
  resolved: number;
  forfeits: number;
  unresolved: number;
} {
  for (const p of players) p.opponents = [];
  const maxRounds = players.reduce((m, p) => Math.max(m, p.per_round.length), 0);

  // team -> board -> player (board layout is constant across rounds)
  const teamBoards = new Map<string, Map<number, TeamPlayerPerformance>>();
  for (const p of players) {
    if (p.board == null) continue;
    if (!teamBoards.has(p.team_name)) teamBoards.set(p.team_name, new Map());
    teamBoards.get(p.team_name)!.set(p.board, p);
  }
  const teams = [...teamBoards.keys()];

  let resolved = 0;
  let forfeits = 0;
  let unresolved = 0;

  for (let round = 1; round <= maxRounds; round++) {
    // Real-board signature (W/D/L only) for this round, per team.
    const sigOf = (team: string, map: (c: string) => string) => {
      const boards = teamBoards.get(team)!;
      return [...boards.keys()]
        .sort((a, b) => a - b)
        .map((bn) => [bn, tokenChar(boards.get(bn)!.per_round[round - 1])] as const)
        .filter(([, c]) => c === "W" || c === "D" || c === "L")
        .map(([bn, c]) => `${bn}:${map(c)}`)
        .join(",");
    };

    // Candidate partners: team v whose signature equals the complement of u's.
    const cand = new Map<string, string[]>();
    for (const u of teams) {
      const want = sigOf(u, complement);
      cand.set(u, want === "" ? [] : teams.filter((v) => v !== u && sigOf(v, (c) => c) === want));
    }

    // Greedy unique-first matching.
    const partner = new Map<string, string>();
    const used = new Set<string>();
    let progress = true;
    while (progress) {
      progress = false;
      for (const u of teams) {
        if (used.has(u)) continue;
        const opts = (cand.get(u) ?? []).filter((v) => !used.has(v));
        if (opts.length === 1) {
          partner.set(u, opts[0]);
          partner.set(opts[0], u);
          used.add(u);
          used.add(opts[0]);
          progress = true;
        }
      }
    }

    // Emit one opponent entry per player who had a result this round.
    for (const u of teams) {
      const boards = teamBoards.get(u)!;
      const opp = partner.get(u);
      const oppBoards = opp ? teamBoards.get(opp)! : null;
      for (const [bn, p] of boards) {
        const tok = p.per_round[round - 1];
        const ch = tokenChar(tok);
        if (ch === "") continue; // no game this round
        const result = tokenResult(tok);
        if (ch === "F") {
          forfeits++;
          p.opponents!.push({ round, board: bn, result, opponentName: null, opponentRating: null, opponentFed: null });
          continue;
        }
        const o = oppBoards?.get(bn) ?? null;
        if (o) resolved++;
        else unresolved++;
        p.opponents!.push({
          round,
          board: bn,
          result,
          opponentName: o?.name ?? null,
          opponentRating: o?.rating ?? null,
          opponentFed: o?.federation ?? null,
        });
      }
    }
  }

  return { resolved, forfeits, unresolved };
}
