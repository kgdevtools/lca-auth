import { Chess, DEFAULT_POSITION } from 'chess.js';
import type { Move } from 'chess.js';
import { createRootNode, addMove, sanitizePgn } from './gameTree';
import type { GameNode, NodeAnnotations } from './gameTree';

// ─── Result of a full PGN import ────────────────────────────────────────────────
//
// Unlike chess.js's history-only loader (which flattens to the main line and
// discards comments, NAGs, evals and variations), this builds the complete game
// tree and returns every per-node decoration keyed by node id, so nothing in the
// source PGN is lost on import.

export interface ImportedGame {
  root: GameNode;
  end: GameNode;                              // last node of the main line
  headers: Record<string, string>;
  comments: Map<string, string>;             // nodeId → human comment text
  nags: Map<string, number[]>;               // nodeId → NAG codes
  annotations: Map<string, NodeAnnotations>; // nodeId → arrows/highlights
  evals: Map<string, number | string>;       // nodeId → [%eval] value
  clocks: Map<string, string>;               // nodeId → [%clk] value
}

interface Maps {
  comments: Map<string, string>;
  nags: Map<string, number[]>;
  annotations: Map<string, NodeAnnotations>;
  evals: Map<string, number | string>;
  clocks: Map<string, string>;
}

// Suffix glyphs that may trail a SAN token (e.g. "Ne3?!") mapped to NAG codes.
const GLYPH_TO_NAG: Record<string, number> = {
  '!': 1, '?': 2, '!!': 3, '??': 4, '!?': 5, '?!': 6,
};

// ─── Header / movetext split ────────────────────────────────────────────────────

function splitHeadersAndMovetext(pgn: string): { headers: Record<string, string>; movetext: string } {
  const headers: Record<string, string> = {};
  const lines = pgn.split('\n');
  let movetext = '';
  let inHeaders = true;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { inHeaders = false; continue; }
    if (inHeaders && trimmed.startsWith('[')) {
      // A line may carry one tag (normal) or several glued together.
      let matched = false;
      for (const m of trimmed.matchAll(/\[(\w+)\s+"([^"]*)"\]/g)) {
        headers[m[1]] = m[2];
        matched = true;
      }
      if (matched) continue;
      inHeaders = false;
      movetext += ' ' + trimmed;
    } else {
      inHeaders = false;
      movetext += ' ' + trimmed;
    }
  }
  return { headers, movetext };
}

// ─── Comment-block parsing ──────────────────────────────────────────────────────

