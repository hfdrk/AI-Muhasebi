#!/bin/sh
set -e

echo "Waiting for database to be ready..."
sleep 5

echo "Running database migrations..."
cd /app/apps/backend-api
# Use pnpm if available, otherwise npx, otherwise direct node execution
if command -v pnpm >/dev/null 2>&1; then
  pnpm prisma migrate deploy --schema=./prisma/schema.prisma 2>&1 || echo "Migration failed or already applied, continuing..."
elif command -v npx >/dev/null 2>&1; then
  npx prisma migrate deploy --schema=./prisma/schema.prisma 2>&1 || echo "Migration failed or already applied, continuing..."
elif [ -f "/app/node_modules/.bin/prisma" ]; then
  node /app/node_modules/.bin/prisma migrate deploy --schema=./prisma/schema.prisma 2>&1 || echo "Migration failed or already applied, continuing..."
else
  echo "Prisma not found, skipping migrations"
fi

echo "Starting backend API server..."
exec node dist/server.js
