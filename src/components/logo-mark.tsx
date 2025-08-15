import * as React from "react"

type LogoMarkProps = {
  className?: string
}

// Inline SVG mark so text can inherit the app font (Geist)
export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 240 64"
      fill="none"
      className={className}
      aria-label="Limpopo Chess Academy"
      role="img"
      style={{ fontFamily: 'var(--font-geist-sans)' }}
    >
      {/* Pawn mark (academy blue) */}
      <g fill="#274c77">
        <circle cx="32" cy="16" r="6" />
        <rect x="26" y="24" width="12" height="3" rx="1.5" />
        <path d="M24 48 L40 48 L36 32 L28 32 Z" />
        <rect x="16" y="52" width="32" height="6" rx="2" />
      </g>
      {/* Text lockup on two lines, tight tracking/leading */}
      <g style={{ letterSpacing: '-0.04em' }}>
        <text x="64" y="28" fontSize="24" fontWeight={800} fill="#274c77">
          Limpopo
        </text>
        <text x="64" y="52" fontSize="18" fontWeight={700} fill="currentColor">
          Chess Academy
        </text>
      </g>
    </svg>
  )
}

export default LogoMark


