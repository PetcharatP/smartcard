import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './BehaviorPoint.css';

export default function BehaviorPoint() {
  const [realname, setRealname] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [point, setPoint] = useState(0);
  const [adjustments, setAdjustments] = useState([]);
  const [userid, setUserid] = useState('');
  const [major, setMajor] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState('');
  const apiUrl = process.env.NODE_ENV === 'production' ? '' : (import.meta.env.VITE_API_URL || '');
  const navigate = useNavigate();
  const majorOptions = [
    { value: "ME", label: "วิศวกรรมเครื่องกล" },
    { value: "EE", label: "วิศวกรรมไฟฟ้าสื่อสาร" },
    { value: "CYBER", label: "ความมั่นคงปลอดภัยทางไซเบอร์" },
    { value: "SCIEN", label: "วิทยาศาสตร์และเทคโนโลยี (EN)" },
    { value: "CE", label: "วิศวกรรมโยธา" },
    { value: "GEO", label: "วิศวกรรมแผนที่" },
    { value: "IE", label: "วิศวกรรมอุตสาหการ" },
    { value: "SCI", label: "วิทยาศาสตร์และเทคโนโลยี" },
    { value: "SOC", label: "สังคมศาสตร์เพื่อการพัฒนา" },
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`/api/user/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(userData => {
        if (!userData.data || !userData.data.userid) {
          setLoading(false);
          return;
        }
        setUserid(userData.data.userid);
        setRealname(userData.data.realname || '');
        setMajor(userData.data.major || '');
        setProfileImage(userData.data.profileImage ? `data:image/jpeg;base64,${userData.data.profileImage}` : '');

        const adjs = userData.data.adjustments || [];
        setAdjustments(adjs);

        setPoint(userData.data.point || 0);

        setIsAdmin(!!userData.data.admin);

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // ฟังก์ชันแปลงวันที่เป็น วัน/เดือน/ปี
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }

  if (loading) {
    return <div className="behavior-point-container"><div className="loading">Loading...</div></div>;
  }

  return (
    <div className="behavior-point-bg">
      <div className="behavior-point-container">
        <h1 className="behavior-point-title">คะแนนความประพฤติ</h1>
        
        <div className="behavior-card">
          <h2>ข้อมูลผู้ใช้</h2>
          <div className="profile-section">
          {profileImage ? (
            <img src={profileImage} alt="Profile" className="profile-img" />
          ) : (
            <div className="profile-img no-img">No Image</div>
          )}
          <div className="profile-info">
            <p><strong>ชื่อ:</strong> {realname}</p>
            <p><strong>รหัส:</strong> {userid}</p>
            {major && (
              <p>
                <strong>สาขา:</strong> {
                  majorOptions.find(opt => opt.value === major)?.label || major
                }
              </p>
            )}
            <p>
              <strong>คะแนนพฤติกรรม:</strong>
              <span className="point" style={{
                color:
                  point === 0 ? '#22c55e' :
                  point <= 65 ? '#e11d48' :
                  point <= 120 ? '#f59e42' :
                  point <= 165 ? '#facc15' : '#22c55e',
                fontWeight: 700,
                fontSize: '1.2em',
                padding: '0 8px'
              }}>
                {point}
              </span>
              <span style={{
                fontWeight: 600,
                fontSize: '1em',
                marginLeft: 8,
                color:
                  point === 0 ? '#22c55e' :
                  point <= 35 ? '#facc15' :
                  point <= 80 ? '#f59e42' :
                  point <= 120 ? '#e11d48' : '#22c55e'
              }}>
                {point === 0 ? 'ดีมาก' :
                  point <= 35 ? 'ดี' :
                  point <= 80 ? 'พอใช้' :
                  point <= 120 ? 'ปรับปรุง' : 'ดีมาก'}
              </span>
            </p>
            {isAdmin && <p className="admin-badge">สถานะ: Admin</p>}
          </div>
        </div>
        {isAdmin && (
          <button
            className="deduct-point-btn"
            onClick={() => navigate('/DeductPoint')}
          >
            ไปหน้าหักคะแนน (DeductPoint)
          </button>
        )}
        <h3>ประวัติการปรับคะแนน</h3>
        <div style={{ fontWeight: 600, display: 'flex', padding: '4px 0', borderBottom: '1px solid #e0e0e0', marginBottom: 4 }}>
          <span style={{ flex: 1 }}>วันที่</span>
          <span style={{ width: 60, textAlign: 'center' }}>คะแนน</span>
          <span style={{ flex: 2 }}>เหตุผล</span>
          <span style={{ flex: 1 }}>โดย</span>
        </div>
        <ul className="adjustment-list">
          {adjustments.length === 0 && <li className="no-history">ไม่มีประวัติการปรับคะแนน</li>}
          {adjustments.map((adj, idx) => (
            <li key={idx} className={adj.change > 0 ? 'plus' : adj.change < 0 ? 'minus' : ''} style={{ display: 'flex', alignItems: 'center' }}>
              <span className="adj-date" style={{ flex: 1 }}>{formatDate(adj.date)}</span>
              <span className="adj-change" style={{ width: 60, textAlign: 'center' }}>{adj.change > 0 ? '+' : ''}{adj.change}</span>
              <span className="adj-reason" style={{ flex: 2 }}>({adj.reason})</span>
              <span className="adj-operator" style={{ flex: 1 }}>โดย: {adj.operator}</span>
            </li>
          ))}
        </ul>
        </div>
      </div>
    </div>
  );
}