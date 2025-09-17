#!/bin/bash

# สคริปต์สำหรับอัปเดต API URL ในทุกไฟล์ Frontend

echo "🔄 อัปเดต API URL ในไฟล์ Frontend ทั้งหมด..."

# อัปเดตไฟล์ที่ใช้ apiUrl
files=(
  "src/pages/Register.jsx"
  "src/pages/GunBorrowing.jsx"
  "src/pages/EditProfile.jsx"
  "src/pages/BehaviorPoint/BehaviorPoint.jsx"
  "src/pages/DeductPoint/DeductPoint.jsx"
  "src/pages/Summary.jsx"
  "src/pages/ViewPofile.jsx"
  "src/components/UserList.jsx"
  "src/components/Navbar.jsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 อัปเดตไฟล์: $file"
    
    # แทนที่ apiUrl declaration
    sed -i 's/const apiUrl = import\.meta\.env\.VITE_API_URL;/const apiUrl = process.env.NODE_ENV === '\''production'\'' ? '\'''\'' : (import.meta.env.VITE_API_URL || '\'\'\'');/' "$file"
    
    echo "✅ อัปเดต $file เสร็จแล้ว"
  else
    echo "⚠️  ไม่พบไฟล์: $file"
  fi
done

echo ""
echo "🎉 อัปเดตเสร็จสิ้น!"
echo ""
echo "📋 สรุปการเปลี่ยนแปลง:"
echo "- Development: ใช้ VITE_API_URL (http://103.91.205.153:3000)"
echo "- Production: ใช้ relative path (/api) ผ่าน Vercel proxy"
echo ""
echo "🚀 ขั้นตอนถัดไป:"
echo "1. npm run build"
echo "2. Deploy to Vercel"
echo "3. Vercel จะ proxy /api/* ไปยัง http://103.91.205.153:3000/api/*"
