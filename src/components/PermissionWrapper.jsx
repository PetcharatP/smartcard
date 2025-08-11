import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFastAuth } from '../hooks/useFastAuth';
import { canAccessPage, getPermissionMessage } from '../utils/permissions';

/**
 * Higher-Order Component สำหรับตรวจสอบสิทธิ์การเข้าถึงหน้า
 * @param {React.Component} WrappedComponent - Component ที่ต้องการป้องกัน
 * @param {string} requiredPage - ชื่อหน้าที่ต้องการสิทธิ์
 * @param {Object} options - ตัวเลือกเพิ่มเติม
 */
export const withPermission = (WrappedComponent, requiredPage, options = {}) => {
  const {
    redirectTo = '/login',
    showMessage = true,
    fallbackComponent: FallbackComponent = null
  } = options;

  return function ProtectedComponent(props) {
    const { user, isLoading } = useFastAuth();

    // กำลังโหลด
    if (isLoading) {
      return (
        <div className="permission-loading">
          <div className="loading">
            <div className="spinner"></div>
            กำลังตรวจสอบสิทธิ์...
          </div>
        </div>
      );
    }

    // ไม่มีผู้ใช้ - redirect ไป login
    if (!user) {
      return <Navigate to={redirectTo} replace />;
    }

    // ตรวจสอบสิทธิ์
    const hasAccess = canAccessPage(user, requiredPage);

    if (!hasAccess) {
      // แสดง Fallback Component ถ้ามี
      if (FallbackComponent) {
        return <FallbackComponent user={user} requiredPage={requiredPage} />;
      }

      // แสดงข้อความไม่มีสิทธิ์
      if (showMessage) {
        return (
          <div className="permission-denied">
            <div className="permission-denied-container">
              <div className="permission-denied-icon">🚫</div>
              <h2>ไม่มีสิทธิ์เข้าถึง</h2>
              <p>{getPermissionMessage(user.role, 'เข้าถึงหน้านี้')}</p>
              <div className="permission-actions">
                <button 
                  onClick={() => window.history.back()} 
                  className="btn-back"
                >
                  กลับหน้าก่อนหน้า
                </button>
                <button 
                  onClick={() => window.location.href = '/'} 
                  className="btn-home"
                >
                  กลับหน้าหลัก
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Redirect ถ้าไม่แสดงข้อความ
      return <Navigate to="/" replace />;
    }

    // มีสิทธิ์ - แสดง Component
    return <WrappedComponent {...props} user={user} />;
  };
};

/**
 * Hook สำหรับตรวจสอบสิทธิ์
 * @param {string} permission - สิทธิ์ที่ต้องการตรวจสอบ
 * @returns {Object}
 */
export const usePermission = (permission) => {
  const { user, isLoading } = useFastAuth();

  const hasPermission = React.useMemo(() => {
    if (!user || isLoading) return false;
    
    if (typeof permission === 'string') {
      return canAccessPage(user, permission);
    }
    
    return false;
  }, [user, isLoading, permission]);

  return {
    hasPermission,
    user,
    isLoading,
    role: user?.role,
    isAdmin: user?.admin || user?.role === 'admin'
  };
};

/**
 * Component สำหรับแสดง/ซ่อน UI ตามสิทธิ์
 */
export const PermissionGate = ({ 
  permission, 
  children, 
  fallback = null,
  user: propUser = null 
}) => {
  const { user: hookUser } = useFastAuth();
  const user = propUser || hookUser;

  if (!user) {
    return fallback;
  }

  const hasAccess = canAccessPage(user, permission);

  return hasAccess ? children : fallback;
};

/**
 * Component สำหรับแสดงข้อความไม่มีสิทธิ์
 */
export const PermissionDenied = ({ user, requiredPage, onBack, onHome }) => {
  return (
    <div className="permission-denied">
      <div className="permission-denied-container">
        <div className="permission-denied-icon">🚫</div>
        <h2>ไม่มีสิทธิ์เข้าถึง</h2>
        <p>{getPermissionMessage(user?.role, 'เข้าถึงหน้านี้')}</p>
        <div className="permission-denied-info">
          <p>หน้านี้เฉพาะสำหรับผู้ที่มีสิทธิ์เท่านั้น</p>
          <p>หากคุณเชื่อว่านี่เป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบ</p>
        </div>
        <div className="permission-actions">
          <button 
            onClick={onBack || (() => window.history.back())} 
            className="btn-back"
          >
            กลับหน้าก่อนหน้า
          </button>
          <button 
            onClick={onHome || (() => window.location.href = '/')} 
            className="btn-home"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    </div>
  );
};
