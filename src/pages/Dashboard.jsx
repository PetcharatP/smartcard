import React, { useState, useEffect } from 'react';
import './Dashboard.css';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [battalion, setBattalion] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [confirmedIds, setConfirmedIds] = useState([]);
  const [userBattalion, setUserBattalion] = useState('');
  const fetchConfirmedIds = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('/api/dashboard-confirm', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.confirmedIds)) {
        setConfirmedIds(json.confirmedIds);
      }
    } catch (err) {
      // ignore
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/dashboard', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        cache: 'no-store'
      });
      const json = await res.json();
      setEntries(json.data || []);
    } catch (err) {
      setEntries([]);
      setError('โหลดข้อมูลไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const date = startDateTime ? startDateTime.slice(0,10) : new Date().toISOString().slice(0,10);
      const company = user.company || '';
      const sender = user.realname || user.username || '';
      const note = content;
      // ถ้าไม่ได้เลือก battalion ให้ส่งเป็นค่าว่าง (ทุกกองพันเห็น)
      const battalionValue = battalion || '';
      const res = await fetch('/api/dashboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          title,
          date,
          battalion: battalionValue,
          company,
          sender,
          note,
          endDateTime
        })
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess('สร้างข้อมูลสำเร็จ');
        setTitle('');
        setContent('');
        setBattalion('');
        setStartDateTime('');
        setEndDateTime('');
        setShowForm(false);
        fetchEntries();
      } else {
        setError(json.message || 'เกิดข้อผิดพลาด');
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาด');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      (async () => {
        try {
          const response = await fetch(`/api/user/${token}`);
          const data = await response.json();
          if (data.status && data.data) {
            setUserBattalion(data.data.battalion || '');
          }
        } catch (err) {
          // ignore
        }
      })();
      fetchConfirmedIds();
    }
    fetchEntries();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="dashboard-page" style={{maxWidth:900, margin:'0 auto', padding:'32px 8px'}}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{minWidth: 200}}>
          <h2 style={{color:'#2563eb', fontWeight:700, fontSize:'2.2rem', margin:0}}>ข่าวสาร / ภารกิจของ นนร.</h2>
          <div style={{color:'#666', fontSize:'1.1rem'}}>สร้างและดูรายการ Dashboard ของคุณได้ที่นี่</div>
        </div>
        <button
          onClick={fetchEntries}
          className="btn-primary"
          style={{minWidth:120, height:40, fontWeight:600, fontSize:16, boxShadow:'0 2px 8px #2563eb22', borderRadius:8, width:'100%', maxWidth:220}}
        >
          รีโหลดข้อมูล
        </button>
      </div>

      {/* สร้างรายการใหม่: ปุ่มกดเพื่อเปิดฟอร์ม */}
      <div className="card" style={{marginBottom:32, padding:'28px 24px'}}>
        {!showForm ? (
          <button
            className="btn-primary"
            style={{width:'100%', fontWeight:600, fontSize:16, boxShadow:'0 2px 8px #2563eb22', borderRadius:8, padding:'12px 0'}}
            onClick={()=>{ setShowForm(true); setError(''); setSuccess(''); }}
          >
            สร้างรายการใหม่
          </button>
        ) : (
          <form
            onSubmit={handleCreate}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              background: 'white',
              borderRadius: '16px',
              padding: '18px 0',
              boxSizing: 'border-box',
              maxWidth: '100%',
              alignItems: 'center'
            }}
          >
            <div style={{ width: '100%', maxWidth: 420 }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>หัวข้อ</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="หัวข้อข่าว (ไม่บังคับ)"
                required
                style={{
                  width: '100%',
                  maxWidth: 420,
                  padding: '12px 16px',
                  border: '2px solid #f1f5f9',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '500',
                  outline: 'none',
                  background: '#fafafa',
                  marginBottom: 0,
                  transition: 'all 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#f1f5f9'}
              />
            </div>
            <div style={{ width: '100%', maxWidth: 420 }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>รายละเอียด</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="เขียนข่าวสาร..."
                className="input"
                style={{
                  width: '100%',
                  maxWidth: 420,
                  padding: '16px',
                  border: '2px solid #f1f5f9',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '100px',
                  fontFamily: 'inherit',
                  lineHeight: '1.6',
                  background: '#fafafa',
                  transition: 'all 0.2s',
                  whiteSpace: 'pre-line',
                  boxSizing: 'border-box',
                  marginBottom: 0
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#f1f5f9'}
              />
            </div>
            <div style={{ width: '100%', maxWidth: 420 }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>กองพัน</label>
              <select
                value={battalion}
                onChange={e => setBattalion(e.target.value)}
        // ไม่ required
                style={{
                  width: '100%',
                  maxWidth: 420,
                  padding: '12px 16px',
                  border: '2px solid #f1f5f9',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '500',
                  outline: 'none',
                  background: '#fafafa',
                  marginBottom: 0,
                  transition: 'all 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#f1f5f9'}
              >
                <option value="">เลือกกองพัน</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            <div style={{ width: '100%', maxWidth: 420 }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>เวลาเริ่มภารกิจ (วัน+เวลา)</label>
              <input
                type="datetime-local"
                value={startDateTime}
                onChange={e => setStartDateTime(e.target.value)}
                required
                style={{
                  width: '100%',
                  maxWidth: 420,
                  padding: '12px 16px',
                  border: '2px solid #f1f5f9',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  background: '#fafafa',
                  marginBottom: 0,
                  transition: 'all 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#f1f5f9'}
              />
            </div>
            <div style={{ width: '100%', maxWidth: 420 }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>เวลาสิ้นสุดภารกิจ (วัน+เวลา)</label>
              <input
                type="datetime-local"
                value={endDateTime}
                onChange={e => setEndDateTime(e.target.value)}
                // ไม่ required
                style={{
                  width: '100%',
                  maxWidth: 420,
                  padding: '12px 16px',
                  border: '2px solid #f1f5f9',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  background: '#fafafa',
                  marginBottom: 0,
                  transition: 'all 0.2s',
                }}
                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                onBlur={e => e.target.style.borderColor = '#f1f5f9'}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 16, minWidth: 120, width: '100%', marginTop: 12 }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{
                  width: '100%',
                  fontWeight: 600,
                  fontSize: 16,
                  boxShadow: '0 2px 8px #2563eb22',
                  borderRadius: 10,
                  padding: '12px 0',
                  minWidth: 120,
                  background: isSubmitting ? '#e2e8f0' : '#2563eb',
                  color: isSubmitting ? '#94a3b8' : 'white',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  border: 'none',
                  transition: 'all 0.2s',
                }}
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{
                  width: '100%',
                  marginTop: 0,
                  fontWeight: 500,
                  fontSize: 15,
                  borderRadius: 10,
                  padding: '12px 0',
                  minWidth: 120,
                  background: '#f3f4f6',
                  color: '#374151',
                  border: '2px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onClick={() => { setShowForm(false); setError(''); setSuccess(''); }}
              >
                ยกเลิก
              </button>
            </div>
            {(error && !success) && (
              <div style={{marginTop:16}}>
                <span style={{color:'#e11d48', fontWeight:500, marginRight:16}}>{error}</span>
              </div>
            )}
            {(success && !error) && (
              <div style={{marginTop:16}}>
                <span style={{color:'#059669', fontWeight:500}}>{success}</span>
              </div>
            )}
          </form>
        )}
      </div>

  {/* Entries List Section: Group by date, no year */}
  <div className="card" style={{marginBottom:32, padding:'24px 20px'}}>
    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8}}>
      <div style={{fontWeight:600, fontSize:'1.1rem', color:'#222'}}>Timeline</div>
      <span style={{color:'#2563eb', fontWeight:500, fontSize:15}}>{entries.length} รายการ</span>
    </div>
    {loading ? (
      <div style={{color:'#888', margin:'24px 0', textAlign:'center'}}>Loading...</div>
    ) : entries.length === 0 ? (
      <div style={{color:'#888', margin:'24px 0', textAlign:'center'}}>ไม่พบข้อมูล</div>
    ) : (
      (() => {
        // filter: ถ้ามี userBattalion ให้เห็นเฉพาะโพสต์ที่ battalion ตรงกับ userBattalion หรือ battalion ว่าง/null
        // ถ้าไม่มี userBattalion ให้เห็นทุกโพสต์
        const filtered = userBattalion
          ? entries.filter(e => String(e.battalion) === String(userBattalion) || !e.battalion || e.battalion === '')
          : entries;
        // group by date
        const groups = {};
        filtered.forEach(e => {
          const d = e.date || '-';
          if (!groups[d]) groups[d] = [];
          groups[d].push(e);
        });
        const sortedDates = Object.keys(groups).sort((a,b) => new Date(b) - new Date(a));
        return (
          <div>
            {sortedDates.map(date => {
              // แปลงวันที่เป็นรูปแบบ 24 ก.ย. 68
              let dateLabel = '-';
              try {
                const d = new Date(date);
                if (!isNaN(d)) {
                  const day = d.getDate();
                  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                  const month = monthNames[d.getMonth()];
                  const year = d.getFullYear() > 2500 ? d.getFullYear() - 2500 : d.getFullYear() - 2000;
                  dateLabel = `${day} ${month} ${year}`;
                }
              } catch {}
              return (
                <div key={date} style={{marginBottom:32, border:'1px solid #e5e7eb', borderRadius:12, background:'#fafbff'}}>
                  <div style={{fontWeight:700, fontSize:'1.2rem', color:'#2563eb', padding:'12px 0 0 18px'}}>{dateLabel}</div>
                  <ul style={{listStyle:'none', padding:0, margin:0}}>
                    {groups[date].map(e => {
                      const isConfirmed = confirmedIds.includes(e.id);
                      const user = JSON.parse(localStorage.getItem('user') || '{}');
                      if (!e.endDateTime) {
                        console.log('Dashboard entry missing endDateTime:', e);
                      }
                      return (
                        <li key={e.id} className="card" style={{margin:'16px 0', padding:'18px 16px', border:'none', boxShadow:'none', background:'transparent'}}>
                          {/* Title เป็นหัวข้อ */}
                          <div style={{fontWeight:'bold', fontSize:'1.18rem', color:'#222', marginBottom:2}}>{e.title || 'ไม่มี'}</div>
                          {/* Note เป็นรายละเอียด */}
                          <div style={{color:'#555', fontSize:'1rem', marginBottom:2, whiteSpace:'pre-line'}}>{e.note || 'หัวข้อ'}</div>
                          {/* กองพัน */}
                          <div style={{fontSize:13, color:'#666', marginBottom:2}}>
                            <span>กองพัน: {e.battalion ? String(e.battalion) : '-'}</span>
                          </div>
                          {/* วันเวลาเริ่ม */}
                          <div style={{fontSize:13, color:'#666', marginBottom:2}}>
                            <span>วันเวลาเริ่ม: {e.startDateTime ? new Date(e.startDateTime).toLocaleString('th-TH') : (e.date ? new Date(e.date).toLocaleDateString('th-TH') : '-')}</span>
                          </div>
                          {/* วันเวลาสิ้นสุด */}
                          <div style={{fontSize:13, color:'#666', marginBottom:2}}>
                            <span>วันเวลาสิ้นสุด: {e.endDateTime ? new Date(e.endDateTime).toLocaleString('th-TH') : '-'}</span>
                          </div>
                          {/* ปุ่มลบ/ยืนยันกิจกรรม: inline, เล็กลง */}
                          <div style={{display:'flex', gap:20, marginTop:12, alignItems:'center'}}>
                            {String(userBattalion) === String(e.battalion) && !isConfirmed && (
                              <button
                                className="btn-primary"
                                style={{fontWeight:600, fontSize:16, borderRadius:8, padding:'10px 24px', minWidth:120, height:44}}
                                onClick={async () => {
                                  const token = localStorage.getItem('token');
                                  if (!token) return;
                                  try {
                                    await fetch('/api/dashboard-confirm', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: `Bearer ${token}`
                                      },
                                      body: JSON.stringify({ entryId: e.id })
                                    });
                                    fetchConfirmedIds();
                                  } catch (err) {}
                                }}
                              >
                                Finish Attempt
                              </button>
                            )}
                            {user && (user.realname === e.sender || user.username === e.sender) && (
                              <button
                                className="btn-secondary"
                                style={{fontWeight:500, fontSize:14, borderRadius:8, padding:'6px 14px', minWidth:0, background:'#e11d48', color:'#fff', height:36}}
                                onClick={async () => {
                                  if (!window.confirm('คุณต้องการลบข้อมูลนี้ใช่หรือไม่?')) return;
                                  const token = localStorage.getItem('token');
                                  if (!token) return;
                                  try {
                                    const res = await fetch(`/api/dashboard/${e.id}`, {
                                      method: 'DELETE',
                                      headers: {
                                        Authorization: `Bearer ${token}`
                                      }
                                    });
                                    if (res.ok) {
                                      fetchEntries();
                                    } else {
                                      alert('ลบข้อมูลไม่สำเร็จ');
                                    }
                                  } catch (err) {
                                    alert('เกิดข้อผิดพลาดในการลบข้อมูล');
                                  }
                                }}
                              >
                                ลบข้อมูลนี้
                              </button>
                            )}
                            {String(userBattalion) === String(e.battalion) && isConfirmed && (
                              <span style={{color:'#059669', fontWeight:500, fontSize:14}}>✅ Finished</span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        );
      })()
    )}
  </div>
    </div>
  );
}