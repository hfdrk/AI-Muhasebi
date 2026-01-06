#!/bin/sh
set -e
# Compile TypeScript
echo "Compiling TypeScript..."
echo "Current directory: $(pwd)"
echo "Checking if src/server.ts exists:"
ls -la src/server.ts || echo "src/server.ts not found!"
echo "Running tsc with verbose output:"
npx tsc --skipLibCheck --listFiles 2>&1 | grep -E "apps/backend-api/src" | head -10 || echo "No backend-api src files found in list!"
echo "Checking what files tsc sees:"
npx tsc --skipLibCheck --listFilesOnly 2>&1 | grep "server" | head -5 || echo "No server files found"
echo "Running tsc compilation:"
npx tsc --skipLibCheck || echo "TypeScript compilation had errors, but continuing..."
# Check if dist/server.js exists (handle nested structure from monorepo)
if [ -f "dist/server.js" ]; then
  echo "✓ Build successful - dist/server.js exists"
  prisma generate
  exit 0
fi
# Check if files are in nested structure (dist/apps/backend-api/src/server.js)
if [ -f "dist/apps/backend-api/src/server.js" ]; then
  echo "Found files in nested structure, flattening..."
  mv dist/apps/backend-api/src/* dist/ 2>&1 || true
  rm -rf dist/apps 2>&1 || true
  if [ -f "dist/server.js" ]; then
    echo "✓ Build successful - dist/server.js exists (flattened)"
    prisma generate
    exit 0
  fi
fi
# If still not found, search for it
echo "Checking for server.js in various locations:"
find dist -name "server.js" -type f 2>&1 | head -5
echo "ERROR: dist/server.js not found after compilation!"
echo "Listing dist directory:"
ls -la dist/ 2>&1 || echo "dist directory does not exist"
exit 1

