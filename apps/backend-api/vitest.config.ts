import { defineConfig } from "vitest/config";
import { join, resolve } from "path";
import { setupTestDatabase, teardownTestDatabase } from "./src/test-utils/test-db.js";

const rootDir = resolve(__dirname, "../..");

// CRITICAL: Override NODE_ENV before any modules load
// Vitest sets it to "test" which is invalid for our config schema
// Use direct assignment - env-setup.ts will also enforce this
process.env.NODE_ENV = "development";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only-min-32-chars";
}

export default defineConfig({
  esbuild: {
    target: "node18",
  },
  test: {
    globals: true,
    environment: "node",
    transformMode: {
      web: [/\.[jt]sx?$/],
      ssr: [/\.[jt]sx?$/],
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "**/*.test.ts", "**/*.spec.ts"],
    },
    globalSetup: "./src/test-utils/global-setup.ts",
    globalTeardown: "./src/test-utils/global-teardown.ts",
    setupFiles: ["./src/test-utils/test-setup.ts"],
    testTimeout: 30000,
    hookTimeout: 60000,
    // Reduce parallelism to prevent database deadlocks
    // Integration tests share the same database and can conflict
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 2, // Limit to 2 threads to reduce deadlock risk
        minThreads: 1,
      },
    },
    // Use verbose reporter for human-readable output
    // JSON output will be generated via CLI flag if needed
    reporter: ["verbose"],
    // Increase stack trace limit to help debug issues
    chaiConfig: {
      truncateThreshold: 1000,
    },
  },
  resolve: {
    alias: [
      {
        find: /^@repo\/(.+)$/,
        replacement: join(rootDir, "packages/$1/src"),
      },
      {
        find: "@repo/config",
        replacement: join(rootDir, "packages/config/src"),
      },
      {
        find: "@repo/shared-utils",
        replacement: join(rootDir, "packages/shared-utils/src"),
      },
      {
        find: "@repo/core-domain",
        replacement: join(rootDir, "packages/core-domain/src"),
      },
    ],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
  },
  optimizeDeps: {
    include: [
      "@repo/config",
      "@repo/shared-utils",
      "@repo/core-domain",
    ],
    exclude: ["bcrypt"],
  },
  ssr: {
    noExternal: ["@repo/config", "@repo/shared-utils", "@repo/core-domain"],
  },
});
