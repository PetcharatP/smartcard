import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './EditProfile.css';

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

export default function EditProfile() {
  const [realname, setRealname] = useState('');
  const [userid, setUserId] = useState('');
  const [oldUserid, setOldUserid] = useState('');
  const [blood, setBlood] = useState('');
  const [gunNumber, setGunNumber] = useState('');
  const [major, setMajor] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [club1, setClub1] = useState('');
  const [club2, setClub2] = useState('');
  const [club3, setClub3] = useState('');
  const [year, setYear] = useState('');
  const [otherFields, setOtherFields] = useState([{ key: '', value: 1 }]);
  
  // เพิ่ม state สำหรับสังกัด
  const [battalion, setBattalion] = useState('');
  const [company, setCompany] = useState('');
  const [platoon, setPlatoon] = useState('');
  const [squad, setSquad] = useState('');
  
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState('success'); // 'success' or 'error'
  const navigate = useNavigate();
  const apiUrl = process.env.NODE_ENV === 'production' ? '' : (import.meta.env.VITE_API_URL || '');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`/api/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status) {
          setRealname(data.data.realname || '');
          setUserId(data.data.userid || '');
          setOldUserid(data.data.userid || '');
          setBlood(data.data.blood || '');
          setGunNumber(data.data.gunNumber || '');
          let majorLabel = data.data.major || '';
          if (majorLabel.startsWith('สาขาวิชา')) {
            majorLabel = majorLabel.replace('สาขาวิชา', '').trim();
          }
          const found = majorOptions.find(opt => opt.label === majorLabel || opt.value === majorLabel);
          setMajor(found ? found.value : '');
          setClub1(data.data.club1 || '');
          setClub2(data.data.club2 || '');
          setClub3(data.data.club3 || '');
          setYear(data.data.year || '');
          
          // โหลดข้อมูลสังกัด
          setBattalion(data.data.battalion || '');
          setCompany(data.data.company || '');
          setPlatoon(data.data.platoon || '');
          setSquad(data.data.squad || '');
          
          if (data.data.profileImage) {
            setPreviewImage(`data:image/jpeg;base64,${data.data.profileImage}`);
          }
          if (data.data.other) {
            try {
              const parsed = typeof data.data.other === 'string'
                ? JSON.parse(data.data.other)
                : data.data.other;
              if (Array.isArray(parsed)) setOtherFields(parsed);
            } catch {}
          }
        }
      })
      .catch((error) => {
        console.error('Error fetching user data:', error);
      });
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleOtherChange = (idx, field, val) => {
    setOtherFields(fields => {
      const copy = [...fields];
      copy[idx][field] = val;
      return copy;
    });
  };

  const addOtherField = () => {
    setOtherFields(fields => [...fields, { key: '', value: 1 }]);
  };

  const removeOtherField = (idx) => {
    setOtherFields(fields => fields.filter((_, i) => i !== idx));
  };

  const showMessage = (message, type = 'success') => {
    setPopupMessage(message);
    setPopupType(type);
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    if (popupType === 'success') {
      navigate('/');
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    
    // ตรวจสอบรหัสประจำตัวให้มี 13 หลักพอดี
    if (userid.length !== 13) {
      showMessage('กรุณากรอกรหัสประจำตัวให้ครบ 13 หลัก', 'error');
      return;
    }
    
    const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('realname', realname);
  formData.append('userid', userid);
  formData.append('oldUserid', oldUserid);
    formData.append('blood', blood);
    formData.append('gunNumber', gunNumber);
    formData.append('major', major);
    formData.append('club1', club1);
    formData.append('club2', club2);
    formData.append('club3', club3);
    formData.append('year', year);
    formData.append('other', JSON.stringify(otherFields));
    
    // เพิ่มข้อมูลสังกัด
    formData.append('battalion', battalion);
    formData.append('company', company);
    formData.append('platoon', platoon);
    formData.append('squad', squad);
    
    if (profileImage) formData.append('profileImage', profileImage);

    fetch(`/api/user/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          showMessage('บันทึกข้อมูลเรียบร้อยแล้ว! 🎉', 'success');
        } else {
          showMessage('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง', 'error');
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        showMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง', 'error');
      });
  };

  return (
    <div className="edit-profile-minimal">
      <form className="edit-profile-form" onSubmit={handleSave}>
        <h2 className="edit-profile-title">แก้ไขข้อมูลส่วนตัว</h2>
        
        <div className="section-container">
          <h3 className="section-title">รูปโปรไฟล์</h3>
          <div className="profile-img-block">
            {previewImage && <img src={previewImage} alt="Preview" className="profile-img" />}
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </div>
        </div>

        <div className="section-container">
          <h3 className="section-title">ข้อมูลพื้นฐาน</h3>
          <div className="form-group">
            <label className="form-label">ชื่อ-นามสกุล</label>
            <input
              type="text"
              placeholder="กรอกชื่อ-นามสกุล"
              value={realname}
              onChange={(e) => setRealname(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">รหัสประจำตัว (13 หลัก)</label>
            <input
              type="text"
              placeholder="กรอกรหัสประจำตัว 13 หลัก"
              value={userid}
              onChange={(e) => {
                // อนุญาตให้กรอกเฉพาะตัวเลข
                const value = e.target.value.replace(/\D/g, '');
                // จำกัดความยาวไม่เกิน 13 หลัก
                if (value.length <= 13) {
                  setUserId(value);
                }
              }}
              pattern="[0-9]{13}"
              minLength="13"
              maxLength="13"
              title="กรุณากรอกรหัสประจำตัว 13 หลัก (ตัวเลขเท่านั้น)"
              required
            />
            {userid && userid.length !== 13 && (
              <small style={{ color: '#e57373', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                รหัสประจำตัวต้องมี 13 หลักพอดี (ปัจจุบัน: {userid.length} หลัก)
              </small>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">กรุ๊ปเลือด</label>
            <input
              type="text"
              placeholder="กรอกกรุ๊ปเลือด เช่น A, B, AB, O"
              value={blood}
              onChange={(e) => setBlood(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">เลขปืน (ไม่บังคับ)</label>
            <input
              type="text"
              placeholder="กรอกเลขปืน"
              value={gunNumber}
              onChange={(e) => setGunNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="section-container">
          <h3 className="section-title">ข้อมูลการศึกษา</h3>
          <div className="form-group">
            <label className="form-label">สาขาวิชา</label>
            <select
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              required
            >
              <option value="">-- เลือกสาขาวิชา --</option>
              {majorOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">ชั้นปี</label>
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              required
            >
              <option value="">-- เลือกชั้นปี --</option>
              <option value="1">ชั้นปี 1</option>
              <option value="2">ชั้นปี 2</option>
              <option value="3">ชั้นปี 3</option>
              <option value="4">ชั้นปี 4</option>
              <option value="5">ชั้นปี 5</option>
            </select>
          </div>
        </div>

        <div className="section-container">
          <h3 className="section-title">ข้อมูลสังกัด (ไม่บังคับ)</h3>
          <div className="form-group">
            <label className="form-label">กองพัน</label>
            <select
              value={battalion}
              onChange={e => setBattalion(e.target.value)}
            >
              <option value="">-- เลือกกองพัน --</option>
              <option value="1">กองพัน 1</option>
              <option value="2">กองพัน 2</option>
              <option value="3">กองพัน 3</option>
              <option value="4">กองพัน 4</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">กองร้อย</label>
            <select
              value={company}
              onChange={e => setCompany(e.target.value)}
            >
              <option value="">-- เลือกกองร้อย --</option>
              <option value="1">กองร้อย 1</option>
              <option value="2">กองร้อย 2</option>
              <option value="3">กองร้อย 3</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">หมู่</label>
            <select
              value={platoon}
              onChange={e => setPlatoon(e.target.value)}
            >
              <option value="">-- เลือกหมู่ --</option>
              <option value="1">หมู่ 1</option>
              <option value="2">หมู่ 2</option>
              <option value="3">หมู่ 3</option>
              <option value="4">หมู่ 4</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">หมวด</label>
            <select
              value={squad}
              onChange={e => setSquad(e.target.value)}
            >
              <option value="">-- เลือกหมวด --</option>
              <option value="1">หมวด 1</option>
              <option value="2">หมวด 2</option>
              <option value="3">หมวด 3</option>
            </select>
          </div>
        </div>

        <div className="section-container">
          <h3 className="section-title">ข้อมูลชมรม (ไม่บังคับ)</h3>
          <div className="form-group">
            <label className="form-label">ชมรมที่ 1</label>
            <input
              type="text"
              placeholder="กรอกชื่อชมรมที่ 1"
              value={club1}
              onChange={e => setClub1(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">ชมรมที่ 2</label>
            <input
              type="text"
              placeholder="กรอกชื่อชมรมที่ 2"
              value={club2}
              onChange={e => setClub2(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">ชมรมที่ 3</label>
            <input
              type="text"
              placeholder="กรอกชื่อชมรมที่ 3"
              value={club3}
              onChange={e => setClub3(e.target.value)}
            />
          </div>
        </div>

        {/* ส่วนเพิ่มรายการจำหน่าย */}
        <div className="sale-container">
          <h3 className="section-title">รายการจำหน่าย (ไม่บังคับ)</h3>
          <p className="sale-description">เพิ่มรายการที่ต้องการจำหน่าย เช่น อุปกรณ์การเรียน เครื่องแบบ หรืออื่นๆ</p>
          {otherFields.map((f, idx) => (
            <div
              key={idx}
              className="sale-input-row"
            >
              <input
                placeholder="ชื่อรายการ"
                value={f.key}
                onChange={e => handleOtherChange(idx, 'key', e.target.value)}
                style={{ flex: 2, minWidth: 0 }}
              />
              <button
                type="button"
                onClick={() => removeOtherField(idx)}
                style={{
                  padding: '0 10px',
                  height: 36,
                  background: '#e57373',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >-</button>
            </div>
          ))}
          <button
            type="button"
            onClick={addOtherField}
            style={{
              width: '100%',
              marginTop: 4,
              background: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 0',
              fontSize: '1rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >+ เพิ่มรายการจำหน่าย</button>
        </div>
        <button type="submit" className="save-button">บันทึกข้อมูล</button>
      </form>

      {/* Custom Popup */}
      {showPopup && (
        <div className="success-popup-backdrop">
          <div className="success-popup">
            <div className="success-icon">
              {popupType === 'success' ? '✅' : '❌'}
            </div>
            <h3 className="success-title">
              {popupType === 'success' ? 'สำเร็จ!' : 'เกิดข้อผิดพลาด!'}
            </h3>
            <p className="success-message">
              {popupMessage}
            </p>
            <button
              onClick={closePopup}
              className="success-close-btn"
            >
              ตกลง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}