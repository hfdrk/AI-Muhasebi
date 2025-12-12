#!/bin/bash
# Health Check Helper Script for Backend API
# 
# This script calls /healthz and /readyz endpoints to verify backend health.
# Usage: ./scripts/healthcheck-backend.sh [API_URL]
#
# Default API_URL: http://localhost:3800

API_URL="${1:-http://localhost:3800}"

echo "Checking backend health at ${API_URL}..."
echo ""

# Check /healthz endpoint
echo "=== GET ${API_URL}/healthz ==="
HEALTHZ_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${API_URL}/healthz")
HEALTHZ_BODY=$(echo "$HEALTHZ_RESPONSE" | sed '$d')
HEALTHZ_CODE=$(echo "$HEALTHZ_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$HEALTHZ_CODE" = "200" ]; then
  echo "✅ /healthz: OK (200)"
  echo "$HEALTHZ_BODY" | jq '.' 2>/dev/null || echo "$HEALTHZ_BODY"
else
  echo "❌ /healthz: FAILED (${HEALTHZ_CODE})"
  echo "$HEALTHZ_BODY"
fi

echo ""
echo "=== GET ${API_URL}/readyz ==="
READYZ_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" "${API_URL}/readyz")
READYZ_BODY=$(echo "$READYZ_RESPONSE" | sed '$d')
READYZ_CODE=$(echo "$READYZ_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d: -f2)

if [ "$READYZ_CODE" = "200" ]; then
  echo "✅ /readyz: READY (200)"
  echo "$READYZ_BODY" | jq '.' 2>/dev/null || echo "$READYZ_BODY"
else
  echo "❌ /readyz: NOT READY (${READYZ_CODE})"
  echo "$READYZ_BODY"
fi

echo ""
if [ "$HEALTHZ_CODE" = "200" ] && [ "$READYZ_CODE" = "200" ]; then
  echo "✅ Backend is healthy and ready"
  exit 0
else
  echo "❌ Backend health check failed"
  exit 1
fi




