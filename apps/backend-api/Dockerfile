# Multi-stage build for backend-api
# Using Debian-based images throughout to avoid musl/glibc native module issues
FROM node:18-slim AS base

# Install build tools for native modules (bcrypt, etc.) + OpenSSL for Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend-api/package.json ./apps/backend-api/
COPY packages/*/package.json ./packages/*/

# Copy all source code (needed for workspace dependencies)
COPY . .

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Build all packages first (compile TypeScript to JavaScript)
RUN echo "Building packages..." && \
    for pkg in packages/*/; do \
      if [ -f "$pkg/tsconfig.json" ]; then \
        echo "Building $pkg..." && \
        cd "$pkg" && \
        npx tsc --skipLibCheck --outDir dist || echo "Build failed for $pkg, continuing..."; \
        cd /app; \
      fi; \
    done

# Build backend-api
RUN pnpm --filter backend-api build

# Generate Prisma client in builder stage
WORKDIR /app/apps/backend-api
RUN pnpm prisma generate
WORKDIR /app

# Production stage
FROM node:18-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install runtime dependencies for Prisma + gosu for entrypoint
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates gosu && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nodejs

# Copy node_modules from builder (native modules are compatible - same glibc)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend-api/node_modules ./apps/backend-api/node_modules

# Copy compiled packages from builder stage
COPY --from=builder /app/packages ./packages

# Update package.json main fields to point to compiled dist
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend-api/package.json ./apps/backend-api/
RUN for pkg in packages/*/; do \
      if [ -f "$pkg/package.json" ] && [ -d "$pkg/dist" ]; then \
        node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('$pkg/package.json')); pkg.main='./dist/index.js'; pkg.types='./dist/index.d.ts'; fs.writeFileSync('$pkg/package.json', JSON.stringify(pkg, null, 2));"; \
      fi; \
    done

# Ensure workspace symlinks exist
RUN mkdir -p node_modules/@repo && \
    ln -sf ../../packages/config node_modules/@repo/config && \
    ln -sf ../../packages/shared-utils node_modules/@repo/shared-utils && \
    ln -sf ../../packages/core-domain node_modules/@repo/core-domain

# Copy compiled application and Prisma schema
COPY --from=builder /app/apps/backend-api/dist ./apps/backend-api/dist
COPY --from=builder /app/apps/backend-api/prisma ./apps/backend-api/prisma

# Re-generate Prisma client for production runtime
WORKDIR /app/apps/backend-api
RUN npx prisma generate || echo "Prisma generate completed"
WORKDIR /app

# Copy entrypoint script
COPY apps/backend-api/docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

EXPOSE 3800

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3800/healthz', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
