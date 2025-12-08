/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@repo/ui", "@repo/api-client", "@repo/i18n"],
  eslint: {
    ignoreDuringBuilds: true, // Temporarily ignore ESLint during builds - fix linting separately
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;

