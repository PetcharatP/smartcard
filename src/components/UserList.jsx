import React, { useEffect, useState } from 'react';
import './UserList.css';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const apiUrl = process.env.NODE_ENV === 'production' ? '' : (import.meta.env.VITE_API_URL || '');

  useEffect(() => {
    fetch(`/api/users`)
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(err => console.error(err));
  }, []);

  // แปลง Buffer เป็น base64 สำหรับรูปภาพ
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

  // อัปเดตสถานะ admin
  const handleAdminChange = async (userid, newAdmin) => {
    await fetch(`/api/user/setAdmin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userid, admin: newAdmin })
    });
    setUsers(users.map(u =>
      u.userid === userid ? { ...u, admin: newAdmin } : u
    ));
    if (newAdmin) {
      console.log(`User ${userid} is now Admin`);
    } else {
      console.log(`User ${userid} is no longer Admin`);
    }
  };

  return (
    <div className="userlist-bg">
      <div className="userlist-container">
        <h1 className="userlist-title">รายชื่อผู้ใช้ระบบ</h1>
        <table className="userlist-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Real Name</th>
              <th>UserID</th>
              <th>Blood</th>
              <th>Gun Number</th>
              <th>Point</th>
              <th>Major</th>
              <th>Profile Image</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="10" className="userlist-loading">ไม่พบข้อมูลผู้ใช้</td>
              </tr>
            ) : (
              users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>{user.realname}</td>
                  <td>{user.userid}</td>
                  <td>{user.blood}</td>
                  <td>{user.gunNumber}</td>
                  <td>{user.point}</td>
                  <td>{user.major}</td>
                  <td>
                    {user.profileImage && user.profileImage.data ? (
                      <img
                        src={bufferToImage(user.profileImage)}
                        alt="profile"
                        className="userlist-avatar"
                      />
                    ) : (
                      <div className="userlist-no-avatar">No Image</div>
                    )}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!user.admin}
                      onChange={e => handleAdminChange(user.userid, e.target.checked)}
                      className="userlist-checkbox"
                    />{' '}
                    {user.admin ? 'YES' : 'NO'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserList;