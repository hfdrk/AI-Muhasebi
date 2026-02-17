#!/bin/bash

################################################################################
#                         BUILD AND PUSH SCRIPT                               #
#                        Build Docker images locally                           #
#                        Push to gulfhoster Docker Hub                        #
################################################################################

set -e

echo "========================================================================"
echo "               AI MUHASEBI - BUILD & PUSH TO DOCKER HUB"
echo "========================================================================"
echo ""

# Configuration
DOCKER_REGISTRY="gulfhoster"
BACKEND_IMAGE="${DOCKER_REGISTRY}/ai-muhasebi-backend"
WEB_IMAGE="${DOCKER_REGISTRY}/ai-muhasebi-web"
WORKER_IMAGE="${DOCKER_REGISTRY}/ai-muhasebi-worker"
TAG="${1:-latest}"

echo "📦 Build Configuration:"
echo "   Registry: ${DOCKER_REGISTRY}"
echo "   Tag: ${TAG}"
echo "   Backend Image: ${BACKEND_IMAGE}:${TAG}"
echo "   Web Image: ${WEB_IMAGE}:${TAG}"
echo "   Worker Image: ${WORKER_IMAGE}:${TAG}"
echo ""

# Check Docker daemon
echo "✓ Checking Docker daemon..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker daemon is not running. Please start Docker."
    exit 1
fi
echo "✓ Docker daemon is running"
echo ""

# Check Docker login
echo "✓ Checking Docker authentication..."
if ! docker info | grep -q "Username: ${DOCKER_REGISTRY}"; then
    echo "⚠️  Docker login required for ${DOCKER_REGISTRY}"
    echo "   Please run: docker login"
    exit 1
fi
echo "✓ Docker authenticated"
echo ""

# Build backend-api
echo "🔨 Building backend-api Docker image..."
echo "   Dockerfile: apps/backend-api/Dockerfile"
docker build \
    -f apps/backend-api/Dockerfile \
    -t ${BACKEND_IMAGE}:${TAG} \
    -t ${BACKEND_IMAGE}:latest \
    --progress=plain \
    .
echo "✓ Backend image built successfully"
echo ""

# Build web-app
echo "🔨 Building web-app Docker image..."
echo "   Dockerfile: apps/web-app/Dockerfile"
docker build \
    -f apps/web-app/Dockerfile \
    -t ${WEB_IMAGE}:${TAG} \
    -t ${WEB_IMAGE}:latest \
    --progress=plain \
    .
echo "✓ Web app image built successfully"
echo ""

# Build worker-jobs
echo "🔨 Building worker-jobs Docker image..."
echo "   Dockerfile: apps/worker-jobs/Dockerfile"
docker build \
    -f apps/worker-jobs/Dockerfile \
    -t ${WORKER_IMAGE}:${TAG} \
    -t ${WORKER_IMAGE}:latest \
    --progress=plain \
    .
echo "✓ Worker jobs image built successfully"
echo ""

# Push images
echo "📤 Pushing images to Docker Hub..."
echo ""

echo "   Pushing ${BACKEND_IMAGE}:${TAG}..."
docker push ${BACKEND_IMAGE}:${TAG}
echo "   Pushing ${BACKEND_IMAGE}:latest..."
docker push ${BACKEND_IMAGE}:latest
echo "✓ Backend image pushed"
echo ""

echo "   Pushing ${WEB_IMAGE}:${TAG}..."
docker push ${WEB_IMAGE}:${TAG}
echo "   Pushing ${WEB_IMAGE}:latest..."
docker push ${WEB_IMAGE}:latest
echo "✓ Web app image pushed"
echo ""

echo "   Pushing ${WORKER_IMAGE}:${TAG}..."
docker push ${WORKER_IMAGE}:${TAG}
echo "   Pushing ${WORKER_IMAGE}:latest..."
docker push ${WORKER_IMAGE}:latest
echo "✓ Worker jobs image pushed"
echo ""

# Summary
echo "========================================================================"
echo "✅ BUILD & PUSH COMPLETE"
echo "========================================================================"
echo ""
echo "Images ready for deployment:"
echo "  • ${BACKEND_IMAGE}:${TAG}"
echo "  • ${WEB_IMAGE}:${TAG}"
echo "  • ${WORKER_IMAGE}:${TAG}"
echo ""
echo "Next steps:"
echo "  1. Copy docker-compose.prod.yml to VPS"
echo "  2. Create .env.prod with production variables"
echo "  3. Run: docker-compose -f docker-compose.prod.yml up -d"
echo ""
