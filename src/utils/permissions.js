// Role-Based Access Control (RBAC) Utility Functions

export const ROLES = {
  STUDENT: 'student',    // นนร.
  TEACHER: 'teacher',    // อาจารย์
  OFFICER: 'officer',    // นายทหาร
  ADMIN: 'admin'         // แอดมิน
};

export const PERMISSIONS = {
  // ข้อมูลผู้ใช้
  VIEW_USER_DATA: 'view_user_data',
  EDIT_OWN_PROFILE: 'edit_own_profile',
  EDIT_OTHER_PROFILES: 'edit_other_profiles',
  
  // การตัดคะแนน
  DEDUCT_POINTS: 'deduct_points',
  
  // คลังอาวุธ
  VIEW_WEAPON_STORAGE: 'view_weapon_storage',
  EDIT_WEAPON_STORAGE: 'edit_weapon_storage',
  
  // สรุปยอด
  ADD_SUMMARY: 'add_summary',
  VIEW_SUMMARY: 'view_summary',
  EDIT_SUMMARY: 'edit_summary',
  DELETE_SUMMARY: 'delete_summary',
  
  // การจัดการผู้ใช้
  MANAGE_USERS: 'manage_users',
  MANAGE_ROLES: 'manage_roles',
  
  // อื่น ๆ
  VIEW_ALL_DATA: 'view_all_data'
};

// กำหนดสิทธิ์ตาม Role
export const ROLE_PERMISSIONS = {
  [ROLES.STUDENT]: [
    PERMISSIONS.EDIT_OWN_PROFILE,
    PERMISSIONS.ADD_SUMMARY,
    PERMISSIONS.VIEW_SUMMARY
  ],
  
  [ROLES.TEACHER]: [
    PERMISSIONS.VIEW_USER_DATA,
    PERMISSIONS.VIEW_ALL_DATA,
    PERMISSIONS.DEDUCT_POINTS,
    PERMISSIONS.VIEW_SUMMARY
  ],
  
  [ROLES.OFFICER]: [
    PERMISSIONS.VIEW_USER_DATA,
    PERMISSIONS.VIEW_ALL_DATA,
    PERMISSIONS.DEDUCT_POINTS,
    PERMISSIONS.VIEW_WEAPON_STORAGE,
    PERMISSIONS.VIEW_SUMMARY
  ],
  
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_USER_DATA,
    PERMISSIONS.VIEW_ALL_DATA,
    PERMISSIONS.EDIT_OWN_PROFILE,
    PERMISSIONS.EDIT_OTHER_PROFILES,
    PERMISSIONS.DEDUCT_POINTS,
    PERMISSIONS.VIEW_WEAPON_STORAGE,
    PERMISSIONS.EDIT_WEAPON_STORAGE,
    PERMISSIONS.ADD_SUMMARY,
    PERMISSIONS.VIEW_SUMMARY,
    PERMISSIONS.EDIT_SUMMARY,
    PERMISSIONS.DELETE_SUMMARY,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_ROLES
  ]
};

/**
 * ตรวจสอบว่าผู้ใช้มีสิทธิ์ที่กำหนดหรือไม่
 * @param {Object} user - ข้อมูลผู้ใช้
 * @param {string} permission - สิทธิ์ที่ต้องการตรวจสอบ
 * @returns {boolean}
 */
export const hasPermission = (user, permission) => {
  if (!user || !user.role) {
    return false;
  }
  
  // Admin มีสิทธิ์ทุกอย่าง
  if (user.admin || user.role === ROLES.ADMIN) {
    return true;
  }
  
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
};

/**
 * ตรวจสอบว่าผู้ใช้สามารถแก้ไขโปรไฟล์ของผู้อื่นได้หรือไม่
 * @param {Object} currentUser - ผู้ใช้ปัจจุบัน
 * @param {Object} targetUser - ผู้ใช้เป้าหมาย
 * @returns {boolean}
 */
export const canEditProfile = (currentUser, targetUser) => {
  if (!currentUser || !targetUser) {
    return false;
  }
  
  // Admin แก้ไขได้ทุกคน
  if (hasPermission(currentUser, PERMISSIONS.EDIT_OTHER_PROFILES)) {
    return true;
  }
  
  // นนร. แก้ไขได้แค่ตัวเอง
  if (currentUser.role === ROLES.STUDENT) {
    return currentUser.id === targetUser.id && 
           hasPermission(currentUser, PERMISSIONS.EDIT_OWN_PROFILE);
  }
  
  return false;
};

