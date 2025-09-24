import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';
import { VscAccount, VscThreeBars } from "react-icons/vsc";
import { motion, AnimatePresence } from 'framer-motion';
import UserSearch from './UserSearch';
import { getMenuItems, hasPermission, PERMISSIONS } from '../utils/permissions';
import logo from '../pic/logo.png';

export default function Navbar() {
  const [realname, setRealname] = useState('');
  const [userid, setUserId] = useState('');
  const [blood, setBlood] = useState('');
  const [major, setMajor] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null); // เพิ่มตัวแปร user
  const [showDropdown, setShowDropdown] = useState(false);
  const [showGunBehaviorMenu, setShowGunBehaviorMenu] = useState(false);
  const apiUrl = process.env.NODE_ENV === 'production' ? '' : (import.meta.env.VITE_API_URL || '');
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);
  const gunBehaviorRef = useRef(null);

  // รับเมนูตาม Role
  const menuItems = getMenuItems(user);
  const majorOptions = [
    { value: "ME", label: "วิศวกรรมเครื่องกล" },
    { value: "EE", label: "วิศวกรรมไฟฟ้าสื่อสาร" },
    { value: "CYBER", label: "ความมั่นคงปลอดภัยทางไซเบอร์" },
    { value: "SCIEN", label: "วิทยาศาสตร์และเทคโนโลยี (EN)" },
    { value: "CE", label: "วิศวกรรมโยธา" },
    { value: "GEO", label: "วิศวกรรมแผนที่" },
    { value: "IE", label: "วิศวกรรมอุตสาหการ" },
    { value: "SCI", label: "วิทยาศาสตร์และเทคโนโลยี" },
    { value: "SOC", label: "สังคมศาสตร์เพื่อการพัฒนา" },
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    // ไม่ redirect ถ้าอยู่ที่ /login หรือ /register
    if (!token && location.pathname !== '/login' && location.pathname !== '/register') {
      navigate('/login');
    } else if (token) {
      fetch(`/api/user/${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setRealname(data.data.realname);
            setUserId(data.data.userid);
            setBlood(data.data.blood);
            setMajor(data.data.major);
            setIsAdmin(data.data.admin || false);
            
            // เซ็ต user object สำหรับ permission system
            setUser({
              id: data.data.id,
              realname: data.data.realname,
              userid: data.data.userid,
              username: data.data.username,
              role: data.data.role || 'student',
              admin: data.data.admin || false,
              ...data.data
            });
            if (data.data.profileImage) {
              setProfileImage(`data:image/jpeg;base64,${data.data.profileImage}`);
            } else {
              setProfileImage('');
            }
          }
        });
    }
  }, [navigate, location]);

  // ปรับ toggle ให้กดได้ทีละปุ่ม
  const toggleDropdown = () => {
    setShowDropdown(prev => {
      if (!prev) {
        setShowGunBehaviorMenu(false);
      }
      return !prev;
    });
  };

  const toggleGunBehaviorMenu = () => {
    setShowGunBehaviorMenu(prev => {
      if (!prev) {
        setShowDropdown(false);
      }
      return !prev;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setShowDropdown(false);
    navigate('/login');
  };

  const handleHome = () => {
    navigate('/');
  };

  const handleEditProfile = () => {
    setShowDropdown(false);
    navigate('/edit-profile');
  };

  const handleViewProfile = () => {
    setShowDropdown(false);
    navigate('/view-profile');
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        profileRef.current && !profileRef.current.contains(event.target) &&
        gunBehaviorRef.current && !gunBehaviorRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
        setShowGunBehaviorMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar bg-white text-black shadow-md border-b border-gray-300 flex items-center justify-between px-4 py-2">
      <div className="flex items-center">
        <span className="btn btn-ghost normal-case text-xl text-black flex items-center cursor-pointer" onClick={handleHome}>
          <img src={logo} alt="Logo" className="logo-img" />
          <span className="ml-2">CRMA</span>
        </span>
        {/* Dashboard link after logo */}
        <button className="btn btn-ghost ml-3 text-sm" onClick={() => navigate('/dashboard')}>Dashboard</button>
      </div>

      <div className="flex items-center space-x-2">
        {/* User Search */}
        <UserSearch />
        
        {/* Gun/Behavior Menu */}
        <div ref={gunBehaviorRef} className="relative">
          <button className="btn btn-ghost" onClick={toggleGunBehaviorMenu}>
            <VscThreeBars size={28} />
          </button>
          <AnimatePresence>
            {showGunBehaviorMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.18 }}
                className="dropdown-content show"
              >
                {menuItems
                  .filter(item => item.path !== '/' && item.path !== '/profile') // ไม่แสดงหน้าหลักและโปรไฟล์
                  .map((item, index) => (
                    <p
                      key={item.path}
                      className={`block px-4 py-2 text-black cursor-pointer hover:bg-gray-200 ${
                        item.path === '/role-manager' ? 'font-semibold border-t border-gray-200' : ''
                      }`}
                      onClick={() => {
                        setShowGunBehaviorMenu(false);
                        navigate(item.path);
                      }}
                    >
                      {item.icon && <span className="mr-2">{item.icon}</span>}
                      {item.label}
                    </p>
                  ))
                }
                
                {/* แสดงข้อความถ้าไม่มีเมนู */}
                {menuItems.filter(item => item.path !== '/' && item.path !== '/profile').length === 0 && (
                  <p className="block px-4 py-2 text-gray-500 text-center">
                    ไม่มีเมนูเพิ่มเติม
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Dropdown */}
        <div ref={profileRef} className="relative">
          <button className="btn btn-ghost" onClick={toggleDropdown}>
            <VscAccount size={28} />
          </button>
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.18 }}
                className="dropdown-content show"
              >
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="dropdown-profile-img mb-2 rounded-full w-16 h-16 object-cover mx-auto" />
                ) : (
                  <div className="dropdown-profile-img mb-2 rounded-full w-16 h-16 bg-gray-300 mx-auto flex items-center justify-center text-gray-600">
                    No Image
                  </div>
                )}
                <p><strong>ชื่อ:</strong> {realname}</p>
                <p><strong>User ID:</strong> {userid}</p>
                <p>
                  <strong>สาขา:</strong> {
                    majorOptions.find(opt => opt.value === major)?.label || major
                  }
                </p>
                <div className="mt-3 space-y-1">
                  <p className="btn btn-ghost text-left w-full edit-profile-item" onClick={handleEditProfile}>Edit Profile</p>
                  <p className="btn btn-ghost text-left w-full view-profile-item" onClick={handleViewProfile}>View Profile</p>
                  <p className="btn btn-ghost text-left w-full logout-item" onClick={handleLogout}>Logout</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
}