const { withNx } = require("@nx/next/plugins/with-nx");
const path = require("path");
const workspaceRoot = path.join(__dirname, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // On Vercel, emit the build at repo root so the runtime can discover .next.
  distDir: process.env.VERCEL ? "../../.next" : ".next",
  outputFileTracingRoot: workspaceRoot,
  turbopack: {
    root: workspaceRoot
  },
  experimental: {
    externalDir: true
  }
};

module.exports = withNx(nextConfig);
