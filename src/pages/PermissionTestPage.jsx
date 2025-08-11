import React from 'react';
import { useFastAuth } from '../hooks/useFastAuth';
import { hasPermission, PERMISSIONS, ROLES, getMenuItems } from '../utils/permissions';

const PermissionTestPage = () => {
  const { user, isLoading } = useFastAuth();

  if (isLoading) {
    return <div>กำลังโหลด...</div>;
  }

  if (!user) {
    return <div>กรุณาเข้าสู่ระบบ</div>;
  }

  const menuItems = getMenuItems(user);

  const testPermissions = [
    { permission: PERMISSIONS.VIEW_USER_DATA, label: 'ดูข้อมูลผู้ใช้' },
    { permission: PERMISSIONS.EDIT_OWN_PROFILE, label: 'แก้ไขโปรไฟล์ตัวเอง' },
    { permission: PERMISSIONS.EDIT_OTHER_PROFILES, label: 'แก้ไขโปรไฟล์คนอื่น' },
    { permission: PERMISSIONS.DEDUCT_POINTS, label: 'ตัดคะแนน' },
    { permission: PERMISSIONS.VIEW_WEAPON_STORAGE, label: 'ดูคลังอาวุธ' },
    { permission: PERMISSIONS.EDIT_WEAPON_STORAGE, label: 'แก้ไขคลังอาวุธ' },
    { permission: PERMISSIONS.ADD_SUMMARY, label: 'เพิ่มสรุปยอด' },
    { permission: PERMISSIONS.VIEW_SUMMARY, label: 'ดูสรุปยอด' },
    { permission: PERMISSIONS.EDIT_SUMMARY, label: 'แก้ไขสรุปยอด' },
    { permission: PERMISSIONS.DELETE_SUMMARY, label: 'ลบสรุปยอด' },
    { permission: PERMISSIONS.MANAGE_USERS, label: 'จัดการผู้ใช้' },
    { permission: PERMISSIONS.MANAGE_ROLES, label: 'จัดการสิทธิ์' }
  ];

  const getRoleText = (role) => {
    const roleMap = {
      [ROLES.STUDENT]: 'นักเรียน (นนร.)',
      [ROLES.TEACHER]: 'อาจารย์',
      [ROLES.OFFICER]: 'นายทหาร',
      [ROLES.ADMIN]: 'แอดมิน'
    };
    return roleMap[role] || role;
  };

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1>🧪 ทดสอบระบบสิทธิ์การใช้งาน (RBAC)</h1>
      
      <div style={{ 
        backgroundColor: '#f0f8ff', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px'
      }}>
        <h2>ข้อมูลผู้ใช้ปัจจุบัน</h2>
        <p><strong>ชื่อ:</strong> {user.realname}</p>
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Role:</strong> {getRoleText(user.role)} ({user.role})</p>
        <p><strong>Admin:</strong> {user.admin ? '✅ ใช่' : '❌ ไม่ใช่'}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>🔑 สิทธิ์การใช้งาน</h2>
        <div style={{ display: 'grid', gap: '8px' }}>
          {testPermissions.map(({ permission, label }) => {
            const hasAccess = hasPermission(user, permission);
            return (
              <div
                key={permission}
                style={{
                  padding: '10px',
                  backgroundColor: hasAccess ? '#e8f5e8' : '#ffe8e8',
                  border: `2px solid ${hasAccess ? '#4caf50' : '#f44336'}`,
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{label}</span>
                <span style={{ 
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: hasAccess ? '#4caf50' : '#f44336'
                }}>
                  {hasAccess ? '✅ อนุญาต' : '❌ ไม่อนุญาต'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>📱 เมนูที่แสดงตาม Role</h2>
        <div style={{ display: 'grid', gap: '8px' }}>
          {menuItems.map((item, index) => (
            <div
              key={index}
              style={{
                padding: '12px',
                backgroundColor: '#e3f2fd',
                border: '2px solid #2196f3',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span><strong>{item.label}</strong> ({item.path})</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ 
        backgroundColor: '#fff3e0', 
        padding: '15px', 
        borderRadius: '8px',
        border: '2px solid #ff9800'
      }}>
        <h3>📋 สรุปสิทธิ์ตาม Role</h3>
        
        {user.role === ROLES.STUDENT && (
          <div>
            <h4>👨‍🎓 นักเรียน (นนร.)</h4>
            <ul>
              <li>✅ แก้ไขข้อมูลตัวเอง</li>
              <li>✅ เพิ่มและดูสรุปยอด</li>
              <li>❌ ไม่สามารถตัดคะแนนได้</li>
              <li>❌ ไม่สามารถดูคลังอาวุธได้</li>
              <li>❌ ไม่สามารถแก้ไขข้อมูลคนอื่นได้</li>
            </ul>
          </div>
        )}
        
        {user.role === ROLES.TEACHER && (
          <div>
            <h4>👨‍🏫 อาจารย์</h4>
            <ul>
              <li>✅ ดูข้อมูลผู้ใช้</li>
              <li>✅ ตัดคะแนนได้</li>
              <li>✅ ดูสรุปยอด</li>
              <li>❌ ไม่สามารถแก้ไขข้อมูลคลังอาวุธได้</li>
              <li>❌ ไม่สามารถแก้ไขข้อมูลคนอื่นได้</li>
            </ul>
          </div>
        )}
        
        {user.role === ROLES.OFFICER && (
          <div>
            <h4>🪖 นายทหาร</h4>
            <ul>
              <li>✅ ดูข้อมูลผู้ใช้</li>
              <li>✅ ตัดคะแนนได้</li>
              <li>✅ ดูข้อมูลคลังอาวุธ</li>
              <li>✅ ดูสรุปยอด</li>
              <li>❌ ไม่สามารถแก้ไขข้อมูลคนอื่นได้</li>
              <li>❌ ไม่สามารถแก้ไขคลังอาวุธได้</li>
            </ul>
          </div>
        )}
        
        {(user.role === ROLES.ADMIN || user.admin) && (
          <div>
            <h4>🔧 แอดมิน</h4>
            <ul>
              <li>✅ ทำได้ทุกอย่าง</li>
              <li>✅ จัดการสิทธิ์ผู้ใช้</li>
              <li>✅ แก้ไขข้อมูลทุกคน</li>
              <li>✅ จัดการคลังอาวุธ</li>
              <li>✅ จัดการสรุปยอด</li>
            </ul>
          </div>
        )}
      </div>

      <div style={{ 
        marginTop: '20px',
        textAlign: 'center',
        color: '#666'
      }}>
        <p>🧪 นี่คือหน้าทดสอบระบบสิทธิ์ - ใช้สำหรับตรวจสอบการทำงานของ RBAC</p>
      </div>
    </div>
  );
};

export default PermissionTestPage;
