// Decorative chess-piece backdrop for the home page — faint Unicode piece glyphs
// scattered at varied sizes + rotations behind the content, mirroring the academy
// brand backdrop (AcademyLayoutClient) and the brand poster/flyer style. Purely
// decorative: non-interactive, fixed behind everything (content sits at z-10).

const PIECES = ["♞", "♛", "♟", "♚", "♝", "♜"];

// A bit of brand colour so the pieces read (esp. in light mode). Tokens adapt
// per light/dark in globals.css.
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-5)", "var(--primary)"];

// Hand-tuned scatter: varied sizes, positions and rotation across the viewport.
const SCATTER: { top: string; left: string; size: number; rot: number }[] = [
  { top: "4%", left: "6%", size: 84, rot: -12 },
  { top: "2%", left: "33%", size: 52, rot: 10 },
  { top: "8%", left: "61%", size: 124, rot: -6 },
  { top: "12%", left: "87%", size: 64, rot: 14 },
  { top: "23%", left: "19%", size: 152, rot: 8 },
  { top: "27%", left: "47%", size: 46, rot: -16 },
  { top: "32%", left: "75%", size: 96, rot: 6 },
  { top: "41%", left: "4%", size: 72, rot: 18 },
  { top: "45%", left: "39%", size: 112, rot: -10 },
  { top: "49%", left: "65%", size: 56, rot: 12 },
  { top: "54%", left: "91%", size: 136, rot: -8 },
  { top: "62%", left: "13%", size: 90, rot: 16 },
  { top: "67%", left: "45%", size: 60, rot: -14 },
  { top: "71%", left: "71%", size: 104, rot: 10 },
  { top: "79%", left: "23%", size: 142, rot: -6 },
  { top: "83%", left: "57%", size: 48, rot: 12 },
  { top: "88%", left: "83%", size: 84, rot: -12 },
  { top: "93%", left: "9%", size: 66, rot: 8 },
];

export default function ChessPiecesBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      {SCATTER.map((p, i) => (
        <span
          key={i}
          className="absolute leading-none opacity-[0.16] dark:opacity-[0.12]"
          style={{
            top: p.top,
            left: p.left,
            fontSize: p.size,
            transform: `rotate(${p.rot}deg)`,
            color: COLORS[i % COLORS.length],
          }}
        >
          {PIECES[i % PIECES.length]}
        </span>
      ))}
    </div>
  );
}
