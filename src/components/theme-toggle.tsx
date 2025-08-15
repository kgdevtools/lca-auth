"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const [isDark, setIsDark] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return document.documentElement.classList.contains("dark")
  })

  React.useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light")
    } catch {}
  }, [isDark])

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("theme")
      if (saved === "dark") setIsDark(true)
      if (saved === "light") setIsDark(false)
    } catch {}
  }, [])

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 hover:bg-neutral-50 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-offset-2"
      onClick={() => setIsDark((v) => !v)}
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </button>
  )
}


