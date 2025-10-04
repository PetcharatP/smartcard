import React, { useState, useEffect, useRef } from 'react';
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
    const scannerRef = useRef(null);
    const scannerContainerRef = useRef(null);

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

    // Mobile optimization state
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isScanning, setIsScanning] = useState(false);

    // Detect mobile changes
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // เริ่มต้น QR Scanner
    useEffect(() => {
        setScannerReady(true);
        return () => {
            // Cleanup scanner เมื่อ component unmount
            if (scannerRef.current) {
                try {
                    scannerRef.current.clear().catch(console.error);
                } catch (error) {
                    console.error('Error cleaning up scanner:', error);
                }
                scannerRef.current = null;
            }
            if (scannerContainerRef.current) {
                scannerContainerRef.current.innerHTML = '';
            }
        };
    }, []);

    // Effect สำหรับปิดกล้องเมื่อพบข้อมูลผู้ใช้ (ปิดเพื่อแก้ปัญหา)
    // useEffect(() => {
    //     if (userData && scannerInstance) {
    //         console.log('User data detected, forcing camera stop...');
    //         setTimeout(() => {
    //             stopCamera();
    //         }, 100);
    //     }
    // }, [userData, scannerInstance]);

    // จัดการการสแกน QR Code
    const handleQRCodeScan = async (decodedText) => {
        console.log('Scanned QR Code:', decodedText);
        
        if (userQRCode === decodedText) {
            // QR Code เดิม ไม่ต้องประมวลผลใหม่
            return;
        }

        // หยุดกล้องทันทีเพื่อป้องกัน DOM conflict
        await stopCamera();

        setUserQRCode(decodedText);
        setStatusMessage(`🔍 กำลังค้นหาข้อมูลผู้ใช้จากรหัส QR: ${decodedText}`);
        
        await fetchUserData(decodedText);
    };

    // หยุดสแกน
    const stopCamera = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.clear();
                console.log('Scanner cleared successfully');
            } catch (error) {
                console.error('Error clearing scanner:', error);
            }
            scannerRef.current = null;
        }
        
        if (scannerContainerRef.current) {
            // Force clear the container
            scannerContainerRef.current.innerHTML = '';
        }
        
        setScannerInstance(null);
        setIsScanning(false);
    };

    // ดึงข้อมูลผู้ใช้จาก API
    const fetchUserData = async (searchTerm) => {
        setIsLoading(true);
        console.log('Frontend: Searching for:', searchTerm);
        
        try {
            // ตรวจสอบว่าเป็นตัวเลขหรือไม่ (User ID) หรือเป็นชื่อ
            const isNumeric = /^\d+$/.test(searchTerm.trim());
            const queryParam = isNumeric ? 'userQRCode' : 'userName';
            const apiUrl = `/api/get-user-details?${queryParam}=${encodeURIComponent(searchTerm)}`;
            
            console.log('Frontend: API URL:', apiUrl);
            console.log('Frontend: Search type:', isNumeric ? 'User ID' : 'User Name');
            
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            console.log('Frontend: API Response:', data);
            
            if (data.success) {
                // ใช้ setTimeout เพื่อให้ React update state หลังจาก DOM เสถียร
                setTimeout(() => {
                    setUserData({
                        userid: data.userid || searchTerm,
                        realname: data.realname,
                        gunNumber: data.gunNumber || 'N/A',
                        ...data // เผื่อมีข้อมูลเพิ่มเติม
                    });
                    
                    setShowManualInput(false); // ซ่อนฟอร์มกรอกข้อมูลด้วยตนเอง
                    
                    const searchType = isNumeric ? 'รหัสประจำตัว' : 'ชื่อผู้ใช้';
                    setStatusMessage(`✅ พบข้อมูลผู้ใช้จาก${searchType}: ${data.realname}`);
                    
                    console.log('Found user data successfully');
                }, 100);
                
            } else {
                setUserData(null);
                const searchType = isNumeric ? 'รหัสประจำตัว' : 'ชื่อผู้ใช้';
                const errorMsg = data.message || `ไม่พบข้อมูลผู้ใช้จาก${searchType}: ${searchTerm}`;
                setStatusMessage(`❌ ${errorMsg}`);
                console.log('Frontend: User not found:', errorMsg);
            }
        } catch (error) {
            console.error('Frontend: Error fetching user data:', error);
            setUserData(null);
            setStatusMessage(`❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // จัดการการกรอกข้อมูลด้วยตนเอง
    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualInput.trim()) {
            const searchTerm = manualInput.trim();
            setUserQRCode(searchTerm);
            
            // แสดงข้อความสถานะที่เหมาะสม
            const isNumeric = /^\d+$/.test(searchTerm);
            const searchType = isNumeric ? 'รหัสประจำตัว' : 'ชื่อผู้ใช้';
            setStatusMessage(`🔍 กำลังค้นหาข้อมูลจาก${searchType}: ${searchTerm}`);
            
            fetchUserData(searchTerm);
            setShowManualInput(false);
        }
    };

    // เริ่มสแกน - ใช้ ref เพื่อป้องกัน React DOM conflict
    const startCamera = async () => {
        // ถ้ากำลัง scan อยู่แล้ว ให้หยุด
        if (isScanning && scannerRef.current) {
            await stopCamera();
            return;
        }
        
        if (!scannerContainerRef.current) {
            console.error('Scanner container ref not available');
            return;
        }
        
        // ล้าง container ก่อน
        scannerContainerRef.current.innerHTML = '';
        
        // ตรวจสอบ browser support ก่อน
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setStatusMessage('เบราว์เซอร์ไม่รองรับการใช้กล้อง');
            return;
        }

        // ขอ permission กล้องก่อน
        try {
            await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment' // บังคับใช้กล้องหลังใน Android
                } 
            });
        } catch (error) {
            console.error('Camera permission error:', error);
            setStatusMessage('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้อง');
            return;
        }

        // Mobile-optimized scanner configuration
        const scannerConfig = {
            fps: isMobile ? 5 : 10,
            qrbox: isMobile 
                ? { width: Math.min(300, window.innerWidth - 40), height: Math.min(300, window.innerWidth - 40) }
                : { width: 250, height: 250 },
            aspectRatio: 1.0,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            videoConstraints: {
                facingMode: 'environment',
                width: isMobile ? { ideal: 640 } : { ideal: 1280 },
                height: isMobile ? { ideal: 480 } : { ideal: 720 }
            }
        };

        try {
            // สร้าง unique ID สำหรับ scanner instance นี้
            const uniqueId = `scanner-${Date.now()}`;
            scannerContainerRef.current.id = uniqueId;
            
            const qrCodeScanner = new Html5QrcodeScanner(uniqueId, scannerConfig);
            scannerRef.current = qrCodeScanner;
            setScannerInstance(qrCodeScanner);
            setIsScanning(true);

            qrCodeScanner.render(
                (decodedText) => {
                    // Haptic feedback for mobile
                    if (navigator.vibrate && isMobile) {
                        navigator.vibrate(200);
                    }
                    
                    console.log('QR Code scanned:', decodedText);
                    handleQRCodeScan(decodedText);
                },
                (errorMessage) => {
                    // Ignore common scanning errors
                    if (!errorMessage.includes("No QR code found") && !errorMessage.includes("QR code parse error")) {
                        console.log('Scan failed:', errorMessage);
                        if (errorMessage.includes('NotAllowedError')) {
                            setStatusMessage('ไม่ได้รับอนุญาตให้ใช้กล้อง');
                        } else if (errorMessage.includes('NotFoundError')) {
                            setStatusMessage('ไม่พบกล้อง');
                        } else if (errorMessage.includes('NotReadableError')) {
                            setStatusMessage('กล้องถูกใช้งานโดยแอปอื่น');
                        }
                    }
                }
            );
        } catch (error) {
            console.error('Error starting scanner:', error);
            setStatusMessage('เกิดข้อผิดพลาดในการเริ่มกล้อง');
            setIsScanning(false);
        }
    };

    // รีเซ็ตข้อมูล
    const resetData = async () => {
        console.log('Resetting data...');
        
        // รีเซ็ต state
        setUserQRCode('');
        setUserData(null);
        setStatusMessage('');
        setManualInput('');
        setShowManualInput(false);
        setIsLoading(false);
        
        // หยุดกล้องก่อน
        await stopCamera();
        
        // เริ่มกล้องใหม่หลังจากหยุด
        setTimeout(() => {
            if (scannerReady && !showManualInput) {
                startCamera();
            }
        }, 300);
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
                                placeholder="กรอก User ID หรือชื่อผู้ใช้"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                className="manual-input"
                                autoFocus
                            />
                            <button type="submit" className="search-btn">
                                🔍 ค้นหา
                            </button>
                        </form>
                        <div className="search-hint">
                            💡 สามารถค้นหาด้วย User ID (รหัสประจำตัว) หรือชื่อ-นามสกุลได้
                        </div>
                    </div>
                ) : (
                    <div className="qr-scanner-wrapper">
                        <div 
                            ref={scannerContainerRef}
                            id="user-qr-reader" 
                            className="qr-reader"
                            style={{ minHeight: isScanning ? '300px' : '50px' }}
                        ></div>
                        <button 
                            onClick={() => startCamera()}
                            className="qr-scan-btn"
                            disabled={isLoading}
                            style={{
                                background: isLoading ? '#f3f4f6' : isScanning ? '#dc2626' : '#3b82f6',
                                color: isLoading ? '#9ca3af' : 'white',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                padding: '12px 24px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                fontSize: '16px',
                                fontWeight: '500',
                                width: '100%',
                                margin: '8px 0'
                            }}
                        >
                            {isLoading 
                                ? "🔄 กำลังเปิดกล้อง..." 
                                : isScanning 
                                    ? "🛑 หยุดสแกน QR Code" 
                                    : "📷 เปิดกล้องสแกน QR Code"
                            }
                        </button>
                        <div className="qr-help-text">
                            💡 {isMobile 
                                ? isScanning 
                                    ? "📱 กล้องเปิดแล้ว - สแกน QR Code ของผู้ใช้" 
                                    : "หมุนโทรศัพท์เป็นแนวตั้ง แล้วกดเปิดกล้องเพื่อสแกน"
                                : isScanning 
                                    ? "🎥 กล้องเปิดแล้ว - สแกน QR Code ของผู้ใช้ได้เลย"
                                    : "กดปุ่มเพื่อเปิดกล้องสแกน QR Code ของผู้ใช้"
                            }
                        </div>
                        
                        {/* ปุ่มปิดกล้องเมื่อพบข้อมูลแล้ว */}
                        {userData && isScanning && (
                            <button 
                                onClick={() => stopCamera()}
                                style={{
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '10px 20px',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    width: '100%',
                                    marginTop: '10px'
                                }}
                            >
                                ✅ ปิดกล้อง (พบข้อมูลแล้ว)
                            </button>
                        )}
                    </div>
                )}
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