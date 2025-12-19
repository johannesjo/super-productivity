#!/bin/bash
# SuperSync Server Deployment Script
#
# Usage:
#   ./scripts/deploy.sh [--force]
#
# This script:
#   1. Pulls latest changes from git
#   2. Rebuilds and restarts containers
#   3. Verifies health check passes
#
# Options:
#   --force    Force rebuild without cache

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(dirname "$SCRIPT_DIR")"
REPO_DIR="$(dirname "$(dirname "$SERVER_DIR")")"

# Get domain from .env file
if [ -f "$SERVER_DIR/.env" ]; then
    DOMAIN=$(grep -E '^DOMAIN=' "$SERVER_DIR/.env" | cut -d'=' -f2)
fi

if [ -z "$DOMAIN" ]; then
    echo "Warning: DOMAIN not set in .env, using localhost for health check"
    HEALTH_URL="http://localhost:1900/health"
else
    HEALTH_URL="https://$DOMAIN/health"
fi

# Parse arguments
FORCE_BUILD=""
if [ "$1" = "--force" ]; then
    FORCE_BUILD="--no-cache"
fi

echo "==> SuperSync Deployment"
echo "    Server dir: $SERVER_DIR"
echo "    Health URL: $HEALTH_URL"
echo ""

# Step 1: Pull latest changes
echo "==> Pulling latest changes..."
cd "$REPO_DIR"
git pull origin "$(git rev-parse --abbrev-ref HEAD)"

# Step 2: Build and restart
echo ""
echo "==> Building and restarting containers..."
cd "$SERVER_DIR"

# Check if monitoring compose exists and include it
COMPOSE_FILES="-f docker-compose.yml"
if [ -f "docker-compose.monitoring.yml" ]; then
    COMPOSE_FILES="$COMPOSE_FILES -f docker-compose.monitoring.yml"
fi

docker compose $COMPOSE_FILES up -d --build $FORCE_BUILD

# Step 3: Wait for health check
echo ""
echo "==> Waiting for service to be healthy..."
sleep 5

# Retry health check up to 6 times (30 seconds total)
for i in {1..6}; do
    if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
        echo ""
        echo "==> Deployment successful!"
        echo "    Service is healthy at $HEALTH_URL"
        exit 0
    fi
    echo "    Waiting... (attempt $i/6)"
    sleep 5
done

echo ""
echo "==> Health check failed!"
echo "    Recent logs:"
docker compose logs --tail=30 supersync
exit 1
