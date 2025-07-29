# Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Backend API**: Make sure your backend is running and accessible

## Deployment Steps

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy from frontend directory**:
```bash
cd /root/my-fullstack-app/frontend
vercel
```

4. **Follow the prompts**:
- Link to existing project? `N`
- What's your project's name? `my-fullstack-app-frontend`
- In which directory is your code located? `./`
- Auto-detected Project Settings (Vite): `Y`

### Method 2: GitHub Integration

1. **Push to GitHub**:
```bash
cd /root/my-fullstack-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

2. **Connect to Vercel**:
- Go to [vercel.com/dashboard](https://vercel.com/dashboard)
- Click "Import Project"
- Connect your GitHub repository
- Select the frontend folder as root directory

## Environment Variables

Configure these in Vercel Dashboard → Project → Settings → Environment Variables:

```
VITE_API_URL=http://103.91.205.153:3000
```

## Build Settings

Vercel should auto-detect these settings:
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## Custom Domains (Optional)

1. In Vercel Dashboard → Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

## Production Checklist

- ✅ Environment variables configured
- ✅ Backend API accessible and CORS enabled
- ✅ Build succeeds locally (`npm run build`)
- ✅ Preview works (`npm run serve`)

## Useful Commands

```bash
# Test build locally
npm run build
npm run serve

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment logs
vercel logs [deployment-url]
```

## Troubleshooting

### Build Errors
- Check package.json dependencies
- Ensure all imports are correct
- Verify environment variables

### API Connection Issues
- Verify VITE_API_URL in environment variables
- Check CORS settings on backend
- Ensure backend is accessible from internet

### Routing Issues
- Verify vercel.json configuration
- Check React Router setup

## Automatic Deployments

Once connected to GitHub:
- Push to main branch → automatic production deployment
- Push to other branches → automatic preview deployments

## Domain Example

After deployment, your app will be available at:
- `https://my-fullstack-app-frontend.vercel.app`
- Or your custom domain
