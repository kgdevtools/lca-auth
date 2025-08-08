"use client"

import * as React from "react"
import { Button, type ButtonProps } from "@/components/ui/button"

export function SubmitButton({ children, ...props }: ButtonProps) {
  const [isPending, startTransition] = React.useTransition()
  return (
    <Button
      {...props}
      aria-busy={isPending}
      disabled={isPending || props.disabled}
      onClick={(e) => {
        // Let form submission happen, but mark pending for UI feedback
        startTransition(() => {})
      }}
    >
      {isPending ? 'Loading…' : children}
    </Button>
  )
}


