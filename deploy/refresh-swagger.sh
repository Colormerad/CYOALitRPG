#!/bin/bash

# 🔄 Swagger UI Refresh Script
# This script ensures Swagger UI is updated with the latest API changes

echo "🔄 Refreshing Swagger UI..."

# Add Docker to PATH if needed
export PATH="/Applications/Docker.app/Contents/Resources/bin:$PATH"

# Force rebuild backend with no cache to ensure Swagger changes are deployed
echo "🔨 Rebuilding backend container (no cache)..."
docker compose build --no-cache backend

# Restart the backend container
echo "🚀 Restarting backend container..."
docker compose up -d backend

# Wait a moment for the container to fully start
echo "⏳ Waiting for backend to start..."
sleep 5

# Verify Swagger JSON is serving correctly
echo "✅ Verifying Swagger JSON..."
SWAGGER_SIZE=$(curl -s https://api.mythosgame.app/api/docs.json | wc -c | tr -d ' ')

if [ "$SWAGGER_SIZE" -gt 5000 ]; then
    echo "✅ Swagger JSON is serving correctly ($SWAGGER_SIZE bytes)"
    echo "🎉 Swagger UI refresh complete!"
    echo "📖 View updated docs at: https://api.mythosgame.app/api/docs"
else
    echo "⚠️  Warning: Swagger JSON seems small ($SWAGGER_SIZE bytes)"
    echo "   This might indicate an issue with the API or truncation"
fi

echo ""
echo "💡 Tip: If endpoints still don't appear, try:"
echo "   - Hard refresh browser (Cmd+Shift+R)"
echo "   - Check for duplicate paths in swagger-spec.js"
echo "   - Verify Cloudflare cache settings"
