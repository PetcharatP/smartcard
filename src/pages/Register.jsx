import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [username, setUsername] = useState('');
  const [realname, setRealname] = useState('');
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [blood, setBlood] = useState('');
  const [error, setError] = useState('');
  const [fadeIn, setFadeIn] = useState(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    setFadeIn(true);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${apiUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          realname,
          userid,
          password,
          blood
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('สมัครสมาชิกสำเร็จ');
        navigate('/login');
      } else {
        setError(data.error || data.message || 'สมัครสมาชิกไม่สำเร็จ');
      }
    } catch {
      setError('เกิดข้อผิดพลาด');
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: '40px auto',
        padding: 24,
        boxShadow: '0 2px 8px #eee',
        borderRadius: 8,
        opacity: fadeIn ? 1 : 0,
        transform: fadeIn ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.7s, transform 0.7s'
      }}
    >
      <h2>สมัครสมาชิก</h2>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="ชื่อผู้ใช้"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        />
        <input
          type="text"
          placeholder="ชื่อ-นามสกุล"
          value={realname}
          onChange={e => setRealname(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        />
        <input
          type="text"
          placeholder="รหัสประจำตัวประชาชน"
          value={userid}
          onChange={e => setUserid(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        />
        <input
          type="password"
          placeholder="รหัสผ่าน"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        />
        <select
          value={blood}
          onChange={e => setBlood(e.target.value)}
          required
          style={{ width: '100%', marginBottom: 12, padding: 8 }}
        >
          <option value="">เลือกกรุ๊ปเลือด</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="O">O</option>
          <option value="AB">AB</option>
        </select>
        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}
        <button type="submit" style={{ width: '100%', padding: 10 }}>สมัครสมาชิก</button>
      </form>
      <div style={{ marginTop: 16 }}>
        มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
      </div>
    </div>
  );
}