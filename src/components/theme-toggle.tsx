"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  // --- THE FIX: isMounted state to prevent hydration mismatch ---
  const [isMounted, setIsMounted] = React.useState(false);

  const [isDark, setIsDark] = React.useState<boolean>(() => {
    // This now only runs on the client, but we'll sync it in an effect anyway for safety.
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark";
  });

  // Effect to ensure the component is mounted before rendering the button
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Effect to sync the theme with the DOM and localStorage
  React.useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // --- THE FIX: Render null on the server and initial client render ---
  if (!isMounted) {
    // Returning null is safe and prevents layout shift for a small icon button.
    // You could also return a placeholder div with a fixed size if needed.
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 hover:bg-neutral-50 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-offset-2"
      onClick={() => setIsDark((v) => !v)}
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
