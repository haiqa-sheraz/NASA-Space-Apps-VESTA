import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The repo root also holds Python prep scripts and private folders; pin the app root here.
  turbopack: { root: __dirname },
};

/**
 * On Netlify, /api/ask and /api/compare are Netlify Functions (netlify/functions). In local
 * development they run on port 8888 (scripts/dev-functions.ts), so `next dev` forwards /api/* there.
 */
export default function config(phase: string): NextConfig {
  if (phase !== PHASE_DEVELOPMENT_SERVER) return nextConfig;
  return {
    ...nextConfig,
    async rewrites() {
      return [{ source: "/api/:path*", destination: `http://localhost:${process.env.FUNCTIONS_PORT ?? 8888}/api/:path*` }];
    },
  };
}
