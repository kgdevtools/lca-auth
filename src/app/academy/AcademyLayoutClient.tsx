'use client'

import { useState } from 'react'
import { JetBrains_Mono } from 'next/font/google'
import AcademySidebar from '@/components/academy/AcademySidebar'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
})

export default function AcademyLayoutClient({
  children,
  role = null,
  level = 1,
}: {
  children: React.ReactNode
  role?: string | null
  level?: number
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div
      className={`${jetbrainsMono.variable} flex h-[100dvh] overflow-hidden bg-background tracking-tighter leading-tight`}
      style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
    >
      {/* Brand backdrop — faint chess pieces scattered behind content */}
      <AcademyBackdrop role={role} level={level} />

      <AcademySidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main content */}
      <main className="relative z-10 flex-1 pt-20 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}

// Solid (filled) glyphs read as silhouettes at low opacity.
const LEVEL_PIECE: Record<number, string> = { 1: '♟', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' }

// Hand-tuned scatter: varied sizes + positions + rotation across the viewport.
const SCATTER: { top: string; left: string; size: number; rot: number }[] = [
  { top: '5%',  left: '7%',  size: 78,  rot: -12 },
  { top: '3%',  left: '34%', size: 52,  rot: 10 },
  { top: '9%',  left: '60%', size: 120, rot: -6 },
  { top: '13%', left: '86%', size: 64,  rot: 14 },
  { top: '24%', left: '20%', size: 150, rot: 8 },
  { top: '28%', left: '48%', size: 44,  rot: -16 },
  { top: '33%', left: '74%', size: 96,  rot: 6 },
  { top: '42%', left: '5%',  size: 70,  rot: 18 },
  { top: '46%', left: '38%', size: 110, rot: -10 },
  { top: '50%', left: '64%', size: 56,  rot: 12 },
  { top: '55%', left: '90%', size: 134, rot: -8 },
  { top: '63%', left: '14%', size: 88,  rot: 16 },
  { top: '68%', left: '44%', size: 60,  rot: -14 },
  { top: '72%', left: '70%', size: 100, rot: 10 },
  { top: '80%', left: '24%', size: 140, rot: -6 },
  { top: '84%', left: '56%', size: 48,  rot: 12 },
  { top: '88%', left: '82%', size: 82,  rot: -12 },
  { top: '93%', left: '10%', size: 64,  rot: 8 },
]

/** Decorative chess-piece backdrop. Coaches/admins see kings & queens; students
 *  see their current level's piece, scattered at varied sizes. Behind all content
 *  (z-0; opaque sidebars cover their region) and non-interactive. */
function AcademyBackdrop({ role, level }: { role: string | null; level: number }) {
  const isCoach = role === 'coach' || role === 'admin'
  const pieceAt = (i: number) =>
    isCoach ? (i % 2 === 0 ? '♚' : '♛') : (LEVEL_PIECE[level] ?? '♟')

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none text-foreground"
    >
      {SCATTER.map((p, i) => (
        <span
          key={i}
          className="absolute leading-none opacity-[0.05]"
          style={{
            top: p.top,
            left: p.left,
            fontSize: p.size,
            transform: `rotate(${p.rot}deg)`,
          }}
        >
          {pieceAt(i)}
        </span>
      ))}
    </div>
  )
}