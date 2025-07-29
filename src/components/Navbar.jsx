import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../pic/logo.jpeg';
import './Navbar.css';
import { VscAccount, VscThreeBars } from "react-icons/vsc";
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const [realname, setRealname] = useState('');
  const [userid, setUserId] = useState('');
  const [blood, setBlood] = useState('');
  const [major, setMajor] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showGunBehaviorMenu, setShowGunBehaviorMenu] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);
  const gunBehaviorRef = useRef(null);
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
      fetch(`${apiUrl}/api/user/${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.data) {
            setRealname(data.data.realname);
            setUserId(data.data.userid);
            setBlood(data.data.blood);
            setMajor(data.data.major);
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
      </div>

      <div className="flex items-center space-x-2">
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
                className="absolute right-0 mt-2 w-48 bg-white border border-gray-300 rounded shadow-md z-50 dropdown-content show"
              >
                <p className="block px-4 py-2 text-black cursor-pointer hover:bg-gray-200" onClick={() => { setShowGunBehaviorMenu(false); navigate('/gun-borrowing'); }}>เบิก / คืน อาวุธปืน</p>
                <p className="block px-4 py-2 text-black cursor-pointer hover:bg-gray-200" onClick={() => { setShowGunBehaviorMenu(false); navigate('/behavior-point'); }}>ตัดคะแนนความประพฤติ</p>
                <p className="block px-4 py-2 text-black cursor-pointer hover:bg-gray-200" onClick={() => { setShowGunBehaviorMenu(false); navigate('/summary'); }}>เช็คใบยอด</p>
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
                className="dropdown-content show absolute right-0 mt-2 w-52 bg-white border border-gray-300 rounded shadow-md z-50 p-4"
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