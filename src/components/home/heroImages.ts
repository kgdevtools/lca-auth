// Hero gallery sources. The files live in /public/hero — when you drop a new
// image in that folder, add its filename here. Kept as an explicit list (rather
// than a runtime fs.readdir of /public) because Vercel doesn't ship the public
// folder into the serverless function, so a directory read can fail on ISR.
// Landscape photos only — they fill the wide banner with minimal crop. Portrait
// shots are kept out of the gallery on purpose (they can't fill a wide banner
// without heavy cropping). When adding a new photo, prefer landscape.
const FILES = [
  "IMG-20250927-WA0000.jpg",
  "IMG-20250927-WA0005.jpg",
  "IMG-20250927-WA0006.jpg",
  "IMG-20250927-WA0009.jpg",
  "IMG-20250927-WA0011.jpg",
];

export type HeroImage = {
  src: string;
  alt: string;
  /** Focal point for the cover crop, e.g. "top" or "center 35%". CSS object-position. */
  position?: string;
};

export const HERO_IMAGES: HeroImage[] = FILES.map((f) => ({
  src: `/hero/${f}`,
  alt: "Limpopo Chess Academy",
}));
