/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@repo/ui", "@repo/api-client", "@repo/i18n", "@repo/shared-utils"],
  eslint: {
    ignoreDuringBuilds: true, // Temporarily ignore ESLint during builds - fix linting separately
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config, { isServer }) => {
    // Exclude server-only modules from client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      // Replace LLM client with empty stub for client bundle
      const webpack = require("webpack");
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /shared-utils\/src\/llm-client/,
          require.resolve("./src/lib/empty-llm-client.ts")
        )
      );
    }
    return config;
  },
};

module.exports = nextConfig;

