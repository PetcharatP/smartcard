import { useState, useEffect } from 'react';

export const useFastAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileImage, setProfileImage] = useState(null);

  // ดึงข้อมูลเบื้องต้นจาก localStorage ทันที
  useEffect(() => {
    const loadBasicUserData = () => {
      try {
        const savedToken = localStorage.getItem('token');
        const savedUserInfo = localStorage.getItem('userInfo');
        
        if (savedToken) {
          setToken(savedToken);
        }
        
        if (savedUserInfo) {
          const userInfo = JSON.parse(savedUserInfo);
          setUser(userInfo);
          console.log('⚡ Fast loaded user info:', userInfo);
        }
      } catch (error) {
        console.error('❌ Error loading basic user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
      } finally {
        setIsLoading(false); // สำคัญ: หยุด loading ทันทีหลังโหลดจาก localStorage
      }
    };

    loadBasicUserData();
  }, []);

  // ฟังก์ชันดึงรูปโปรไฟล์แยก (เรียกเมื่อต้องการ)
  const loadProfileImage = async () => {
    if (!token || profileImage) return; // มีรูปแล้วหรือไม่มี token

    try {
      const response = await fetch(`/api/user/profile?token=${encodeURIComponent(token)}&includeImage=true`);
      const data = await response.json();
      
      if (data.status && data.data.profileImage) {
        const imageData = `data:image/jpeg;base64,${data.data.profileImage}`;
        setProfileImage(imageData);
        console.log('🖼️ Profile image loaded');
      }
    } catch (error) {
      console.error('Error loading profile image:', error);
    }
  };

  // ฟังก์ชันรีเฟรชข้อมูลจาก API (เรียกเมื่อจำเป็น)
  const refreshUserData = async () => {
    if (!token) return;

    try {
      const response = await fetch(`/api/user/profile?token=${encodeURIComponent(token)}`);
      const data = await response.json();
      
      if (data.status) {
        setUser(data.data);
        localStorage.setItem('userInfo', JSON.stringify(data.data));
        console.log('🔄 User data refreshed:', data.data);
        return data.data;
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // ฟังก์ชันล็อกเอาท์
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    setToken(null);
    setUser(null);
    setProfileImage(null);
  };

  // ฟังก์ชันอัพเดตข้อมูล user
  const updateUser = (newUserInfo) => {
    setUser(newUserInfo);
    localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
  };

  // ฟังก์ชันตรวจสอบสิทธิ์ admin
  const isAdmin = () => {
    return user?.admin === true || user?.role === 'admin';
  };

  return {
    // ข้อมูลพื้นฐาน (โหลดเร็ว)
    user,
    token,
    isLoading,
    isLoggedIn: !!token && !!user,
    isAdmin: isAdmin(),
    
    // ข้อมูลเสริม (โหลดแยก)
    profileImage,
    
    // ฟังก์ชัน
    logout,
    updateUser,
    loadProfileImage,
    refreshUserData,
    
    // สถานะ
    hasProfileImage: !!profileImage
  };
};
