import type { NextConfig } from "next";

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

type NextConfigWithDevOrigins = NextConfig & {
  experimental?: {

  }
  images?: {
    domains: string[];
  }
}

const nextConfig: NextConfigWithDevOrigins = {
  experimental: {
    // Allow your mobile device (LAN) to load dev assets from this server
    // Replace with your device IP and port if it changes

  },
  images: {
    domains: ['i.ibb.co', 'images.ctfassets.net'],
  },
};

export default withBundleAnalyzer(nextConfig);