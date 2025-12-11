#!/bin/bash

# Database Connection Diagnostic Script

echo "🔍 Checking PostgreSQL connection..."

# Check if Docker container is running
if docker ps | grep -q postgres; then
  CONTAINER_NAME=$(docker ps | grep postgres | awk '{print $NF}')
  echo "✅ Found PostgreSQL container: $CONTAINER_NAME"
  
  # Get container details
  echo ""
  echo "Container details:"
  docker ps | grep postgres
  
  # Check if port 5432 is exposed
  echo ""
  echo "Port mapping:"
  docker port $CONTAINER_NAME 2>/dev/null || echo "  Could not get port mapping"
  
  # Try to connect from inside container
  echo ""
  echo "Testing connection from inside container..."
  if docker exec $CONTAINER_NAME pg_isready -U ai_muhasebi &> /dev/null; then
    echo "✅ PostgreSQL is ready (user: ai_muhasebi)"
  elif docker exec $CONTAINER_NAME pg_isready -U postgres &> /dev/null; then
    echo "✅ PostgreSQL is ready (user: postgres)"
  else
    echo "❌ PostgreSQL is not ready"
  fi
  
  # Check environment variables
  echo ""
  echo "Container environment:"
  docker exec $CONTAINER_NAME env | grep POSTGRES || echo "  No POSTGRES env vars found"
  
else
  echo "❌ No PostgreSQL container found running"
  echo "   Run: pnpm setup:db"
  exit 1
fi

# Test connection from host
echo ""
echo "Testing connection from host..."
echo "Trying: postgresql://ai_muhasebi:ai_muhasebi_dev@localhost:5432/postgres"

# Try with psql if available, otherwise use docker exec
if command -v psql &> /dev/null; then
  PGPASSWORD=ai_muhasebi_dev psql -h localhost -p 5432 -U ai_muhasebi -d postgres -c "SELECT 1;" &> /dev/null
  if [ $? -eq 0 ]; then
    echo "✅ Connection successful!"
  else
    echo "❌ Connection failed"
  fi
else
  echo "⚠️  psql not available, testing via Docker exec..."
  docker exec $CONTAINER_NAME psql -U ai_muhasebi -d postgres -c "SELECT 1;" &> /dev/null
  if [ $? -eq 0 ]; then
    echo "✅ Connection successful (via Docker exec)"
  else
    echo "❌ Connection failed"
  fi
fi




