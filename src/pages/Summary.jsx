import React, { useEffect, useState } from 'react';
import './Summary.css';

export default function Summary() {
  const [summaries, setSummaries] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);

  // สำหรับ user
  const [userOtherFields, setUserOtherFields] = useState([]);
  const [userOtherChecked, setUserOtherChecked] = useState(null);
  const [userSummarySelect, setUserSummarySelect] = useState('');
  const [userSummaries, setUserSummaries] = useState([]);
  const [userRealname, setUserRealname] = useState('');
  const [userYear, setUserYear] = useState('');

  // สำหรับ admin/เจ้าหน้าที่
  const [form, setForm] = useState({
    date: '', time: '', battalion: '', company: '', total: '', other: '', note: '',
    total_year_5: '', total_year_4: '', total_year_3: '', total_year_2: '', total_year_1: ''
  });
  const [otherFields, setOtherFields] = useState([{ key: '', value: '', names: [''], counted: true }]);
  const [openBattalion, setOpenBattalion] = useState({});
  const [openCompany, setOpenCompany] = useState({});
  const [editId, setEditId] = useState(null);
  const [notCountedResult, setNotCountedResult] = useState({});

  // popup รายละเอียด
  const [showDetail, setShowDetail] = useState(false);
  const [detailObj, setDetailObj] = useState(null);
  const [detailSummaryId, setDetailSummaryId] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL;
  // ดึงใบยอดทั้งหมด (ที่ยังไม่มีการลงยอดจำหน่าย)
  useEffect(() => {
    console.log('API URL:', apiUrl);
    fetch(`${apiUrl}/api/summary`)
      .then(res => res.json())
      .then(data => {
        setSummaries(data.data || []);
        setUserSummaries(data.data || []);
      });
  }, []);

  // ดึง other จาก user (authme)
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${apiUrl}/api/user/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setUserRealname(data.data.realname || '');
          setUserYear(data.data.year || '');
        }
        if (data.data && data.data.other) {
          try {
            const arr = typeof data.data.other === 'string'
              ? JSON.parse(data.data.other)
              : data.data.other;
            setUserOtherFields(
              Array.isArray(arr)
                ? arr.map(f => ({ ...f, value: Number(f.value) || 1 }))
                : []
            );
            const checkedObj = {};
            (Array.isArray(arr) ? arr : []).forEach((f, idx) => {
              checkedObj[idx] = true;
            });
            setUserOtherChecked(checkedObj);
          } catch {
            setUserOtherFields([]);
            setUserOtherChecked({});
          }
        }
      });
  }, []);

  const handleUserOtherChecked = idx => {
    setUserOtherChecked(idx);
  };

  const handleUserSummarySelect = e => {
    setUserSummarySelect(e.target.value);
  };

  // handle ส่งยอดจำหน่าย (เฉพาะที่ติ๊ก)
  const handleUserSendSummary = async () => {
    if (!userSummarySelect) {
      alert('กรุณาเลือกใบยอด');
      return;
    }
    const summary = userSummaries.find(s => String(s.id) === String(userSummarySelect));
    if (!summary) {
      alert('ไม่พบใบยอดที่เลือก');
      return;
    }
    let oldOther = {};
    try {
      oldOther = summary.other ? JSON.parse(summary.other) : {};
    } catch {}
    const otherObj = { ...oldOther };

    // ตรวจสอบว่ามีการเลือกหรือไม่
    if (userOtherChecked === null || userOtherChecked === undefined) {
      alert('กรุณาเลือกอย่างน้อย 1 รายการ');
      return;
    }
    const userNameWithYear = userRealname && userYear ? `${userRealname}(${userYear})` : userRealname || '';
    let isDuplicate = false;
    Object.values(oldOther).forEach(v => {
      if (Array.isArray(v.names) && v.names.includes(userNameWithYear)) {
        isDuplicate = true;
      }
    });
    if (isDuplicate) {
      alert('คุณได้ส่งยอดในใบนี้ไปแล้ว');
      return;
    }

    const f = userOtherFields[userOtherChecked];
    if (f && f.key) {
      const oldCount = Number(oldOther[f.key]?.count) || 0;
      const newCount = Number(f.value) || 1;
      const oldNames = Array.isArray(oldOther[f.key]?.names) ? oldOther[f.key].names : [];
      const newNames = userNameWithYear ? [userNameWithYear] : [];
      const allNames = Array.from(new Set([...oldNames, ...newNames].filter(Boolean)));
      otherObj[f.key] = {
        count: oldCount + newCount,
        names: allNames
      };
    } else {
      alert('กรุณาเลือกอย่างน้อย 1 รายการ');
      return;
    }
    const res = await fetch(`${apiUrl}/api/summary?id=${summary.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...summary,
        other: otherObj
      })
    });
    if (res.ok) {
      alert('ส่งยอดจำหน่ายสำเร็จ');
      setUserSummarySelect('');
      setUserOtherChecked(null);
      fetch(`${apiUrl}/api/summary`)
        .then(res => res.json())
        .then(data => setSummaries(data.data || []));
      setShowUserForm(false);
    }
  };

  // ส่วนของ admin/เจ้าหน้าที่ (เหมือนเดิม)
  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleOtherChange = (idx, field, value) => {
    const updated = [...otherFields];
    updated[idx][field] = value;
    setOtherFields(updated);
  };

  const handleCountedChange = (idx, checked) => {
    const updated = [...otherFields];
    updated[idx].counted = checked;
    setOtherFields(updated);
  };

  const handleNameChange = (idx, nameIdx, value) => {
    const updated = [...otherFields];
    updated[idx].names[nameIdx] = value;
    setOtherFields(updated);
  };

  const addNameField = idx => {
    const updated = [...otherFields];
    updated[idx].names.push('');
    setOtherFields(updated);
  };

  const addOtherField = () => setOtherFields([...otherFields, { key: '', value: '', names: [''], counted: true }]);

  const total = Number(form.total) || 0;
  const used = otherFields.reduce((sum, f) => f.counted !== false ? sum + (Number(f.value) || 0) : sum, 0);
  const remain = total - used;

  const totalByYear = ['5', '4', '3', '2', '1'].reduce((obj, year) => {
    obj[year] = Number(form[`total_year_${year}`]) || 0;
    return obj;
  }, {});
  const totalAllYear = Object.values(totalByYear).reduce((sum, v) => sum + v, 0);

  const handleEdit = s => {
    setForm({
      date: s.date,
      time: s.time,
      battalion: String(s.battalion),
      company: String(s.company),
      total: String(s.total),
      note: s.note || '',
      other: '',
      total_year_5: s.total_year_5 || '',
      total_year_4: s.total_year_4 || '',
      total_year_3: s.total_year_3 || '',
      total_year_2: s.total_year_2 || '',
      total_year_1: s.total_year_1 || ''
    });
    try {
      const obj = JSON.parse(s.other);
      setOtherFields(
        Object.entries(obj).map(([key, v]) => ({
          key,
          value: v.count,
          names: v.names && Array.isArray(v.names) ? v.names : [''],
          counted: v.counted !== false
        }))
      );
    } catch {
      setOtherFields([{ key: '', value: '', names: [''], counted: true }]);
    }
    setEditId(s.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async id => {
    if (window.confirm('ต้องการลบข้อมูลนี้ใช่หรือไม่?')) {
      await fetch(`${apiUrl}/api/summary?id=${id}`, { method: 'DELETE' });
      setSummaries(summaries => summaries.filter(item => item.id !== id));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const otherObj = {};
    otherFields.forEach(f => {
      if (f.key) {
        otherObj[f.key] = {
          count: f.value,
          names: f.names.filter(n => n),
          counted: f.counted !== false
        };
      }
    });
    const method = editId ? 'PUT' : 'POST';
    const url = editId
      ? `${apiUrl}/api/summary?id=${editId}`
      : `${apiUrl}/api/summary`;
    const bodyData = {
      ...form,
      battalion: Number(form.battalion),
      company: Number(form.company),
      total: Number(form.total),
      other: otherObj,
      total_year_5: form.total_year_5,
      total_year_4: form.total_year_4,
      total_year_3: form.total_year_3,
      total_year_2: form.total_year_2,
      total_year_1: form.total_year_1
    };
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });
    const data = await res.json();
    if (data.success) {
      if (editId) {
        setSummaries(summaries.map(s => (s.id === editId ? data.data : s)));
        setEditId(null);
      } else {
        setSummaries([data.data, ...summaries]);
      }
      setForm({
        date: '', time: '', battalion: '', company: '', total: '', other: '', note: '',
        total_year_5: '', total_year_4: '', total_year_3: '', total_year_2: '', total_year_1: ''
      });
      setOtherFields([{ key: '', value: '', names: [''], counted: true }]);
    }
  };

  // --- กลุ่มข้อมูลตามกองพัน/กองร้อย ---
  const grouped = {};
  summaries.forEach(s => {
    if (!grouped[s.battalion]) grouped[s.battalion] = {};
    if (!grouped[s.battalion][s.company]) grouped[s.battalion][s.company] = [];
    grouped[s.battalion][s.company].push(s);
  });

  const toggleBattalion = battalion => {
    setOpenBattalion(prev => ({ ...prev, [battalion]: !prev[battalion] }));
  };
  const toggleCompany = (battalion, company) => {
    setOpenCompany(prev => ({
      ...prev,
      [`${battalion}-${company}`]: !prev[`${battalion}-${company}`]
    }));
  };

  // popup รายละเอียด
  const handleShowDetail = namesArr => {
    // ไม่ใช้ใน popup รายการจำหน่ายแบบใหม่
  };

  // popup รายการจำหน่ายแบบใหม่
  const handleShowSaleList = (obj, summaryId) => {
    setDetailObj(obj);
    setDetailSummaryId(summaryId);
    setShowDetail(true);
  };

  // ลบชื่อ user ออกจากรายการจำหน่าย
  const handleRemoveUserFromSale = async (summaryId, key, userName) => {
    // หา summary ที่ต้องการแก้ไข
    const summary = summaries.find(s => s.id === summaryId);
    if (!summary) return;
    let obj = {};
    try {
      obj = summary.other ? JSON.parse(summary.other) : {};
    } catch {}
    if (!obj[key] || !Array.isArray(obj[key].names)) return;

    // ลบชื่อ user ออกจาก names
    obj[key].names = obj[key].names.filter(n => n !== userName);

    // ถ้า names ว่าง ให้ลบ key นี้ออก
    if (obj[key].names.length === 0) {
      delete obj[key];
    }

    // อัปเดตไปยัง backend
    await fetch(`${apiUrl}/api/summary?id=${summaryId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...summary,
        other: obj
      })
    });

    // อัปเดต state
    setSummaries(summaries =>
      summaries.map(s =>
        s.id === summaryId ? { ...s, other: JSON.stringify(obj) } : s
      )
    );
    // ปิด popup ถ้าไม่มีรายการเหลือ
    if (Object.keys(obj).length === 0) {
      setShowDetail(false);
    } else {
      setDetailObj(obj);
    }
  };

  return (
    <div className="summary-container">
      {/* ----------- ตารางสถานะการส่งยอดจำหน่ายของผู้ใช้ ----------- */}
      <div style={{ marginBottom: 32 }}>
        <h4 style={{ color: '#007bff', marginBottom: 8 }}>สถานะการส่งยอดจำหน่ายของคุณ</h4>
        <table className="summary-table" style={{ minWidth: 400 }}>
          <thead>
            <tr>
              <th>วันที่</th>
              <th>เวลา</th>
              <th>กองพัน</th>
              <th>กองร้อย</th>
              <th>สถานะ</th>
              <th>รายการที่ส่ง</th>
            </tr>
          </thead>
          <tbody>
            {userSummaries.map(s => {
              let sent = false;
              let sentList = [];
              try {
                const other = s.other ? JSON.parse(s.other) : {};
                const userNameWithYear = userRealname && userYear ? `${userRealname}(${userYear})` : userRealname || '';
                Object.entries(other).forEach(([key, v]) => {
                  if (Array.isArray(v.names) && v.names.includes(userNameWithYear)) {
                    sent = true;
                    sentList.push(key);
                  }
                });
              } catch {}
              return (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>{s.time}</td>
                  <td>{s.battalion}</td>
                  <td>{s.company}</td>
                  <td>
                    {sent ? (
                      <span style={{ color: '#19d254', fontWeight: 500 }}>ส่งจำหน่ายแล้ว</span>
                    ) : (
                      <span style={{ color: '#e53935', fontWeight: 500 }}>ยังไม่ได้ส่ง</span>
                    )}
                  </td>
                  <td>
                    {sentList.length > 0
                      ? sentList.map((item, idx) => (
                          <span key={item}>
                            {item}
                            {idx < sentList.length - 1 ? ', ' : ''}
                          </span>
                        ))
                      : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* ----------- ส่วนของผู้ใช้ (User) ----------- */}
      <div style={{ marginBottom: 32, border: '2px solid #007bff', borderRadius: 8, padding: 16, background: '#f8faff' }}>
        <h3 style={{ color: '#007bff' }}>ส่งยอดจำหน่าย (สำหรับผู้ใช้ทั่วไป)</h3>
        {!showUserForm ? (
          <button
            className="btn btn-primary"
            onClick={() => setShowUserForm(true)}
            style={{ marginBottom: 0 }}
          >
            + เพิ่มส่งยอดจำหน่าย
          </button>
        ) : (
          <>
            <div style={{ marginBottom: 8 }}>
              <b>เลือกใบยอดที่ต้องการลงยอด:</b>
              <select value={userSummarySelect} onChange={handleUserSummarySelect} style={{ marginLeft: 8 }}>
                <option value="">-- เลือกใบยอด --</option>
                {userSummaries.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.date} | {s.time} | กองพัน {s.battalion} กองร้อย {s.company}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 8 }}>
              <b>รายการจำหน่ายของคุณ:</b>
              {userOtherFields.length === 0 && <div style={{ color: '#888' }}>ไม่มีรายการจำหน่าย</div>}
              {userOtherFields.map((f, idx) => {
                // ตรวจสอบว่า user นี้เคยส่งยอดในใบนี้แล้วหรือยัง
                let sent = false;
                if (userSummarySelect) {
                  const summary = userSummaries.find(s => String(s.id) === String(userSummarySelect));
                  if (summary) {
                    try {
                      const other = summary.other ? JSON.parse(summary.other) : {};
                      const userNameWithYear = userRealname && userYear ? `${userRealname}(${userYear})` : userRealname || '';
                      if (
                        other[f.key] &&
                        Array.isArray(other[f.key].names) &&
                        other[f.key].names.includes(userNameWithYear)
                      ) {
                        sent = true;
                      }
                    } catch {}
                  }
                }
                return (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                    <input
                      type="checkbox"
                      checked={userOtherChecked === idx}
                      onChange={() => handleUserOtherChecked(idx)}
                      style={{ marginRight: 4 }}
                      disabled={sent}
                    />
                    <span style={{ flex: 2 }}>
                      {f.key}
                      {sent && (
                        <span style={{ color: '#1976d2', fontWeight: 500, marginLeft: 8 }}>
                          (คุณส่งยอดนี้แล้ว)✅
                        </span>
                      )}
                    </span>
                    <span style={{ flex: 1 }}>จำนวน {f.value}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-primary"
                style={{ marginBottom: 0 }}
                onClick={handleUserSendSummary}
              >
                ส่งยอดจำหน่าย
              </button>
              <button
                type="button"
                className="btn"
                style={{ marginBottom: 0, background: '#eee', color: '#333' }}
                onClick={() => {
                  setUserSummarySelect('');
                  setUserOtherChecked(null);
                  setShowUserForm(false);
                }}
              >
                ยกเลิก
              </button>
            </div>
          </>
        )}
      </div>

      {/* ----------- ส่วนของเจ้าหน้าที่/แอดมิน ----------- */}
      <h2>สร้างใบยอด(สำหรับตัวแทนชั้น)</h2>
      <form className="summary-form" onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <select name="battalion" value={form.battalion} onChange={handleChange} required>
            <option value="">เลือกกองพัน</option>
            <option value="1">กองพัน 1</option>
            <option value="2">กองพัน 2</option>
            <option value="3">กองพัน 3</option>
            <option value="4">กองพัน 4</option>
          </select>
          <select name="company" value={form.company} onChange={handleChange} required>
            <option value="">เลือกกองร้อย</option>
            <option value="1">กองร้อย 1</option>
            <option value="2">กองร้อย 2</option>
            <option value="3">กองร้อย 3</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <b>วันที่ :</b>
            <input
              name="date"
              type="date"
              placeholder="เช่น 2025-06-12"
              value={form.date}
              onChange={handleChange}
              required
              style={{ width: '100%' }}
            />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <b>เวลา :</b>
          <input name="time" type="text" placeholder="เช่น 0530, 0700, 0800, 1800, 2100" value={form.time} onChange={handleChange} required style={{ width: '100%' }} />
        </div>
        <div style={{ margin: '16px 0', padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#f9f9f9' }}>
          <b>จำนวนคนทั้งหมด (แยกชั้นปี):</b>
          <div className="summary-year-row">
            {['5', '4', '3', '2', '1'].map(year => (
              <div key={year} className="summary-year-col">
                <label>ชั้น {year}:</label>
                <input
                  type="number"
                  min="0"
                  value={form[`total_year_${year}`] || ''}
                  onChange={e => setForm(f => ({ ...f, [`total_year_${year}`]: e.target.value }))}
                  placeholder={`ชั้น ${year}`}
                />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <b>รวมทั้งหมด:</b>{' '}
            {['5', '4', '3', '2', '1'].reduce((sum, year) => sum + (Number(form[`total_year_${year}`]) || 0), 0)}
          </div>
        </div>
        <input name="total" type="number" placeholder="จำนวนคนทั้งหมด" value={form.total} onChange={handleChange} required style={{ marginBottom: 8, width: '100%' }} />
        <div style={{ marginBottom: 8 }}>
          <div className={`remain ${remain < 0 ? 'negative' : 'positive'}`}>
            <b>ยอดที่เหลือ:</b> {remain}
          </div>
        </div>
        <input name="note" placeholder="ชื่อตัวแทนชั้น (ชั้นปี)" value={form.note} onChange={handleChange} style={{ marginBottom: 8, width: '100%' }} />
        <button type="submit">{editId ? 'บันทึกการแก้ไข' : 'บันทึกยอด'}</button>
        {editId && (
          <button
            type="button"
            onClick={() => {
              setEditId(null);
              setForm({
                date: '', time: '', battalion: '', company: '', total: '', other: '', note: '',
                total_year_5: '', total_year_4: '', total_year_3: '', total_year_2: '', total_year_1: ''
              });
              setOtherFields([{ key: '', value: '', names: [''], counted: true }]);
            }}
          >
            ยกเลิก
          </button>
        )}
      </form>

      <h3>ผลลัพธ์ยอด (แยกตามกองพัน/กองร้อย)</h3>
      {Object.keys(grouped).sort().map(battalion => (
        <div key={battalion} style={{ marginBottom: 24 }}>
          <button
            type="button"
            className="summary-accordion-btn"
            onClick={() => toggleBattalion(battalion)}
          >
            {openBattalion[battalion] ? '▼' : '►'} กองพัน {battalion}
          </button>
          {openBattalion[battalion] && (
            <div>
              {Object.keys(grouped[battalion]).sort().map(company => (
                <div key={company} style={{ marginBottom: 12, marginLeft: 24 }}>
                  <button
                    type="button"
                    className="summary-company-btn"
                    onClick={() => toggleCompany(battalion, company)}
                  >
                    {openCompany[`${battalion}-${company}`] ? '▼' : '►'} กองร้อย {company}
                  </button>
                  {openCompany[`${battalion}-${company}`] && (
                    <div style={{ overflowX: 'auto' }}>
                      <table className="summary-table">
                        <thead>
                          <tr>
                            <th>วันที่</th>
                            <th>เวลา</th>
                            <th>ทั้งหมด</th>
                            <th>จำหน่าย</th>
                            <th>ยอดที่เหลือ</th>
                            <th>ตัวแทนชั้น</th>
                            <th>แก้ไข</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grouped[battalion][company].map(s => {
                            let remainRow = Number(s.total) || 0;
                            let obj = {};
                            try {
                              obj = JSON.parse(s.other);
                              remainRow -= Object.entries(obj).reduce((sum, [key, v]) => {
                                if (notCountedResult[s.id] && notCountedResult[s.id][key]) return sum;
                                return sum + (Number(v.count) || 0);
                              }, 0);
                            } catch {}
                            return (
                              <tr key={s.id}>
                                <td data-label="วันที่">{s.date}</td>
                                <td data-label="แถวกี่โมง">{s.time}</td>
                                <td data-label="ทั้งหมด">{s.total}</td>
                                <td data-label="จำหน่าย" style={{ fontSize: '0.92em', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                  {obj && Object.entries(obj).length > 0 ? (
                                    <button
                                      type="button"
                                      style={{
                                        background: '#1976d2',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: 4,
                                        padding: '2px 12px',
                                        fontSize: '0.95em',
                                        cursor: 'pointer',
                                        marginBottom: 4
                                      }}
                                      onClick={() => handleShowSaleList(obj, s.id)}
                                    >
                                      ดูรายการจำหน่าย
                                    </button>
                                  ) : (
                                    <span style={{ color: '#888' }}>-</span>
                                  )}
                                </td>
                                <td data-label="ยอดที่เหลือ">
                                  <span style={{ color: remainRow < 0 ? 'red' : 'green' }}>{remainRow}</span>
                                </td>
                                <td data-label="ตัวแทนชั้น">{s.note}</td>
                                <td data-label="แก้ไข">
                                  <button type="button" onClick={() => handleEdit(s)}>
                                    แก้ไข
                                  </button>
                                  <button
                                    type="button"
                                    style={{ marginLeft: 8, color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}
                                    onClick={() => handleDelete(s.id)}
                                    title="ลบ"
                                  >
                                    ลบ
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {/* Popup รายการจำหน่ายแบบใหม่ */}
      {showDetail && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.3)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => setShowDetail(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 24,
              minWidth: 260,
              maxWidth: 350,
              boxShadow: '0 2px 16px rgba(0,0,0,0.18)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h4 style={{ marginTop: 0 }}>รายการจำหน่าย</h4>
            <div>
              {detailObj && Object.keys(detailObj).length > 0 ? (
                Object.entries(detailObj).map(([key, v]) => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{key} : {v.count}</div>
                    <ul style={{ paddingLeft: 18, margin: 0 }}>
                      {Array.isArray(v.names) && v.names.length > 0 ? (
                        v.names.map((name, idx) => (
                          <li key={name} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
                            <span style={{ flex: 1 }}>{name}</span>
                            <button
                              style={{
                                marginLeft: 8,
                                background: '#e53935',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                padding: '2px 10px',
                                fontSize: '0.92em',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleRemoveUserFromSale(detailSummaryId, key, name)}
                            >
                              ลบ
                            </button>
                          </li>
                        ))
                      ) : (
                        <li style={{ color: '#888' }}>ไม่มีชื่อผู้ใช้</li>
                      )}
                    </ul>
                  </div>
                ))
              ) : (
                <div style={{ color: '#888' }}>ไม่มีรายการ</div>
              )}
            </div>
            <button
              style={{
                marginTop: 16,
                background: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                padding: '4px 16px',
                cursor: 'pointer'
              }}
              onClick={() => setShowDetail(false)}
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}