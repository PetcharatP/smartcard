import React, { useState, useEffect } from 'react';
import './Dashboard.css';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [battalion, setBattalion] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [endDateTime, setEndDateTime] = useState('');
  const [responsible, setResponsible] = useState('');
  const [operator, setOperator] = useState('');
  const [dress, setDress] = useState('');
  const [location, setLocation] = useState('');
  const [link, setLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [confirmedIds, setConfirmedIds] = useState([]);
  const [userBattalion, setUserBattalion] = useState('');
  const [showTimeFilter, setShowTimeFilter] = useState(false);
  const [showSortFilter, setShowSortFilter] = useState(false);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('Next 7 days');
  const [selectedSortFilter, setSelectedSortFilter] = useState('Sort by dates');
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

  const handleDelete = async (entryId) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายการนี้?')) {
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/dashboard/${entryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setSuccess('ลบรายการสำเร็จ');
        fetchEntries();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('ไม่สามารถลบรายการได้');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการลบ');
      setTimeout(() => setError(''), 3000);
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
          content,
          responsible,
          operator,
          dress,
          location,
          link,
          startDateTime,
          endDateTime,
          battalion: battalionValue,
          company,
          sender
        })
      });
      const json = await res.json();
      if (res.ok) {
        setSuccess('สร้างข้อมูลสำเร็จ');
        setTitle('');
        setContent('');
        setResponsible('');
        setOperator('');
        setDress('');
        setLocation('');
        setLink('');
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

    // Close dropdowns when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        setShowTimeFilter(false);
        setShowSortFilter(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
    // eslint-disable-next-line
  }, []);

  return (
    <div className="dashboard-bg">
      <div className="dashboard-container">
        {/* Greeting Header */}
        <div className="greeting-header">
          <h2>Hi, {
            (() => {
              const user = JSON.parse(localStorage.getItem('user') || '{}');
              return user.realname || user.username || 'เพื่อน';
            })()
          } 👋</h2>
        </div>      {/* สร้างรายการใหม่: ปุ่มกดเพื่อเปิดฟอร์ม */}
      <div className="dashboard-card" style={{marginBottom:32, padding:'28px 24px'}}>
        {!showForm ? (
          <button
            className="btn-primary dashboard-page"
            style={{width:'100%', padding:'12px 0'}}
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
            <div style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box' }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>หัวข้อ</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="หัวข้อ"
                required
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 0,
                }}
              />
            </div>
            <div style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box' }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>รายละเอียด</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="รายละเอียด"
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  whiteSpace: 'pre-line',
                  marginBottom: 0
                }}
              />
            </div>
            <div style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box' }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>ผู้รับผิดชอบ</label>
              <input
                type="text"
                value={responsible}
                onChange={e => setResponsible(e.target.value)}
                placeholder="ผู้รับผิดชอบ"
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 0,
                }}
              />
            </div>
            <div style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box' }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>ผู้ปฏิบัติ</label>
              <input
                type="text"
                value={operator}
                onChange={e => setOperator(e.target.value)}
                placeholder="ผู้ปฏิบัติ"
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 0,
                }}
              />
            </div>
            <div style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box' }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>การแต่งกาย</label>
              <input
                type="text"
                value={dress}
                onChange={e => setDress(e.target.value)}
                placeholder="การแต่งกาย"
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 0,
                }}
              />
            </div>
            <div style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box' }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>สถานที่</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="สถานที่"
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 0,
                }}
              />
            </div>
            <div style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box' }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>ลิงก์ที่เกี่ยวข้อง</label>
              <input
                type="url"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="https://example.com"
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 0,
                }}
              />
            </div>
            <div style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box' }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>กองพัน</label>
              <select
                value={battalion}
                onChange={e => setBattalion(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 0,
                }}
              >
                <option value="">เลือกกองพัน</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
            </div>
            <div style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box' }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>เวลาเริ่มภารกิจ (วัน+เวลา)</label>
              <input
                type="datetime-local"
                value={startDateTime}
                onChange={e => setStartDateTime(e.target.value)}
                required
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 0,
                }}
              />
            </div>
            <div style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box' }}>
              <label style={{ fontSize: 14, color: '#374151', fontWeight: 500, marginBottom: 6, display: 'block' }}>เวลาสิ้นสุดภารกิจ (วัน+เวลา)</label>
              <input
                type="datetime-local"
                value={endDateTime}
                onChange={e => setEndDateTime(e.target.value)}
                style={{
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                  marginBottom: 0,
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 16, minWidth: 120, width: '100%', marginTop: 12 }}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary dashboard-page"
                style={{
                  width: '100%',
                  maxWidth: 180,
                  padding: '10px 0',
                  background: isSubmitting ? '#e2e8f0' : '#2563eb',
                  color: isSubmitting ? '#94a3b8' : 'white',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  margin: '0 auto'
                }}
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
              <button
                type="button"
                className="btn-secondary dashboard-page"
                style={{
                  width: '100%',
                  maxWidth: 180,
                  marginTop: 0,
                  padding: '10px 0',
                  margin: '0 auto'
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
  <div className="dashboard-card timeline-card">
    <div className="card-header">
      <h3 className="timeline-title">Timeline</h3>
    </div>
    <div className="timeline-filters">
      <div className="filters-row">
        <div className="filter-group">
          <div className="dropdown">
            <button 
              className="dropdown-toggle" 
              type="button"
              onClick={() => setShowTimeFilter(!showTimeFilter)}
            >
              {selectedTimeFilter}
            </button>
            {showTimeFilter && (
              <div className="dropdown-menu" style={{position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #d1d5db', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 1000, minWidth: '150px'}}>
                <div className="dropdown-item" onClick={() => {setSelectedTimeFilter('All'); setShowTimeFilter(false);}} style={{padding: '8px 12px', cursor: 'pointer', fontSize: '14px'}}>All</div>
                <div className="dropdown-item" onClick={() => {setSelectedTimeFilter('Overdue'); setShowTimeFilter(false);}} style={{padding: '8px 12px', cursor: 'pointer', fontSize: '14px'}}>Overdue</div>
                <div className="dropdown-item" onClick={() => {setSelectedTimeFilter('Due date'); setShowTimeFilter(false);}} style={{padding: '8px 12px', cursor: 'pointer', fontSize: '14px'}}>Due date</div>
                <div className="dropdown-item" onClick={() => {setSelectedTimeFilter('Next 7 days'); setShowTimeFilter(false);}} style={{padding: '8px 12px', cursor: 'pointer', fontSize: '14px'}}>Next 7 days</div>
                <div className="dropdown-item" onClick={() => {setSelectedTimeFilter('Next 30 days'); setShowTimeFilter(false);}} style={{padding: '8px 12px', cursor: 'pointer', fontSize: '14px'}}>Next 30 days</div>
                <div className="dropdown-item" onClick={() => {setSelectedTimeFilter('Next 3 months'); setShowTimeFilter(false);}} style={{padding: '8px 12px', cursor: 'pointer', fontSize: '14px'}}>Next 3 months</div>
                <div className="dropdown-item" onClick={() => {setSelectedTimeFilter('Next 6 months'); setShowTimeFilter(false);}} style={{padding: '8px 12px', cursor: 'pointer', fontSize: '14px'}}>Next 6 months</div>
              </div>
            )}
          </div>
        </div>
        <div className="filter-group">
          <div className="dropdown">
            <button 
              className="dropdown-toggle" 
              type="button"
              onClick={() => setShowSortFilter(!showSortFilter)}
            >
              {selectedSortFilter}
            </button>
            {showSortFilter && (
              <div className="dropdown-menu" style={{position: 'absolute', top: '100%', left: 0, background: 'white', border: '1px solid #d1d5db', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 1000, minWidth: '150px'}}>
                <div className="dropdown-item" onClick={() => {setSelectedSortFilter('Sort by dates'); setShowSortFilter(false);}} style={{padding: '8px 12px', cursor: 'pointer', fontSize: '14px'}}>Sort by dates</div>
                <div className="dropdown-item" onClick={() => {setSelectedSortFilter('Sort by courses'); setShowSortFilter(false);}} style={{padding: '8px 12px', cursor: 'pointer', fontSize: '14px'}}>Sort by courses</div>
              </div>
            )}
          </div>
        </div>
        <div className="search-group">
          <div className="search-container">
            <input 
              type="text" 
              className="form-control search-input" 
              placeholder="Search by activity type or name"
            />
          </div>
        </div>
      </div>
      <div className="filters-divider"></div>
    </div>
    
    {/* Success/Error Messages */}
    {(success && !error) && (
      <div style={{
        background: '#dcfce7',
        border: '1px solid #16a34a',
        color: '#166534',
        padding: '12px 16px',
        borderRadius: '8px',
        margin: '16px 0',
        textAlign: 'center'
      }}>
        {success}
      </div>
    )}
    {(error && !success) && (
      <div style={{
        background: '#fef2f2',
        border: '1px solid #dc2626',
        color: '#dc2626',
        padding: '12px 16px',
        borderRadius: '8px',
        margin: '16px 0',
        textAlign: 'center'
      }}>
        {error}
      </div>
    )}
    
    <div className="timeline-content">
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
        // group by startDateTime date
        const groups = {};
        filtered.forEach(e => {
          let dateKey = '-';
          if (e.startDateTime) {
            try {
              const startDate = new Date(e.startDateTime);
              if (!isNaN(startDate)) {
                dateKey = startDate.toISOString().slice(0, 10); // YYYY-MM-DD
              }
            } catch (err) {
              console.error('Error parsing startDateTime:', e.startDateTime);
            }
          }
          if (!groups[dateKey]) groups[dateKey] = [];
          groups[dateKey].push(e);
        });
        const sortedDates = Object.keys(groups).sort((a,b) => {
          // เรียงจากน้อยไปมาก (ล่าสุดไปเก่าสุด)
          if (a === '-' && b === '-') return 0;
          if (a === '-') return 1; // วาง '-' ไว้ท้ายสุด
          if (b === '-') return -1;
          return new Date(a) - new Date(b);
        });
        return (
          <div>
            {sortedDates.map(date => {
              let dateLabel = 'ไม่ระบุวันที่';
              if (date !== '-') {
                try {
                  const d = new Date(date);
                  if (!isNaN(d)) {
                    const day = d.getDate();
                    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
                    const month = monthNames[d.getMonth()];
                    // ใช้เลขท้าย 2 ตัวของปี
                    const year = String(d.getFullYear()).slice(-2);
                    dateLabel = `${day} ${month} ${year}`;
                  }
                } catch (err) {
                  console.error('Error formatting date:', date);
                }
              }
              return (
                <div key={date} className="timeline-date-section">
                  <div className="date-header">
                    <h5 className="date-title">{dateLabel}</h5>
                  </div>
                  <div className="event-list">
                    {groups[date].map(e => {
                      const isConfirmed = confirmedIds.includes(e.id);
                      const user = JSON.parse(localStorage.getItem('user') || '{}');
                      if (!e.endDateTime) {
                        console.log('Dashboard entry missing endDateTime:', e);
                      }
                      return (
                        <div key={e.id} className="timeline-event-item">
                          <div className="event-item-content">
                            <div className="event-time-section">
                              <small className="event-time">
                                {e.startDateTime ? new Date(e.startDateTime).toLocaleTimeString('th-TH', {hour: '2-digit', minute: '2-digit'}) : '00:00'}
                              </small>
                              <div className="activity-icon">
                                <div className="icon-placeholder"></div>
                              </div>
                            </div>
                            <div className="event-details">
                              <div className="event-name">
                                <h6 className="event-title">
                                  <a href="#" className="event-link">{e.title || 'ไม่มี'}</a>
                                </h6>
                                <div className="event-description">
                                  <p style={{margin: '0.5rem 0', fontSize: '0.875rem', color: '#6b7280'}}>
                                    <strong>รายละเอียด:</strong> {e.content || 'ไม่มีรายละเอียด'}
                                  </p>
                                  <p style={{margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280'}}>
                                    <strong>ผู้รับผิดชอบ:</strong> {e.responsible || '-'}
                                  </p>
                                  <p style={{margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280'}}>
                                    <strong>ผู้ปฏิบัติ:</strong> {e.operator || '-'}
                                  </p>
                                  <p style={{margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280'}}>
                                    <strong>การแต่งกาย:</strong> {e.dress || '-'}
                                  </p>
                                  <p style={{margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280'}}>
                                    <strong>สถานที่:</strong> {e.location || '-'}
                                  </p>
                                  <p style={{margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280'}}>
                                    <strong>กองพัน:</strong> {e.battalion ? String(e.battalion) : '-'}
                                  </p>
                                  <p style={{margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280'}}>
                                    <strong>วันเวลาเริ่ม:</strong> {e.startDateTime ? new Date(e.startDateTime).toLocaleString('th-TH') : (e.date ? new Date(e.date).toLocaleDateString('th-TH') : '-')}
                                  </p>
                                  <p style={{margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280'}}>
                                    <strong>วันเวลาสิ้นสุด:</strong> {e.endDateTime ? new Date(e.endDateTime).toLocaleString('th-TH') : '-'}
                                  </p>
                                  {e.link && (
                                    <p style={{margin: '0.25rem 0', fontSize: '0.875rem', color: '#6b7280'}}>
                                      <strong>ลิงก์ที่เกี่ยวข้อง:</strong>{' '}
                                      <a 
                                        href={e.link} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        style={{color: '#2563eb', textDecoration: 'underline'}}
                                      >
                                        เปิดลิงก์
                                      </a>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="event-action">
                              <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end'}}>
                                {e.link && (
                                  <a 
                                    href={e.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="action-button"
                                    style={{
                                      padding: '6px 12px',
                                      fontSize: '0.875rem',
                                      border: '1px solid #2563eb',
                                      background: '#2563eb',
                                      color: 'white',
                                      borderRadius: '4px',
                                      textDecoration: 'none',
                                      whiteSpace: 'nowrap',
                                      display: 'inline-block'
                                    }}
                                  >
                                    เปิดลิงก์
                                  </a>
                                )}
                                <div style={{display: 'flex', gap: '0.5rem'}}>
                                  {!isConfirmed && (
                                    <button
                                      className="btn btn-outline-secondary btn-sm action-button"
                                      onClick={async (event) => {
                                        event.preventDefault();
                                        console.log('Button clicked! EntryId:', e.id, 'UserBattalion:', userBattalion, 'EntryBattalion:', e.battalion);
                                        const token = localStorage.getItem('token');
                                        if (!token) {
                                          console.log('No token found');
                                          return;
                                        }
                                        try {
                                          console.log('Sending POST request to /api/dashboard-confirm');
                                          const response = await fetch('/api/dashboard-confirm', {
                                            method: 'POST',
                                            headers: {
                                              'Content-Type': 'application/json',
                                              Authorization: `Bearer ${token}`
                                            },
                                            body: JSON.stringify({ entryId: e.id })
                                          });
                                          console.log('Response status:', response.status);
                                          const result = await response.json();
                                          console.log('Response data:', result);
                                          fetchConfirmedIds();
                                        } catch (err) {
                                          console.error('Error confirming entry:', err);
                                        }
                                      }}
                                    >
                                      ยืนยันการเข้าร่วม
                                    </button>
                                  )}
                                  {isConfirmed && (
                                    <span className="confirmed-badge" style={{
                                      padding: '6px 12px',
                                      fontSize: '0.875rem',
                                      background: '#dcfce7',
                                      color: '#166534',
                                      borderRadius: '4px',
                                      fontWeight: '500'
                                    }}>
                                      ✓ ยืนยันแล้ว
                                    </span>
                                  )}
                                  <button
                                    className="action-button"
                                    onClick={() => handleDelete(e.id)}
                                    style={{
                                      padding: '6px 12px',
                                      fontSize: '0.875rem',
                                      border: '1px solid #dc2626',
                                      background: '#dc2626',
                                      color: 'white',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    ลบ
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()
    )}
    </div>
  </div>
      </div>
    </div>
  );
}