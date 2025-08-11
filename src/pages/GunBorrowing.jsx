import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { hasPermission, PERMISSIONS } from '../utils/permissions';
import { useFastAuth } from '../hooks/useFastAuth';
import './GunBorrowing.css';

export default function GunBorrowing() {
    const apiUrl = process.env.NODE_ENV === 'production' ? '' : (import.meta.env.VITE_API_URL || '');
    const { user } = useFastAuth();
    
    // Check permissions
    const canEdit = hasPermission(user, PERMISSIONS.EDIT_WEAPON_STORAGE);
    
    // Debug: แสดงข้อมูล user และ permissions
    useEffect(() => {
        console.log('=== GunBorrowing Debug ===');
        console.log('User:', user);
        console.log('User Role:', user?.role);
        console.log('Is Admin:', user?.admin);
        console.log('Can Edit Weapon Storage:', canEdit);
        console.log('EDIT_WEAPON_STORAGE permission:', PERMISSIONS.EDIT_WEAPON_STORAGE);
        console.log('========================');
    }, [user, canEdit]);
    
    // State
    const [userQRCode, setUserQRCode] = useState('');
    const [gunQRCode, setGunQRCode] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
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
    
    // Scanner state
    const [isScanning, setIsScanning] = useState(false);
    const [scannerInstance, setScannerInstance] = useState(null);

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

    // Cleanup scanner on unmount
    useEffect(() => {
        return () => {
            if (scannerInstance) {
                scannerInstance.clear().catch(console.error);
            }
        };
    }, [scannerInstance]);

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
        // ตรวจสอบสิทธิ์ก่อนทำการเบิก/คืน
        if (!canEdit) {
            setStatusMessage(`❌ คุณไม่มีสิทธิ์ในการ${action === 'borrow' ? 'เบิก' : 'คืน'}อาวุธ - เฉพาะดูข้อมูลเท่านั้น`);
            return false;
        }
        
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
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/public-gun`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success !== false) {
                setPublicGuns(data);
            } else {
                setPublicGunStatus(data.message || 'ไม่สามารถโหลดข้อมูลปืนสาธารณะ');
            }
        } catch {
            setPublicGunStatus('ไม่สามารถโหลดข้อมูลปืนสาธารณะ');
        }
    };

    // Fetch today's records from database
    const fetchTodayRecords = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/gun-borrowing-record?date=${currentDate}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
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
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/gun-borrowing-record`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/gun-borrowing-record`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
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

    // Load records from specific date
    const loadRecordsFromDate = async (selectedDate) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/gun-borrowing-record?date=${selectedDate}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
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
        
        // ตรวจสอบสิทธิ์
        if (!canEdit) {
            setPublicGunStatus('❌ คุณไม่มีสิทธิ์เพิ่มปืน - เฉพาะดูข้อมูลเท่านั้น');
            return;
        }
        
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
        // ตรวจสอบสิทธิ์
        if (!canEdit) {
            setPublicGunStatus('❌ คุณไม่มีสิทธิ์ลบปืน - เฉพาะดูข้อมูลเท่านั้น');
            return;
        }
        
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

    // ฟอร์มกรอกแทนการสแกน
    const handleManualSubmit = (e) => {
        e.preventDefault();
        if (manualUserQR && manualGunQR) {
            setUserQRCode(manualUserQR);
            setGunQRCode(manualGunQR);
            setStatusMessage('กรอกข้อมูล QR Code สำเร็จ');

            setManualUserQR('');
            setManualGunQR('');
        } else {
            setStatusMessage('กรุณากรอกข้อมูลให้ครบ');
        }
    };

    // สแกน QR - แยกแยะอัตโนมัติ
    const handleQRCodeScan = async (decodedText) => {
        console.log('Scanned QR Code:', decodedText);
        
        // ตรวจสอบรูปแบบ QR Code เพื่อแยกแยะว่าเป็น User หรือ Gun
        const isUserQR = await isUserQRCode(decodedText);
        console.log('Detection result - Is User QR:', isUserQR);
        
        // แสดงผลการตรวจจับทันที
        const qrType = isUserQR ? 'User' : 'Gun';
        console.log(`🎯 Detected: ${decodedText} = ${qrType} QR`);
        
        if (isUserQR && !userQRCode) {
            setUserQRCode(decodedText);
            setStatusMessage(`✅ ตรวจจับ User QR: ${decodedText}`);
        } else if (!isUserQR && !gunQRCode) {
            // ตัด prefix ออกจาก Gun QR ก่อนเก็บค่า
            const cleanGunQR = decodedText.replace(/^(GUN-|WEAPON-|W-|G-|gun-|Gun-|RIFLE-|rifle-)/i, '');
            setGunQRCode(cleanGunQR);
            setStatusMessage(`✅ ตรวจจับ Gun QR: ${decodedText} (บันทึกเป็น: ${cleanGunQR})`);
        } else if (isUserQR && userQRCode) {
            // ถ้าสแกน User QR ซ้ำ
            if (userQRCode === decodedText) {
                setStatusMessage(`⚠️ User QR [${decodedText}] สแกนไปแล้ว`);
            } else {
                setStatusMessage(`⚠️ เปลี่ยน User QR: ${userQRCode} → ${decodedText}`);
                setUserQRCode(decodedText);
            }
        } else if (!isUserQR && gunQRCode) {
            // ถ้าสแกน Gun QR ซ้ำ
            const cleanGunQR = decodedText.replace(/^(GUN-|WEAPON-|W-|G-|gun-|Gun-|RIFLE-|rifle-)/i, '');
            if (gunQRCode === cleanGunQR) {
                setStatusMessage(`⚠️ Gun QR [${decodedText}] สแกนไปแล้ว`);
            } else {
                setStatusMessage(`⚠️ เปลี่ยน Gun QR: ${gunQRCode} → ${cleanGunQR}`);
                setGunQRCode(cleanGunQR);
            }
        }
    };

    // ฟังก์ชันตรวจสอบว่า QR Code เป็น User หรือ Gun โดยเช็คจาก database
    const isUserQRCode = async (qrText) => {
        console.log('Checking QR Code from database:', qrText);
        
        try {
            // เรียก API เพื่อตรวจสอบว่า QR Code นี้เป็น User หรือไม่
            const response = await fetch(`/api/check-user-qr?qr=${encodeURIComponent(qrText)}`);
            const data = await response.json();
            
            if (data.success) {
                if (data.isUser) {
                    console.log('Detected as User QR from database:', data.userInfo);
                    return true;
                } else {
                    console.log('QR not found in user database, checking patterns');
                    // ถ้าไม่พบใน database ให้เช็ค pattern เพิ่มเติม
                    return checkPatternForUserQR(qrText);
                }
            } else {
                console.log('Database check failed, using pattern matching');
                return checkPatternForUserQR(qrText);
            }
        } catch (error) {
            console.error('Error checking QR code:', error);
            console.log('Database unavailable, using pattern matching');
            return checkPatternForUserQR(qrText);
        }
    };

    // ฟังก์ชันเช็ค pattern สำหรับ User QR (ไม่จำกัดจำนวนหลัก)
    const checkPatternForUserQR = (qrText) => {
        console.log('Checking pattern for QR:', qrText);
        
        // กรณีที่ 1: ถ้ามี prefix ของปืนชัดเจน ถือว่าเป็น Gun QR
        if (/^(GUN-|WEAPON-|W-|G-|gun-|Gun-|RIFLE-|rifle-)/i.test(qrText)) {
            console.log('Pattern: Detected as Gun QR - has gun prefix');
            return false;
        }
        
        // กรณีที่ 2: ถ้าเป็นตัวเลขที่มีรูปแบบเหมือน serial number ของปืน
        if (/^[0-9]{1,3}[-_][0-9]+$/.test(qrText) || /^[A-Z][0-9]{3,6}$/.test(qrText)) {
            console.log('Pattern: Detected as Gun QR - serial number format');
            return false;
        }
        
        // กรณีที่ 3: ถ้าเป็นตัวเลขล้วนและมีความยาวเหมาะสมสำหรับ User ID
        if (/^\d+$/.test(qrText)) {
            if (qrText.length >= 3) { // อย่างน้อย 3 หลัก
                console.log('Pattern: Detected as User QR - numeric user ID');
                return true;
            } else {
                console.log('Pattern: Detected as Gun QR - too short for user ID');
                return false;
            }
        }
        
        // กรณีที่ 4: ถ้าเป็นตัวอักษรผสมตัวเลข อาจเป็น User ID
        if (/^[A-Za-z][0-9]+$/.test(qrText)) {
            console.log('Pattern: Detected as User QR - alphanumeric user ID');
            return true;
        }
        
        // กรณีที่ 5: ถ้ามีอักขระพิเศษหรือรูปแบบแปลกๆ ถือว่าเป็น Gun QR
        if (/[^A-Za-z0-9]/.test(qrText) && !/^[A-Za-z0-9]+$/.test(qrText)) {
            console.log('Pattern: Detected as Gun QR - contains special characters');
            return false;
        }
        
        // กรณีอื่นๆ ให้ดูจากความยาว - ถ้าสั้นมากอาจเป็นปืน ถ้ายาวมากอาจเป็น user
        if (qrText.length <= 2) {
            console.log('Pattern: Detected as Gun QR - very short');
            return false;
        } else {
            console.log('Pattern: Detected as User QR - default case');
            return true;
        }
    };

    // เริ่มสแกน - แบบรวม (สแกนได้ทั้ง User และ Gun) - เปิดค้างไว้
    const startScanner = async () => {
        // ถ้ากำลัง scan อยู่แล้ว ให้หยุด
        if (isScanning && scannerInstance) {
            stopScanner();
            return;
        }
        
        const scannerId = 'qr-reader';
        
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
        setScannerInstance(qrCodeScanner);
        setIsScanning(true);

        qrCodeScanner.render(
            (decodedText) => {
                // Haptic feedback for mobile
                if (navigator.vibrate && isMobile) {
                    navigator.vibrate(200);
                }
                
                // แยกแยะ QR Code โดยอัตโนมัติ
                handleQRCodeScan(decodedText);
                // ไม่ปิด scanner หลังจากสแกน - ให้ค้างไว้เพื่อสแกนต่อ
                // qrCodeScanner.clear().catch(console.error);
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
    
    // หยุดสแกน
    const stopScanner = () => {
        if (scannerInstance) {
            scannerInstance.clear().catch(console.error);
            setScannerInstance(null);
            setIsScanning(false);
        }
    };

    // เรียก checkUserGunMatch เมื่อสแกน user และ gun ครั้งแรกครบ
    useEffect(() => {
        if (userQRCode && gunQRCode) {
            checkUserGunMatch();
        }
        // eslint-disable-next-line
    }, [userQRCode, gunQRCode]);

    // เช็คว่าข้อมูล User และ Gun ตรงกับ Database หรือไม่
    const checkUserGunMatch = async () => {
        try {
            setStatusMessage('🔍 กำลังตรวจสอบข้อมูลกับ Database...');
            
            // เช็คข้อมูล User
            const userResponse = await fetch(`/api/get-user-details?userQRCode=${userQRCode}`);
            const userData = await userResponse.json();
            
            if (!userData.success) {
                setStatusMessage(`❌ ไม่พบข้อมูล User: ${userQRCode} ในระบบ`);
                return;
            }

            // เช็คว่ามีการยืมปืนคู่นี้ในวันนี้แล้วหรือไม่
            const today = new Date().toISOString().split('T')[0];
            const recordResponse = await fetch(`/api/gun-borrowing-record?date=${today}&userQRCode=${userQRCode}&gunQRCode=${gunQRCode}`);
            const recordData = await recordResponse.json();
            
            if (recordData.success && recordData.data.length > 0) {
                // มีการยืมแล้ว - นี่คือการคืน
                const existingRecord = recordData.data[0];
                
                if (existingRecord.status === 'borrowed') {
                    // ยังไม่ได้คืน - ทำการคืน
                    const returnResult = await autoSave(userQRCode, gunQRCode, userData.realname, 'return');
                    if (returnResult) {
                        setStatusMessage(`✅ คืนปืนสำเร็จ: ${userData.realname} คืนปืน ${gunQRCode}`);
                        resetForNextScan();
                    }
                } else {
                    // คืนแล้ว - แจ้งเตือน
                    setStatusMessage(`⚠️ ${userData.realname} คืนปืน ${gunQRCode} ไปแล้ววันนี้`);
                }
                return;
            }

            // ไม่มีการยืมก่อนหน้า - นี่คือการยืมครั้งแรก
            // เช็คว่า Gun Number ตรงกับ User หรือไม่ (ใช้ gunQRCode ที่ตัด prefix แล้ว)
            const userGunNumber = userData.gunNumber;
            if (userGunNumber && userGunNumber === gunQRCode) {
                setStatusMessage(`✅ ตรวจสอบสำเร็จ: ${userData.realname} | ปืน: ${gunQRCode}`);
                // ดำเนินการยืมต่อ
                const saved = await autoSave(userQRCode, gunQRCode, userData.realname, 'borrow');
                if (saved) {
                    resetForNextScan();
                }
            } else if (userGunNumber) {
                setStatusMessage(`⚠️ ปืนไม่ตรงกัน! ${userData.realname} ควรใช้ปืน: ${userGunNumber} แต่สแกน: ${gunQRCode}`);
                // ยังให้ดำเนินการต่อได้
                setTimeout(async () => {
                    const saved = await autoSave(userQRCode, gunQRCode, userData.realname, 'borrow');
                    if (saved) {
                        resetForNextScan();
                    }
                }, 2000);
            } else {
                setStatusMessage(`⚠️ ${userData.realname} ไม่มีปืนที่กำหนดในระบบ แต่สแกนปืน: ${gunQRCode}`);
                // อนุญาตให้ใช้ปืนอื่นได้
                const saved = await autoSave(userQRCode, gunQRCode, userData.realname, 'borrow');
                if (saved) {
                    resetForNextScan();
                }
            }
            
        } catch (error) {
            console.error('Check user-gun match error:', error);
            setStatusMessage('❌ เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
        }
    };

    // รีเซ็ต state หลังจากเสร็จสิ้นการประมวลผล (สำหรับสแกนคู่ต่อไป)
    const resetForNextScan = () => {
        setTimeout(() => {
            setUserQRCode('');
            setGunQRCode('');
            setStatusMessage('🔄 พร้อมสแกนคู่ต่อไป');
        }, 3000); // รอ 3 วินาทีแล้วรีเซ็ต
    };

    // รีเซ็ตการสแกน
    const resetScanner = () => {
        // หยุด scanner ก่อน
        stopScanner();
        
        // รีเซ็ต state
        setUserQRCode('');
        setGunQRCode('');
        setStatusMessage('🔄 รีเซ็ตเรียบร้อย - พร้อมสแกนใหม่');
        
        // เริ่มต้น scanner ใหม่อัตโนมัติ
        setTimeout(() => {
            setStatusMessage('');
        }, 2000);
    };

    return (
        <div className="gun-borrowing-bg">
            <div className="gun-borrowing-container">
                <h1 className="gun-borrowing-title">ระบบยืม-คืนปืน</h1>
                
                {/* แสดงข้อมูล Role และ Permissions สำหรับ Debug */}
                <div style={{
                    background: '#f0f9ff',
                    border: '1px solid #0284c7',
                    borderRadius: '8px',
                    padding: '12px',
                    margin: '16px 0',
                    fontSize: '14px'
                }}>
                    <div><strong>ผู้ใช้:</strong> {user?.realname || user?.username || 'ไม่ระบุ'}</div>
                    <div><strong>Role:</strong> {user?.role || 'ไม่ระบุ'}</div>
                    <div><strong>Admin:</strong> {user?.admin ? 'ใช่' : 'ไม่ใช่'}</div>
                    <div><strong>สิทธิ์แก้ไขคลังอาวุธ:</strong> <span style={{color: canEdit ? '#059669' : '#dc2626'}}>{canEdit ? '✅ มีสิทธิ์' : '❌ ไม่มีสิทธิ์'}</span></div>
                </div>
                
                <div className="gun-borrowing-card">
                    {/* แสดง Scanner เฉพาะผู้ที่มีสิทธิ์แก้ไข */}
                    {canEdit ? (
                        <div className="edit-mode">
                            {/* สแกน QR Code แบบรวม - สแกนได้ทั้ง User และ Gun */}
                            <div className="qr-section">
                                <label className="qr-label">
                                    สแกน QR Code (User หรือ Gun)
                                </label>
                        <div id="qr-reader" className="qr-reader"></div>
                        <button 
                            onClick={() => startScanner()}
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
                                    ? "📱 กล้องเปิดแล้ว - สแกน User QR หรือ Gun QR ได้ทันที" 
                                    : "หมุนโทรศัพท์เป็นแนวตั้ง สแกน User QR หรือ Gun QR ได้ทันที"
                                : isScanning 
                                    ? "🎥 กล้องเปิดแล้ว - สแกน QR Code ใดก็ได้ (User หรือ Gun) ระบบจะแยกแยะให้อัตโนมัติ"
                                    : "สแกน QR Code ใดก็ได้ (User หรือ Gun) ระบบจะแยกแยะให้อัตโนมัติ"
                            }
                        </div>
                        
                        {/* แสดงผลการสแกน */}
                        <div style={{ 
                            display: 'flex', 
                            gap: '16px', 
                            marginTop: '12px',
                            flexDirection: isMobile ? 'column' : 'row'
                        }}>
                            <div className="qr-result" style={{ flex: 1 }}>
                                <b>👤 User:</b> {userQRCode ? (
                                    <span className="qr-result-value" style={{ color: '#059669' }}>✅ {userQRCode}</span>
                                ) : (
                                    <span className="qr-result-none" style={{ color: '#6b7280' }}>ยังไม่ได้สแกน</span>
                                )}
                            </div>
                            <div className="qr-result" style={{ flex: 1 }}>
                                <b>🔫 Gun:</b> {gunQRCode ? (
                                    <span className="qr-result-value" style={{ color: '#dc2626' }}>✅ {gunQRCode}</span>
                                ) : (
                                    <span className="qr-result-none" style={{ color: '#6b7280' }}>ยังไม่ได้สแกน</span>
                                )}
                            </div>
                        </div>
                        
                        {/* แสดงสถานะความคืบหน้า */}
                        {(userQRCode || gunQRCode) && (
                            <div style={{
                                marginTop: '12px',
                                padding: '8px 12px',
                                background: userQRCode && gunQRCode ? '#dcfce7' : '#fef3c7',
                                border: `1px solid ${userQRCode && gunQRCode ? '#16a34a' : '#f59e0b'}`,
                                borderRadius: '6px',
                                fontSize: '14px',
                                color: userQRCode && gunQRCode ? '#166534' : '#92400e'
                            }}>
                                {userQRCode && gunQRCode 
                                    ? '✅ สแกนครบแล้ว! กำลังตรวจสอบข้อมูล...'
                                    : `⏳ สแกนแล้ว ${(userQRCode ? 1 : 0) + (gunQRCode ? 1 : 0)}/2 รายการ - ${!userQRCode ? 'ต้องการ User QR' : 'ต้องการ Gun QR'}`
                                }
                            </div>
                        )}
                        
                        {/* แสดงสถานะ Scanner */}
                        {isScanning && (
                            <div style={{
                                marginTop: '8px',
                                padding: '6px 10px',
                                background: '#e0f2fe',
                                border: '1px solid #0284c7',
                                borderRadius: '6px',
                                fontSize: '12px',
                                color: '#0369a1',
                                textAlign: 'center'
                            }}>
                                🎥 กล้องเปิดอยู่ - พร้อมสแกน QR Code
                            </div>
                        )}
                        
                        {/* Debug Information */}
                        {(userQRCode || gunQRCode) && (
                            <div style={{
                                marginTop: '8px',
                                padding: '6px 10px',
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                fontSize: '11px',
                                color: '#475569'
                            }}>
                                🔍 Debug: {userQRCode ? `User(${userQRCode})` : 'User(-)'} | {gunQRCode ? `Gun(${gunQRCode})` : 'Gun(-)'}
                            </div>
                        )}
                    </div>
                    <button 
                        onClick={resetScanner}
                        className="btn-reset"
                        style={{
                            background: '#f59e0b',
                            color: 'white',
                            border: '1px solid #d97706',
                            borderRadius: '8px',
                            padding: '10px 20px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            width: '100%',
                            marginTop: '12px'
                        }}
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

                    {/* ปุ่มทดสอบการตรวจจับ QR Code */}
                    <div style={{ marginTop: '12px' }}>
                        <details style={{ marginBottom: '8px' }}>
                            <summary style={{ 
                                cursor: 'pointer', 
                                fontSize: '12px', 
                                color: '#6b7280',
                                marginBottom: '8px'
                            }}>
                                🧪 ทดสอบการตรวจจับ QR Code
                            </summary>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                {/* ทดสอบ User QR */}
                                <button onClick={() => handleQRCodeScan('1234567890')} style={{ fontSize: '10px', padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>
                                    Test: 1234567890
                                </button>
                                <button onClick={() => handleQRCodeScan('A123')} style={{ fontSize: '10px', padding: '4px 8px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px' }}>
                                    Test: A123
                                </button>
                                {/* ทดสอบ Gun QR */}
                                <button onClick={() => handleQRCodeScan('GUN-001')} style={{ fontSize: '10px', padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px' }}>
                                    Test: GUN-001
                                </button>
                                <button onClick={() => handleQRCodeScan('WEAPON-123')} style={{ fontSize: '10px', padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px' }}>
                                    Test: WEAPON-123
                                </button>
                                <button onClick={() => handleQRCodeScan('ABC123DEF')} style={{ fontSize: '10px', padding: '4px 8px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '4px' }}>
                                    Test: ABC123DEF
                                </button>
                            </div>
                        </details>
                    </div>

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
                    ) : (
                        /* แสดงข้อความสำหรับ View Only */
                        <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            background: '#f8fafc',
                            border: '2px dashed #cbd5e1',
                            borderRadius: '8px',
                            color: '#64748b',
                            margin: '16px 0'
                        }}>
                            <h3 style={{ margin: '0 0 8px 0', color: '#475569' }}>📖 โหมดดูข้อมูลเท่านั้น</h3>
                            <p style={{ margin: 0, fontSize: '14px' }}>คุณสามารถดูข้อมูลการเบิก-คืนปืนได้ แต่ไม่สามารถทำการเบิก/คืนหรือเพิ่มปืนใหม่ได้</p>
                        </div>
                    )}

                {/* --- ส่วนจัดการปืนสาธารณะ --- */}
                <div className="public-gun-section">
                    <h2 className="public-gun-title">ปืนสาธารณะ (Public Gun)</h2>
                    
                    {canEdit && (
                    <button
                        type="button"
                        className="gun-borrowing-print-btn"
                        style={{ width: "100%", marginBottom: showAddPublicGunForm ? 0 : 16 }}
                        onClick={() => setShowAddPublicGunForm(v => !v)}
                    >
                        {showAddPublicGunForm ? "ปิดฟอร์มเพิ่มปืน" : "เพิ่มปืนสาธารณะ"}
                    </button>
                    )}

                    {canEdit && showAddPublicGunForm && (
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
                                                {canEdit && (
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
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* --- จบส่วนจัดการปืนสาธารณะ --- */}

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
        </div>
        </div>
    );
}