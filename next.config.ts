import type { NextConfig } from "next";

type NextConfigWithDevOrigins = NextConfig & {
  experimental?: {
    
  }
}

const nextConfig: NextConfigWithDevOrigins = {
  experimental: {
    // Allow your mobile device (LAN) to load dev assets from this server
    // Replace with your device IP and port if it changes
    
  },
};

export default nextConfig;
