"use client"

import { cn } from "@/lib/utils"

interface CheckboxProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
  disabled?: boolean
}

export function Checkbox({ checked, onCheckedChange, className, disabled }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      disabled={disabled}
      className={cn(
        "h-4 w-4 rounded-sm border border-primary accent-primary cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    />
  )
}