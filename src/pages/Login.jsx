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
  
  // ใช้ relative path เพื่อให้ Vercel proxy ทำงาน
  const apiUrl = process.env.NODE_ENV === 'production' ? '' : (import.meta.env.VITE_API_URL || '');

  console.log('🔍 Environment:', process.env.NODE_ENV);
  console.log('🔍 API URL:', apiUrl);

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
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUserid, password: loginPassword }),
      });
      const data = await res.json();
      console.log('Login response data:', data);
      
      if (res.ok) {
        setLoginStatus('เข้าสู่ระบบสำเร็จ! กำลังนำคุณไปยังหน้าหลัก...');
        
        // เก็บ token และข้อมูล user แบบเร็ว
        const token = data.token || data.data?.token;
        const userInfo = data.data?.user;
        
        console.log('⚡ Fast login - Token:', token ? 'OK' : 'Missing');
        console.log('⚡ Fast login - User info:', userInfo ? 'OK' : 'Missing');
        
        if (token) {
          localStorage.setItem('token', token);
          console.log('✅ Token saved');
        } else {
          console.error('❌ No token received');
        }
        
        if (userInfo) {
          localStorage.setItem('userInfo', JSON.stringify(userInfo));
          console.log('✅ User info saved immediately:', userInfo);
        } else {
          console.error('❌ No user info received');
        }
        
        // นำทางทันทีโดยไม่ต้องรอ
        navigate('/');
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
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: registerUser,
          realname: registerName,
          userid: registerCitizenId,
          password: registerPass,
          blood: registerBlood,
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
    <div className="login-bg">
      <div className={`container ${fadeIn ? 'fade-in' : ''}`}>
        <div className="logo-container">
        <img src={logo} alt="logo" className="logo" />
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
          {loginError && <div className="error-message">{loginError}</div>}
          {loginStatus && <div className="success-message">{loginStatus}</div>}
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
              className="register-blood-select"
            >
              <option value="">เลือกกรุ๊ปเลือด</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="O">O</option>
              <option value="AB">AB</option>
          </select>
          {registerError && <div className="error-message">{registerError}</div>}
          <button type="submit" className="btn">สมัครสมาชิก</button>
        </form>
      )}
      {tab === 'login' && (
        <div className="login-footer">
          ยังไม่มีบัญชี? <span className="login-link" onClick={() => setTab('register')}>สมัครสมาชิก</span>
        </div>
      )}
      </div>
    </div>
  );
}