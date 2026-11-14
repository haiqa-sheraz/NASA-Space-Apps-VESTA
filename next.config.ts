import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The repo root also holds Python prep scripts and private folders; pin the app root here.
  turbopack: { root: __dirname },
};

export default nextConfig;
