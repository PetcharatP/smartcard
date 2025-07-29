#!/bin/bash

echo "🚀 Building and preparing for deployment..."

# Build the project
npm run build

echo "✅ Build completed!"
echo ""
echo "📋 Next steps for Vercel deployment:"
echo "1. Go to vercel.com and login/signup"
echo "2. Click 'New Project'"
echo "3. Import this git repository OR upload the dist folder"
echo "4. Configure these settings:"
echo "   - Framework Preset: Other"
echo "   - Build Command: npm run build"
echo "   - Output Directory: dist"
echo "   - Install Command: npm install"
echo ""
echo "5. Add environment variables:"
echo "   VITE_API_URL= (leave empty)"
echo ""
echo "6. Deploy!"
echo ""
echo "📁 Your built files are in the dist/ folder"
echo "📁 Your API proxy is in the api/ folder"
echo ""
echo "🔧 Alternatively, you can:"
echo "1. Install Vercel CLI globally: npm i -g vercel"
echo "2. Run: vercel login"
echo "3. Run: vercel --prod"
