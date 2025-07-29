import React, { useEffect, useState } from 'react';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    fetch(`${apiUrl}/api/users`)
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
    await fetch(`${apiUrl}/api/user/setAdmin`, {
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
    <div style={{ overflowX: 'auto' }}>
      <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', minWidth: 900 }}>
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
              <td colSpan="10" align="center">No users found.</td>
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
                      style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '50%' }}
                    />
                  ) : (
                    'No Image'
                  )}
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={!!user.admin}
                    onChange={e => handleAdminChange(user.userid, e.target.checked)}
                  />{' '}
                  {user.admin ? 'YES' : 'NO'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UserList;