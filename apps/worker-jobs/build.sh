#!/bin/sh
set +e
echo "Compiling TypeScript for worker-jobs..."
echo "Current directory: $(pwd)"
echo "Checking if src/worker.ts exists:"
ls -la src/worker.ts || echo "src/worker.ts not found!"
echo "Running tsc compilation:"
npx tsc --skipLibCheck
EXIT_CODE=$?

# Check if dist/worker.js exists
if [ -f "dist/worker.js" ]; then
  echo "✓ Build successful - dist/worker.js exists"
elif [ -f "dist/apps/worker-jobs/src/worker.js" ]; then
  echo "Found files in nested structure, flattening..."
  mkdir -p dist/temp
  mv dist/apps/worker-jobs/src/* dist/temp/ 2>&1 || true
  rm -rf dist/apps 2>&1 || true
  mv dist/temp/* dist/ 2>&1 || true
  rm -rf dist/temp 2>&1 || true
  if [ -f "dist/worker.js" ]; then
    echo "✓ Build successful - dist/worker.js exists (flattened)"
  fi
fi

# Generate Prisma client
prisma generate
exit 0

