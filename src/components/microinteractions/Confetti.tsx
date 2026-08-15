'use client'

import { useEffect, useRef } from 'react'
import { useMotionProfile } from './MotionProfileProvider'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

/** In-house canvas confetti burst — no dependency. Pass an incrementing `fire`
 *  value to trigger a new burst; renders nothing under prefers-reduced-motion. */
export default function Confetti({
  fire,
  particleCount = 80,
}: {
  fire: number
  particleCount?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { reduced } = useMotionProfile()

  useEffect(() => {
    if (!fire || reduced) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const particles = Array.from({ length: particleCount }, () => ({
      x: w / 2,
      y: h / 3,
      vx: (Math.random() - 0.5) * 12,
      vy: Math.random() * -12 - 4,
      size: Math.random() * 6 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 1,
    }))

    let raf = 0
    const gravity = 0.35

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      let alive = false
      for (const p of particles) {
        p.vy += gravity
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        p.life -= 0.012
        if (p.life <= 0) continue
        alive = true
        ctx.save()
        ctx.globalAlpha = Math.max(p.life, 0)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      }
      if (alive) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, w, h)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ctx.clearRect(0, 0, w, h)
    }
  }, [fire, reduced, particleCount])

  if (reduced) return null

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50"
      style={{ width: '100vw', height: '100vh' }}
    />
  )
}
