#!/bin/bash

# Database Setup Script
# This script helps set up PostgreSQL for the project

set -e

echo "🔍 Checking for PostgreSQL installation..."

# Check if Docker is available
if command -v docker &> /dev/null; then
  echo "✅ Docker is available"
  
  # Check if PostgreSQL container is already running
  if docker ps | grep -q postgres; then
    echo "✅ PostgreSQL container is already running"
    echo "🔍 Verifying connection..."
    
    # Try to connect to verify it's working
    if docker exec $(docker ps | grep postgres | awk '{print $1}') pg_isready -U ai_muhasebi &> /dev/null 2>&1; then
      echo "✅ PostgreSQL is ready and accepting connections"
    else
      echo "⚠️  Container is running but may not be ready yet"
      echo "   Waiting 3 seconds for PostgreSQL to initialize..."
      sleep 3
    fi
    exit 0
  fi
  
  # Check if container exists but is stopped
  if docker ps -a | grep -q postgres; then
    CONTAINER_ID=$(docker ps -a | grep postgres | awk '{print $1}' | head -1)
    CONTAINER_NAME=$(docker ps -a | grep postgres | awk '{print $NF}' | head -1)
    
    # Check if it's our container with correct name
    if [ "$CONTAINER_NAME" = "ai-muhasebi-postgres" ]; then
      echo "🔄 Starting existing PostgreSQL container..."
      docker start $CONTAINER_ID
      echo "⏳ Waiting for PostgreSQL to be ready..."
      sleep 3
      
      # Verify it's working
      if docker exec $CONTAINER_ID pg_isready -U ai_muhasebi &> /dev/null; then
        echo "✅ PostgreSQL container started and ready"
        exit 0
      else
        echo "⚠️  Container started but not ready yet, waiting..."
        sleep 5
      fi
    else
      echo "⚠️  Found existing PostgreSQL container: $CONTAINER_NAME"
      echo "   This might not be configured correctly for this project"
      echo "   You may need to stop it and let this script create a new one"
    fi
  fi
  
  echo "🐳 Starting PostgreSQL with Docker..."
  docker run -d \
    --name ai-muhasebi-postgres \
    -p 5432:5432 \
    -e POSTGRES_USER=ai_muhasebi \
    -e POSTGRES_PASSWORD=ai_muhasebi_dev \
    -e POSTGRES_DB=ai_muhasebi \
    -v ai-muhasebi-data:/var/lib/postgresql/data \
    postgres:14
  
  echo "⏳ Waiting for PostgreSQL to be ready..."
  sleep 5
  
  # Wait for PostgreSQL to be ready
  for i in {1..30}; do
    if docker exec ai-muhasebi-postgres pg_isready -U ai_muhasebi &> /dev/null; then
      echo "✅ PostgreSQL is ready!"
      exit 0
    fi
    sleep 1
  done
  
  echo "❌ PostgreSQL failed to start"
  exit 1

# Check if Homebrew is available
elif command -v brew &> /dev/null; then
  echo "✅ Homebrew is available"
  
  # Check if PostgreSQL is installed via Homebrew
  if brew list postgresql@14 &> /dev/null || brew list postgresql &> /dev/null; then
    echo "✅ PostgreSQL is installed via Homebrew"
    
    # Try to start PostgreSQL service
    if brew services list | grep -q "postgresql.*started"; then
      echo "✅ PostgreSQL service is already running"
      exit 0
    else
      echo "🔄 Starting PostgreSQL service..."
      brew services start postgresql@14 2>/dev/null || brew services start postgresql
      echo "✅ PostgreSQL service started"
      exit 0
    fi
  else
    echo "📦 Installing PostgreSQL via Homebrew..."
    brew install postgresql@14
    brew services start postgresql@14
    
    # Create user and database
    echo "🔧 Setting up database user and database..."
    createuser -s ai_muhasebi 2>/dev/null || echo "User may already exist"
    createdb -O ai_muhasebi ai_muhasebi 2>/dev/null || echo "Database may already exist"
    createdb -O ai_muhasebi ai_muhasebi_test 2>/dev/null || echo "Test database may already exist"
    
    echo "✅ PostgreSQL installed and configured"
    exit 0
  fi

else
  echo "❌ Neither Docker nor Homebrew is available"
  echo ""
  echo "Please install one of the following:"
  echo ""
  echo "Option 1: Install Docker"
  echo "  Download from: https://www.docker.com/products/docker-desktop"
  echo ""
  echo "Option 2: Install Homebrew (then run this script again)"
  echo "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
  echo ""
  echo "Option 3: Install PostgreSQL manually"
  echo "  Download from: https://www.postgresql.org/download/macosx/"
  echo ""
  exit 1
fi

