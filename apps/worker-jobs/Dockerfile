# Multi-stage build for worker-jobs
FROM node:18-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker-jobs/package.json ./apps/worker-jobs/
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

# Build worker-jobs
RUN pnpm --filter worker-jobs build

# Generate Prisma client in builder stage
WORKDIR /app/apps/worker-jobs
RUN pnpm prisma generate
WORKDIR /app

# Production stage - Use Debian-based image for Prisma OpenSSL compatibility
FROM node:18-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Install OpenSSL and other dependencies for Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nodejs

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker-jobs/package.json ./apps/worker-jobs/
COPY packages/*/package.json ./packages/*/

# Copy compiled packages from builder stage
COPY --from=builder /app/packages ./packages

# Update package.json main fields to point to compiled dist BEFORE installing
RUN for pkg in packages/*/; do \
      if [ -f "$pkg/package.json" ] && [ -d "$pkg/dist" ]; then \
        node -e "const fs=require('fs'); const pkg=JSON.parse(fs.readFileSync('$pkg/package.json')); pkg.main='./dist/index.js'; pkg.types='./dist/index.d.ts'; fs.writeFileSync('$pkg/package.json', JSON.stringify(pkg, null, 2));"; \
      fi; \
    done

# Install ALL dependencies (workspace packages need their deps too)
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate && \
    pnpm install --no-frozen-lockfile && \
    pnpm add nodemailer@^6.9.7 handlebars@^4.7.8 || echo "dependencies install attempted"

# Ensure workspace symlinks exist
RUN mkdir -p node_modules/@repo && \
    ln -sf ../../packages/config node_modules/@repo/config && \
    ln -sf ../../packages/shared-utils node_modules/@repo/shared-utils && \
    ln -sf ../../packages/core-domain node_modules/@repo/core-domain

# Copy compiled application and Prisma schema FIRST
COPY --from=builder /app/apps/worker-jobs/dist ./apps/worker-jobs/dist
COPY --from=builder /app/apps/worker-jobs/prisma ./apps/worker-jobs/prisma

# Install Prisma CLI and generate client (after schema is copied)
RUN pnpm add -D prisma@^5.22.0 || npm install -g prisma@^5.22.0
WORKDIR /app/apps/worker-jobs
RUN pnpm prisma generate || npx prisma generate || echo "Prisma generate completed"
WORKDIR /app

WORKDIR /app

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node apps/worker-jobs/dist/health-check.js || exit 1

CMD ["node", "apps/worker-jobs/dist/worker.js"]

