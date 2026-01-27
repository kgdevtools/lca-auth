import * as React from "react"
import { clsx } from "clsx"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "outline" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg"
}

const baseStyles =
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 focus-visible:ring-[var(--ring)]",
  primary:
    "bg-[var(--primary)] text-[var(--primary-foreground)] hover:brightness-95 focus-visible:ring-[var(--ring)]",
  outline:
    "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[color-mix(in_oklab,var(--card),black_5%)] focus-visible:ring-[var(--ring)]",
  ghost: "bg-transparent hover:bg-[color-mix(in_oklab,var(--foreground),transparent_95%)]",
  destructive: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
}

const sizes: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-9 px-3",
  md: "h-10 px-4",
  lg: "h-11 px-6",
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        className={clsx(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"


