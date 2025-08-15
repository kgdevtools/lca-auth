import * as React from "react"
import { clsx } from "clsx"

export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="alert"
      className={clsx(
        "rounded-md border px-3 py-2 text-sm bg-[color-mix(in_oklab,var(--accent),transparent_70%)] border-[var(--accent)] text-[var(--foreground)]",
        className
      )}
      {...props}
    />
  )
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={clsx("font-medium", className)} {...props} />
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("text-sm text-neutral-700", className)} {...props} />
}


