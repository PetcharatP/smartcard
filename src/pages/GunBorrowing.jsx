import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import './GunBorrowing.css';

export default function GunBorrowing() {
    const apiUrl = process.env.NODE_ENV === 'production' ? '' : (import.meta.env.VITE_API_URL || '');
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
    const [currentDate, setCurrentDate] = useState(
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
);
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
            case 'unauthorized_gun_access':
                setStatusMessage('🚫 ไม่สามารถเบิกปืนนี้ได้');
                break;
            case 'user_not_found':
                setStatusMessage('❌ ไม่พบข้อมูลผู้ใช้ในระบบ');
                break;
            case 'gun_belongs_to_other_user':
                setStatusMessage(`🚫 ปืนนี้เป็นของ ${errorData.validationDetails?.owner?.realname || 'ผู้ใช้คนอื่น'}`);
                break;
            case 'gun_not_in_system':
                setStatusMessage('❌ ปืนนี้ไม่อยู่ในระบบ กรุณาติดต่อผู้ดูแล');
                break;
            case 'validation_error':
                setStatusMessage('❌ เกิดข้อผิดพลาดในการตรวจสอบข้อมูล');
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
                             `จำนวنข้อมูลที่จะถูกลบ: ${savedRecords.all.length} รายการ\n\n` +
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

    // Print daily report as PDF
    const printDailyReport = () => {
        if (!savedRecords.all || savedRecords.all.length === 0) {
            alert('ไม่มีข้อมูลสำหรับพิมพ์ในวันที่เลือก');
            return;
        }

        // สร้างหน้าใหม่สำหรับ PDF
        const printWindow = window.open('', '_blank');
        
        // ฟังก์ชันแปลงเวลาเป็นรูปแบบ ชม.:นาที
        const formatTime = (dateString) => {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleTimeString('th-TH', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
            });
        };

        // ฟังก์ชันแปลงวันที่เป็นภาษาไทย
        const formatDateThai = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        // จัดกลุ่มข้อมูลตามสถานะ
        const borrowedRecords = savedRecords.all.filter(record => record.status === 'borrowed');
        const returnedRecords = savedRecords.all.filter(record => record.status === 'returned');

        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, maximum-scale=3.0">
            <meta name="mobile-web-app-capable" content="yes">
            <meta name="apple-mobile-web-app-capable" content="yes">
            <meta name="format-detection" content="telephone=no">
            <title>รายงานการเบิก-คืนปืน วันที่ ${formatDateThai(currentDate)}</title>
            <style>
                body {
                    font-family: 'Sarabun', Arial, sans-serif;
                    margin: 10px;
                    font-size: 14px;
                    line-height: 1.4;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                    border-bottom: 3px solid #2c5aa0;
                    padding-bottom: 15px;
                }
                .header h1 {
                    color: #2c5aa0;
                    margin: 0;
                    font-size: 20px;
                    font-weight: bold;
                }
                .header h2 {
                    color: #666;
                    margin: 5px 0;
                    font-size: 16px;
                    font-weight: normal;
                }
                .summary {
                    background: #f8f9fa;
                    border: 2px solid #e9ecef;
                    border-radius: 8px;
                    padding: 15px;
                    margin-bottom: 20px;
                }
                .summary h3 {
                    color: #2c5aa0;
                    margin: 0 0 10px 0;
                    font-size: 16px;
                }
                .summary-stats {
                    display: flex;
                    justify-content: space-around;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                .stat-item {
                    text-align: center;
                    margin: 5px;
                    min-width: 80px;
                }
                .stat-number {
                    font-size: 20px;
                    font-weight: bold;
                    display: block;
                }
                .stat-label {
                    font-size: 11px;
                    color: #666;
                    word-break: keep-all;
                }
                .total { color: #0066cc; }
                .returned { color: #28a745; }
                .borrowed { color: #fd7e14; }
                
                .section {
                    margin-bottom: 20px;
                    page-break-inside: avoid;
                }
                .section h3 {
                    background: #2c5aa0;
                    color: white;
                    padding: 8px 12px;
                    margin: 0 0 15px 0;
                    border-radius: 5px;
                    font-size: 14px;
                }
                
                /* Mobile-first responsive table */
                .table-container {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    margin-bottom: 15px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    min-width: 600px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 6px 8px;
                    text-align: left;
                    font-size: 12px;
                    word-break: break-word;
                }
                th {
                    background-color: #f1f3f4;
                    font-weight: bold;
                    color: #333;
                    white-space: nowrap;
                }
                tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                .time-col {
                    font-family: 'Courier New', monospace;
                    font-weight: bold;
                    white-space: nowrap;
                    font-size: 11px;
                }
                .status-returned {
                    color: #28a745;
                    font-weight: bold;
                    font-size: 11px;
                }
                .status-borrowed {
                    color: #fd7e14;
                    font-weight: bold;
                    font-size: 11px;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 2px solid #eee;
                    text-align: center;
                    color: #666;
                    font-size: 11px;
                }
                .no-data {
                    text-align: center;
                    color: #999;
                    font-style: italic;
                    padding: 20px;
                    font-size: 14px;
                }
                
                /* Mobile specific styles */
                @media screen and (max-width: 768px) {
                    body {
                        margin: 5px;
                        font-size: 12px;
                    }
                    .header h1 {
                        font-size: 18px;
                    }
                    .header h2 {
                        font-size: 14px;
                    }
                    .summary {
                        padding: 10px;
                        margin-bottom: 15px;
                    }
                    .summary h3 {
                        font-size: 14px;
                    }
                    .stat-number {
                        font-size: 18px;
                    }
                    .stat-label {
                        font-size: 10px;
                    }
                    .section h3 {
                        font-size: 13px;
                        padding: 6px 10px;
                    }
                    th, td {
                        padding: 4px 6px;
                        font-size: 11px;
                    }
                    .time-col {
                        font-size: 10px;
                    }
                    .status-returned, .status-borrowed {
                        font-size: 10px;
                    }
                }
                
                /* Very small mobile screens */
                @media screen and (max-width: 480px) {
                    body {
                        margin: 2px;
                        font-size: 11px;
                    }
                    .header h1 {
                        font-size: 16px;
                    }
                    .header h2 {
                        font-size: 12px;
                    }
                    .summary {
                        padding: 8px;
                    }
                    .summary-stats {
                        flex-direction: column;
                        gap: 5px;
                    }
                    .stat-item {
                        margin: 2px;
                    }
                    .section h3 {
                        font-size: 12px;
                        padding: 5px 8px;
                    }
                    table {
                        min-width: 100%;
                        font-size: 9px;
                        width: 100%;
                    }
                    th, td {
                        padding: 2px 3px;
                        font-size: 9px;
                        word-break: break-all;
                        max-width: 60px;
                    }
                    .time-col {
                        font-size: 8px;
                    }
                    .status-returned, .status-borrowed {
                        font-size: 8px;
                    }
                    /* Mobile table optimization */
                    .table-container {
                        font-size: 8px;
                    }
                    th:nth-child(1), td:nth-child(1) { width: 8%; } /* ลำดับ */
                    th:nth-child(2), td:nth-child(2) { width: 35%; } /* ชื่อ */
                    th:nth-child(3), td:nth-child(3) { width: 15%; } /* ปืน */
                    th:nth-child(4), td:nth-child(4) { width: 18%; } /* เวลาเบิก */
                    th:nth-child(5), td:nth-child(5) { width: 18%; } /* เวลาคืน */
                    th:nth-child(6), td:nth-child(6) { width: 6%; } /* สถานะ */
                }
                
                @media print {
                    .no-print { display: none; }
                    body { 
                        margin: 0; 
                        font-size: 12px;
                        background: white;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        width: 100%;
                        max-width: none;
                    }
                    .section { 
                        page-break-inside: avoid; 
                    }
                    table {
                        min-width: auto;
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 10px;
                    }
                    th, td {
                        font-size: 10px;
                        padding: 4px;
                        border: 1px solid #333 !important;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                    }
                    th {
                        background-color: #f0f0f0 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        font-weight: bold;
                    }
                    .header {
                        border-bottom: 2px solid #333 !important;
                        text-align: center;
                    }
                    .summary {
                        border: 1px solid #333 !important;
                        background-color: #f8f9fa !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        page-break-inside: avoid;
                    }
                    .section h3 {
                        background-color: #333 !important;
                        color: white !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    button, .instruction-bar {
                        display: none !important;
                    }
                    div[style*="position: fixed"] {
                        display: none !important;
                    }
                    .table-container {
                        overflow: visible !important;
                    }
                    /* Mobile PDF optimizations */
                    @page {
                        size: A4;
                        margin: 0.5in;
                    }
                    .summary-stats {
                        flex-direction: row !important;
                        justify-content: space-around !important;
                    }
                    .stat-item {
                        margin: 2px !important;
                        min-width: 60px !important;
                    }
                    .time-col {
                        font-size: 9px !important;
                        white-space: nowrap;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📋 รายงานการเบิก-คืนปืน</h1>
                <h2>วันที่ ${formatDateThai(currentDate)}</h2>
            </div>
            
            <div class="summary">
                <h3>📊 สรุปภาพรวม</h3>
                <div class="summary-stats">
                    <div class="stat-item">
                        <span class="stat-number total">${savedRecords.all.length}</span>
                        <span class="stat-label">รายการทั้งหมด</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number returned">${savedRecords.summary?.totalReturned || 0}</span>
                        <span class="stat-label">คืนแล้ว</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-number borrowed">${savedRecords.summary?.notReturned || 0}</span>
                        <span class="stat-label">ยังไม่คืน</span>
                    </div>
                </div>
            </div>

            <div class="section">
                <h3>✅ รายชื่อผู้ที่คืนปืนแล้ว (${returnedRecords.length} คน)</h3>
                ${returnedRecords.length === 0 ? 
                    '<div class="no-data">ไม่มีรายการที่คืนแล้ว</div>' :
                    `<div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 8%; min-width: 40px;">ลำดับ</th>
                                    <th style="width: 30%; min-width: 120px;">ชื่อ-นามสกุล</th>
                                    <th style="width: 15%; min-width: 80px;">หมายเลขปืน</th>
                                    <th style="width: 15%; min-width: 70px;">เวลาเบิก</th>
                                    <th style="width: 15%; min-width: 70px;">เวลาคืน</th>
                                    <th style="width: 12%; min-width: 60px;">ระยะเวลาใช้</th>
                                    <th style="width: 5%; min-width: 50px;">สถานะ</th>
                                </tr>
                            </thead>
                        <tbody>
                            ${returnedRecords.map((record, index) => {
                                const borrowTime = new Date(record.borrowTime);
                                const returnTime = new Date(record.returnTime);
                                const durationMs = returnTime - borrowTime;
                                const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                                const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                                const durationText = `${durationHours}:${durationMinutes.toString().padStart(2, '0')}`;
                                
                                return `
                                <tr>
                                    <td style="text-align: center">${index + 1}</td>
                                    <td>${record.realname}</td>
                                    <td style="text-align: center; font-weight: bold">${record.gunQRCode}</td>
                                    <td class="time-col">${formatTime(record.borrowTime)}</td>
                                    <td class="time-col">${formatTime(record.returnTime)}</td>
                                    <td class="time-col" style="text-align: center">${durationText}</td>
                                    <td class="status-returned" style="text-align: center">คืนแล้ว</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                    </div>`
                }
            </div>

            <div class="section">
                <h3>⚠️ รายชื่อผู้ที่ยังไม่ได้คืนปืน (${borrowedRecords.length} คน)</h3>
                ${borrowedRecords.length === 0 ? 
                    '<div class="no-data">ไม่มีรายการที่ยังไม่ได้คืน</div>' :
                    `<div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 8%; min-width: 40px;">ลำดับ</th>
                                    <th style="width: 35%; min-width: 120px;">ชื่อ-นามสกุล</th>
                                    <th style="width: 20%; min-width: 80px;">หมายเลขปืน</th>
                                    <th style="width: 20%; min-width: 70px;">เวลาเบิก</th>
                                    <th style="width: 12%; min-width: 70px;">ระยะเวลาคงค้าง</th>
                                    <th style="width: 5%; min-width: 50px;">สถานะ</th>
                                </tr>
                            </thead>
                        <tbody>
                            ${borrowedRecords.map((record, index) => {
                                const borrowTime = new Date(record.borrowTime);
                                const currentTime = new Date();
                                const durationMs = currentTime - borrowTime;
                                const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                                const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                                const durationText = `${durationHours}:${durationMinutes.toString().padStart(2, '0')}`;
                                
                                return `
                                <tr>
                                    <td style="text-align: center">${index + 1}</td>
                                    <td>${record.realname}</td>
                                    <td style="text-align: center; font-weight: bold">${record.gunQRCode}</td>
                                    <td class="time-col">${formatTime(record.borrowTime)}</td>
                                    <td class="time-col" style="text-align: center">${durationText}</td>
                                    <td class="status-borrowed" style="text-align: center">ยังไม่คืน</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                    </div>`
                }
            </div>

            <div class="footer">
                <p>📅 รายงานสร้างเมื่อ: ${new Date().toLocaleString('th-TH')}</p>
                <p>🖨️ พิมพ์จากระบบยืม-คืนปืน</p>
            </div>
        </body>
        </html>
        `;

        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // ตรวจสอบว่าเป็นมือถือหรือไม่ - ย้ายออกมาข้างนอก
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        console.log('📱 Mobile Detection:', isMobileDevice);
        
        // รอให้เนื้อหาโหลดเสร็จแล้วสร้าง PDF
        setTimeout(() => {
            if (isMobileDevice) {
                // สำหรับมือถือ: เปิด PDF dialog ทันทีโดยไม่ต้องรอ
                console.log('📱 Opening PDF dialog for mobile...');
                printWindow.print();
            } else {
                // สำหรับคอมพิวเตอร์: แสดงป้ายแจ้งเตือนและปุ่ม
                console.log('💻 Setting up desktop PDF interface...');
                const instructionDiv = printWindow.document.createElement('div');
                instructionDiv.className = 'instruction-bar';
                instructionDiv.innerHTML = `
                    <div class="instruction-bar" style="
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        background: #1976d2;
                        color: white;
                        padding: 10px 5px;
                        text-align: center;
                        z-index: 1000;
                        font-size: 12px;
                        font-weight: bold;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                        border-bottom: 3px solid #0d47a1;
                        line-height: 1.3;
                    ">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 5px;">
                            <div>📄 เลือก 'Save as PDF' ในเมนูพิมพ์</div>
                            <div style="font-size: 10px; opacity: 0.9;">💻 กด Ctrl+P หรือคลิกปุ่มด้านล่าง</div>
                        </div>
                    </div>
                `;
                
                printWindow.document.body.appendChild(instructionDiv);
                // เพิ่มปุ่มสำหรับสร้าง PDF (เฉพาะคอมพิวเตอร์)
                const pdfButton = printWindow.document.createElement('button');
                pdfButton.innerHTML = '📄 บันทึก PDF';
                pdfButton.style.cssText = `
                    position: fixed;
                    top: 80px;
                    right: 10px;
                    z-index: 1001;
                    background: #2e7d32;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    font-weight: bold;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    transition: all 0.3s ease;
                `;
                
                pdfButton.onmouseover = function() {
                    this.style.background = '#1b5e20';
                    this.style.transform = 'scale(1.05)';
                };
                
                pdfButton.onmouseout = function() {
                    this.style.background = '#2e7d32';
                    this.style.transform = 'scale(1)';
                };
                
                pdfButton.onclick = function() {
                    printWindow.print();
                };
                
                printWindow.document.body.appendChild(pdfButton);
                
                // เปิด dialog บันทึก PDF อัตโนมัติสำหรับคอมพิวเตอร์
                setTimeout(() => {
                    printWindow.print();
                }, 500);
            }
        }, 300);
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

    // ฟังก์ชันเล่นเสียงแจ้งเตือน
    const playSuccessSound = () => {
        try {
            // สร้าง Audio context สำหรับเสียงแจ้งเตือน
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // สร้างเสียงแจ้งเตือนแบบ beep ง่ายๆ
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // ตั้งค่าเสียง - โทนสูงสำหรับการแจ้งเตือนที่ชัดเจน
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz
            oscillator.type = 'sine';
            
            // ปรับระดับเสียงให้ไม่ดังเกินไป
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
            
            // เล่นเสียง
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);
            
            console.log('🔊 Success sound played');
        } catch (error) {
            console.log('Audio not supported or blocked:', error);
            // Fallback: ใช้ vibration หากรองรับ
            if (navigator.vibrate) {
                navigator.vibrate([200, 100, 200]);
            }
        }
    };

    // สแกน QR - แยกแยะอัตโนมัติ
    const handleQRCodeScan = async (decodedText) => {
        console.log('Scanned QR Code:', decodedText);
        
        // เล่นเสียงแจ้งเตือนทันที
        playSuccessSound();
        
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

        // Mobile-optimized scanner configuration with visible frame like UserScanner
        const scannerConfig = {
            fps: isMobile ? 5 : 10, // ลด fps สำหรับ mobile
            qrbox: function(viewfinderWidth, viewfinderHeight) {
                // สร้างกรอบ QR ที่มองเห็นได้ชัดเหมือน UserScanner
                let minEdgePercentage = 0.7; // 70% ของหน้าจอ
                let minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                let qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
                
                // สำหรับมือถือให้กรอบเล็กลงเล็กน้อย
                if (isMobile) {
                    qrboxSize = Math.min(qrboxSize, 280);
                    qrboxSize = Math.max(qrboxSize, 200); // ขั้นต่ำ 200px
                } else {
                    qrboxSize = Math.min(qrboxSize, 350);
                    qrboxSize = Math.max(qrboxSize, 250); // ขั้นต่ำ 250px
                }
                
                console.log(`📱 QR Box Size: ${qrboxSize}x${qrboxSize}, Mobile: ${isMobile}`);
                
                return {
                    width: qrboxSize,
                    height: qrboxSize
                };
            },
            aspectRatio: 1.0,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
            videoConstraints: {
                facingMode: 'environment',
                width: isMobile ? { ideal: 640 } : { ideal: 1280 },
                height: isMobile ? { ideal: 480 } : { ideal: 720 }
            },
            // เพิ่มการตั้งค่าเพื่อแสดงกรอบชัดเจน
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            defaultZoomValueIfSupported: 2,
            disableFlip: false,
            // เพิ่ม configuration สำหรับกรอบ
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
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
                
                <div className="gun-borrowing-card">
                    {/* สแกน QR Code แบบรวม - สแกนได้ทั้ง User และ Gun */}
                    <div className="qr-section">
                        <label className="qr-label">
                            สแกน QR Code (User หรือ Gun)
                        </label>
                        <div id="qr-reader" className={`qr-reader ${isScanning ? 'qr-reader-active' : ''}`}></div>
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
                                    <th style={{ width: "70%" }}>เลขอาวุธปืนสำรอง</th>
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
                                        <tr key={gun.gunId}>
                                            <td>{gun.gunId}</td>
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
                                                    onClick={() => handleDeletePublicGun(gun.gunId)}
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
                
                {/* ปุ่มพิมพ์รายงานและลบข้อมูล */}
                {savedRecords.all && savedRecords.all.length > 0 && (
                    <div style={{ borderTop: "1px solid #e0e0e0", paddingTop: 16 }}>
                        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
                            <button
                                onClick={printDailyReport}
                                style={{
                                    background: "#1976d2",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 6,
                                    padding: "10px 20px",
                                    cursor: "pointer",
                                    fontSize: "1rem",
                                    fontWeight: "500",
                                    minWidth: "160px"
                                }}
                            >
                                � สร้าง PDF
                            </button>
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
                                    fontWeight: "500",
                                    minWidth: "160px"
                                }}
                            >
                                🗑️ ลบข้อมูลทั้งวัน
                            </button>
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "#666", textAlign: "center" }}>
                            💡 พิมพ์รายงานก่อนลบข้อมูล | ⚠️ การลบจะไม่สามารถกู้คืนได้<br/>
                            📱 <strong>มือถือ:</strong> กดปุ่ม "📄 สร้าง PDF" แล้วหน้าบันทึก PDF จะเปิดทันที<br/>
                            💻 <strong>คอมพิวเตอร์:</strong> หน้าใหม่จะแสดงคำแนะนำและปุ่มบันทึก PDF
                        </div>
                    </div>
                )}
            </div>
            </div>
        </div>
    );

}
