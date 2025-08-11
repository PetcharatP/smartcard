import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useFastAuth } from '../hooks/useFastAuth';
import { hasPermission, PERMISSIONS, ROLES } from '../utils/permissions';
import './Home.css';

// --- EditPostForm Component ---
function EditPostForm({
  post,
  userid,
  isAdmin,
  onClose,
  onSuccess,
  showMessage
}) {
  const [title, setTitle] = useState(post.title || '');
  const [content, setContent] = useState(post.content || '');
  const [imageFiles, setImageFiles] = useState([]);
  const [imageBase64List, setImageBase64List] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(files);
    const readers = files.map(file => {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers).then(setImageBase64List);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      showMessage('กรุณากรอกเนื้อหาข่าวสาร', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('postId', post.id);
      formData.append('title', title);
      formData.append('content', content);
      formData.append('userid', userid);
      
      // เพิ่มไฟล์รูปภาพใหม่
      imageFiles.forEach(file => {
        formData.append('images', file);
      });

      console.log('Sending edit request for post:', post.id);
      const res = await fetch(`/api/edit-post`, {
        method: 'PUT',
        body: formData
      });

      const data = await res.json();
      console.log('Edit response:', data);

      if (res.ok && data.status) {
        showMessage('แก้ไขโพสต์สำเร็จ! ✏️', 'success');
        onSuccess();
        onClose();
      } else {
        throw new Error(data.message || 'Failed to update post');
      }
    } catch (error) {
      console.error('Edit post error:', error);
      showMessage(`เกิดข้อผิดพลาดขณะแก้ไขโพสต์: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)'
      }}>
        <h3 style={{
          margin: '0 0 20px 0',
          color: '#1e293b',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          แก้ไขโพสต์
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="หัวข้อข่าว (ไม่บังคับ)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '2px solid #f1f5f9',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '500',
                outline: 'none',
                transition: 'all 0.2s ease',
                background: '#fafafa'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#f1f5f9'}
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <textarea
              placeholder="เขียนข่าวสาร..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows="4"
              style={{
                width: '100%',
                padding: '16px',
                border: '2px solid #f1f5f9',
                borderRadius: '12px',
                fontSize: '16px',
                outline: 'none',
                resize: 'vertical',
                minHeight: '100px',
                fontFamily: 'inherit',
                lineHeight: '1.6',
                background: '#fafafa',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#f1f5f9'}
            />
          </div>

          {post.images?.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ marginBottom: '8px', fontWeight: '500', color: '#374151' }}>รูปภาพปัจจุบัน:</p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: '8px',
                marginBottom: '12px'
              }}>
                {post.images.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`current-${idx}`}
                    style={{
                      width: '100%',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid #e2e8f0'
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          
          <div style={{ marginBottom: '20px' }}>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageChange}
              style={{ display: 'none' }}
              id="editImageUpload"
            />
            <label
              htmlFor="editImageUpload"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: '#f8fafc',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                color: '#475569',
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#f1f5f9';
                e.target.style.borderColor = '#cbd5e1';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#f8fafc';
                e.target.style.borderColor = '#e2e8f0';
              }}
            >
              📎 เพิ่มรูปใหม่
            </label>
          </div>

          {imageBase64List.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '12px',
              marginBottom: '20px',
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px solid #e2e8f0'
            }}>
              {imageBase64List.map((imgSrc, idx) => (
                <div key={idx} style={{ position: 'relative' }}>
                  <img
                    src={imgSrc}
                    alt={`preview-${idx}`}
                    style={{
                      width: '100%',
                      height: '100px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid #e2e8f0'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newFiles = imageFiles.filter((_, i) => i !== idx);
                      const newBase64 = imageBase64List.filter((_, i) => i !== idx);
                      setImageFiles(newFiles);
                      setImageBase64List(newBase64);
                    }}
                    style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      width: '24px',
                      height: '24px',
                      background: 'rgba(0,0,0,0.7)',
                      border: 'none',
                      borderRadius: '50%',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: '2px solid #e2e8f0',
                borderRadius: '10px',
                color: '#64748b',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.color = '#475569';
              }}
              onMouseOut={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.color = '#64748b';
              }}
            >
              ยกเลิก
            </button>
            
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              style={{
                padding: '12px 24px',
                background: (!content.trim() || isSubmitting) ? '#e2e8f0' : '#3b82f6',
                border: 'none',
                borderRadius: '10px',
                color: (!content.trim() || isSubmitting) ? '#94a3b8' : 'white',
                fontWeight: '600',
                cursor: (!content.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '100px'
              }}
              onMouseOver={(e) => {
                if (!(!content.trim() || isSubmitting)) {
                  e.target.style.background = '#2563eb';
                }
              }}
              onMouseOut={(e) => {
                if (!(!content.trim() || isSubmitting)) {
                  e.target.style.background = '#3b82f6';
                }
              }}
            >
              {isSubmitting ? 'กำลังแก้ไข...' : 'บันทึก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- NewPostForm Component ---
function NewPostForm({
  title, setTitle,
  content, setContent,
  imageFiles, setImageFiles,
  imageBase64List, setImageBase64List,
  isExpanded, setIsExpanded,
  isSubmitting, setIsSubmitting,
  userid,
  fetchPosts,
  showMessage
}) {
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [currentCamera, setCurrentCamera] = useState('back'); // 'back' หรือ 'front'
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImageFiles(files);
    const readers = files.map(file => {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readers).then(setImageBase64List);
  };

  const startCamera = async (cameraType = 'back') => {
    try {
      setShowCamera(true);
      setCurrentCamera(cameraType);
      
      // หยุดกล้องเก่าก่อน (ถ้ามี)
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        video: cameraType === 'back' 
          ? { facingMode: { ideal: 'environment' } }
          : { facingMode: 'user' }
      };
      
      console.log(`🎥 เปิดกล้อง${cameraType === 'back' ? 'หลัง' : 'หน้า'}...`);
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      // รอให้ video element พร้อม
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(e => {
            console.error('Error playing video:', e);
          });
        }
      }, 100);
      
    } catch (error) {
      console.error('Error accessing camera:', error);
      setShowCamera(false);
      
      // แสดงข้อความข้อผิดพลาดที่เหมาะสม
      if (error.name === 'NotAllowedError') {
        showMessage('กรุณาอนุญาตให้เข้าถึงกล้องในเบราว์เซอร์', 'error');
      } else if (error.name === 'NotFoundError') {
        showMessage('ไม่พบกล้องในอุปกรณ์นี้', 'error');
      } else if (error.name === 'NotSupportedError') {
        showMessage('เบราว์เซอร์นี้ไม่รองรับการใช้งานกล้อง', 'error');
      } else {
        showMessage('ไม่สามารถเปิดกล้องได้ กรุณาลองใหม่อีกครั้ง', 'error');
      }
    }
  };

  const switchCamera = () => {
    const newCameraType = currentCamera === 'back' ? 'front' : 'back';
    startCamera(newCameraType);
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      setIsCapturing(true);
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // ตรวจสอบว่า video พร้อมใช้งาน
      if (video.readyState !== 4) {
        showMessage('กรุณารอสักครู่ให้กล้องเตรียมพร้อม', 'error');
        setIsCapturing(false);
        return;
      }
      
      // ตั้งค่าขนาด canvas ตามขนาดวิดีโอ
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      // วาดภาพจากวิดีโอลงใน canvas
      // สำหรับกล้องหน้า ให้กลับภาพแนวนอน
      if (currentCamera === 'front') {
        context.scale(-1, 1);
        context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
      } else {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      
      // แปลงเป็น blob และสร้างไฟล์
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const newFiles = [...imageFiles, file];
          setImageFiles(newFiles);
          
          // เพิ่มรูปใน preview
          const reader = new FileReader();
          reader.onloadend = () => {
            setImageBase64List(prev => [...prev, reader.result]);
          };
          reader.readAsDataURL(file);
          
          stopCamera();
          showMessage('ถ่ายรูปสำเร็จ! 📸', 'success');
        } else {
          showMessage('เกิดข้อผิดพลาดในการถ่ายรูป', 'error');
        }
        setIsCapturing(false);
      }, 'image/jpeg', 0.8);
    } else {
      showMessage('กล้องยังไม่พร้อม กรุณาลองใหม่อีกครั้ง', 'error');
      setIsCapturing(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) {
      showMessage('กรุณากรอกเนื้อหาข่าวสาร', 'error');
      return;
    }
    
    if (!userid) {
      showMessage('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title || '');
      formData.append('content', content);
      formData.append('userid', userid);
      
      // เพิ่มไฟล์รูปภาพ
      imageFiles.forEach(file => {
        formData.append('images', file);
      });
      
      console.log('📤 Sending post data:', {
        title: title || '',
        content: content.substring(0, 50) + '...',
        userid,
        filesCount: imageFiles.length
      });
      
      const res = await fetch('/api/post', {
        method: 'POST',
        body: formData
      });
      
      const responseText = await res.text();
      console.log('📥 Raw response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        throw new Error('Invalid response from server');
      }
      
      if (res.ok && data.status) {
        console.log('✅ Post created successfully');
        setTitle('');
        setContent('');
        setImageFiles([]);
        setImageBase64List([]);
        setIsExpanded(false);
        await fetchPosts();
        showMessage('โพสต์ข่าวสารสำเร็จ! 🎉', 'success');
      } else {
        console.error('❌ Server error:', data);
        throw new Error(data.message || 'Failed to create post');
      }
    } catch (error) {
      console.error('💥 Submit error:', error);
      showMessage(`เกิดข้อผิดพลาดขณะโพสต์: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="new-post-section">
      <AnimatePresence>
        {isExpanded ? (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              border: '1px solid #f1f5f9',
              marginBottom: '24px'
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="หัวข้อข่าว (ไม่บังคับ)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #f1f5f9',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '500',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  background: '#fafafa'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#f1f5f9'}
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <textarea
                placeholder="เขียนข่าวสาร..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows="4"
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '2px solid #f1f5f9',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  resize: 'vertical',
                  minHeight: '100px',
                  fontFamily: 'inherit',
                  lineHeight: '1.6',
                  background: '#fafafa',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#f1f5f9'}
              />
            </div>
            
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginBottom: '20px',
              flexWrap: 'wrap'
            }}>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
                id="imageUpload"
              />
              <label
                htmlFor="imageUpload"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: '#f8fafc',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  color: '#475569',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f1f5f9';
                  e.target.style.borderColor = '#cbd5e1';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#f8fafc';
                  e.target.style.borderColor = '#e2e8f0';
                }}
              >
                📎 เลือกรูป
              </label>
              
              <button
                type="button"
                onClick={() => startCamera('back')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: '#f8fafc',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  color: '#475569',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#f1f5f9';
                  e.target.style.borderColor = '#cbd5e1';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#f8fafc';
                  e.target.style.borderColor = '#e2e8f0';
                }}
              >
                📷 ถ่ายรูป
              </button>
            </div>
            
            {/* Camera Modal */}
            {showCamera && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.92)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
              }}>
                {/* Simple Header */}
                <div style={{
                  position: 'absolute',
                  top: '24px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '500',
                  opacity: '0.9'
                }}>
                  กล้อง{currentCamera === 'back' ? 'หลัง' : 'หน้า'}
                </div>

                {!stream ? (
                  <div style={{ 
                    color: 'white', 
                    fontSize: '16px', 
                    textAlign: 'center',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '32px',
                    borderRadius: '16px',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{ fontSize: '2rem', marginBottom: '16px' }}>�</div>
                    <div style={{ marginBottom: '8px' }}>กำลังเปิดกล้อง...</div>
                    <div style={{ fontSize: '14px', opacity: 0.7 }}>
                      อนุญาตการเข้าถึงกล้องในเบราว์เซอร์
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{
                        maxWidth: '90vw',
                        maxHeight: '65vh',
                        borderRadius: '16px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        transform: currentCamera === 'front' ? 'scaleX(-1)' : 'none'
                      }}
                    />
                    
                    {/* Minimal Controls */}
                    <div style={{ 
                      marginTop: '32px', 
                      display: 'flex', 
                      gap: '16px',
                      alignItems: 'center'
                    }}>
                      {/* Switch Camera */}
                      <button
                        type="button"
                        onClick={switchCamera}
                        style={{ 
                          width: '48px',
                          height: '48px',
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          border: 'none',
                          borderRadius: '50%',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          transition: 'all 0.2s ease',
                          backdropFilter: 'blur(10px)'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                      >
                        🔄
                      </button>
                      
                      {/* Capture Button */}
                      <button
                        type="button"
                        onClick={capturePhoto}
                        disabled={isCapturing}
                        style={{ 
                          width: '72px',
                          height: '72px',
                          backgroundColor: isCapturing ? 'rgba(255,255,255,0.3)' : 'white',
                          border: '4px solid rgba(255,255,255,0.3)',
                          borderRadius: '50%',
                          color: isCapturing ? 'rgba(0,0,0,0.5)' : '#000',
                          cursor: isCapturing ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '24px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {isCapturing ? '⏳' : '📸'}
                      </button>
                      
                      {/* Close Button */}
                      <button
                        type="button"
                        onClick={stopCamera}
                        style={{ 
                          width: '48px',
                          height: '48px',
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          border: 'none',
                          borderRadius: '50%',
                          color: 'white',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '20px',
                          transition: 'all 0.2s ease',
                          backdropFilter: 'blur(10px)'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
                      >
                        ✕
                      </button>
                    </div>
                  </>
                )}
                <canvas ref={canvasRef} style={{ display: 'none' }} />
              </div>
            )}
            {imageBase64List.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                gap: '12px',
                marginBottom: '20px',
                padding: '16px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0'
              }}>
                {imageBase64List.map((imgSrc, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <img
                      src={imgSrc}
                      alt={`preview-${idx}`}
                      style={{
                        width: '100%',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '2px solid #e2e8f0'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newFiles = imageFiles.filter((_, i) => i !== idx);
                        const newBase64 = imageBase64List.filter((_, i) => i !== idx);
                        setImageFiles(newFiles);
                        setImageBase64List(newBase64);
                      }}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        width: '24px',
                        height: '24px',
                        background: 'rgba(0,0,0,0.7)',
                        border: 'none',
                        borderRadius: '50%',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  setTitle('');
                  setContent('');
                  setImageFiles([]);
                  setImageBase64List([]);
                  setCurrentCamera('back');
                  stopCamera();
                }}
                style={{
                  padding: '12px 20px',
                  background: 'transparent',
                  border: '2px solid #e2e8f0',
                  borderRadius: '10px',
                  color: '#64748b',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.borderColor = '#cbd5e1';
                  e.target.style.color = '#475569';
                }}
                onMouseOut={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.color = '#64748b';
                }}
              >
                ยกเลิก
              </button>
              
              <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                style={{
                  padding: '12px 24px',
                  background: (!content.trim() || isSubmitting) ? '#e2e8f0' : '#3b82f6',
                  border: 'none',
                  borderRadius: '10px',
                  color: (!content.trim() || isSubmitting) ? '#94a3b8' : 'white',
                  fontWeight: '600',
                  cursor: (!content.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  minWidth: '100px'
                }}
                onMouseOver={(e) => {
                  if (!(!content.trim() || isSubmitting)) {
                    e.target.style.background = '#2563eb';
                  }
                }}
                onMouseOut={(e) => {
                  if (!(!content.trim() || isSubmitting)) {
                    e.target.style.background = '#3b82f6';
                  }
                }}
              >
                {isSubmitting ? 'กำลังโพสต์...' : 'โพสต์'}
              </button>
            </div>
          </motion.form>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            style={{
              width: '100%',
              padding: '16px',
              background: 'white',
              border: '2px solid #f1f5f9',
              borderRadius: '16px',
              color: '#64748b',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              marginBottom: '24px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}
            onMouseOver={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.background = '#fafafa';
            }}
            onMouseOut={(e) => {
              e.target.style.borderColor = '#f1f5f9';
              e.target.style.background = 'white';
            }}
          >
            ✍️ เขียนข่าวสาร...
          </button>
        )}
      </AnimatePresence>
    </section>
  );
}

// --- Main Home Component ---
export default function Home() {
  const { user, isLoading, loadProfileImage, profileImage } = useFastAuth(); // เพิ่ม loadProfileImage และ profileImage
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [imageBase64List, setImageBase64List] = useState([]);
  const [posts, setPosts] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userAvatarUrl, setUserAvatarUrl] = useState('');
  const [showPopup, setShowPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState('success'); // 'success' or 'error'
  const [editingPost, setEditingPost] = useState(null);
  const [likingPosts, setLikingPosts] = useState(new Set()); // เก็บ ID ของโพสต์ที่กำลังไลค์
  const navigate = useNavigate();

  // Helper functions สำหรับ role
  const getRoleText = (role) => {
    switch (role) {
      case ROLES.STUDENT: return '🎓 นักเรียน';
      case ROLES.TEACHER: return '👨‍🏫 อาจารย์';
      case ROLES.OFFICER: return '🎖️ นายทหาร';
      case ROLES.ADMIN: return '👑 ผู้ดูแลระบบ';
      default: return '✨ สมาชิก';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case ROLES.STUDENT: return '#3b82f6';
      case ROLES.TEACHER: return '#10b981';
      case ROLES.OFFICER: return '#f59e0b';
      case ROLES.ADMIN: return '#ef4444';
      default: return '#6b7280';
    }
  };

  // ใช้ user จาก useFastAuth
  const realname = user && user.realname ? user.realname : 'ผู้ใช้';
  const userid = user && (user.userid || user.username) ? (user.userid || user.username) : '';
  const isAdmin = user && (user.admin || user.role === ROLES.ADMIN);

  const showMessage = (message, type = 'success') => {
    setPopupMessage(message);
    setPopupType(type);
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
  };

  const fetchPosts = useCallback(async () => {
    try {
      console.log('🔄 Fetching posts...');
      const res = await fetch('/api/post');
      const data = await res.json();
      
      if (data.status && data.data) {
        console.log('✅ Posts loaded:', data.data.length, 'posts');
        setPosts(data.data);
      } else {
        console.log('❌ No posts data received');
        setPosts([]);
      }
    } catch (error) {
      console.error('� Error fetching posts:', error);
      setPosts([]);
    }
  }, []);

  // ฟังก์ชันดึงรูปโปรไฟล์โดยตรง
  const fetchUserProfileImage = useCallback(async () => {
    if (!user?.id || userAvatarUrl) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/user/profile?token=${encodeURIComponent(token)}&includeImage=true`);
      const data = await response.json();
      
      if (data.status && data.data.profileImage) {
        const imageData = `data:image/jpeg;base64,${data.data.profileImage}`;
        setUserAvatarUrl(imageData);
        console.log('🖼️ Direct profile image loaded');
      }
    } catch (error) {
      console.error('Error loading profile image directly:', error);
    }
  }, [user?.id, userAvatarUrl]);

  useEffect(() => {
    // รอให้ useFastAuth โหลดข้อมูลเสร็จก่อน
    if (isLoading) return;
    
    // ตรวจสอบ authentication จาก useFastAuth
    if (!user?.id && !user?.username) {
      navigate('/login');
      return;
    }

    // ดึง profile image
    if (user?.profileImage) {
      setUserAvatarUrl(`data:image/jpeg;base64,${user.profileImage}`);
    } else if (profileImage) {
      setUserAvatarUrl(profileImage);
    } else if (user && !profileImage) {
      // ดึงรูปโปรไฟล์จาก API เมื่อมี user แต่ยังไม่มีรูป
      loadProfileImage();
    }

    // เรียก fetchPosts เพียงครั้งเดียวเมื่อ user พร้อม
    console.log('� User ready, fetching posts once...');
    fetchPosts();
  }, [user?.id, isLoading, navigate, fetchPosts]);

  // useEffect แยกสำหรับ profile image - ไม่เรียก fetchPosts
  useEffect(() => {
    if (isLoading || !user) return;

    // ดึง profile image
    if (user?.profileImage) {
      setUserAvatarUrl(`data:image/jpeg;base64,${user.profileImage}`);
    } else if (profileImage) {
      setUserAvatarUrl(profileImage);
    } else {
      // ดึงรูปโปรไฟล์จาก API เมื่อมี user แต่ยังไม่มีรูป
      loadProfileImage();
    }
  }, [user?.profileImage, profileImage, loadProfileImage, isLoading, user]);

  // useEffect แยกสำหรับการอัปเดต profileImage
  useEffect(() => {
    if (profileImage && profileImage !== userAvatarUrl) {
      setUserAvatarUrl(profileImage);
      console.log('🖼️ Profile image updated in Home');
    } else if (user?.id && !userAvatarUrl && !profileImage) {
      // หาก useFastAuth ไม่มีรูป ให้ลองดึงโดยตรง
      fetchUserProfileImage();
    }
  }, [profileImage, user?.id, userAvatarUrl, fetchUserProfileImage]);

  const handleDeletePost = async (postId) => {
    if (!window.confirm('คุณต้องการลบโพสต์นี้ใช่หรือไม่?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/post/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        await fetchPosts();
        showMessage('ลบโพสต์สำเร็จแล้ว! 🗑️', 'success');
      } else {
        showMessage('ลบโพสต์ไม่สำเร็จ', 'error');
      }
    } catch {
      showMessage('เกิดข้อผิดพลาดขณะลบโพสต์', 'error');
    }
  };

  const handleLikePost = async (postId) => {
    // ป้องกันการกดซ้ำ
    if (likingPosts.has(postId)) {
      console.log('Already processing like for post:', postId);
      return;
    }

    try {
      // เพิ่ม postId เข้าไปใน likingPosts set
      setLikingPosts(prev => new Set([...prev, postId]));
      
      console.log('👍 Like request for post:', postId);
      
      const res = await fetch(`/api/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          postId: postId,
          userid: userid 
        }),
      });

      const data = await res.json();

      if (res.ok && data.status) {
        console.log('✅ Like updated successfully');
        
        // อัปเดต state ของ posts โดยใช้ข้อมูลจาก API โดยตรง
        setPosts(prevPosts => prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                likes: data.data.likes,
                likesBy: data.data.likesBy || []
              }
            : post
        ));
      } else {
        throw new Error(data.message || 'Failed to toggle like');
      }
    } catch (error) {
      console.error('💥 Like post error:', error);
      showMessage(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
    } finally {
      // ลบ postId ออกจาก likingPosts set
      setLikingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
    }
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
  };

  const handleCloseEditPost = () => {
    setEditingPost(null);
  };

  const handleEditSuccess = () => {
    fetchPosts();
  };

  // Helper function เพื่อตรวจสอบว่าผู้ใช้กดไลค์แล้วหรือไม่
  const isUserLiked = useCallback((post) => {
    if (!post.likesBy || !userid) return false;
    // เชื่อมั่นใน likesBy array เป็นหลัก
    return post.likesBy.some(id => String(id) === String(userid));
  }, [userid]);

  const openModal = (imgSrc) => {
    setModalImage(imgSrc);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalImage(null);
  };

  function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '20px'
    }}>
      {/* Loading State */}
      {isLoading && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
          flexDirection: 'column'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }}>
            🔄
          </div>
          <div style={{
            fontSize: '18px',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            กำลังโหลด...
          </div>
        </div>
      )}

      {/* Main Content */}
      {!isLoading && user && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* ส่วนโปรไฟล์ผู้ใช้ */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '24px',
        textAlign: 'center',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #f1f5f9'
      }}>
        <div style={{ 
          width: '80px', 
          height: '80px', 
          borderRadius: '50%', 
          margin: '0 auto 16px',
          background: '#f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          border: '3px solid #e2e8f0'
        }}>
          {userAvatarUrl ? (
            <img
              src={userAvatarUrl}
              alt="avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { 
                e.target.style.display = 'none';
                // ลองโหลดใหม่อีกครั้ง
                fetchUserProfileImage();
              }}
            />
          ) : (
            <div style={{ 
              fontSize: '32px', 
              color: '#94a3b8',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => {
              console.log('� Manual profile image reload');
              fetchUserProfileImage();
            }}
            title="คลิกเพื่อโหลดรูปโปรไฟล์"
            >
             👤
            </div>
          )}
        </div>
        <div style={{ 
          fontSize: '20px', 
          fontWeight: '600', 
          color: '#1e293b',
          marginBottom: '8px'
        }}>
          {realname}
        </div>
        
        {/* แสดง role และ permissions */}
        <div style={{ 
          fontSize: '14px', 
          color: 'white',
          background: getRoleColor(user?.role),
          padding: '6px 16px',
          borderRadius: '20px',
          display: 'inline-block',
          fontWeight: '600',
          marginBottom: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          {getRoleText(user?.role)}
        </div>

        {/* แสดงสิทธิ์ตาม role */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          padding: '16px',
          margin: '16px 0',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#374151',
            marginBottom: '8px'
          }}>
            🔑 สิทธิ์การเข้าถึง
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
            {user?.role === ROLES.STUDENT && (
              <>
                <span style={{ fontSize: '12px', background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                  ✏️ แก้ไขโปรไฟล์
                </span>
                <span style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                  📊 เพิ่มสรุปยอด
                </span>
                <span style={{ fontSize: '12px', background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                  👁️ ดูคลังอาวุธ
                </span>
              </>
            )}
            {user?.role === ROLES.TEACHER && (
              <>
                <span style={{ fontSize: '12px', background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                  👥 ดูข้อมูลผู้ใช้
                </span>
                <span style={{ fontSize: '12px', background: '#fecaca', color: '#b91c1c', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                  ➖ ตัดคะแนน
                </span>
                <span style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                  📊 ดูสรุปยอด
                </span>
              </>
            )}
            {user?.role === ROLES.OFFICER && (
              <>
                <span style={{ fontSize: '12px', background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                  👥 ดูข้อมูลผู้ใช้
                </span>
                <span style={{ fontSize: '12px', background: '#fecaca', color: '#b91c1c', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                  ➖ ตัดคะแนน
                </span>
                <span style={{ fontSize: '12px', background: '#f3e8ff', color: '#7c3aed', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                  🔫 จัดการคลังอาวุธ
                </span>
                <span style={{ fontSize: '12px', background: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                  📊 ดูสรุปยอด
                </span>
              </>
            )}
            {(user?.role === ROLES.ADMIN || user?.admin) && (
              <span style={{ fontSize: '12px', background: '#fecaca', color: '#b91c1c', padding: '4px 8px', borderRadius: '12px', fontWeight: '500' }}>
                👑 สิทธิ์เต็มรูปแบบ
              </span>
            )}
          </div>
        </div>
      </div>

      {/* New Post Form อยู่บนสุด */}
      <div style={{ width: '100%', maxWidth: 4500, margin: '0 auto' }}>
        <NewPostForm
          title={title}
          setTitle={setTitle}
          content={content}
          setContent={setContent}
          imageFiles={imageFiles}
          setImageFiles={setImageFiles}
          imageBase64List={imageBase64List}
          setImageBase64List={setImageBase64List}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
          userid={userid}
          fetchPosts={fetchPosts}
          showMessage={showMessage}
        />
      </div>

      {/* ส่วนแสดงโพสต์ */}
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <section style={{ marginTop: '8px' }}>
          <h2 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: '#374151', 
            marginBottom: '20px', 
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            📰 ข่าวสารล่าสุด
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {posts.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#9ca3af',
                padding: '48px 20px',
                background: 'white',
                borderRadius: '16px',
                border: '2px dashed #e5e7eb'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                <div style={{ fontSize: '16px', fontWeight: '500' }}>ยังไม่มีข่าวสาร</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>เป็นคนแรกที่แชร์ข่าวสารกันเลย!</div>
              </div>
            ) : (
              <AnimatePresence>
                {posts.map((post) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{
                      background: 'white',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      border: '1px solid #f1f5f9',
                      position: 'relative'
                    }}
                  >
                    {/* วันที่ที่มุมขวาบน */}
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      fontSize: '12px',
                      color: '#6b7280',
                      background: '#f8fafc',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontWeight: '500'
                    }}>
                      {new Date(post.date).toLocaleDateString('th-TH')}
                    </div>

                    {post.title && (
                      <h3 style={{ 
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#1e293b',
                        marginBottom: '12px',
                        lineHeight: '1.4',
                        marginRight: '80px' // เว้นที่สำหรับวันที่
                      }}>
                        {post.title}
                      </h3>
                    )}
                    
                    <p style={{ 
                      fontSize: '16px',
                      color: '#374151',
                      lineHeight: '1.6',
                      marginBottom: post.images?.length > 0 ? '16px' : '20px',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {linkify(post.content)}
                    </p>
                    
                    {post.images?.length > 0 && (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: post.images.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '12px',
                        marginBottom: '20px'
                      }}>
                        {post.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`โพสต์ ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: post.images.length === 1 ? 'auto' : '200px',
                              objectFit: 'cover',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              transition: 'transform 0.2s ease',
                              border: '1px solid #e2e8f0'
                            }}
                            onClick={() => openModal(img)}
                            onMouseOver={(e) => e.target.style.transform = 'scale(1.02)'}
                            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                          />
                        ))}
                      </div>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '16px',
                      borderTop: '1px solid #f1f5f9'
                    }}>
                      <div style={{ 
                        fontSize: '14px',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span style={{ 
                          background: '#f3f4f6',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontWeight: '500'
                        }}>
                          {post.postedBy}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* Like Button */}
                        <button
                          onClick={() => handleLikePost(post.id)}
                          disabled={likingPosts.has(post.id)}
                          style={{
                            padding: '8px 12px',
                            background: likingPosts.has(post.id) 
                              ? '#f3f4f6' 
                              : isUserLiked(post) ? '#fef3f2' : '#f8fafc',
                            border: `1px solid ${likingPosts.has(post.id) 
                              ? '#d1d5db' 
                              : isUserLiked(post) ? '#fecaca' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            color: likingPosts.has(post.id) 
                              ? '#9ca3af' 
                              : isUserLiked(post) ? '#dc2626' : '#64748b',
                            cursor: likingPosts.has(post.id) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '14px',
                            fontWeight: '500',
                            transition: 'all 0.2s ease',
                            opacity: likingPosts.has(post.id) ? 0.7 : 1
                          }}
                          onMouseOver={(e) => {
                            if (!likingPosts.has(post.id)) {
                              if (isUserLiked(post)) {
                                e.target.style.background = '#fee2e2';
                                e.target.style.borderColor = '#fca5a5';
                              } else {
                                e.target.style.background = '#f1f5f9';
                                e.target.style.borderColor = '#cbd5e1';
                              }
                            }
                          }}
                          onMouseOut={(e) => {
                            if (!likingPosts.has(post.id)) {
                              if (isUserLiked(post)) {
                                e.target.style.background = '#fef3f2';
                                e.target.style.borderColor = '#fecaca';
                              } else {
                                e.target.style.background = '#f8fafc';
                                e.target.style.borderColor = '#e2e8f0';
                              }
                            }
                          }}
                          title={likingPosts.has(post.id) 
                            ? 'กำลังประมวลผล...' 
                            : isUserLiked(post) ? 'ยกเลิกไลค์' : 'กดไลค์'}
                        >
                          {likingPosts.has(post.id) 
                            ? '⏳' 
                            : isUserLiked(post) ? '❤️' : '🤍'}
                          <span>{post.likes || 0}</span>
                        </button>

                        {/* Edit Button */}
                        {(isAdmin || String(post.userid) === String(userid)) && (
                          <button
                            onClick={() => handleEditPost(post)}
                            style={{
                              padding: '8px',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '8px',
                              color: '#2563eb',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.target.style.background = '#dbeafe';
                              e.target.style.borderColor = '#93c5fd';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.background = '#eff6ff';
                              e.target.style.borderColor = '#bfdbfe';
                            }}
                            title="แก้ไขโพสต์"
                          >
                            ✏️
                          </button>
                        )}

                        {/* Delete Button */}
                        {(isAdmin || String(post.userid) === String(userid)) && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            style={{
                              padding: '8px',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                              borderRadius: '8px',
                              color: '#dc2626',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                              e.target.style.background = '#fee2e2';
                              e.target.style.borderColor = '#fca5a5';
                            }}
                            onMouseOut={(e) => {
                              e.target.style.background = '#fef2f2';
                              e.target.style.borderColor = '#fecaca';
                            }}
                            title="ลบโพสต์"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </section>
        {modalOpen && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }} onClick={closeModal}>
            <img
              src={modalImage}
              alt="expanded"
              style={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>

      {/* Custom Popup */}
      {showPopup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
            textAlign: 'center',
            maxWidth: '400px',
            margin: '20px',
            border: `3px solid ${popupType === 'success' ? '#10b981' : '#ef4444'}`
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '16px'
            }}>
              {popupType === 'success' ? '✅' : '❌'}
            </div>
            <h3 style={{
              margin: '0 0 12px 0',
              color: popupType === 'success' ? '#10b981' : '#ef4444',
              fontSize: '1.25rem',
              fontWeight: '600'
            }}>
              {popupType === 'success' ? 'สำเร็จ!' : 'เกิดข้อผิดพลาด!'}
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              color: '#6b7280',
              fontSize: '1rem',
              lineHeight: '1.5'
            }}>
              {popupMessage}
            </p>
            <button
              onClick={closePopup}
              style={{
                backgroundColor: popupType === 'success' ? '#10b981' : '#ef4444',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                minWidth: '100px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.opacity = '0.9'}
              onMouseOut={(e) => e.target.style.opacity = '1'}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {editingPost && (
        <EditPostForm
          post={editingPost}
          userid={userid}
          isAdmin={isAdmin}
          onClose={handleCloseEditPost}
          onSuccess={handleEditSuccess}
          showMessage={showMessage}
        />
      )}
        </div>
      )}
    </div>
  );
}