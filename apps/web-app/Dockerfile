# Multi-stage build for web-app (Next.js)
FROM node:18-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web-app/package.json ./apps/web-app/
COPY packages/*/package.json ./packages/*/

# Copy all source code (needed for workspace dependencies)
COPY . .

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Build stage
FROM base AS builder
WORKDIR /app

# Build arguments for Next.js build-time configuration
ARG API_PROXY_TARGET=http://backend-api:3800/api/:path*
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3800
ENV API_PROXY_TARGET=${API_PROXY_TARGET}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

# Build web-app
RUN pnpm --filter web-app build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-app/.next/static ./apps/web-app/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web-app/public ./apps/web-app/public

USER nextjs

EXPOSE 3001

ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

WORKDIR /app/apps/web-app

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
