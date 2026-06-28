import type { NextConfig } from "next";
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Dev-only: LAN hosts allowed to fetch /_next dev resources (HMR, client JS).
  // Next expects the bare host (no port). Add your phone's LAN IP here — it can
  // change when DHCP reassigns it (check the dev server's "Network:" line).
  allowedDevOrigins: [
    'localhost',
    '192.168.110.252',
    '192.168.110.227',
  ],
  async headers() {
    return [
      {
        // Only apply COOP/COEP to the engine paths that need SharedArrayBuffer
        // Applying it globally blocks external images from loading
        source: "/(view|chess-games|engine)(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
      {
        // Serve the vendored Stockfish wasm with the correct MIME type so the
        // worker can stream-compile it.
        source: "/engine/:path*.wasm",
        headers: [{ key: "Content-Type", value: "application/wasm" }],
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.ibb.co",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in",
      },
    ],
    unoptimized: true,
  },

  turbopack: {
    resolveExtensions: [".tsx", ".ts", ".jsx", ".js", ".wasm"],
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "stockfish"];
    }
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
