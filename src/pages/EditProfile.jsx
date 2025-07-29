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
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${apiUrl}/api/user/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status) {
          setRealname(data.data.realname || '');
          setUserId(data.data.userid || '');
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

  const handleSave = (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('realname', realname);
    formData.append('userid', userid);
    formData.append('blood', blood);
    formData.append('gunNumber', gunNumber);
    formData.append('major', major);
    formData.append('club1', club1);
    formData.append('club2', club2);
    formData.append('club3', club3);
    formData.append('year', year);
    formData.append('other', JSON.stringify(otherFields));
    if (profileImage) formData.append('profileImage', profileImage);

    fetch(`${apiUrl}/api/user/update`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          alert('Profile updated successfully');
          navigate('/');
        } else {
          alert('Failed to update profile');
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('An error occurred while updating profile');
      });
  };

  return (
    <div className="edit-profile-minimal">
      <form className="edit-profile-form" onSubmit={handleSave}>
        <div className="profile-img-block">
          {previewImage && <img src={previewImage} alt="Preview" className="profile-img" />}
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </div>
        <input
          type="text"
          placeholder="ชื่อ-นามสกุล"
          value={realname}
          onChange={(e) => setRealname(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="รหัสประจำตัว"
          value={userid}
          onChange={(e) => setUserId(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="กรุ๊ปเลือด"
          value={blood}
          onChange={(e) => setBlood(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="เลขปืน"
          value={gunNumber}
          onChange={(e) => setGunNumber(e.target.value)}
        />
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
        <input
          type="text"
          placeholder="ชื่อชมรมที่ 1"
          value={club1}
          onChange={e => setClub1(e.target.value)}
        />
        <input
          type="text"
          placeholder="ชื่อชมรมที่ 2"
          value={club2}
          onChange={e => setClub2(e.target.value)}
        />
        <input
          type="text"
          placeholder="ชื่อชมรมที่ 3"
          value={club3}
          onChange={e => setClub3(e.target.value)}
        />

        {/* ส่วนเพิ่มรายการจำหน่าย */}
        <div style={{ margin: '16px 0' }}>
          <b>รายการจำหน่าย (เพิ่มได้หลายรายการ):</b>
          {otherFields.map((f, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 4,
                alignItems: 'center',
                width: '100%',
              }}
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
        <button type="submit">บันทึก</button>
      </form>
    </div>
  );
}