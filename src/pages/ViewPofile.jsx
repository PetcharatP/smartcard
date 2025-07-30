import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import './ViewPofile.css';

export default function ViewProfile() {
    const [realname, setRealname] = useState('');
    const [userid, setUserId] = useState('');
    const [blood, setBlood] = useState('');
    const [gunNumber, setGunNumber] = useState('');
    const [major, setMajor] = useState('');
    const [point, setPoint] = useState('');
    const [admin, setAdmin] = useState(false);
    const [profileImage, setProfileImage] = useState('');
    const [qrCodeImage, setQrCodeImage] = useState('');
    const [gunQrCodeImage, setGunQrCodeImage] = useState('');
    const [adjustments, setAdjustments] = useState([]);
    const [club1, setClub1] = useState('');
    const [club2, setClub2] = useState('');
    const [club3, setClub3] = useState('');
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
            navigate('/login');
        } else {
            console.log('API URL:', apiUrl);
            fetch(`/api/user/me`, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then(res => res.json())
                .then(data => {
                    setRealname(data.data.realname);
                    setUserId(data.data.userid);
                    setBlood(data.data.blood);
                    setGunNumber(data.data.gunNumber || 'N/A');
                    setMajor(data.data.major || '-');
                    setPoint(data.data.point ?? '-');
                    setAdmin(data.data.admin ?? false);
                    setAdjustments(data.data.adjustments || []);
                    setClub1(data.data.club1 || '');
                    setClub2(data.data.club2 || '');
                    setClub3(data.data.club3 || '');
                    if (data.data.profileImage) {
                        setProfileImage(`data:image/jpeg;base64,${data.data.profileImage}`);
                    }
                    generateQRCode(data.data.userid);
                    if (data.data.gunNumber) {
                        generateGunQRCode(data.data.gunNumber);
                    }
                });
        }
    }, [navigate]);

    const generateQRCode = async (text) => {
        try {
            const qrCodeUrl = await QRCode.toDataURL(text, { width: 60 });
            setQrCodeImage(qrCodeUrl);
        } catch (error) {
            console.error('Error generating QR Code:', error);
        }
    };

    const generateGunQRCode = async (gunNumber) => {
        try {
            const qrCodeUrl = await QRCode.toDataURL(gunNumber, { width: 60 });
            setGunQrCodeImage(qrCodeUrl);
        } catch (error) {
            console.error('Error generating Gun QR Code:', error);
        }
    };

    const handleEditProfile = () => {
        navigate('/edit-profile');
    };

return (
    <div className="view-profile-bg">
        <div className="view-profile-container">
            {/* ส่วนหัวโปรไฟล์ */}
            <div className="view-profile-header">
                <div className="view-profile-avatar">
                    {profileImage
                        ? <img src={profileImage} alt="Profile" className="view-profile-avatar-img" />
                        : (realname ? realname[0] : '')
                    }
                </div>
                <div>
                    <div className="view-profile-name">{realname}</div>
                    <div className="view-profile-major">{major}</div>
                    <button
                        onClick={handleEditProfile}
                        className="btn"
                        type="button"
                    >
                        Edit profile
                    </button>
                </div>
            </div>
            {/* กล่องข้อมูลโปรไฟล์ + QR Code ขวา */}
            <div className="view-profile-main-row">
                <div className="view-profile-card">
                    <div className="view-profile-card-title">User details</div>
                    <div className="view-profile-row"><span>รหัสประจำตัว: </span>{userid}</div>
                    <div className="view-profile-row"><span>หมู่โลหิต: </span>{blood}</div>
                    <div className="view-profile-row"><span>หมายเลขปืน: </span>{gunNumber}</div>
                    <div className="view-profile-row"><span>สาขา: </span>{
                        (() => {
                            const found = majorOptions.find(opt =>
                                opt.value === major || opt.label === major
                            );
                            return found ? found.label : (major && !major.startsWith('สาขาวิชา') ? `สาขาวิชา${major}` : major);
                        })()
                    }</div>
                    <div className="view-profile-row"><span>คะแนนพฤติกรรม: </span>{point}</div>
                    <div className="view-profile-row"><span>สิทธิ์ผู้ดูแล: </span>{admin ? 'ผู้ดูแลระบบ' : 'ทั่วไป'}</div>
                    <div className="view-profile-row">
                        <span>ชมรม: </span>
                        <ul className="view-profile-clubs-list">
                            {club1 && <li>{club1}</li>}
                            {club2 && <li>{club2}</li>}
                            {club3 && <li>{club3}</li>}
                            {!club1 && !club2 && !club3 && <li className="view-profile-no-club">-</li>}
                        </ul>
                    </div>
                    <div className="view-profile-card-subtitle">ประวัติการปรับคะแนน</div>
                    <div className="view-profile-history">
                        {adjustments.length === 0 && <div className="view-profile-no-data">ไม่มีข้อมูล</div>}
                        {adjustments.map(adj => (
                            <div key={adj.id} className="view-profile-history-item">
                                <div>วันที่: {new Date(adj.date).toLocaleDateString()}</div>
                                <div>เปลี่ยนแปลง: <b>{adj.change > 0 ? '+' : ''}{adj.change}</b> ({adj.reason})</div>
                                <div>โดย: {adj.operator}</div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* QR Code Section ด้านขวา */}
                <div className="view-profile-card view-profile-qr-only">
                    <div className="view-profile-card-title">QR Code</div>
                    {qrCodeImage && (
                        <img src={qrCodeImage} alt="QR Code" className="view-profile-qr-img" />
                    )}
                    <div className="view-profile-card-title view-profile-qr-title">Gun QR Code</div>
                    {gunQrCodeImage && (
                        <img src={gunQrCodeImage} alt="Gun QR Code" className="view-profile-qr-img" />
                    )}
                </div>
            </div>
        </div>
    </div>
);
}