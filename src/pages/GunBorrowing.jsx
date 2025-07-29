import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import './GunBorrowing.css';

export default function GunBorrowing() {
    const apiUrl = import.meta.env.VITE_API_URL;
    // State
    const [userQRCode, setUserQRCode] = useState('');
    const [gunQRCode, setGunQRCode] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [successfulBorrows, setSuccessfulBorrows] = useState([]);
    const [usersWithTwoScans, setUsersWithTwoScans] = useState([]);
    const [scanCount, setScanCount] = useState({});
    const [manualUserQR, setManualUserQR] = useState('');
    const [manualGunQR, setManualGunQR] = useState('');
    const [showManualForm, setShowManualForm] = useState(false);

    // Public Gun State
    const [publicGuns, setPublicGuns] = useState([]);
    const [newPublicGun, setNewPublicGun] = useState('');
    const [publicGunStatus, setPublicGunStatus] = useState('');
    const [showAddPublicGunForm, setShowAddPublicGunForm] = useState(false);

    // Fetch public guns
    useEffect(() => {
        fetchPublicGuns();
    }, []);

    const fetchPublicGuns = async () => {
        try {
            const res = await fetch(`${apiUrl}/api/public-gun`);
            const data = await res.json();
            setPublicGuns(data);
        } catch {
            setPublicGunStatus('ไม่สามารถโหลดข้อมูลปืนสาธารณะ');
        }
    };

    // Add public gun
    const handleAddPublicGun = async (e) => {
        e.preventDefault();
        if (!newPublicGun) return;
        try {
            const res = await fetch(`${apiUrl}/api/public-gun`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gunQRCode: newPublicGun }),
            });
            if (res.ok) {
                setNewPublicGun('');
                setPublicGunStatus('เพิ่มปืนสำเร็จ');
                fetchPublicGuns();
            } else {
                setPublicGunStatus('เพิ่มปืนไม่สำเร็จ');
            }
        } catch {
            setPublicGunStatus('เกิดข้อผิดพลาด');
        }
    };

    // Delete public gun
    const handleDeletePublicGun = async (gunQRCode) => {
        if (!window.confirm(`ลบปืน ${gunQRCode} ?`)) return;
        try {
            const res = await fetch(`${apiUrl}/api/public-gun`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ gunQRCode }),
            });
            if (res.ok) {
                setPublicGunStatus('ลบปืนสำเร็จ');
                fetchPublicGuns();
            } else {
                setPublicGunStatus('ลบปืนไม่สำเร็จ');
            }
        } catch {
            setPublicGunStatus('เกิดข้อผิดพลาด');
        }
    };

    // รายการเบิก (เฉพาะการสแกนครั้งแรกของแต่ละ user+gun)
    const getBorrowedList = () => {
        const seen = new Set();
        return successfulBorrows.filter(borrow => {
            const key = `${borrow.userQRCode}_${borrow.gunQRCode}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    // รายการคืน (เฉพาะการสแกนครั้งที่สองของแต่ละ user+gun)
    const getReturnedList = () => {
        const seen = new Set();
        return usersWithTwoScans.filter(user => {
            const key = `${user.userQRCode}_${user.gunQRCode}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    // รายการที่ยังไม่คืน (มีเฉพาะการสแกนครั้งแรก แต่ไม่มีในคืน)
    const getNotReturned = () => {
        const returnedSet = new Set(
            usersWithTwoScans.map(u => `${u.userQRCode}_${u.gunQRCode}`)
        );
        const seen = new Set();
        return successfulBorrows.filter(borrow => {
            const key = `${borrow.userQRCode}_${borrow.gunQRCode}`;
            if (returnedSet.has(key) || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    };

    // ฟอร์มกรอกแทนการสแกน
    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualUserQR && manualGunQR) {
            setUserQRCode(manualUserQR);
            setGunQRCode(manualGunQR);
            setStatusMessage('กรอกข้อมูล QR Code สำเร็จ');

            // Logic นับจำนวนการกรอกเหมือนกับการสแกน
            const userKey = manualUserQR;
            const gunKey = manualGunQR;
            if (userKey && gunKey) {
                const pairKey = `${userKey}_${gunKey}`;
                setScanCount(prev => {
                    const newCount = (prev[pairKey] || 0) + 1;
                    if (newCount === 2) {
                        fetchUserDetails(userKey, gunKey);
                    }
                    return { ...prev, [pairKey]: newCount };
                });
            }

            setManualUserQR('');
            setManualGunQR('');
        } else {
            setStatusMessage('กรุณากรอกข้อมูลให้ครบ');
        }
    };

    // สแกน QR
    const handleQRCodeScan = (decodedText, isUserQR) => {
        if (isUserQR && !userQRCode) {
            setUserQRCode(decodedText);
            setStatusMessage('User QR Code Scanned');
        } else if (!isUserQR && !gunQRCode) {
            setGunQRCode(decodedText);
            setStatusMessage('Gun QR Code Scanned');
        }

        // นับจำนวนสแกนของคู่ user+gun
        const userKey = isUserQR ? decodedText : userQRCode;
        const gunKey = !isUserQR ? decodedText : gunQRCode;
        if (userKey && gunKey) {
            const pairKey = `${userKey}_${gunKey}`;
            setScanCount(prev => {
                const newCount = (prev[pairKey] || 0) + 1;
                if (newCount === 2) {
                    fetchUserDetails(userKey, gunKey);
                }
                return { ...prev, [pairKey]: newCount };
            });
        }
    };

    // ดึงข้อมูล user
    const fetchUserDetails = async (userQRCode, gunQRCode) => {
        try {
            const response = await fetch(`${apiUrl}/api/get-user-details?userQRCode=${userQRCode}`);
            const data = await response.json();
            if (data.success) {
                const { realname } = data;
                const currentTime = new Date().toLocaleString();
                setUsersWithTwoScans(prevUsers => {
                    if (!prevUsers.some(user => user.userQRCode === userQRCode && user.gunQRCode === gunQRCode)) {
                        return [...prevUsers, { userQRCode, gunQRCode, realname, time: currentTime }];
                    }
                    return prevUsers;
                });
            } else {
                setStatusMessage('Error: Unable to fetch user details');
            }
        } catch (error) {
            setStatusMessage('Error: Failed to fetch user data');
        }
    };

    // เริ่มสแกน
    const startScanner = (isUserQR) => {
        const scannerId = isUserQR ? 'user-qr-reader' : 'gun-qr-reader';
        const qrCodeScanner = new Html5QrcodeScanner(scannerId, {
            fps: 30,
            qrbox: 350,
        });

        qrCodeScanner.render(
            (decodedText) => {
                handleQRCodeScan(decodedText, isUserQR);
                qrCodeScanner.clear();
            },
            (errorMessage) => {
                console.log('Scan failed:', errorMessage);
            }
        );
    };

    // สำหรับเบิกอาวุธ (สแกนครั้งแรก)
    const handleSubmit = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/check-gun-borrowing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userQRCode, gunQRCode }),
            });
            const data = await response.json();
            if (data.success) {
                setStatusMessage('Gun Borrowing Successful');
                const realname = data.realname;
                const newBorrowRecord = {
                    realname,
                    userQRCode,
                    gunQRCode,
                    time: new Date().toLocaleString(),
                };
                setSuccessfulBorrows((prev) => {
                    const isDuplicate = prev.some(record =>
                        record.userQRCode === newBorrowRecord.userQRCode &&
                        record.gunQRCode === newBorrowRecord.gunQRCode
                    );
                    if (isDuplicate) {
                        return prev;
                    } else {
                        return [...prev, newBorrowRecord];
                    }
                });
            } else {
                setStatusMessage('QR Codes do not match');
            }
        } catch (error) {
            setStatusMessage('Error: Unable to process request');
        }
    };

    // เรียก handleSubmit เมื่อสแกน user และ gun ครั้งแรกครบ
    useEffect(() => {
        if (userQRCode && gunQRCode) {
            handleSubmit();
        }
        // eslint-disable-next-line
    }, [userQRCode, gunQRCode]);

    // รีเซ็ตการสแกน
    const resetScanner = () => {
        setUserQRCode('');
        setGunQRCode('');
        setStatusMessage('');
    };

    // ปุ่มพิมพ์รายงาน (เฉพาะรายชื่อที่ยังไม่ได้คืน)
    const handlePrint = () => {
        const notReturned = getNotReturned();
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
            <html>
            <head>
                <title>Gun Borrowing Report</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 24px; }
                    table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
                    th, td { border: 1px solid #888; padding: 8px; text-align: left; }
                    th { background: #f0f0f0; }
                </style>
            </head>
            <body>
                <div><b>จำนวนการเบิก:</b> ${getBorrowedList().length}</div>
                <div><b>จำนวนการคืน:</b> ${getReturnedList().length}</div>
                <h3 style="margin-top:24px;">รายชื่อที่ยังไม่ได้คืน</h3>
                <table>
                    <thead>
                        <tr>
                            <th>User Name</th>
                            <th>Gun QR Code</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${notReturned.length === 0
                            ? `<tr><td colspan="3" style="text-align:center;">-</td></tr>`
                            : notReturned.map(user => `
                                <tr>
                                    <td>${user.realname}</td>
                                    <td>${user.gunQRCode}</td>
                                    <td>${user.time}</td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <div className="gun-borrowing-bg">
            <div className="gun-borrowing-main">
                <h1>Gun Borrowing</h1>
                <div style={{ marginBottom: 24 }}>
                    {/* สแกน User QR */}
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontWeight: 500, color: "#1976d2" }}>User QR Code</label>
                        <div id="user-qr-reader" style={{ width: '100%', margin: "8px 0" }}></div>
                        <button onClick={() => startScanner(true)}>
                            Scan User QR Code
                        </button>
                        <div style={{ marginTop: 8, color: "#333" }}>
                            <b>Scanned:</b> {userQRCode || <span style={{ color: "#aaa" }}>None</span>}
                        </div>
                    </div>
                    {/* สแกน Gun QR */}
                    <div style={{ marginBottom: 12 }}>
                        <label style={{ fontWeight: 500, color: "#1976d2" }}>Gun QR Code</label>
                        <div id="gun-qr-reader" style={{ width: '100%', margin: "8px 0" }}></div>
                        <button onClick={() => startScanner(false)}>
                            Scan Gun QR Code
                        </button>
                        <div style={{ marginTop: 8, color: "#333" }}>
                            <b>Scanned:</b> {gunQRCode || <span style={{ color: "#aaa" }}>None</span>}
                        </div>
                    </div>
                    <button onClick={resetScanner}>
                        Repeat Scanning
                    </button>

                    {/* ปุ่มแสดงฟอร์มกรอก */}
                    <button
                        type="button"
                        className="gun-borrowing-print-btn"
                        style={{
                            width: "100%",
                            marginTop: 16,
                            marginBottom: showManualForm ? 0 : 16
                        }}
                        onClick={() => setShowManualForm(v => !v)}
                    >
                        {showManualForm ? "ปิดฟอร์มกรอกข้อมูล" : "กรอกข้อมูลด้วยตนเอง"}
                    </button>

                    {/* --- ฟอร์มกรอกแทนการสแกน --- */}
                    {showManualForm && (
                        <form onSubmit={handleManualSubmit} style={{ margin: "16px 0 0 0", background: "#f7fafd", borderRadius: 10, padding: 16 }}>
                            <div style={{ marginBottom: 10, color: "#1976d2", fontWeight: 500 }}>
                                หรือ <span style={{ color: "#1976d2", fontWeight: 700 }}>กรอกข้อมูล</span> ด้วยตนเอง
                            </div>
                            <input
                                type="text"
                                placeholder="User ID"
                                value={manualUserQR}
                                onChange={e => setManualUserQR(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: 8,
                                    border: "1px solid #d1d9e6",
                                    marginBottom: 10,
                                    fontSize: "1rem",
                                    boxSizing: "border-box"
                                }}
                            />
                            <input
                                type="text"
                                placeholder="Gun Number"
                                value={manualGunQR}
                                onChange={e => setManualGunQR(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: 8,
                                    border: "1px solid #d1d9e6",
                                    marginBottom: 10,
                                    fontSize: "1rem",
                                    boxSizing: "border-box"
                                }}
                            />
                            <button
                                type="submit"
                                className="gun-borrowing-print-btn"
                                style={{
                                    width: "100%",
                                    marginTop: 8
                                }}
                            >
                                ยืนยันข้อมูล
                            </button>
                        </form>
                    )}

                    {statusMessage && (
                        <div className={`gun-borrowing-status ${statusMessage.includes('Successful') ? 'success' : 'error'}`}>
                            {statusMessage}
                        </div>
                    )}
                </div>

                {/* --- ส่วนจัดการปืนสาธารณะ --- */}
                <div style={{ background: "#f7fafd", borderRadius: 10, padding: 16, margin: "24px 0" }}>
                    <h2 style={{ color: "#1976d2", fontSize: "1.1rem", marginBottom: 8 }}>ปืนสาธารณะ (Public Gun)</h2>
                    
                    <button
                        type="button"
                        className="gun-borrowing-print-btn"
                        style={{ width: "100%", marginBottom: showAddPublicGunForm ? 0 : 16 }}
                        onClick={() => setShowAddPublicGunForm(v => !v)}
                    >
                        {showAddPublicGunForm ? "ปิดฟอร์มเพิ่มปืน" : "เพิ่มปืนสาธารณะ"}
                    </button>

                    {showAddPublicGunForm && (
                        <form onSubmit={handleAddPublicGun} style={{ display: "flex", gap: 8, margin: "16px 0 12px 0" }}>
                            <input
                                type="text"
                                placeholder="Gun QR Code"
                                value={newPublicGun}
                                onChange={e => setNewPublicGun(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: "8px",
                                    borderRadius: 6,
                                    border: "1px solid #d1d9e6",
                                    fontSize: "1rem"
                                }}
                            />
                            <button type="submit" className="gun-borrowing-print-btn" style={{ minWidth: 90 }}>
                                เพิ่ม
                            </button>
                        </form>
                    )}

                    {publicGunStatus && (
                        <div style={{ color: "#1976d2", marginBottom: 8 }}>{publicGunStatus}</div>
                    )}
                    <div style={{ maxHeight: 120, overflowY: "auto" }}>
                        <table style={{ width: "100%", fontSize: "1rem" }}>
                            <thead>
                                <tr>
                                    <th style={{ width: "70%" }}>Gun QR Code</th>
                                    <th style={{ width: "30%" }}>ลบ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {publicGuns.length === 0 ? (
                                    <tr>
                                        <td colSpan={2} style={{ color: "#888", textAlign: "center" }}>ไม่มีข้อมูล</td>
                                    </tr>
                                ) : (
                                    publicGuns.map(gun => (
                                        <tr key={gun.gunQRCode}>
                                            <td>{gun.gunQRCode}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    style={{
                                                        background: "#e53935",
                                                        color: "#fff",
                                                        border: "none",
                                                        borderRadius: 6,
                                                        padding: "4px 12px",
                                                        cursor: "pointer"
                                                    }}
                                                    onClick={() => handleDeletePublicGun(gun.gunQRCode)}
                                                >
                                                    ลบ
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* --- จบส่วนจัดการปืนสาธารณะ --- */}
                        {/* ปุ่มพิมพ์รายงานอยู่ตรงกลาง */}
            <div
                className="gun-borrowing-print-row"
                style={{
                    display: "flex",
                    justifyContent: "center",
                    maxWidth: 1200,
                    margin: "0 auto 16px auto"
                }}
            >
                <button className="gun-borrowing-print-btn" onClick={handlePrint}>
                    พิมพ์รายงาน
                </button>
            </div>
            </div>
            {/* --- รายการเบิก/คืน/ยังไม่คืน --- */}
            <div className="gun-borrowing-list-row">
                <div className="gun-borrowing-list-card">
                    <h2 style={{ color: "#2563eb" }}>รายการเบิกอาวุธ</h2>
                    <p>จำนวนการเบิก: <b>{getBorrowedList().length}</b></p>
                    {getBorrowedList().length === 0 ? (
                        <p className="text-center mt-4" style={{ color: "#888" }}>No borrow records available</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>User Name</th>
                                    <th>Gun QR Code</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getBorrowedList().map((record, index) => (
                                    <tr key={index}>
                                        <td>{record.realname}</td>
                                        <td>{record.gunQRCode}</td>
                                        <td>{record.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="gun-borrowing-list-card">
                    <h2 style={{ color: "#2563eb" }}>รายการส่งคืนอาวุธ</h2>
                    <p>จำนวนการส่งคืน: <b>{getReturnedList().length}</b></p>
                    {getReturnedList().length === 0 ? (
                        <p className="text-center mt-4" style={{ color: "#888" }}>No users scanned both QR codes twice</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>User Name</th>
                                    <th>Gun QR Code</th>
                                    <th>Time</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getReturnedList().map((user, index) => (
                                    <tr key={index}>
                                        <td>{user.realname}</td>
                                        <td>{user.gunQRCode}</td>
                                        <td>{user.time}</td>
                                        <td style={{ color: "#388e3c", fontWeight: 600 }}>✅</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                <div className="gun-borrowing-list-card">
                    <h2 style={{ color: "#2563eb" }}>รายชื่อที่ยังไม่ได้คืน</h2>
                    <p>จำนวน: <b>{getNotReturned().length}</b></p>
                    {getNotReturned().length === 0 ? (
                        <p className="text-center mt-4" style={{ color: "#888" }}>ไม่มีข้อมูล</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>User Name</th>
                                    <th>Gun QR Code</th>
                                    <th>Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getNotReturned().map((user, index) => (
                                    <tr key={index}>
                                        <td>{user.realname}</td>
                                        <td>{user.gunQRCode}</td>
                                        <td>{user.time}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}