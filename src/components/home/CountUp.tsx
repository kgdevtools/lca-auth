"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated count-up for a single stat figure. Starts null so SSR / no-JS render
 * the real value immediately (the number is an enhancement, never load-bearing);
 * on the client it eases 0 → value once. Honours prefers-reduced-motion.
 */
export function CountUp({
  value,
  className,
  duration = 2200,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState<number | null>(null);
  const raf = useRef<number | undefined>(undefined);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value === 0) return; // leave null → renders the final value
    setDisplay(0);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(t < 1 ? Math.round(value * eased) : value);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  return <span className={className}>{(display ?? value).toLocaleString("en-ZA")}</span>;
}
