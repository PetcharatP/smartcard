import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import './GunBorrowing.css';

export default function GunBorrowing() {
    const apiUrl = process.env.NODE_ENV === 'production' ? '' : (import.meta.env.VITE_API_URL || '');
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

    // Database Record State
    const [savedRecords, setSavedRecords] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
    const [showSaveButton, setShowSaveButton] = useState(false);

    // Enhanced error handling state
    const [isLoading, setIsLoading] = useState(false);
    const [networkError, setNetworkError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    // Mobile optimization state
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);

    // Detect mobile and orientation changes
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
            setIsLandscape(window.innerWidth > window.innerHeight);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Fetch public guns and records
    useEffect(() => {
        fetchPublicGuns();
        fetchTodayRecords();
    }, []);

    // Enhanced error handling with retry mechanism
    const apiCall = async (url, options, maxRetries = 3) => {
        setIsLoading(true);
        setNetworkError(false);
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, {
                    ...options,
                    timeout: 10000 // 10 second timeout
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                setIsLoading(false);
                setRetryCount(0);
                return { success: true, data };
                
            } catch (error) {
                console.error(`API call attempt ${attempt}:`, error);
                
                if (attempt === maxRetries) {
                    setIsLoading(false);
                    setNetworkError(true);
                    setRetryCount(attempt);
                    return { 
                        success: false, 
                        error: error.message,
                        isNetworkError: error.name === 'TypeError' || error.message.includes('fetch')
                    };
                }
                
                // Wait before retry (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
    };

    // Auto-save function - บันทึกทันทีเมื่อสแกนสำเร็จ
    const autoSave = async (userQRCode, gunQRCode, realname, action) => {
        const result = await apiCall(`/api/gun-borrowing-record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userQRCode,
                gunQRCode,
                realname,
                action
            }),
        });
        
        if (result.success) {
            console.log(`Auto-saved ${action} record:`, result.data);
            fetchTodayRecords(); // Refresh records
            setStatusMessage(`✅ ${action === 'borrow' ? 'เบิก' : 'คืน'}อาวุธและบันทึกข้อมูลสำเร็จ`);
            return true;
        } else {
            console.error('Auto-save failed:', result.error);
            if (result.data?.conflictType) {
                handleConflictError(result.data);
            } else {
                setStatusMessage(`❌ ไม่สามารถบันทึกข้อมูลได้: ${result.error}`);
            }
            return false;
        }
    };

    // Handle conflict errors with detailed messages
    const handleConflictError = (errorData) => {
        switch (errorData.conflictType) {
            case 'duplicate_borrow':
                setStatusMessage('⚠️ เบิกปืนนี้ไปแล้ววันนี้');
                break;
            case 'user_has_other_gun':
                setStatusMessage(`⚠️ คุณเบิกปืน ${errorData.existingRecord.gunQRCode} ไว้แล้ว`);
                break;
            case 'gun_borrowed_by_other':
                setStatusMessage(`⚠️ ปืนนี้ถูก ${errorData.existingRecord.realname} เบิกไว้แล้ว`);
                break;
            default:
                setStatusMessage('⚠️ ข้อมูลซ้ำซ้อน');
        }
    };

    const fetchPublicGuns = async () => {
        try {
            const res = await fetch(`/api/public-gun`);
            const data = await res.json();
            setPublicGuns(data);
        } catch {
            setPublicGunStatus('ไม่สามารถโหลดข้อมูลปืนสาธารณะ');
        }
    };

    // Fetch today's records from database
    const fetchTodayRecords = async () => {
        try {
            const res = await fetch(`/api/gun-borrowing-record?date=${currentDate}`);
            const data = await res.json();
            if (data.success) {
                setSavedRecords(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch records:', error);
        }
    };

    // Save borrow record to database
    const saveBorrowRecord = async (userQRCode, gunQRCode, realname) => {
        try {
            const res = await fetch(`/api/gun-borrowing-record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userQRCode,
                    gunQRCode,
                    realname,
                    action: 'borrow'
                }),
            });
            const data = await res.json();
            if (data.success) {
                console.log('Borrow record saved to database');
                fetchTodayRecords(); // Refresh records
            }
        } catch (error) {
            console.error('Failed to save borrow record:', error);
        }
    };

    // Save return record to database
    const saveReturnRecord = async (userQRCode, gunQRCode, realname) => {
        try {
            const res = await fetch(`/api/gun-borrowing-record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userQRCode,
                    gunQRCode,
                    realname,
                    action: 'return'
                }),
            });
            const data = await res.json();
            if (data.success) {
                console.log('Return record saved to database');
                fetchTodayRecords(); // Refresh records
            }
        } catch (error) {
            console.error('Failed to save return record:', error);
        }
    };

    // Save all current session data to database
    const saveAllRecords = async () => {
        try {
            // Save all borrow records
            const borrowPromises = getBorrowedList().map(record => 
                saveBorrowRecord(record.userQRCode, record.gunQRCode, record.realname)
            );
            
            // Save all return records
            const returnPromises = getReturnedList().map(record => 
                saveReturnRecord(record.userQRCode, record.gunQRCode, record.realname)
            );

            await Promise.all([...borrowPromises, ...returnPromises]);
            
            setStatusMessage('บันทึกข้อมูลทั้งหมดสำเร็จ');
            setShowSaveButton(false);
            fetchTodayRecords();
        } catch (error) {
            console.error('Failed to save all records:', error);
            setStatusMessage('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
    };

    // Load records from specific date
    const loadRecordsFromDate = async (selectedDate) => {
        try {
            const res = await fetch(`/api/gun-borrowing-record?date=${selectedDate}`);
            const data = await res.json();
            if (data.success) {
                setSavedRecords(data.data);
                setCurrentDate(selectedDate);
            }
        } catch (error) {
            console.error('Failed to load records:', error);
        }
    };

    // Delete single record
    const deleteSingleRecord = async (recordId) => {
        if (!window.confirm('ต้องการลบข้อมูลนี้หรือไม่?\n\n⚠️ การลบจะไม่สามารถกู้คืนได้')) return;
        
        try {
            const res = await fetch(`/api/gun-borrowing-record`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recordId }),
            });
            const data = await res.json();
            if (data.success) {
                setStatusMessage('✅ ลบข้อมูลสำเร็จ');
                loadRecordsFromDate(currentDate); // Refresh current date records
            } else {
                setStatusMessage('❌ ลบข้อมูลไม่สำเร็จ');
            }
        } catch (error) {
            console.error('Failed to delete record:', error);
            setStatusMessage('❌ เกิดข้อผิดพลาดในการลบข้อมูล');
        }
    };

    // Delete all records for current date
    const deleteAllRecords = async () => {
        const confirmMessage = `ต้องการลบข้อมูลทั้งหมดในวันที่ ${currentDate} หรือไม่?\n\n` +
                             `จำนวนข้อมูลที่จะถูกลบ: ${savedRecords.all.length} รายการ\n\n` +
                             `⚠️ การลบจะไม่สามารถกู้คืนได้`;
        
        if (!window.confirm(confirmMessage)) return;
        
        try {
            const res = await fetch(`/api/gun-borrowing-record`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: currentDate }),
            });
            const data = await res.json();
            if (data.success) {
                setStatusMessage(`✅ ลบข้อมูลทั้งหมดในวันที่ ${currentDate} สำเร็จ (${data.deletedCount || 0} รายการ)`);
                loadRecordsFromDate(currentDate); // Refresh current date records
            } else {
                setStatusMessage('❌ ลบข้อมูลไม่สำเร็จ');
            }
        } catch (error) {
            console.error('Failed to delete all records:', error);
            setStatusMessage('❌ เกิดข้อผิดพลาดในการลบข้อมูล');
        }
    };

    // Add public gun
    const handleAddPublicGun = async (e) => {
        e.preventDefault();
        if (!newPublicGun) return;
        try {
            const res = await fetch(`/api/public-gun`, {
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
            const res = await fetch(`/api/public-gun`, {
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

    // ดึงข้อมูล user และ Auto-save การคืน
    const fetchUserDetails = async (userQRCode, gunQRCode) => {
        try {
            const response = await fetch(`/api/get-user-details?userQRCode=${userQRCode}`);
            const data = await response.json();
            if (data.success) {
                const { realname } = data;
                
                // Auto-save return to database immediately
                const saved = await autoSave(userQRCode, gunQRCode, realname, 'return');
                
                if (saved) {
                    // เพิ่มข้อมูลใน session สำหรับแสดงผล
                    const currentTime = new Date().toLocaleString();
                    setUsersWithTwoScans(prevUsers => {
                        if (!prevUsers.some(user => user.userQRCode === userQRCode && user.gunQRCode === gunQRCode)) {
                            return [...prevUsers, { userQRCode, gunQRCode, realname, time: currentTime }];
                        }
                        return prevUsers;
                    });
                } else {
                    setStatusMessage('🔄 บันทึกการคืนไม่สำเร็จ กรุณาลองใหม่');
                }
            } else {
                setStatusMessage('Error: Unable to fetch user details');
            }
        } catch (error) {
            console.error('Fetch user details error:', error);
            setStatusMessage('Error: Failed to fetch user data');
        }
    };

    // เริ่มสแกน - Mobile Optimized
    const startScanner = async (isUserQR) => {
        const scannerId = isUserQR ? 'user-qr-reader' : 'gun-qr-reader';
        
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
            fps: isMobile ? 5 : 10, // ลด fps สำหรับ mobile
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

        const qrCodeScanner = new Html5QrcodeScanner(scannerId, scannerConfig);

        qrCodeScanner.render(
            (decodedText) => {
                // Haptic feedback for mobile
                if (navigator.vibrate && isMobile) {
                    navigator.vibrate(200);
                }
                
                handleQRCodeScan(decodedText, isUserQR);
                qrCodeScanner.clear().catch(console.error);
            },
            (errorMessage) => {
                console.log('Scan failed:', errorMessage);
                if (errorMessage.includes('NotAllowedError')) {
                    setStatusMessage('ไม่ได้รับอนุญาตให้ใช้กล้อง');
                } else if (errorMessage.includes('NotFoundError')) {
                    setStatusMessage('ไม่พบกล้อง');
                } else if (errorMessage.includes('NotReadableError')) {
                    setStatusMessage('กล้องถูกใช้งานโดยแอปอื่น');
                }
            }
        );
    };

    // สำหรับเบิกอาวุธ (สแกนครั้งแรก) - ใช้ Auto-save
    const handleSubmit = async () => {
        try {
            // ตรวจสอบสิทธิ์การเบิกก่อน
            const response = await fetch(`/api/check-gun-borrowing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userQRCode, gunQRCode }),
            });
            const data = await response.json();
            
            if (data.success) {
                const realname = data.realname;
                
                // Auto-save to database immediately
                const saved = await autoSave(userQRCode, gunQRCode, realname, 'borrow');
                
                if (saved) {
                    // เพิ่มข้อมูลใน session สำหรับแสดงผล
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
                        if (!isDuplicate) {
                            return [...prev, newBorrowRecord];
                        }
                        return prev;
                    });
                } else {
                    // ถ้าบันทึกไม่สำเร็จ ให้แสดง offline mode
                    setStatusMessage('🔄 บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่');
                }
            } else {
                setStatusMessage('QR Codes do not match');
            }
        } catch (error) {
            console.error('Submit error:', error);
            setStatusMessage('❌ เกิดข้อผิดพลาด: ' + error.message);
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
            <div className="gun-borrowing-container">
                <h1 className="gun-borrowing-title">ระบบยืม-คืนปืน</h1>
                
                <div className="gun-borrowing-card">
                    {/* สแกน User QR - Mobile Optimized */}
                    <div className="qr-section">
                        <label className="qr-label">
                            User QR Code
                        </label>
                        <div id="user-qr-reader" className="qr-reader"></div>
                        <button 
                            onClick={() => startScanner(true)}
                            className="qr-scan-btn user"
                            disabled={isLoading}
                        >
                            {isLoading ? "🔄 กำลังเปิดกล้อง..." : "📷 สแกน User QR Code"}
                        </button>
                        <div className="qr-help-text">
                            💡 {isMobile ? "หมุนโทรศัพท์เป็นแนวตั้ง เพื่อสแกนที่ดีที่สุด" : "หากใช้ Android: อนุญาตการใช้กล้อง และใช้ HTTPS หรือ localhost เท่านั้น"}
                        </div>
                        <div className="qr-result">
                            <b>Scanned:</b> {userQRCode ? (
                                <span className="qr-result-value">✅ {userQRCode}</span>
                            ) : (
                                <span className="qr-result-none">None</span>
                            )}
                        </div>
                    </div>
                    {/* สแกน Gun QR - Mobile Optimized */}
                    <div className="qr-section">
                        <label className="qr-label">
                            Gun QR Code
                        </label>
                        <div id="gun-qr-reader" className="qr-reader"></div>
                        <button 
                            onClick={() => startScanner(false)}
                            className="qr-scan-btn gun"
                            disabled={isLoading}
                        >
                            {isLoading ? "🔄 กำลังเปิดกล้อง..." : "🔫 สแกน Gun QR Code"}
                        </button>
                        <div className="qr-help-text gun-help">
                            💡 {isMobile ? "ถ้าสแกนไม่ได้ ให้กดปุ่มด้านล่างเพื่อกรอกด้วยตนเอง" : "หากไม่สามารถใช้กล้องได้ ให้ใช้ฟอร์มกรอกข้อมูลด้านล่าง"}
                        </div>
                        <div className="qr-result">
                            <b>Scanned:</b> {gunQRCode ? (
                                <span className="qr-result-value">✅ {gunQRCode}</span>
                            ) : (
                                <span className="qr-result-none">None</span>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={resetScanner}
                        className="btn-reset"
                    >
                        🔄 เริ่มสแกนใหม่
                    </button>

                    {/* ปุ่มแสดงฟอร์มกรอก - Mobile Optimized */}
                    <button
                        type="button"
                        className="gun-borrowing-print-btn btn-toggle-form"
                        onClick={() => setShowManualForm(v => !v)}
                    >
                        {showManualForm ? "❌ ปิดฟอร์มกรอกข้อมูล" : "⌨️ กรอกข้อมูลด้วยตนเอง"}
                    </button>

                    {/* --- ฟอร์มกรอกแทนการสแกน - Mobile Optimized --- */}
                    {showManualForm && (
                        <form 
                            onSubmit={handleManualSubmit} 
                            className="manual-form"
                        >
                            <div className="manual-form-title">
                                ⌨️ กรอกข้อมูล QR Code ด้วยตนเอง
                            </div>
                            <input
                                type="text"
                                placeholder="รหัสผู้ใช้ (User ID)"
                                value={manualUserQR}
                                onChange={e => setManualUserQR(e.target.value)}
                                className="manual-input"
                            />
                            <input
                                type="text"
                                placeholder="หมายเลขปืน (Gun Number)"
                                value={manualGunQR}
                                onChange={e => setManualGunQR(e.target.value)}
                                className="manual-input"
                            />
                            <button
                                type="submit"
                                className="gun-borrowing-print-btn manual-submit"
                                disabled={isLoading}
                            >
                                {isLoading ? "🔄 กำลังประมวลผล..." : "✅ ยืนยันข้อมูล"}
                            </button>
                        </form>
                    )}

                    {statusMessage && (
                        <div className={`gun-borrowing-status ${statusMessage.includes('Successful') || statusMessage.includes('✅') ? 'success' : 'error'}`}>
                            {statusMessage}
                        </div>
                    )}
                    
                    {/* Loading State */}
                    {isLoading && (
                        <div className="loading-message">
                            <div className="loading-text">
                                🔄 กำลังประมวลผล...
                            </div>
                        </div>
                    )}
                    
                    {/* Network Error State */}
                    {networkError && (
                        <div className="network-error">
                            <div className="network-error-title">
                                ❌ ไม่สามารถเชื่อมต่อได้
                            </div>
                            <div className="network-error-text">
                                ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต (ลองใหม่ {retryCount} ครั้ง)
                            </div>
                            <button
                                onClick={() => {
                                    setNetworkError(false);
                                    fetchTodayRecords();
                                }}
                                className="retry-btn"
                            >
                                ลองใหม่
                            </button>
                        </div>
                    )}
                </div>

                {/* --- ส่วนจัดการปืนสาธารณะ --- */}
                <div className="public-gun-section">
                    <h2 className="public-gun-title">ปืนสาธารณะ (Public Gun)</h2>
                    
                    <button
                        type="button"
                        className="gun-borrowing-print-btn"
                        style={{ width: "100%", marginBottom: showAddPublicGunForm ? 0 : 16 }}
                        onClick={() => setShowAddPublicGunForm(v => !v)}
                    >
                        {showAddPublicGunForm ? "ปิดฟอร์มเพิ่มปืน" : "เพิ่มปืนสาธารณะ"}
                    </button>

                    {showAddPublicGunForm && (
                        <form onSubmit={handleAddPublicGun} className="public-gun-form">
                            <input
                                type="text"
                                placeholder="Gun QR Code"
                                value={newPublicGun}
                                onChange={e => setNewPublicGun(e.target.value)}
                                className="public-gun-input"
                            />
                            <button type="submit" className="gun-borrowing-print-btn public-gun-add-btn">
                                เพิ่ม
                            </button>
                        </form>
                    )}

                    {publicGunStatus && (
                        <div className="public-gun-status">{publicGunStatus}</div>
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
                    gap: "16px",
                    maxWidth: 1200,
                    margin: "0 auto 16px auto"
                }}
            >
                <button className="gun-borrowing-print-btn" onClick={handlePrint}>
                    📄 พิมพ์รายงาน
                </button>
                
                {/* แสดงสถานะ Auto-save */}
                <div style={{ 
                    background: "#e8f5e8", 
                    padding: "8px 16px", 
                    borderRadius: 20, 
                    fontSize: "0.9rem",
                    color: "#2e7d32"
                }}>
                    ✅ บันทึกอัตโนมัติ
                </div>
            </div>

            {/* แสดงข้อมูลที่บันทึกแล้วจาก Database */}
            <div style={{ 
                background: savedRecords.all && savedRecords.all.length > 0 ? "#e8f5e8" : "#f0f4f8", 
                borderRadius: 10, 
                padding: 16, 
                margin: "16px auto", 
                maxWidth: 1200,
                border: savedRecords.all && savedRecords.all.length > 0 ? "2px solid #4caf50" : "2px solid #e0e0e0"
            }}>
                <h3 style={{ color: "#2e7d32", marginBottom: 12 }}>
                    📊 ข้อมูลที่บันทึกแล้วในวันที่ {currentDate}
                </h3>
                <div style={{ display: "flex", gap: "24px", marginBottom: 12 }}>
                    <div style={{ color: "#1976d2" }}>
                        <strong>เบิกทั้งหมด:</strong> {savedRecords.summary?.totalBorrowed || 0} คน
                    </div>
                    <div style={{ color: "#388e3c" }}>
                        <strong>คืนแล้ว:</strong> {savedRecords.summary?.totalReturned || 0} คน
                    </div>
                    <div style={{ color: "#f57c00" }}>
                        <strong>ยังไม่คืน:</strong> {savedRecords.summary?.notReturned || 0} คน
                    </div>
                </div>

                {/* แสดงรายละเอียดข้อมูลจาก Database */}
                <div style={{ marginTop: 16 }}>
                    <h4 style={{ color: "#1976d2", marginBottom: 8 }}>รายละเอียดจาก Database:</h4>
                    <div style={{ maxHeight: 200, overflowY: "auto", background: "white", borderRadius: 6, padding: 8 }}>
                        {!savedRecords.all || savedRecords.all.length === 0 ? (
                            <div style={{ textAlign: "center", color: "#666", padding: 16 }}>
                                ไม่มีข้อมูลในวันนี้
                            </div>
                        ) : (
                            <table style={{ width: "100%", fontSize: "0.9rem" }}>
                                <thead>
                                    <tr style={{ background: "#f5f5f5" }}>
                                        <th style={{ padding: 8, border: "1px solid #ddd" }}>ชื่อ</th>
                                        <th style={{ padding: 8, border: "1px solid #ddd" }}>ปืน</th>
                                        <th style={{ padding: 8, border: "1px solid #ddd" }}>เวลาเบิก</th>
                                        <th style={{ padding: 8, border: "1px solid #ddd" }}>เวลาคืน</th>
                                        <th style={{ padding: 8, border: "1px solid #ddd" }}>สถานะ</th>
                                        <th style={{ padding: 8, border: "1px solid #ddd" }}>ลบ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {savedRecords.all.map((record, index) => (
                                        <tr key={index}>
                                            <td style={{ padding: 8, border: "1px solid #ddd" }}>
                                                {record.realname}
                                            </td>
                                            <td style={{ padding: 8, border: "1px solid #ddd" }}>
                                                {record.gunQRCode}
                                            </td>
                                            <td style={{ padding: 8, border: "1px solid #ddd" }}>
                                                {new Date(record.borrowTime).toLocaleString('th-TH')}
                                            </td>
                                            <td style={{ padding: 8, border: "1px solid #ddd" }}>
                                                {record.returnTime 
                                                    ? new Date(record.returnTime).toLocaleString('th-TH')
                                                    : '-'
                                                }
                                            </td>
                                            <td style={{ 
                                                padding: 8, 
                                                border: "1px solid #ddd",
                                                color: record.status === 'returned' ? '#388e3c' : '#f57c00',
                                                fontWeight: 'bold'
                                            }}>
                                                {record.status === 'borrowed' ? '🔴 ยังไม่คืน' : '✅ คืนแล้ว'}
                                            </td>
                                            <td style={{ padding: 8, border: "1px solid #ddd", textAlign: 'center' }}>
                                                <button
                                                    onClick={() => deleteSingleRecord(record.id)}
                                                    style={{
                                                        background: "#e53935",
                                                        color: "#fff",
                                                        border: "none",
                                                        borderRadius: 4,
                                                        padding: "4px 8px",
                                                        cursor: "pointer",
                                                        fontSize: "0.8rem"
                                                    }}
                                                >
                                                    🗑️ ลบ
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div style={{ fontSize: "0.9rem", color: "#666", marginTop: 8 }}>
                    💡 ข้อมูลนี้ดึงมาจาก Database 
                    {savedRecords.all && savedRecords.all.length > 0 ? 
                        ` (มี ${savedRecords.all.length} รายการ)` : 
                        " (ยังไม่มีข้อมูลบันทึก)"
                    }
                </div>
            </div>

            {/* เลือกดูข้อมูลจากวันอื่น */}
            <div style={{ 
                background: "#f0f4f8", 
                borderRadius: 10, 
                padding: 16, 
                margin: "16px auto", 
                maxWidth: 1200,
                textAlign: "center"
            }}>
                <h3 style={{ color: "#1976d2", marginBottom: 12 }}>
                    📅 ดูข้อมูลจาก Database
                </h3>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: 16 }}>
                    <label style={{ fontWeight: "500" }}>เลือกวันที่:</label>
                    <input
                        type="date"
                        value={currentDate}
                        onChange={(e) => loadRecordsFromDate(e.target.value)}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 6,
                            border: "1px solid #d1d9e6",
                            fontSize: "1rem"
                        }}
                    />
                </div>
                
                {/* ปุ่มลบข้อมูลทั้งวัน */}
                {savedRecords.all && savedRecords.all.length > 0 && (
                    <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: 16 }}>
                        <button
                            onClick={deleteAllRecords}
                            style={{
                                background: "#d32f2f",
                                color: "#fff",
                                border: "none",
                                borderRadius: 6,
                                padding: "10px 20px",
                                cursor: "pointer",
                                fontSize: "1rem",
                                fontWeight: "500"
                            }}
                        >
                            🗑️ ลบข้อมูลทั้งวันที่ {currentDate}
                        </button>
                        <div style={{ fontSize: "0.85rem", color: "#666", marginTop: 8 }}>
                            ⚠️ การลบจะไม่สามารถกู้คืนได้
                        </div>
                    </div>
                )}
            </div>
            </div>
            {/* --- รายการเบิก/คืน/ยังไม่คืน --- */}
            <div className="gun-borrowing-list-row">
                <div className="gun-borrowing-list-card">
                    <h2>รายการเบิกอาวุธ</h2>
                    <p>จำนวนการเบิก: <b>{getBorrowedList().length}</b></p>
                    {getBorrowedList().length === 0 ? (
                        <p className="text-center mt-4">No borrow records available</p>
                    ) : (
                        <div className="table-wrapper">
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
                        </div>
                    )}
                </div>
                <div className="gun-borrowing-list-card">
                    <h2>รายการส่งคืนอาวุธ</h2>
                    <p>จำนวนการส่งคืน: <b>{getReturnedList().length}</b></p>
                    {getReturnedList().length === 0 ? (
                        <p className="text-center mt-4">No users scanned both QR codes twice</p>
                    ) : (
                        <div className="table-wrapper">
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
                                            <td className="status-returned">✅</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="gun-borrowing-list-card">
                    <h2>รายชื่อที่ยังไม่ได้คืน</h2>
                    <p>จำนวน: <b>{getNotReturned().length}</b></p>
                    {getNotReturned().length === 0 ? (
                        <p className="text-center mt-4">ไม่มีข้อมูล</p>
                    ) : (
                        <div className="table-wrapper">
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}