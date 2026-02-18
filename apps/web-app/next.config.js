/** @type {import('next').NextConfig} */
const nextConfig = {
  // TODO: Fix 160 TS errors then set ignoreBuildErrors to false
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
            // @repo/shared-utils → browser entry
          }
        ),
        // Match package/index
        new webpack.NormalModuleReplacementPlugin(
          /^@repo\/shared-utils\/index$/,
          (resource) => {
            resource.request = browserEntryPath;
            // @repo/shared-utils/index → browser entry
          }
        ),
        // Match any path containing shared-utils/src/index
        new webpack.NormalModuleReplacementPlugin(
          /shared-utils[\\/]src[\\/]index/,
          (resource) => {
            resource.request = browserEntryPath;
            // shared-utils/src/index → browser entry
          }
        ),
        // Replace llm-client imports
        new webpack.NormalModuleReplacementPlugin(
          /shared-utils[\\/]src[\\/]llm-client/,
          (resource) => {
            resource.request = emptyLLMPath;
            // llm-client → empty stub
          }
        )
      );
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' " + (process.env.API_PROXY_TARGET || "http://localhost:3800"),
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
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
