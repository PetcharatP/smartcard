# Vercel Deployment Configuration

## การตั้งค่า Vercel Proxy

### 1. vercel.json Configuration
```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "http://103.91.205.153:3000/api/$1"
    }
  ]
}
```

### 2. Environment Variables
ใน Vercel Dashboard ตั้งค่า:
```
NODE_ENV=production
```

### 3. API URL Logic
```javascript
// ใน component ต่างๆ
const apiUrl = process.env.NODE_ENV === 'production' ? '' : (import.meta.env.VITE_API_URL || '');
```

## วิธีการ Deploy

### 1. Build Project
```bash
npm run build
```

### 2. Deploy to Vercel
```bash
# ติดตั้ง Vercel CLI (ถ้ายังไม่มี)
npm i -g vercel

# Deploy
vercel --prod
```

### 3. หรือใช้ Git Integration
1. Push code ไป GitHub
2. Connect repository ใน Vercel Dashboard
3. Vercel จะ auto-deploy เมื่อ push

## การทำงาน

### Development Mode
- Frontend: `http://localhost:5173` หรือ `http://103.91.205.153:5173`
- API calls: ไปที่ `http://103.91.205.153:3000/api/*` (direct)

### Production Mode (Vercel)
- Frontend: `https://your-app.vercel.app`
- API calls: `/api/*` → Vercel proxy → `http://103.91.205.153:3000/api/*`

## ข้อดี

1. **CORS Problem Solved**: ไม่มีปัญหา CORS เพราะ same-origin
2. **Security**: ซ่อน backend URL จาก client
3. **Performance**: Vercel Edge Network caching
4. **Reliability**: Vercel handles SSL/TLS และ CDN

## การทดสอบ

### หลัง Deploy แล้ว
```bash
# ทดสอบ API ผ่าน Vercel
curl https://your-app.vercel.app/api/health-check

# ทดสอบ login
curl -X POST https://your-app.vercel.app/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

## Troubleshooting

### 1. ถ้า API ไม่ทำงาน
- ตรวจสอบ backend server ยังทำงานอยู่หรือไม่
- ตรวจสอบ firewall port 3000
- ดู Vercel Function Logs

### 2. ถ้า CORS Error
- ตรวจสอบ vercel.json syntax
- Redeploy Vercel

### 3. Environment Variables
- ตรวจสอบใน Vercel Dashboard
- Redeploy หลังเปลี่ยน env vars
