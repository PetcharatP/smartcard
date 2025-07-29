import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import './Home.css';

// --- NewPostForm Component ---
function NewPostForm({
  title, setTitle,
  content, setContent,
  imageFiles, setImageFiles,
  imageBase64List, setImageBase64List,
  isExpanded, setIsExpanded,
  isSubmitting, setIsSubmitting,
  userid,
  fetchPosts
}) {
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
  const apiUrl = import.meta.env.VITE_API_URL || 'http://103.91.205.153:3000';
  
  console.log('🔍 Home - API URL:', apiUrl);
  console.log('🔍 Home - Environment:', import.meta.env.VITE_API_URL);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    
    // ตรวจสอบว่ามี userid หรือไม่
    if (!userid) {
      alert('ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่');
      return;
    }
    
    setIsSubmitting(true);
    try {
      console.log('📤 Posting to:', `${apiUrl}/api/post`);
      console.log('📤 Data to send:', { title, content, userid, images: imageFiles.length });
      
      // ใช้ FormData เพื่อส่งรูปภาพ
      const formData = new FormData();
      formData.append('title', title || 'ไม่มีหัวข้อ');
      formData.append('content', content);
      formData.append('userid', userid);
      
      // เพิ่มรูปภาพ
      imageFiles.forEach((file, index) => {
        formData.append('images', file);
        console.log(`📸 Added image ${index + 1}:`, file.name);
      });
      
      const res = await fetch(`${apiUrl}/api/post`, {
        method: 'POST',
        body: formData // ไม่ต้องใส่ Content-Type ให้ browser ตั้งค่าเอง
      });
      const data = await res.json();
      console.log('📤 Post response:', data);
      if (res.ok) {
        console.log('✅ Post created successfully');
        setTitle('');
        setContent('');
        setImageFiles([]);
        setImageBase64List([]);
        setIsExpanded(false);
        await fetchPosts();
      } else {
        console.error('❌ Post creation failed:', data);
        alert('เกิดข้อผิดพลาดขณะโพสต์: ' + (data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Post error:', error);
      alert('เกิดข้อผิดพลาดขณะโพสต์');
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
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="post-form"
          >
            <input
              type="text"
              placeholder="หัวข้อข่าว"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
            <textarea
              placeholder="เขียนอะไรลงไป..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows="4"
              className="textarea"
            />
            <div style={{ marginBottom: '0.75rem' }}>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="imageUpload"
              />
              <label
                htmlFor="imageUpload"
                className="btn"
                style={{ background: '#e0e7ff', color: '#2563eb', fontWeight: 600, cursor: 'pointer' }}
              >
                เลือกรูปภาพ
              </label>
            </div>
            {imageBase64List.length > 0 && (
              <div className="post-images">
                {imageBase64List.map((imgSrc, idx) => (
                  <img
                    key={idx}
                    src={imgSrc}
                    alt={`preview-${idx}`}
                    className="post-image"
                  />
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  setTitle('');
                  setContent('');
                  setImageFiles([]);
                  setImageBase64List([]);
                }}
                className="btn"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={!content.trim() || isSubmitting}
                className="btn btn-primary"
              >
                {isSubmitting ? 'กำลังโพสต์...' : 'โพสต์'}
              </button>
            </div>
          </motion.form>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="btn"
            style={{ width: '100%', marginBottom: '1.5rem' }}
          >
            เขียนโพสต์ใหม่...
          </button>
        )}
      </AnimatePresence>
    </section>
  );
}

// --- Main Home Component ---
export default function Home() {
  const [realname, setRealname] = useState('');
  const [userid, setUserId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
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
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('Token from localStorage:', token, 'Type:', typeof token);
    
    if (!token || token === 'null' || token === 'undefined') {
      console.log('No valid token found, redirecting to login');
      navigate('/login');
      return;
    }

    // ตรวจสอบว่า token เป็น string จริงๆ
    const tokenString = typeof token === 'string' ? token : JSON.stringify(token);
    console.log('Using token:', tokenString.substring(0, 30) + '...');
    
    fetch(`${apiUrl}/api/user/${tokenString}`)
      .then(res => res.json())
      .then(data => {
        console.log('API Response:', data);
        if (data.status && data.data) {
          setRealname(data.data.realname);
          setUserId(data.data.userid);
          setIsAdmin(data.data.admin);
          if (data.data.profileImage) {
            setUserAvatarUrl(`data:image/jpeg;base64,${data.data.profileImage}`);
          } else if (data.data.avatar) {
            setUserAvatarUrl(data.data.avatar);
          }
        } else {
          localStorage.removeItem('token');
          navigate('/login');
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        navigate('/login');
      });
    fetchPosts();
    // eslint-disable-next-line
  }, []);

  const fetchPosts = async () => {
    try {
      console.log('🔄 Fetching posts from:', `${apiUrl}/api/post`);
      const res = await fetch(`${apiUrl}/api/post`);
      const data = await res.json();
      console.log('📝 Posts response:', data);
      
      // แก้ไข: API ส่งกลับมาเป็น {status: true, data: [...]} ไม่ใช่ {success: true}
      if (data.status && data.data) {
        setPosts(data.data);
        console.log('✅ Posts loaded:', data.data.length, 'posts');
      } else {
        console.error('❌ Posts fetch failed:', data);
        setPosts([]); // ตั้งค่าเป็น array ว่างถ้าไม่มีข้อมูล
      }
    } catch (error) {
      console.error('❌ Posts fetch error:', error);
      setPosts([]); // ตั้งค่าเป็น array ว่างถ้าเกิด error
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('คุณต้องการลบโพสต์นี้ใช่หรือไม่?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiUrl}/api/post/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        await fetchPosts();
      } else {
        alert('ลบโพสต์ไม่สำเร็จ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดขณะลบโพสต์');
    }
  };

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
    <div className="home-bg">
      {/* ส่วนโปรไฟล์ผู้ใช้ */}
      <div className="profile-section">
        <div className="profile-avatar-center">
          <img
            src={userAvatarUrl}
            alt="avatar"
            className="avatar-img"
            onError={e => { e.target.onerror = null; }}
          />
        </div>
        <div className="profile-info-center">
          <div className="profile-name">{realname || 'ชื่อผู้ใช้'}</div>
          <div className="profile-grade">{isAdmin ? 'Admin' : 'สมาชิกทั่วไป'}</div>
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
        />
      </div>

      {/* ส่วนแสดงโพสต์ */}
      <div className="home-container">
        <section className="all-posts-section" style={{ marginTop: '0.1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', marginBottom: '1rem', textAlign: 'center' }}>
            ข่าวสารทั้งหมด
          </h2>
          <div>
            {posts.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#64748b' }}>ยังไม่มีข่าวสาร</p>
            ) : (
              <AnimatePresence>
                {posts.map((post) => (
                  <motion.div
                    key={post.id}
                    className="post-card"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -30 }}
                    transition={{ duration: 0.4 }}
                    layout
                  >
                    <h3 className="post-title">{post.title || '(ไม่มีหัวข้อ)'}</h3>
                    <p className="post-content">{linkify(post.content)}</p>
                    {post.images?.length > 0 && (
                      <div className="post-images">
                        {post.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`โพสต์ ${idx + 1}`}
                            className="post-image"
                            onClick={() => openModal(img)}
                          />
                        ))}
                      </div>
                    )}
                    <div className="post-meta">
                      โพสต์โดย: {post.postedBy} | {new Date(post.date).toLocaleString()}
                    </div>
                    {(isAdmin || String(post.userid) === String(userid)) && (
                      <button
                        className="btn btn-danger"
                        style={{ marginTop: 8, padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => handleDeletePost(post.id)}
                        title="ลบโพสต์"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M9 3a3 3 0 0 1 6 0h5a1 1 0 1 1 0 2h-1.05l-1.2 14.39A3 3 0 0 1 14.76 22H9.24a3 3 0 0 1-2.99-2.61L5.05 5H4a1 1 0 1 1 0-2h5Zm2 0a1 1 0 0 1 2 0h-2Zm-4.95 2 1.2 14.39A1 1 0 0 0 9.24 20h5.52a1 1 0 0 0 .99-.89L16.95 5H7.05ZM9 9a1 1 0 0 1 2 0v6a1 1 0 1 1-2 0V9Zm4 0a1 1 0 1 1 2 0v6a1 1 0 1 1-2 0V9Z"/>
                        </svg>
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </section>
        {modalOpen && (
          <div className="modal-bg" onClick={closeModal}>
            <img
              src={modalImage}
              alt="expanded"
              className="modal-img"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
}