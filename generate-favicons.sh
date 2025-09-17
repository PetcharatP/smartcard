#!/bin/bash

# Script to generate favicon files for CRMA System
# This script creates various sizes of favicon from the SVG source

echo "🎨 Creating CRMA System favicons..."

# Create a temporary HTML file to generate favicons
cat > /tmp/favicon-generator.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Favicon Generator</title>
    <style>
        canvas { border: 1px solid #ccc; margin: 10px; }
        .container { display: flex; flex-wrap: wrap; }
    </style>
</head>
<body>
    <h1>CRMA System Favicon Generator</h1>
    <div class="container">
        <canvas id="canvas16" width="16" height="16"></canvas>
        <canvas id="canvas32" width="32" height="32"></canvas>
        <canvas id="canvas180" width="180" height="180"></canvas>
        <canvas id="canvas512" width="512" height="512"></canvas>
    </div>

    <script>
        function drawFavicon(canvas, size) {
            const ctx = canvas.getContext('2d');
            const cornerRadius = size * 0.1875; // 6/32 ratio
            
            // Create gradient
            const gradient = ctx.createLinearGradient(0, 0, size, size);
            gradient.addColorStop(0, '#4F46E5');
            gradient.addColorStop(1, '#7C3AED');
            
            // Draw rounded rectangle background
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(0, 0, size, size, cornerRadius);
            ctx.fill();
            
            // Draw arrow
            ctx.fillStyle = 'white';
            const arrowSize = size * 0.375; // 12/32 ratio
            const centerX = size / 2;
            const centerY = size / 2;
            
            // Arrow pointing up
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - arrowSize/2);
            ctx.lineTo(centerX + arrowSize/3, centerY - arrowSize/6);
            ctx.lineTo(centerX + arrowSize/6, centerY - arrowSize/6);
            ctx.lineTo(centerX + arrowSize/6, centerY + arrowSize/2);
            ctx.lineTo(centerX - arrowSize/6, centerY + arrowSize/2);
            ctx.lineTo(centerX - arrowSize/6, centerY - arrowSize/6);
            ctx.lineTo(centerX - arrowSize/3, centerY - arrowSize/6);
            ctx.closePath();
            ctx.fill();
            
            // Draw base line
            const lineY = centerY + arrowSize/2 + size * 0.0625;
            const lineWidth = arrowSize;
            ctx.fillRect(centerX - lineWidth/2, lineY, lineWidth, size * 0.0625);
        }

        // Draw favicons
        drawFavicon(document.getElementById('canvas16'), 16);
        drawFavicon(document.getElementById('canvas32'), 32);
        drawFavicon(document.getElementById('canvas180'), 180);
        drawFavicon(document.getElementById('canvas512'), 512);

        // Function to download canvas as PNG
        function downloadCanvas(canvasId, filename) {
            const canvas = document.getElementById(canvasId);
            const link = document.createElement('a');
            link.download = filename;
            link.href = canvas.toDataURL();
            link.click();
        }

        // Add download buttons
        setTimeout(() => {
            const container = document.querySelector('.container');
            ['16', '32', '180', '512'].forEach(size => {
                const button = document.createElement('button');
                button.textContent = `Download ${size}x${size}`;
                button.onclick = () => downloadCanvas(`canvas${size}`, `favicon-${size}x${size}.png`);
                container.appendChild(button);
            });
        }, 100);
    </script>
</body>
</html>
EOF

echo "📁 Favicon generator created at /tmp/favicon-generator.html"
echo "🌐 Open this file in a browser to generate and download favicon files"
echo ""
echo "Instructions:"
echo "1. Open /tmp/favicon-generator.html in your browser"
echo "2. Click the download buttons to save favicon files"
echo "3. Copy the downloaded files to /root/my-fullstack-app/frontend/public/"
echo ""
echo "Files to generate:"
echo "- favicon-16x16.png"
echo "- favicon-32x32.png"
echo "- favicon-180x180.png (for apple-touch-icon.png)"
echo "- favicon-512x512.png (for og-image.png)"