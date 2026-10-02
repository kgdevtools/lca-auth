import type { MetadataRoute } from "next"

// Served at /sitemap.xml. While the funding-pause proxy keeps the rest of the
// site closed, /rankings is the only indexable page. Player profiles are left
// out until the stakeholders decide whether minors' profiles may be indexed.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://limpopochessacademy.co.za/rankings",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}
