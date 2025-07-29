#!/bin/bash

# Vercel Deployment Script
echo "🚀 Starting Vercel Deployment..."

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the frontend directory"
    exit 1
fi

# Install Vercel CLI if not installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please fix errors and try again."
    exit 1
fi

# Deploy to Vercel
echo "🌐 Deploying to Vercel..."
if [ "$1" = "prod" ]; then
    echo "🚀 Deploying to production..."
    vercel --prod
else
    echo "🔍 Deploying to preview..."
    vercel
fi

echo "✅ Deployment complete!"
echo "💡 To deploy to production, run: ./deploy.sh prod"
