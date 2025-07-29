import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import logo from '../pic/logo.png';

export default function Auth() {
  const [tab, setTab] = useState('login');
  // สำหรับ login
  const [loginUserid, setLoginUserid] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState('');
  const [fadeIn, setFadeIn] = useState(false);

  // สำหรับ register
  const [registerUser, setRegisterUser] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerCitizenId, setRegisterCitizenId] = useState('');
  const [registerPass, setRegisterPass] = useState('');
  const [registerPass2, setRegisterPass2] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerBlood, setRegisterBlood] = useState('');
  const apiUrl = import.meta.env.VITE_API_URL;

  console.log('🔍 API URL:', apiUrl); // ตรวจสอบ API URL
  console.log('🔍 Environment:', import.meta.env); // ตรวจสอบ environment variables

  const navigate = useNavigate();

  useEffect(() => {
    setFadeIn(true);
  }, []);

  // Login API
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    setLoginStatus('กำลังเข้าสู่ระบบ...');
    try {
      const res = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUserid, password: loginPassword }),
      });
      const data = await res.json();
      console.log('Login response data:', data);
      
      if (res.ok) {
        setLoginStatus('เข้าสู่ระบบสำเร็จ! กำลังนำคุณไปยังหน้าหลัก...');
        
        // ตรวจสอบและแก้ไขการเก็บ token
        const token = data.data;
        console.log('Token to save:', token, 'Type:', typeof token);
        
        if (typeof token === 'string') {
          localStorage.setItem('token', token);
        } else if (typeof token === 'object' && token.token) {
          localStorage.setItem('token', token.token);
        } else {
          console.error('Invalid token format:', token);
          localStorage.setItem('token', JSON.stringify(token));
        }
        
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        setLoginError(data.error || data.message || 'เข้าสู่ระบบไม่สำเร็จ');
        setLoginStatus('');
      }
    } catch (err) {
      setLoginError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
      setLoginStatus('');
    } finally {
      setLoading(false);
    }
  };

  // Register API
  const handleRegister = async e => {
    e.preventDefault();
    setRegisterError('');
    if (!registerUser || !registerPass || !registerPass2 || !registerName || !registerCitizenId || !registerBlood) {
      setRegisterError('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    if (registerPass !== registerPass2) {
      setRegisterError('รหัสผ่านไม่ตรงกัน');
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerUser,
          realname: registerName,
          userid: registerCitizenId,
          password: registerPass,
          blood: registerBlood, // ส่ง blood ไปด้วย
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('สมัครสมาชิกสำเร็จ');
        setTab('login');
      } else {
        setRegisterError(data.error || data.message || 'สมัครสมาชิกไม่สำเร็จ');
      }
    } catch {
      setRegisterError('เกิดข้อผิดพลาด');
    }
  };

  return (
    <div className="container" style={{
      opacity: fadeIn ? 1 : 0,
      transform: fadeIn ? 'translateY(0)' : 'translateY(30px)',
      transition: 'opacity 0.7s, transform 0.7s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
      <img src={logo} alt="logo" style={{ width: 100, height: 100, objectFit: 'contain' }} />
      </div>
      <div className="tabs">
        <button
          className={tab === 'login' ? 'active' : ''}
          onClick={() => setTab('login')}
        >
          Login
        </button>
        <button
          className={tab === 'register' ? 'active' : ''}
          onClick={() => setTab('register')}
        >
          Register
        </button>
      </div>
      {/* Login Form */}
      {tab === 'login' && (
        <form className="form active" onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="ชื่อผู้ใช้ หรือ รหัสประจำตัวประชาชน"
            value={loginUserid}
            onChange={e => setLoginUserid(e.target.value)}
            required
            disabled={loading}
          />
          <input
            type="password"
            placeholder="รหัสผ่าน"
            value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)}
            required
            disabled={loading}
          />
          {loginError && <div style={{ color: 'red', marginBottom: 8 }}>{loginError}</div>}
          {loginStatus && <div style={{ color: 'green', marginBottom: 8 }}>{loginStatus}</div>}
          <button
            type="submit"
            disabled={loading}
            className="btn"
          >
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>
      )}
      {/* Register Form */}
      {tab === 'register' && (
        <form className="form active" onSubmit={handleRegister}>
          <input
            type="text"
            placeholder="ชื่อผู้ใช้"
            value={registerUser}
            onChange={e => setRegisterUser(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="ชื่อ-นามสกุล"
            value={registerName}
            onChange={e => setRegisterName(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="รหัสประจำตัวประชาชน"
            value={registerCitizenId}
            onChange={e => setRegisterCitizenId(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="รหัสผ่าน"
            value={registerPass}
            onChange={e => setRegisterPass(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="ยืนยันรหัสผ่าน"
            value={registerPass2}
            onChange={e => setRegisterPass2(e.target.value)}
            required
          />
          <select
              value={registerBlood}
              onChange={e => setRegisterBlood(e.target.value)}
              required
              style={{ marginBottom: 12 }}
            >
              <option value="">เลือกกรุ๊ปเลือด</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="O">O</option>
              <option value="AB">AB</option>
          </select>
          {registerError && <div style={{ color: 'red', marginBottom: 8 }}>{registerError}</div>}
          <button type="submit" className="btn">สมัครสมาชิก</button>
        </form>
      )}
      {tab === 'login' && (
        <div style={{ marginTop: 16 }}>
          ยังไม่มีบัญชี? <span style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => setTab('register')}>สมัครสมาชิก</span>
        </div>
      )}
    </div>
  );
}