// Splits a `{ … }` block into its machine tags ([%eval]/[%clk]/[%cal]/[%csl])
// and any leftover human-readable text.
function applyCommentBlock(node: GameNode, raw: string, maps: Maps): void {
  if (!raw) return;

  const evalMatch = raw.match(/\[%eval\s+([#+-]?\d+(?:\.\d+)?)\]/);
  if (evalMatch) {
    const v = evalMatch[1];
    maps.evals.set(node.id, v.startsWith('#') ? v : parseFloat(v));
  }

  const clkMatch = raw.match(/\[%clk\s+(\d+:\d+(?::\d+)?)\]/);
  if (clkMatch) maps.clocks.set(node.id, clkMatch[1]);

  const arrows: [string, string][] = [];
  const calMatch = raw.match(/\[%cal\s+([^\]]+)\]/);
  if (calMatch) {
    for (const item of calMatch[1].split(',')) {
      const t = item.trim();
      // Form is <color><from><to>, e.g. "Gd1d2".
      const sq = t.replace(/^[GRYBOPgrybop]/, '');
      if (/^[a-h][1-8][a-h][1-8]$/.test(sq)) arrows.push([sq.slice(0, 2), sq.slice(2, 4)]);
    }
  }

  const highlights: string[] = [];
  const cslMatch = raw.match(/\[%csl\s+([^\]]+)\]/);
  if (cslMatch) {
    for (const item of cslMatch[1].split(',')) {
      const sq = item.trim().replace(/^[GRYBOPgrybop]/, '');
      if (/^[a-h][1-8]$/.test(sq)) highlights.push(sq);
    }
  }

  if (arrows.length || highlights.length) {
    const existing = maps.annotations.get(node.id) ?? { arrows: [], highlights: [], history: [] };
    maps.annotations.set(node.id, {
      arrows: [...existing.arrows, ...arrows],
      highlights: [...existing.highlights, ...highlights],
      history: [
        ...existing.history,
        ...arrows.map(([from, to]) => ({ kind: 'arrow' as const, from, to })),
        ...highlights.map((square) => ({ kind: 'highlight' as const, square })),
      ],
    });
  }

  // Whatever remains after stripping the machine tags is the human comment.
  const text = raw.replace(/\[%[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
  if (text) {
    const prev = maps.comments.get(node.id);
    maps.comments.set(node.id, prev ? `${prev} ${text}` : text);
  }
}

function addNag(node: GameNode, code: number, maps: Maps): void {
  if (!code) return;
  const prev = maps.nags.get(node.id) ?? [];
  if (!prev.includes(code)) maps.nags.set(node.id, [...prev, code]);
}

// ─── Recursive movetext walker ──────────────────────────────────────────────────
//
// Parses moves into a chain under `parentNode` (each move is the child of the
// previous one). A `( … )` opens a variation that branches from the position
// *before* the most recent move — i.e. a sibling of that move. Comments and NAGs
// attach to the move they follow.

function walk(s: string, cur: { i: number }, parentNode: GameNode, startFen: string, maps: Maps): void {
  const chess = new Chess(startFen);
  let last: GameNode = parentNode; // attach point for comments / NAGs / variations

  while (cur.i < s.length) {
    const ch = s[cur.i];

    if (/\s/.test(ch)) { cur.i++; continue; }

    // End of the current variation.
    if (ch === ')') { cur.i++; return; }

    // Begin a variation — branches from the move before `last`.
    if (ch === '(') {
      cur.i++;
      const branchParent = last === parentNode ? parentNode : (last.parent ?? parentNode);
      walk(s, cur, branchParent, branchParent.fen, maps);
      continue;
    }

    // Comment block.
    if (ch === '{') {
      cur.i++;
      let depth = 0;
      let comment = '';
      while (cur.i < s.length) {
        const c = s[cur.i];
        if (c === '{') { depth++; comment += c; cur.i++; }
        else if (c === '}') { if (depth === 0) { cur.i++; break; } depth--; comment += c; cur.i++; }
        else { comment += c; cur.i++; }
      }
      if (last.move) applyCommentBlock(last, comment.trim(), maps);
      continue;
    }

    // Standalone numeric NAG ($7).
    if (ch === '$') {
      cur.i++;
      let num = '';
      while (cur.i < s.length && /\d/.test(s[cur.i])) num += s[cur.i++];
      if (num && last.move) addNag(last, parseInt(num, 10), maps);
      continue;
    }

    // Plain token (move, move number, or result marker).
    let token = '';
    while (cur.i < s.length && !/[\s{}()]/.test(s[cur.i])) token += s[cur.i++];
    if (!token) continue;

    if (token === '1-0' || token === '0-1' || token === '1/2-1/2' || token === '*') continue;

    // Strip a leading move-number prefix. Tournament exports glue it to the SAN
    // ("1.e4", "15...d4"), Lichess spaces it out ("1. e4"). Handle both: after
    // stripping, a bare number token ("12.") becomes empty and is skipped.
    token = token.replace(/^\d+(\.{1,3}|…)/, '');
    if (!token) continue;

    // Strip a trailing annotation glyph (!, ?, !!, ??, !?, ?!) off the SAN.
    let san = token;
    let nag = 0;
    const glyphMatch = token.match(/([!?]+)$/);
    if (glyphMatch) {
      const glyph = glyphMatch[1];
      if (GLYPH_TO_NAG[glyph]) {
        san = token.slice(0, token.length - glyph.length);
        nag = GLYPH_TO_NAG[glyph];
      }
    }

    let move: Move | null = null;
    try {
      move = chess.move(san);
    } catch {
      move = null;
    }
    if (!move) continue;

    const node = addMove(last, move, chess.fen());
    last = node;
    if (nag) addNag(node, nag, maps);
  }
}

// ─── Public entry point ─────────────────────────────────────────────────────────

export function importPgn(pgn: string): ImportedGame {
  const { headers, movetext } = splitHeadersAndMovetext(sanitizePgn(pgn));

  const startFen =
    headers.SetUp === '1' && headers.FEN ? headers.FEN : DEFAULT_POSITION;

  const root = createRootNode(startFen);
  const maps: Maps = {
    comments: new Map(),
    nags: new Map(),
    annotations: new Map(),
    evals: new Map(),
    clocks: new Map(),
  };

  walk(movetext, { i: 0 }, root, startFen, maps);

  // The main-line end is the deepest children[0] chain.
  let end = root;
  while (end.children[0]) end = end.children[0];

  return { root, end, headers, ...maps };
}
