import * as React from "react"
import { clsx } from "clsx"

function getInitials(nameOrEmail: string): string {
  const name = nameOrEmail.split("@")[0]
  const parts = name
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
  if (parts.length === 0) return name.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function Avatar({
  name,
  className,
  size = 28,
}: {
  name: string
  className?: string
  size?: number
}) {
  const initials = getInitials(name)
  const style: React.CSSProperties = {
    width: size,
    height: size,
    lineHeight: `${size - 2}px`,
  }
  return (
    <span
      aria-hidden
      className={clsx(
        "inline-flex select-none items-center justify-center rounded-full border border-black/10 bg-primary/10 text-primary-foreground",
        "font-medium text-[0.75rem]",
        className
      )}
      style={style}
    >
      <span className="text-primary font-semibold">
        {initials}
      </span>
    </span>
  )
}


