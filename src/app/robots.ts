import type { MetadataRoute } from "next"

// Served at /robots.txt (opened in the funding-pause proxy). Private and API
// routes stay out of search; everything else may be crawled.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin", "/user", "/academy", "/auth", "/private", "/engine/"],
    },
    sitemap: "https://limpopochessacademy.co.za/sitemap.xml",
    host: "https://limpopochessacademy.co.za",
  }
}
