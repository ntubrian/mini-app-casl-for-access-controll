const { withNx } = require("@nx/next/plugins/with-nx");
const path = require("path");
const workspaceRoot = path.join(__dirname, "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // On Vercel, emit the build at repo root so the runtime can discover .next.
  distDir: process.env.VERCEL ? "../../.next" : ".next",
  outputFileTracingRoot: workspaceRoot,
  async rewrites() {
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ||
      process.env.API_BASE_URL?.replace(/\/$/, "");

    if (!apiBase) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`
      }
    ];
  },
  turbopack: {
    root: workspaceRoot
  },
  experimental: {
    externalDir: true
  }
};

module.exports = withNx(nextConfig);
