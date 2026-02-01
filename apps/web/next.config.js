const { withNx } = require("@nx/next/plugins/with-nx");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    externalDir: true
  }
};

module.exports = withNx(nextConfig);
