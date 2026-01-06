/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  transpilePackages: ["@repo/ui", "@repo/api-client", "@repo/i18n"],
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
      
      const path = require("path");
      const browserEntryPath = path.resolve(__dirname, "../shared-utils/src/index.browser.ts");
      const emptyLLMPath = path.resolve(__dirname, "./src/lib/empty-llm-client.ts");
      
      // AGGRESSIVE: Force ALL imports of @repo/shared-utils to use browser entry
      // This must happen before any module resolution
      const originalAlias = config.resolve.alias || {};
      config.resolve.alias = {
        ...originalAlias,
        // Force exact match
        "@repo/shared-utils": browserEntryPath,
        // Force all possible import paths
        "@repo/shared-utils/index": browserEntryPath,
        "@repo/shared-utils/src/index": browserEntryPath,
        "@repo/shared-utils/src/index.ts": browserEntryPath,
      };
      
      // Use NormalModuleReplacementPlugin with more aggressive patterns
      // Add logging to verify replacements are happening
      config.plugins.push(
        // Match exact package name (most common)
        new webpack.NormalModuleReplacementPlugin(
          /^@repo\/shared-utils$/,
          (resource) => {
            resource.request = browserEntryPath;
            console.log(`[Webpack] Replaced @repo/shared-utils with browser entry: ${browserEntryPath}`);
          }
        ),
        // Match package/index
        new webpack.NormalModuleReplacementPlugin(
          /^@repo\/shared-utils\/index$/,
          (resource) => {
            resource.request = browserEntryPath;
            console.log(`[Webpack] Replaced @repo/shared-utils/index with browser entry`);
          }
        ),
        // Match any path containing shared-utils/src/index
        new webpack.NormalModuleReplacementPlugin(
          /shared-utils[\\/]src[\\/]index/,
          (resource) => {
            resource.request = browserEntryPath;
            console.log(`[Webpack] Replaced shared-utils/src/index with browser entry`);
          }
        ),
        // Replace llm-client imports
        new webpack.NormalModuleReplacementPlugin(
          /shared-utils[\\/]src[\\/]llm-client/,
          (resource) => {
            resource.request = emptyLLMPath;
            console.log(`[Webpack] Replaced llm-client import with empty stub`);
          }
        )
      );
    }
    return config;
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.API_PROXY_TARGET || "http://localhost:3800/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
