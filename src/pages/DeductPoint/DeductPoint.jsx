import { useState } from 'react';
import './DeductPoint.css';

export default function DeductPoint() {
  const [userid, setUserid] = useState('');
  const [change, setChange] = useState(-1);
  const [reason, setReason] = useState('');
  const [operator, setOperator] = useState('');
  const [message, setMessage] = useState('');
  const apiUrl = import.meta.env.VITE_API_URL;
  const handleSubmit = async e => {
    e.preventDefault();
    const res = await fetch(`${apiUrl}/api/behavior/deduct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userid, change, reason, operator })
    });
    const data = await res.json();
    setMessage(data.message || (data.status ? 'สำเร็จ' : 'เกิดข้อผิดพลาด'));
  };

  return (
    <div className="deduct-point-container">
      <div className="deduct-point-card">
        <h2>ตัดคะแนน</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>
              รหัสนักเรียน:
              <input
                value={userid}
                onChange={e => setUserid(e.target.value)}
                required
              />
            </label>
          </div>
          <div>
            <label>
              คะแนนที่ตัด:
              <input
                type="number"
                value={Math.abs(change)} // แสดงค่าบวกใน input
                onChange={e => setChange(-Math.abs(Number(e.target.value)))} // แปลงค่าที่กรอกเป็นค่าลบ
                min="1" // บังคับให้กรอกค่าบวกตั้งแต่ 1 ขึ้นไป
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
          <button type="submit">ตัดคะแนน</button>
        </form>
        {message && <div className="message">{message}</div>}
      </div>
    </div>
  );
}