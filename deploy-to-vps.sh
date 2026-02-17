#!/bin/bash

################################################################################
#                       VPS DEPLOYMENT SCRIPT                                 #
#                    Deploy to remote VPS via SSH                             #
################################################################################

set -e

echo "========================================================================"
echo "            AI MUHASEBI - DEPLOY TO VPS"
echo "========================================================================"
echo ""

# Configuration
SSH_USER="${1:-gh-user}"
SSH_HOST="${2:-172.16.0.191}"
SSH_KEY="${3:-}"
DEPLOY_PATH="${4:-/opt/ai-muhasebi}"
ENV_FILE="${5:-.env.prod}"

echo "📋 Deployment Configuration:"
echo "   SSH User: ${SSH_USER}"
echo "   SSH Host: ${SSH_HOST}"
echo "   Deploy Path: ${DEPLOY_PATH}"
echo "   Env File: ${ENV_FILE}"
echo ""

# Validate SSH connection
echo "🔌 Testing SSH connection..."
if ! ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 ${SSH_USER}@${SSH_HOST} "echo 'SSH connection successful'" > /dev/null 2>&1; then
    echo "❌ SSH connection failed to ${SSH_USER}@${SSH_HOST}"
    echo "   Please check:"
    echo "   1. SSH host is reachable"
    echo "   2. SSH credentials are correct"
    echo "   3. Firewall allows SSH (port 22)"
    exit 1
fi
echo "✓ SSH connection successful"
echo ""

# Check if env file exists
if [ ! -f "${ENV_FILE}" ]; then
    echo "❌ Environment file not found: ${ENV_FILE}"
    echo "   Please create .env.prod with production configuration"
    exit 1
fi
echo "✓ Environment file found: ${ENV_FILE}"
echo ""

# Create deploy directory
echo "📁 Creating deployment directory..."
ssh ${SSH_USER}@${SSH_HOST} "mkdir -p ${DEPLOY_PATH}"
echo "✓ Directory created: ${DEPLOY_PATH}"
echo ""

# Copy docker-compose.prod.yml
echo "📤 Uploading docker-compose.prod.yml..."
scp docker-compose.prod.yml ${SSH_USER}@${SSH_HOST}:${DEPLOY_PATH}/docker-compose.yml
echo "✓ docker-compose.yml uploaded"
echo ""

# Copy environment file
echo "📤 Uploading environment file..."
scp ${ENV_FILE} ${SSH_USER}@${SSH_HOST}:${DEPLOY_PATH}/.env
echo "✓ .env file uploaded"
echo ""

# Create initialization script on VPS
echo "🚀 Creating initialization script..."
ssh ${SSH_USER}@${SSH_HOST} << 'INIT_SCRIPT'
set -e

DEPLOY_PATH="/opt/ai-muhasebi"
cd ${DEPLOY_PATH}

echo ""
echo "========================================================================"
echo "                    INITIALIZING ON VPS"
echo "========================================================================"
echo ""

# Pull latest images
echo "📥 Pulling Docker images from gulfhoster..."
docker pull gulfhoster/ai-muhasebi-backend:latest
docker pull gulfhoster/ai-muhasebi-web:latest
docker pull gulfhoster/ai-muhasebi-worker:latest
echo "✓ Images pulled successfully"
echo ""

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.yml up -d
echo "✓ Services starting..."
echo ""

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy (this may take 1-2 minutes)..."
MAX_RETRIES=60
RETRY_COUNT=0
while [ ${RETRY_COUNT} -lt ${MAX_RETRIES} ]; do
    if docker-compose -f docker-compose.yml exec -T backend-api curl -f http://localhost:3800/healthz > /dev/null 2>&1; then
        echo "✓ Backend API is healthy"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $((RETRY_COUNT % 10)) -eq 0 ]; then
        echo "   Still waiting... (${RETRY_COUNT}/${MAX_RETRIES})"
    fi
    sleep 1
done

if [ ${RETRY_COUNT} -eq ${MAX_RETRIES} ]; then
    echo "⚠️  Timeout waiting for backend API to become healthy"
    echo "   Check logs: docker-compose logs backend-api"
else
    echo "✓ All services are healthy!"
fi
echo ""

# Show status
echo "📊 Service Status:"
docker-compose -f docker-compose.yml ps
echo ""

echo "========================================================================"
echo "✅ DEPLOYMENT COMPLETE"
echo "========================================================================"
echo ""
echo "Access Points:"
echo "  • Frontend: http://$(hostname -I | awk '{print $1}'):3010"
echo "  • Backend API: http://$(hostname -I | awk '{print $1}'):3800"
echo "  • API Docs: http://$(hostname -I | awk '{print $1}'):3800/api-docs"
echo ""
echo "Useful Commands:"
echo "  View logs:      docker-compose -f ${DEPLOY_PATH}/docker-compose.yml logs -f"
echo "  Restart:        docker-compose -f ${DEPLOY_PATH}/docker-compose.yml restart"
echo "  Stop:           docker-compose -f ${DEPLOY_PATH}/docker-compose.yml stop"
echo "  Remove:         docker-compose -f ${DEPLOY_PATH}/docker-compose.yml down"
echo ""

INIT_SCRIPT

echo "✓ Initialization script executed"
echo ""

# Final summary
echo "========================================================================"
echo "✅ DEPLOYMENT TO VPS COMPLETE"
echo "========================================================================"
echo ""
echo "🎉 Your AI Muhasebi platform is now deployed!"
echo ""
echo "Next Steps:"
echo "  1. Verify all services are running:"
echo "     ssh ${SSH_USER}@${SSH_HOST} 'cd /opt/ai-muhasebi && docker-compose ps'"
echo ""
echo "  2. Check backend logs:"
echo "     ssh ${SSH_USER}@${SSH_HOST} 'cd /opt/ai-muhasebi && docker-compose logs backend-api'"
echo ""
echo "  3. Set up reverse proxy (nginx/Apache) for HTTPS"
echo ""
echo "  4. Configure DNS to point to VPS IP: ${SSH_HOST}"
echo ""
