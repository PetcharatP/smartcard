import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';

export default function Register() {
  const [username, setUsername] = useState('');
  const [realname, setRealname] = useState('');
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [blood, setBlood] = useState('');
  const [role, setRole] = useState('student'); // เพิ่ม role เริ่มต้นเป็น student
  const [error, setError] = useState('');
  const [fadeIn, setFadeIn] = useState(false);
  const navigate = useNavigate();
  const apiUrl = process.env.NODE_ENV === 'production' ? '' : (import.meta.env.VITE_API_URL || '');

  useEffect(() => {
    setFadeIn(true);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          realname,
          userid,
          password,
          blood,
          role // เพิ่ม role ในการส่งข้อมูล
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
      className={`register-container ${fadeIn ? 'fade-in' : ''}`}
    >
      <h2 className="register-title">สมัครสมาชิก</h2>
      <form onSubmit={handleRegister} className="register-form">
        <input
          type="text"
          placeholder="ชื่อผู้ใช้"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          className="register-input"
        />
        <input
          type="text"
          placeholder="ชื่อ-นามสกุล"
          value={realname}
          onChange={e => setRealname(e.target.value)}
          required
          className="register-input"
        />
        <input
          type="text"
          placeholder="รหัสประจำตัวประชาชน"
          value={userid}
          onChange={e => setUserid(e.target.value)}
          required
          className="register-input"
        />
        <input
          type="password"
          placeholder="รหัสผ่าน"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="register-input"
        />
        <select
          value={blood}
          onChange={e => setBlood(e.target.value)}
          required
          className="register-select"
        >
          <option value="">เลือกกรุ๊ปเลือด</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="O">O</option>
          <option value="AB">AB</option>
        </select>
        
        {/* Hidden field สำหรับ role */}
        <input
          type="hidden"
          name="role"
          value={role}
        />
        
        {error && <div className="register-error">{error}</div>}
        <button 
          type="submit" 
          className="register-button"
        >
          สมัครสมาชิก
        </button>
      </form>
      <div className="register-footer">
        มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
      </div>
    </div>
  );
}