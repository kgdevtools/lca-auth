"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { HeroImage } from "./heroImages";

/**
 * Full-bleed, auto-crossfading photo banner for the home page. Flat (no overlay
 * text or chrome), edge-to-edge, fixed responsive height. Images fill the full
 * width with object-cover; an optional per-image focal point (object-position)
 * controls which part survives the crop. Honours prefers-reduced-motion by
 * staying on the first frame.
 */
export default function HeroGallery({
  images,
  intervalMs = 5000,
}: {
  images: HeroImage[];
  intervalMs?: number;
}) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(
      () => setCurrent((p) => (p + 1) % images.length),
      intervalMs,
    );
    return () => clearInterval(id);
  }, [images.length, intervalMs]);

  if (images.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="relative w-full h-[56dvh] min-h-[340px] sm:h-[68dvh] lg:h-[74dvh] max-h-[840px] overflow-hidden bg-muted select-none"
    >
      {images.map((img, idx) => (
        <Image
          key={img.src}
          src={img.src}
          alt={img.alt}
          fill
          priority={idx === 0}
          sizes="100vw"
          style={img.position ? { objectPosition: img.position } : undefined}
          className={`object-cover transition-opacity duration-1000 ease-in-out ${
            idx === current ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}
