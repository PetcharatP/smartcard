import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useFastAuth } from '../hooks/useFastAuth';
import Navbar from '../components/Navbar';
import { withPermission, PermissionDenied } from '../components/PermissionWrapper';
import { hasPermission, PERMISSIONS } from '../utils/permissions';
import './RoleManager.css';
import '../components/PermissionWrapper.css';

const RoleManager = () => {
  const { user, isLoading } = useFastAuth();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  console.log('RoleManager - User data:', user);
  console.log('RoleManager - Loading:', isLoading);
  console.log('RoleManager - User admin status:', user?.admin);

  // โหลดผู้ใช้ทั้งหมด
  const loadAllUsers = async () => {
    setLoadingUsers(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/search-users?q=', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      if (data.status) {
        setUsers(data.data || []);
      } else {
        setError(data.message || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้');
    } finally {
      setLoadingUsers(false);
    }
  };

  // ค้นหาผู้ใช้
  const searchUsers = async (query) => {
    if (!query.trim()) {
      loadAllUsers();
      return;
    }

    setLoadingUsers(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/search-users?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      if (data.status) {
        setUsers(data.data || []);
      } else {
        setError(data.message || 'Failed to search users');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setError('เกิดข้อผิดพลาดในการค้นหาผู้ใช้');
    } finally {
      setLoadingUsers(false);
    }
  };

  // อัปเดต role
  const updateUserRole = async (userId, newRole) => {
    setUpdatingRole(userId);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: userId,
          role: newRole
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update role');
      }

      const data = await response.json();
      if (data.status) {
        setSuccess(`อัปเดต role เป็น ${getRoleText(newRole)} สำเร็จ`);
        
        // อัปเดตข้อมูลในรายการ
        setUsers(prevUsers => 
          prevUsers.map(u => 
            u.id === userId 
              ? { ...u, role: newRole, admin: newRole === 'admin' }
              : u
          )
        );

        // ล้างข้อความสำเร็จหลัง 3 วินาที
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update role');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      setError('เกิดข้อผิดพลาดในการอัปเดต role');
    } finally {
      setUpdatingRole(null);
    }
  };

  const getRoleText = (role) => {
    const roleMap = {
      'student': 'นักเรียน',
      'teacher': 'อาจารย์', 
      'officer': 'นายทหาร',
      'admin': 'แอดมิน'
    };
    return roleMap[role] || role;
  };

  const getRoleBadgeClass = (role) => {
    const classMap = {
      'student': 'role-student',
      'teacher': 'role-teacher',
      'officer': 'role-officer', 
      'admin': 'role-admin'
    };
    return classMap[role] || '';
  };

  useEffect(() => {
    if (user && user.admin) {
      loadAllUsers();
    }
  }, [user]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (user && user.admin) {
        searchUsers(searchTerm);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, user]);

  // ตรวจสอบสิทธิ์ admin
  if (isLoading) {
    return (
      <div className="role-manager">
        <div className="loading">
          <div className="spinner"></div>
          กำลังโหลด...
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(user, PERMISSIONS.MANAGE_ROLES)) {
    return (
      <div className="role-manager">
        <PermissionDenied user={user} requiredPage="role-manager" />
      </div>
    );
  }

  return (
    <div className="role-manager">
      <Navbar />
      
      <div className="role-manager-container">
        <div className="role-manager-header">
          <div className="header-content">
            <div className="title-section">
              <h1>การจัดการสิทธิ์ผู้ใช้</h1>
              <p className="subtitle">จัดการ Role และสิทธิ์การเข้าถึงของผู้ใช้ในระบบ</p>
            </div>
            <div className="stats-section">
              <div className="stats-card">
                <span className="stats-number">{users.length}</span>
                <span className="stats-label">ผู้ใช้ทั้งหมด</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-section">
          <div className="search-container">
            <div className="search-icon">🔍</div>
            <input
              type="text"
              placeholder="ค้นหาผู้ใช้ (ชื่อ, รหัสประจำตัว, username)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="clear-search"
                aria-label="ล้างการค้นหา"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
          </div>
        )}

        {/* Users List */}
        <div className="users-section">
          {loadingUsers ? (
            <div className="loading-users">
              <div className="spinner"></div>
              <span>กำลังโหลดข้อมูลผู้ใช้...</span>
            </div>
          ) : (
            <div className="users-grid">
              {users.length === 0 ? (
                <div className="no-users">
                  ไม่พบผู้ใช้
                </div>
              ) : (
                users.map((userData) => (
                  <div key={userData.id} className="user-card">
                    <div className="user-card-header">
                      <div className="user-avatar">
                        {userData.realname?.charAt(0) || '?'}
                      </div>
                      <div className="user-basic-info">
                        <div className="user-name">
                          <strong>{userData.realname}</strong>
                        </div>
                        <div className="user-username">@{userData.username}</div>
                      </div>
                      <div className="current-role-badge">
                        <span className={`role-badge ${getRoleBadgeClass(userData.role)}`}>
                          {getRoleText(userData.role)}
                        </span>
                      </div>
                    </div>

                    <div className="user-card-body">
                      <div className="user-details-grid">
                        <div className="detail-item">
                          <span className="detail-label">รหัสประจำตัว:</span>
                          <span className="detail-value">{userData.userid}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">หน่วย:</span>
                          <span className="detail-value">{userData.battalion}-{userData.company}-{userData.platoon}-{userData.squad}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">ชั้นปี:</span>
                          <span className="detail-value">{userData.year}</span>
                        </div>
                      </div>
                    </div>

                    <div className="user-card-footer">
                      <div className="role-controls">
                        <label>เปลี่ยนสิทธิ์:</label>
                        <div className="role-select-container">
                          <select
                            value={userData.role}
                            onChange={(e) => updateUserRole(userData.id, e.target.value)}
                            disabled={updatingRole === userData.id}
                            className="role-select"
                          >
                            <option value="student">นักเรียน</option>
                            <option value="teacher">อาจารย์</option>
                            <option value="officer">นายทหาร</option>
                            <option value="admin">แอดมิน</option>
                          </select>
                          
                          {updatingRole === userData.id && (
                            <div className="updating-indicator">
                              <div className="small-spinner"></div>
                              <span>อัปเดต...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleManager;
