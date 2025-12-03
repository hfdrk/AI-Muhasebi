/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@repo/ui", "@repo/api-client", "@repo/i18n"],
};

module.exports = nextConfig;

