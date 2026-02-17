#!/bin/bash

set -e

VPS_USER="${1:-gh-user}"
VPS_HOST="${2:-172.16.0.191}"
DEPLOY_DIR="${3:-/opt/ai-muhasebi}"

echo "Deploying to $VPS_USER@$VPS_HOST:$DEPLOY_DIR"

mkdir -p deploy_temp
cp docker-compose.prod.yml deploy_temp/docker-compose.yml
cp .env.prod deploy_temp/.env

echo "Uploading files..."
scp -r deploy_temp/* $VPS_USER@$VPS_HOST:$DEPLOY_DIR/

echo "Starting deployment on VPS..."
ssh $VPS_USER@$VPS_HOST << 'REMOTE_COMMANDS'
cd /opt/ai-muhasebi

echo "Pulling images..."
docker pull gulfhoster/ai-muhasebi-backend:latest
docker pull gulfhoster/ai-muhasebi-web:latest
docker pull gulfhoster/ai-muhasebi-worker:latest

echo "Starting services..."
docker-compose -f docker-compose.yml pull
docker-compose -f docker-compose.yml up -d

echo "Waiting for services..."
sleep 10

echo "Service status:"
docker-compose -f docker-compose.yml ps

echo "Health check:"
curl http://localhost:3800/healthz || echo "API not ready yet"

REMOTE_COMMANDS

echo "✓ Deployment complete"
echo "Access:"
echo "  Frontend: http://$VPS_HOST:3010"
echo "  API: http://$VPS_HOST:3800"
echo "  API Docs: http://$VPS_HOST:3800/api-docs"
