import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './DeductPoint.css';

export default function DeductPoint() {
  const location = useLocation();
  const [userid, setUserid] = useState('');
  const [userName, setUserName] = useState('');
  const [change, setChange] = useState(-1);
  const [reason, setReason] = useState('');
  const [operator, setOperator] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('');
  const [violation, setViolation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const apiUrl = process.env.NODE_ENV === 'production' ? '' : (import.meta.env.VITE_API_URL || '');

  // ดึงข้อมูลจาก URL parameters เมื่อโหลดหน้า
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const urlUserId = searchParams.get('userId');
    const urlUserName = searchParams.get('userName');
    
    if (urlUserId) {
      setUserid(urlUserId);
      fetchCurrentPoint(urlUserId);
    }
    
    if (urlUserName) {
      setUserName(decodeURIComponent(urlUserName));
    }
  }, [location.search]);

  // ประเภทความผิดและรายการ
  const violationTypes = [
    {
      type: 'สถานหนัก',
      range: '26-35',
      color: '#e11d48',
      items: [
        { label: 'หลับขณะเข้าเวรฯ', score: 26 },
        { label: 'ขัดคำสั่งผู้บังคับบัญชา นายทหาร หรืออาจารย์', score: 28 },
        { label: 'ก่อวิวาทกับผู้อื่น', score: 30 },
        { label: 'ประพฤติตนเสื่อมเสียชื่อเสียง', score: 32 },
        { label: 'ครอบครอง/สูบ บุหรี่ไฟฟ้า', score: 33 },
        { label: 'เล่นการพนัน', score: 35 }
      ]
    },
    {
      type: 'สถานกลาง',
      range: '8-25',
      color: '#f59e42',
      items: [
        { label: 'ออกนอกบริเวณ รร.โดยไม่ได้รับอนุญาต', score: 25 },
        { label: 'ไม่ปฎิบัติตามคำสั่ง , คำชี้แจง หรือระเบียบข้อบังคับโดยเคร่งครัด', score: 20 },
        { label: 'บกพร่องหรือไม่เคร่งครัดต่อการปฎิบัติหน้าที่', score: 15 },
        { label: 'ไม่แสดงความเคารพต่อผู้บังคับบัญชาหรือผู้มียศ หรืออาวุโสสูงกว่า', score: 12 },
        { label: 'เป็นตัวอย่างไม่ดีแก่นักเรียนชั้นต่ำ', score: 10 },
        { label: 'ขาดหรือหลีกเลี่ยงการเรียน,ฝึก,ทำงาน', score: 8 },
        { label: 'ไม่รักษาความสามัคคีในหมู่คณะ', score: 8 }
      ]
    },
    {
      type: 'สถานเบา',
      range: '1-7',
      color: '#22c55e',
      items: [
        { label: 'แต่งกายไม่ถูกต้องตามระเบียบ', score: 7 },
        { label: 'มาไม่ทันกำหนดเวลา', score: 6 },
        { label: 'หลับในห้องเรียน', score: 5 },
        { label: 'ปฎิบัติไม่ถูกต้องตามแบบธรรมเนียบทหาร', score: 4 },
        { label: 'กล่าววาจาหยาบคาบ', score: 3 },
        { label: 'ไม่เข้าแถวเมื่อมีการเรียกแถว', score: 1 }
      ]
    }
  ];

  // เมื่อเลือกประเภทความผิด
  const handleTypeChange = e => {
    setType(e.target.value);
    setViolation('');
    setChange(-1);
    setReason('');
  };

  // เมื่อเลือกความผิด
  const handleViolationChange = e => {
    const selected = violationTypes.find(v => v.type === type)?.items.find(i => i.label === e.target.value);
    setViolation(e.target.value);
    setChange(selected ? -selected.score : -1);
    setReason(selected ? selected.label : '');
  };

  const [currentPoint, setCurrentPoint] = useState(null);

  // ดึงคะแนนปัจจุบันเมื่อกรอกรหัสนักเรียน
  const fetchCurrentPoint = async (uid) => {
    if (!uid) return;
    try {
      const res = await fetch(`/api/user/point/${uid}`);
      const data = await res.json();
      if (data && typeof data.point === 'number') {
        setCurrentPoint(data.point);
      } else {
        setCurrentPoint(null);
      }
    } catch {
      setCurrentPoint(null);
    }
  };

  // เมื่อกรอกรหัสนักเรียน
  const handleUseridChange = e => {
    setUserid(e.target.value);
    setCurrentPoint(null);
    if (e.target.value) fetchCurrentPoint(e.target.value);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    // ป้องกันการกดซ้ำ
    if (isSubmitting) {
      return;
    }
    
    // เฉพาะการตัดคะแนน (change < 0) เท่านั้นที่ต้องเช็คคะแนนคงเหลือ
    if (change < 0 && currentPoint !== null && Math.abs(change) > currentPoint) {
      setMessage('ไม่สามารถตัดคะแนนได้ คะแนนคงเหลือไม่พอ');
      return;
    }
    
    setIsSubmitting(true);
    setMessage('กำลังดำเนินการ...');
    
    try {
      const res = await fetch(`/api/behavior/deduct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userid, change, reason, operator })
      });
      const data = await res.json();
      
      if (data.status || data.success) {
        setMessage('✅ ตัดคะแนนสำเร็จ');
        
        // รีเฟรชข้อมูลคะแนนปัจจุบัน
        await fetchCurrentPoint(userid);
        
        // รีเซ็ตฟอร์ม
        setTimeout(() => {
          setType('');
          setViolation('');
          setChange(-1);
          setReason('');
          setOperator('');
          setMessage('');
        }, 2000);
        
      } else {
        setMessage(data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error submitting deduct point:', error);
      setMessage('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="deduct-point-bg">
      <div className="deduct-point-container">
        <h1 className="deduct-point-title">ระบบตัดคะแนนความประพฤติ</h1>
        
        <div className="deduct-point-card">
          <h2>ตัดคะแนน</h2>
          
          {/* แสดงข้อมูลผู้ใช้ที่ถูกส่งมา */}
          {userName && (
            <div className="user-info-display">
              <h3>👤 ข้อมูลผู้ใช้</h3>
              <div className="user-info-row">
                <span><strong>ชื่อ:</strong> {userName}</span>
                <span><strong>รหัส:</strong> {userid}</span>
                {currentPoint !== null && (
                  <span><strong>คะแนนคงเหลือ:</strong> <span className="current-points">{currentPoint}</span> คะแนน</span>
                )}
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div>
              <label>
                รหัสนักเรียน:
                <input
                  value={userid}
                  onChange={handleUseridChange}
                  required
                  readOnly={!!userName}
                  className={userName ? 'readonly-input' : ''}
                  placeholder={userName ? 'ข้อมูลจากการสแกน' : 'กรอกรหัสนักเรียน'}
                />
                {!userName && currentPoint !== null && (
                  <span style={{marginLeft:8, color:'#2563eb', fontWeight:500}}>คะแนนคงเหลือ: {currentPoint}</span>
                )}
              </label>
            </div>
            <div>
              <label>
                ประเภทความผิด:
                <select value={type} onChange={handleTypeChange} required>
                  <option value="">เลือกประเภทความผิด</option>
                  {violationTypes.map(v => (
                    <option key={v.type} value={v.type}>{v.type} ({v.range} แต้ม)</option>
                  ))}
                </select>
              </label>
            </div>
            {type && (
              <div>
                <label>
                  รายการความผิด:
                  <select value={violation} onChange={handleViolationChange} required>
                    <option value="">เลือกรายการความผิด</option>
                    {violationTypes.find(v => v.type === type)?.items.map(item => (
                      <option key={item.label} value={item.label}>{item.label} ({item.score} แต้ม)</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <div>
              <label>
                คะแนนที่ตัด:
                <input
                  type="number"
                  value={Math.abs(change) || ''}
                  readOnly
                  required
                />
              </label>
            </div>
            <div>
              <label>
                เหตุผล:
                <input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  required
                  readOnly={!!violation}
                />
              </label>
            </div>
            <div>
              <label>
                ผู้ตัดคะแนน:
                <input
                  value={operator}
                  onChange={e => setOperator(e.target.value)}
                  required
                />
              </label>
            </div>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'กำลังดำเนินการ...' : 'ตัดคะแนน'}
            </button>
          </form>
        {message && <div className="message">{message}</div>}
        </div>
      </div>
    </div>
  );
}