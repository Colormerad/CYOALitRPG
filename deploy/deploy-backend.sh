#!/bin/bash
# deploy-backend.sh - Script to rebuild and deploy the backend container
# Usage: ./deploy-backend.sh

echo "🚀 Starting backend deployment process..."

# Navigate to the deploy directory (uncomment if running from elsewhere)
# cd "$(dirname "$0")"

echo "🔨 Rebuilding backend container..."
docker-compose build backend

echo "🔄 Restarting backend container..."
docker-compose up -d backend

echo "✅ Checking container status..."
docker-compose ps backend

echo "📋 Showing recent logs..."
docker-compose logs --tail=20 backend

echo "✨ Deployment complete! The API should now be updated at api.mythosgame.app/api/docs"
