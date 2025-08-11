import { useState, useRef, useEffect } from 'react';
import { VscSearch, VscClose } from 'react-icons/vsc';
import { motion, AnimatePresence } from 'framer-motion';
import './UserSearch.css';

export default function UserSearch() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const apiUrl = process.env.NODE_ENV === 'production' ? '' : (import.meta.env.VITE_API_URL || '');

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsExpanded(false);
        setShowResults(false);
        setSearchQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Auto focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 200);
    }
  }, [isExpanded]);

  // Search API call
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/search-users?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      
      if (data.status) {
        setSearchResults(data.data);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery && isExpanded) {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isExpanded]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      setShowResults(false);
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleUserClick = (user) => {
    console.log('Selected user:', user);
    setShowResults(false);
    setSearchQuery('');
    setIsExpanded(false);
    // You can add navigation or other actions here
  };

  // แปลง Buffer เป็น base64 สำหรับรูปภาพ (เหมือนกับใน UserList)
  const bufferToImage = (profileImage) => {
    if (!profileImage) return '';
    if (typeof profileImage === 'string') {
      return `data:image/png;base64,${profileImage}`;
    }
    if (profileImage.data) {
      const base64 = btoa(
        new Uint8Array(profileImage.data).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      return `data:image/png;base64,${base64}`;
    }
    return '';
  };

  const majorOptions = {
    "ME": "วิศวกรรมเครื่องกล",
    "EE": "วิศวกรรมไฟฟ้าสื่อสาร",
    "CYBER": "ความมั่นคงปลอดภัยทางไซเบอร์",
    "SCIEN": "วิทยาศาสตร์และเทคโนโลยี (EN)",
    "CE": "วิศวกรรมโยธา",
    "GEO": "วิศวกรรมแผนที่",
    "IE": "วิศวกรรมอุตสาหการ",
    "SCI": "วิทยาศาสตร์และเทคโนโลยี",
    "SOC": "สังคมศาสตร์เพื่อการพัฒนา",
  };

  const roleOptions = {
    "student": "นักเรียนนายสิบ",
    "teacher": "อาจารย์",
    "officer": "นายทหาร",
    "admin": "ผู้ดูแลระบบ"
  };

  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'admin': return 'role-badge admin';
      case 'officer': return 'role-badge officer';
      case 'teacher': return 'role-badge teacher';
      case 'student': 
      default: return 'role-badge student';
    }
  };

  const getAffiliation = (user) => {
    const parts = [];
    if (user.battalion) parts.push(`กองพัน ${user.battalion}`);
    if (user.company) parts.push(`ร้อย ${user.company}`);
    if (user.platoon) parts.push(`หมู่ ${user.platoon}`);
    if (user.squad) parts.push(`หมวด ${user.squad}`);
    return parts.length > 0 ? parts.join(' ') : '';
  };

  return (
    <div ref={searchRef} className="user-search-container">
      <motion.div
        className={`user-search ${isExpanded ? 'expanded' : ''}`}
        initial={false}
        animate={{ 
          width: isExpanded ? 
            (window.innerWidth <= 480 ? '220px' : 
             window.innerWidth <= 360 ? '200px' : '280px') : '40px',
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <div className="search-icon-container" onClick={handleToggle}>
          {isExpanded ? (
            <VscClose size={20} className="search-icon" />
          ) : (
            <VscSearch size={20} className="search-icon" />
          )}
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.input
              ref={inputRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              type="text"
              placeholder="ค้นหาผู้ใช้..."
              value={searchQuery}
              onChange={handleInputChange}
              className="search-input"
            />
          )}
        </AnimatePresence>
      </motion.div>

      {/* Search Results */}
      <AnimatePresence>
        {showResults && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="search-results"
          >
            {isLoading && (
              <div className="search-loading">กำลังค้นหา...</div>
            )}
            
            {!isLoading && searchResults.map((user) => (
              <div
                key={user.id}
                className="search-result-item"
                onClick={() => handleUserClick(user)}
              >
                <div className="user-avatar">
                  {user.profileImage && user.profileImage.data ? (
                    <img
                      src={bufferToImage(user.profileImage)}
                      alt="Profile"
                      className="userlist-avatar"
                    />
                  ) : (
                    <div className="no-avatar">
                      {user.realname ? user.realname.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                </div>
                
                <div className="user-info">
                  <div className="user-name-row">
                    <div className="user-name">{user.realname || 'ไม่ระบุชื่อ'}</div>
                    <div className="badges">
                      {user.role && (
                        <div className={getRoleBadgeClass(user.role)}>
                          {roleOptions[user.role] || user.role}
                        </div>
                      )}
                      {user.admin && (
                        <div className="admin-badge">Admin</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="user-details">
                    <div className="detail-row">
                      <span className="label">ID:</span>
                      <span className="value">{user.userid}</span>
                    </div>
                    
                    {user.year && (
                      <div className="detail-row">
                        <span className="label">ชั้นปี:</span>
                        <span className="value">{user.year}</span>
                      </div>
                    )}
                    
                    {user.major && (
                      <div className="detail-row">
                        <span className="label">กองวิชา:</span>
                        <span className="value major-text">
                          {majorOptions[user.major] || user.major}
                        </span>
                      </div>
                    )}
                    
                    {getAffiliation(user) && (
                      <div className="detail-row">
                        <span className="label">สังกัด:</span>
                        <span className="value">{getAffiliation(user)}</span>
                      </div>
                    )}
                    
                    <div className="detail-row">
                      <span className="label">Username:</span>
                      <span className="value username">@{user.username}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {!isLoading && searchResults.length === 0 && searchQuery && (
              <div className="no-results">ไม่พบผู้ใช้ที่ค้นหา</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
