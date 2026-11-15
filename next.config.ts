import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The repo root also holds Python prep scripts and private folders; pin the app root here.
  turbopack: { root: __dirname },
};

/**
 * On Netlify, Ask AI and the Compare explanation are Netlify Functions (netlify/functions) at
 * /.netlify/functions/ask and /compare. In local development they run on port 8888
 * (scripts/dev-functions.ts), so `next dev` forwards those requests there.
 */
export default function config(phase: string): NextConfig {
  if (phase !== PHASE_DEVELOPMENT_SERVER) return nextConfig;
  return {
    ...nextConfig,
    async rewrites() {
      return [{ source: "/.netlify/functions/:name", destination: `http://localhost:${process.env.FUNCTIONS_PORT ?? 8888}/.netlify/functions/:name` }];
    },
  };
}
