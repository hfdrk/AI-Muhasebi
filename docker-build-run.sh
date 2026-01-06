#!/bin/bash
set -e

echo "Building and starting AI Muhasebi full stack..."

# Build all services
echo "Building Docker images..."
docker-compose build

# Start infrastructure services first
echo "Starting infrastructure services (postgres, redis, minio)..."
docker-compose up -d postgres redis minio

# Wait for infrastructure to be healthy
echo "Waiting for infrastructure services to be healthy..."
sleep 10

# Start application services
echo "Starting application services (backend-api, web-app, worker-jobs)..."
docker-compose up -d backend-api worker-jobs web-app

# Show status
echo ""
echo "Services status:"
docker-compose ps

echo ""
echo "Services are starting. Check logs with:"
echo "  docker-compose logs -f [service-name]"
echo ""
echo "Access points:"
echo "  Web App: http://localhost:3000"
echo "  Backend API: http://localhost:3800"
echo "  API Health: http://localhost:3800/healthz"
echo "  MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo "To stop all services:"
echo "  docker-compose down"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"

