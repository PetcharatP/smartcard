import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import './UserScanner.css';

export default function UserScanner() {
    const navigate = useNavigate();
    const [userQRCode, setUserQRCode] = useState('');
    const [userData, setUserData] = useState(null);
    const [statusMessage, setStatusMessage] = useState('');
    const [scannerInstance, setScannerInstance] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showManualInput, setShowManualInput] = useState(false);
    const [manualInput, setManualInput] = useState('');
    const [scannerReady, setScannerReady] = useState(false);

    // Helper function สำหรับแปลงชื่อสาขา
    const getMajorName = (majorCode) => {
        const majorMap = {
            "ME": "วิศวกรรมเครื่องกล",
            "EE": "วิศวกรรมไฟฟ้าสื่อสาร",
            "CYBER": "ความมั่นคงปลอดภัยทางไซเบอร์",
            "SCIEN": "วิทยาศาสตร์และเทคโนโลยี (EN)",
            "CE": "วิศวกรรมโยธา",
            "GEO": "วิศวกรรมแผนที่",
            "IE": "วิศวกรรมอุตสาหการ",
            "SCI": "วิทยาศาสตร์และเทคโนโลยี",
            "SOC": "สังคมศาสตร์เพื่อการพัฒนา"
        };
        return majorMap[majorCode] || majorCode;
    };

    // เริ่มต้น QR Scanner
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "user-qr-reader",
            {
                fps: 10,
                qrbox: { width: 280, height: 280 },
                aspectRatio: 1.0,
                supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                showTorchButtonIfSupported: true,
                showZoomSliderIfSupported: true
            },
            false
        );

        scanner.render(
            (decodedText) => handleQRCodeScan(decodedText),
            (error) => {
                // Ignore scanning errors (they happen continuously)
                if (!error.includes("No QR code found")) {
                    console.warn("QR Code scanning error:", error);
                }
            }
        );

        setScannerInstance(scanner);
        setScannerReady(true);

        return () => {
            if (scanner) {
                scanner.clear().catch(console.error);
            }
        };
    }, []);

    // Effect สำหรับปิดกล้องเมื่อพบข้อมูลผู้ใช้
    useEffect(() => {
        if (userData && scannerInstance) {
            console.log('User data detected, forcing camera stop...');
            setTimeout(() => {
                stopCamera();
            }, 100);
        }
    }, [userData, scannerInstance]);

    // จัดการการสแกน QR Code
    const handleQRCodeScan = async (decodedText) => {
        console.log('Scanned QR Code:', decodedText);
        
        if (userQRCode === decodedText) {
            // QR Code เดิม ไม่ต้องประมวลผลใหม่
            return;
        }

        setUserQRCode(decodedText);
        setStatusMessage(`🔍 กำลังค้นหาข้อมูลผู้ใช้: ${decodedText}`);
        
        await fetchUserData(decodedText);
    };

    // ปิดกล้อง Scanner
    const stopCamera = () => {
        console.log('Stopping camera...', { scannerInstance: !!scannerInstance });
        
        // บังคับหยุด video streams ทั้งหมดก่อน
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
                stream.getTracks().forEach(track => {
                    track.stop();
                    console.log('Stopped video track:', track);
                });
            }).catch(() => {
                // Ignore errors
            });
        }
        
        if (scannerInstance) {
            try {
                // บังคับปิด scanner ทันที
                scannerInstance.clear().then(() => {
                    console.log('Camera cleared successfully');
                }).catch((error) => {
                    console.error('Error clearing camera:', error);
                });
                
                // ตั้งค่า instance เป็น null ทันทีไม่ต้องรอ
                setScannerInstance(null);
                console.log('Scanner instance set to null');
                
            } catch (error) {
                console.error('Error stopping camera:', error);
                setScannerInstance(null); // บังคับให้เป็น null ถึงแม้จะมี error
            }
        }
        
        // ลบ DOM element ของ scanner แบบ force
        setTimeout(() => {
            const scannerElement = document.getElementById('user-qr-reader');
            if (scannerElement) {
                scannerElement.innerHTML = '';
                console.log('Cleared scanner DOM element');
            }
        }, 50);
        
        console.log('Camera stop process completed');
    };

    // ดึงข้อมูลผู้ใช้จาก API
    const fetchUserData = async (qrCode) => {
        setIsLoading(true);
        try {
            const response = await fetch(`/api/get-user-details?userQRCode=${encodeURIComponent(qrCode)}`);
            const data = await response.json();
            
            if (data.success) {
                setUserData({
                    userid: qrCode,
                    realname: data.realname,
                    gunNumber: data.gunNumber || 'N/A',
                    ...data // เผื่อมีข้อมูลเพิ่มเติม
                });
                
                // ปิดกล้องอัตโนมัติเมื่อพบข้อมูลสำเร็จ
                console.log('Found user data, stopping camera...');
                
                // บังคับปิดกล้องทันที
                setTimeout(() => {
                    stopCamera();
                    setShowManualInput(false); // ซ่อนฟอร์มกรอกข้อมูลด้วยตนเอง
                    
                    // Force re-render หลังจากปิดกล้อง
                    setTimeout(() => {
                        setStatusMessage(`✅ พบข้อมูลผู้ใช้: ${data.realname} - กล้องถูกปิดแล้ว`);
                    }, 200);
                }, 10);
                
            } else {
                setUserData(null);
                setStatusMessage(`❌ ไม่พบข้อมูลผู้ใช้: ${qrCode}`);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            setUserData(null);
            setStatusMessage('❌ เกิดข้อผิดพลาดในการเชื่อมต่อ');
        } finally {
            setIsLoading(false);
        }
    };

    // จัดการการกรอกข้อมูลด้วยตนเอง
    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualInput.trim()) {
            setUserQRCode(manualInput.trim());
            fetchUserData(manualInput.trim());
            setShowManualInput(false);
        }
    };

    // เริ่มกล้อง Scanner ใหม่
    const startCamera = () => {
        if (!scannerInstance) {
            const scanner = new Html5QrcodeScanner(
                "user-qr-reader",
                {
                    fps: 10,
                    qrbox: { width: 280, height: 280 },
                    aspectRatio: 1.0,
                    supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
                    showTorchButtonIfSupported: true,
                    showZoomSliderIfSupported: true
                },
                false
            );

            scanner.render(
                (decodedText) => handleQRCodeScan(decodedText),
                (error) => {
                    // Ignore scanning errors (they happen continuously)
                    if (!error.includes("No QR code found")) {
                        console.warn("QR Code scanning error:", error);
                    }
                }
            );

            setScannerInstance(scanner);
        }
    };

    // รีเซ็ตข้อมูล
    const resetData = () => {
        setUserQRCode('');
        setUserData(null);
        setStatusMessage('');
        setManualInput('');
        setShowManualInput(false);
        
        // เริ่มกล้องใหม่หากยังไม่มี
        if (!scannerInstance && scannerReady) {
            setTimeout(() => {
                startCamera();
            }, 100);
        }
    };

    // ไปหน้าตัดคะแนนพร้อม User ID
    const goToDeductPoint = () => {
        if (userData && userData.userid) {
            // ส่ง User ID เป็น query parameter
            navigate(`/DeductPoint?userId=${encodeURIComponent(userData.userid)}&userName=${encodeURIComponent(userData.realname)}`);
        }
    };

    return (
        <div className="user-scanner-container">
            <div className="user-scanner-header">
                <h1>🔍 ค้นหาข้อมูลผู้ใช้</h1>
                <p>สแกน QR Code หรือกรอก User ID เพื่อดูข้อมูลผู้ใช้</p>
            </div>

            <div className="scanner-section">
                <div className="scanner-controls">
                    <button 
                        type="button" 
                        className="toggle-manual-btn"
                        onClick={() => setShowManualInput(!showManualInput)}
                    >
                        {showManualInput ? '📱 กลับไปสแกน QR' : '⌨️ กรอกข้อมูลเอง'}
                    </button>
                    
                    <button 
                        type="button" 
                        className="reset-btn"
                        onClick={resetData}
                    >
                        🔄 รีเซ็ต
                    </button>
                </div>

                {showManualInput ? (
                    <div className="manual-input-section">
                        <form onSubmit={handleManualSubmit} className="manual-form">
                            <input
                                type="text"
                                placeholder="กรอก User ID"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                className="manual-input"
                                autoFocus
                            />
                            <button type="submit" className="search-btn">
                                🔍 ค้นหา
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="qr-scanner-wrapper">
                        {scannerInstance ? (
                            <div id="user-qr-reader" className="qr-reader"></div>
                        ) : scannerReady ? (
                            <div className="camera-stopped">
                                <div className="camera-stopped-message">
                                    📷 กล้องถูกปิดแล้ว
                                    <p>กดปุ่มด้านล่างเพื่อเริ่มสแกนคนใหม่</p>
                                </div>
                                <button 
                                    type="button" 
                                    className="start-camera-btn"
                                    onClick={() => {
                                        console.log('Starting camera...');
                                        startCamera();
                                    }}
                                >
                                    🎥 เริ่มกล้องใหม่
                                </button>
                            </div>
                        ) : (
                            <div className="camera-loading">
                                <div className="camera-loading-message">
                                    📷 กำลังเริ่มต้นกล้อง...
                                    <p>กรุณารอสักครู่</p>
                                </div>
                            </div>
                        )}
                        <div id="user-qr-reader" className="qr-reader"></div>
                    </div>
                )}
            </div>

            {/* Debug Info - ชั่วคราว */}
            <div style={{background: '#f3f4f6', padding: '10px', borderRadius: '8px', margin: '10px 0', fontSize: '12px'}}>
                <strong>Debug Info:</strong><br/>
                Scanner Instance: {scannerInstance ? '✅ Active' : '❌ Inactive'}<br/>
                Scanner Ready: {scannerReady ? '✅ Ready' : '❌ Not Ready'}<br/>
                Show Manual Input: {showManualInput ? '✅ Yes' : '❌ No'}<br/>
                User Data: {userData ? `✅ Loaded (${userData.realname})` : '❌ No Data'}<br/>
                Should Show Button: {(!scannerInstance && scannerReady && !showManualInput) ? '✅ Yes' : '❌ No'}
            </div>

            {/* Status Message */}
            {statusMessage && (
                <div className={`status-message ${isLoading ? 'loading' : ''}`}>
                    {isLoading && <div className="spinner"></div>}
                    {statusMessage}
                </div>
            )}


            {/* Current Scanned QR */}
            {userQRCode && (
                <div className="current-qr">
                    <strong>🎯 User ID ที่สแกน:</strong> 
                    <span className="qr-value">{userQRCode}</span>
                </div>
            )}

            {/* User Data Display */}
            {userData && (
                <div className="user-data-card">
                    <div className="user-data-header">
                        <h2>👤 ข้อมูลผู้ใช้</h2>
                    </div>
                    
                    <div className="user-data-content">
                        <div className="user-data-row">
                            <span className="label">🆔 User ID:</span>
                            <span className="value">{userData.userid}</span>
                        </div>
                        
                        <div className="user-data-row">
                            <span className="label">👨‍💼 ชื่อ-นามสกุล:</span>
                            <span className="value">{userData.realname}</span>
                        </div>
                        
                        <div className="user-data-row">
                            <span className="label">🔫 หมายเลขปืน:</span>
                            <span className="value gun-number">
                                {userData.gunNumber === 'N/A' || !userData.gunNumber ? 
                                    <span className="no-gun">ไม่มีปืนที่กำหนด</span> : 
                                    userData.gunNumber
                                }
                            </span>
                        </div>
                        
                        {/* ข้อมูลเพิ่มเติม */}
                        {userData.major && userData.major !== 'N/A' && (
                            <div className="user-data-row">
                                <span className="label">🎓 สาขา:</span>
                                <span className="value">{getMajorName(userData.major)}</span>
                            </div>
                        )}
                        
                        {userData.role && (
                            <div className="user-data-row">
                                <span className="label">👔 บทบาท:</span>
                                <span className="value role">
                                    {userData.role === 'student' && '🎓 นักเรียน'}
                                    {userData.role === 'teacher' && '👨‍🏫 ครู'}
                                    {userData.role === 'officer' && '👮‍♂️ เจ้าหน้าที่'}
                                    {userData.role === 'admin' && '👑 ผู้ดูแลระบบ'}
                                </span>
                            </div>
                        )}
                        
                        {userData.point !== undefined && (
                            <div className="user-data-row">
                                <span className="label">⭐ คะแนน:</span>
                                <span className="value points">{userData.point} คะแนน</span>
                            </div>
                        )}
                        
                        {userData.blood && userData.blood !== 'N/A' && (
                            <div className="user-data-row">
                                <span className="label">🩸 กรุ๊ปเลือด:</span>
                                <span className="value blood">{userData.blood}</span>
                            </div>
                        )}
                        
                        {userData.year && (
                            <div className="user-data-row">
                                <span className="label">📅 ชั้นปี:</span>
                                <span className="value">{userData.year}</span>
                            </div>
                        )}
                        
                        {/* ข้อมูลหน่วย */}
                        {(userData.battalion || userData.company || userData.platoon || userData.squad) && (
                            <div className="unit-info">
                                <h4>🏛️ ข้อมูลหน่วย</h4>
                                {userData.battalion && (
                                    <div className="user-data-row">
                                        <span className="label">🏢 กองพัน:</span>
                                        <span className="value">{userData.battalion}</span>
                                    </div>
                                )}
                                {userData.company && (
                                    <div className="user-data-row">
                                        <span className="label">🏫 กองร้อย:</span>
                                        <span className="value">{userData.company}</span>
                                    </div>
                                )}
                                {userData.platoon && (
                                    <div className="user-data-row">
                                        <span className="label">👥 หมู่:</span>
                                        <span className="value">{userData.platoon}</span>
                                    </div>
                                )}
                                {userData.squad && (
                                    <div className="user-data-row">
                                        <span className="label">🎯 หมวด:</span>
                                        <span className="value">{userData.squad}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="user-actions">
                        <button 
                            type="button" 
                            className="deduct-point-btn"
                            onClick={goToDeductPoint}
                            title="ตัดคะแนนผู้ใช้คนนี้"
                        >
                            ➜ ตัดคะแนนผู้ใช้คนนี้
                        </button>
                        
                        <button 
                            type="button" 
                            className="view-profile-btn"
                            onClick={() => navigate(`/view-profile?userId=${encodeURIComponent(userData.userid)}`)}
                            title="ดูโปรไฟล์ผู้ใช้คนนี้"
                        >
                            👤 ดูโปรไฟล์
                        </button>
                    </div>
                    
                    <div className="scan-time">
                        📅 สแกนเมื่อ: {new Date().toLocaleString('th-TH')}
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="instructions">
                <h3>📋 คำแนะนำการใช้งาน</h3>
                <ul>
                    <li>🎯 วางกล้องให้มองเห็น QR Code ของผู้ใช้ชัดเจน</li>
                    <li>� เมื่อสแกนสำเร็จ กล้องจะปิดอัตโนมัติเพื่อประหยัดแบตเตอรี่</li>
                    <li>🎥 กดปุ่ม "เริ่มกล้องใหม่" หากต้องการสแกนคนต่อไป</li>
                    <li>�💡 หากไม่สามารถสแกนได้ ให้กดปุ่ม "กรอกข้อมูลเอง"</li>
                    <li>🔄 กดปุ่ม "รีเซ็ต" เพื่อเริ่มค้นหาผู้ใช้คนใหม่</li>
                    <li>📱 หากใช้มือถือ อาจต้องอนุญาตการเข้าถึงกล้อง</li>
                </ul>
            </div>
        </div>
    );
}