/**
 * ตรวจสอบว่าผู้ใช้สามารถเข้าถึงหน้าได้หรือไม่
 * @param {Object} user - ข้อมูลผู้ใช้
 * @param {string} page - ชื่อหน้า
 * @returns {boolean}
 */
export const canAccessPage = (user, page) => {
  if (!user) {
    return false;
  }
  
  switch (page) {
    case 'role-manager':
      return hasPermission(user, PERMISSIONS.MANAGE_ROLES);
      
    case 'deduct-point':
      return hasPermission(user, PERMISSIONS.DEDUCT_POINTS);
      
    case 'gun-borrowing':
      return hasPermission(user, PERMISSIONS.VIEW_WEAPON_STORAGE);
      
    case 'summary':
      return hasPermission(user, PERMISSIONS.VIEW_SUMMARY);
      
    case 'behavior-point':
    case 'home':
    case 'profile':
      return hasPermission(user, PERMISSIONS.VIEW_USER_DATA) || 
             user.role === ROLES.STUDENT;
      
    default:
      return true; // หน้าทั่วไปเข้าได้ทุกคน
  }
};

/**
 * รับข้อความแจ้งเตือนเมื่อไม่มีสิทธิ์
 * @param {string} role - Role ของผู้ใช้
 * @param {string} action - การกระทำที่ต้องการ
 * @returns {string}
 */
export const getPermissionMessage = (role, action) => {
  const roleText = {
    [ROLES.STUDENT]: 'นนร.',
    [ROLES.TEACHER]: 'อาจารย์',
    [ROLES.OFFICER]: 'นายทหาร',
    [ROLES.ADMIN]: 'แอดมิน'
  };
  
  return `${roleText[role] || 'ผู้ใช้'} ไม่มีสิทธิ์ในการ${action}`;
};

/**
 * รับรายการเมนูตาม Role
 * @param {Object} user - ข้อมูลผู้ใช้
 * @returns {Array}
 */
export const getMenuItems = (user) => {
  if (!user) return [];
  
  const baseMenu = [
    { path: '/', label: 'หน้าหลัก', icon: '🏠' },
    { path: '/profile', label: 'ข้อมูลส่วนตัว', icon: '👤' }
  ];
  
  const menuItems = [...baseMenu];
  
  // สำหรับ นนร.
  if (user.role === ROLES.STUDENT) {
    menuItems.push(
      { path: '/summary', label: 'ลงยอด', icon: '📊' },
      { path: '/behavior-point', label: 'คะแนนความประพฤติ', icon: '⭐' }
    );
  }
  
  // สำหรับ อาจารย์
  if (user.role === ROLES.TEACHER) {
    menuItems.push(
      { path: '/deduct-point', label: 'ตัดคะแนน', icon: '➖' },
      { path: '/summary', label: 'ดูสรุปยอด', icon: '📊' },
      { path: '/behavior-point', label: 'ดูคะแนนนักเรียน', icon: '⭐' }
    );
  }
  
  // สำหรับ นายทหาร
  if (user.role === ROLES.OFFICER) {
    menuItems.push(
      { path: '/deduct-point', label: 'ตัดคะแนน', icon: '➖' },
      { path: '/gun-borrowing', label: 'คลังอาวุธ', icon: '🔫' },
      { path: '/summary', label: 'ดูสรุปยอด', icon: '📊' },
      { path: '/behavior-point', label: 'ดูคะแนนนักเรียน', icon: '⭐' }
    );
  }
  
  // สำหรับ แอดมิน
  if (user.role === ROLES.ADMIN || user.admin) {
    menuItems.push(
      { path: '/role-manager', label: 'จัดการสิทธิ์ผู้ใช้', icon: '👥' },
      { path: '/deduct-point', label: 'ตัดคะแนน', icon: '➖' },
      { path: '/gun-borrowing', label: 'คลังอาวุธ', icon: '🔫' },
      { path: '/summary', label: 'จัดการสรุปยอด', icon: '📊' },
      { path: '/behavior-point', label: 'จัดการคะแนน', icon: '⭐' }
    );
  }
  
  return menuItems;
};
