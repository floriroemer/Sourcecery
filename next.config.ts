import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow large file uploads (up to 100MB for audio/video files)
  // Next.js 16 renamed middleware to proxy, but the config key may differ
  experimental: {
    proxyClientMaxBodySize: "100mb",
  } as Record<string, unknown>,
};

export default nextConfig;
