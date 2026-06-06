import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Save, Upload, Plus, Trash2, Edit3, Image as ImageIcon, Music as MusicIcon, Layout, LogOut, CheckCircle, AlertCircle, X, ChevronUp, ChevronDown, Compass, Info as InfoIcon, Undo2, RotateCcw, Youtube as VideoIcon, Calendar, MessageSquare, Link as LinkIcon, Cloud, Search, Music, FileText, Database, Copy, Check, Eye } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { collection, query, getDocs, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';

const Notification: React.FC<{ message: string; type: 'success' | 'error'; onClear: () => void }> = ({ message, type, onClear }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, x: '-50%' }}
    animate={{ opacity: 1, y: 0, x: '-50%' }}
    exit={{ opacity: 0, y: 20, x: '-50%' }}
    className={`fixed bottom-10 left-1/2 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border ${
      type === 'success' 
        ? 'bg-green-500/10 border-green-500/20 text-green-400' 
        : 'bg-red-500/10 border-red-500/20 text-red-400'
    }`}
  >
    {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
    <span className="text-sm font-bold tracking-tight">{message}</span>
    <button onClick={onClear} className="ml-4 opacity-50 hover:opacity-100">
      <X className="w-4 h-4" />
    </button>
  </motion.div>
);

const ProgressIndicator: React.FC<{ progress: number; fileName?: string }> = ({ progress, fileName }) => (
  <div className="w-full mt-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
    <div className="flex justify-between items-center mb-2">
      <div className="flex items-center gap-2 overflow-hidden">
        <Upload className="w-3 h-3 text-accent shrink-0" />
        <span className="text-[10px] font-bold text-secondary uppercase tracking-widest truncate">
          {fileName ? fileName : 'Uploading...'}
        </span>
      </div>
      <span className="text-[10px] font-bold text-accent">{progress}%</span>
    </div>
    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        className="h-full bg-accent"
      />
    </div>
  </div>
);

const Admin = () => {
  const { 
    content, 
    updateContent, 
    uploadFile, 
    isAdmin, 
    login, 
    logout, 
    user, 
    existingFiles,
    googleAccessToken,
    loginWithGoogleDrive,
    listDriveFiles,
    listForms,
    openPicker
  } = useContent();
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'music' | 'videos' | 'booking' | 'contact' | 'gallery' | 'footer' | 'forms' | 'pages'>('home');
  const [localContent, setLocalContent] = useState(content);
  const [history, setHistory] = useState<any[]>([]);
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const isUndoing = useRef(false);
  const lastStateRef = useRef(content);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingAlbumId, setEditingAlbumId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [sqlCopied, setSqlCopied] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    database: { status: string; details: string };
    storage: { status: string; details: string };
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const fetchSupabaseStatus = async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch('/api/supabase-status');
      if (res.ok) {
        const data = await res.json();
        setSupabaseStatus(data);
      }
    } catch (err) {
      console.error('Failed to load Supabase status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isBrowsingDrive, setIsBrowsingDrive] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');
  const [onDriveFileSelect, setOnDriveFileSelect] = useState<(url: string) => void>(() => () => {});

  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<any[]>([]);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  const fetchSubmissions = async () => {
    if (!isAdmin) return;
    setLoadingSubmissions(true);
    setSubmissionsError(null);
    try {
      const bQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
      const bSnap = await getDocs(bQuery);
      setBookingRequests(bSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const mQuery = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
      const mSnap = await getDocs(mQuery);
      setContactMessages(mSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const sQuery = query(collection(db, 'subscribers'), orderBy('createdAt', 'desc'));
      const sSnap = await getDocs(sQuery);
      setNewsletterSubscribers(sSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error: any) {
      console.warn('Error fetching inquiries:', error);
      setSubmissionsError('Inquiries restricted. Connect your admin credential account to unlock.');
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchSubmissions();
    }
  }, [isAdmin, firebaseUser]);

  const handleFirebaseAuth = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      showNotification('Authenticated with Firestore Database!', 'success');
    } catch (error: any) {
      showNotification(`Authentication failed: ${error.message}`, 'error');
    }
  };

  const handleUpdateBookingStatus = async (id: string, newStatus: string) => {
    try {
      const docRef = doc(db, 'bookings', id);
      await updateDoc(docRef, { status: newStatus });
      showNotification(`Status modified to ${newStatus}!`, 'success');
      fetchSubmissions();
    } catch (err: any) {
      showNotification(`Failed to update booking: ${err.message}`, 'error');
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!window.confirm('Delete this booking inquiry permanently?')) return;
    try {
      const docRef = doc(db, 'bookings', id);
      await deleteDoc(docRef);
      showNotification(`Booking deleted.`, 'success');
      fetchSubmissions();
    } catch (err: any) {
      showNotification(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteContactMessage = async (id: string) => {
    if (!window.confirm('Delete this contact message permanently?')) return;
    try {
      const docRef = doc(db, 'contacts', id);
      await deleteDoc(docRef);
      showNotification(`Message deleted.`, 'success');
      fetchSubmissions();
    } catch (err: any) {
      showNotification(`Delete failed: ${err.message}`, 'error');
    }
  };

  const handleDeleteSubscriber = async (id: string) => {
    if (!window.confirm('Remove this email subscription?')) return;
    try {
      const docRef = doc(db, 'subscribers', id);
      await deleteDoc(docRef);
      showNotification(`Subscriber removed.`, 'success');
      fetchSubmissions();
    } catch (err: any) {
      showNotification(`Delete failed: ${err.message}`, 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Sync local content when it loads or updates (if no edits made)
  useEffect(() => {
    if (content) {
      if (!localContent || history.length === 0) {
        setLocalContent(content);
        lastStateRef.current = content;
      }
    }
  }, [content, history.length]);

  // Handle history tracking with debouncing
  useEffect(() => {
    if (!localContent) return;
    
    // Don't push to history if we're in the middle of an undo or if state hasn't changed
    if (isUndoing.current) {
      isUndoing.current = false;
      lastStateRef.current = localContent;
      return;
    }

    if (JSON.stringify(localContent) === JSON.stringify(lastStateRef.current)) {
      return;
    }

    const timer = setTimeout(() => {
      setHistory(prev => {
        // Keep unique states in history
        const newState = lastStateRef.current;
        if (!newState) return prev;
        return [...prev, newState].slice(-50);
      });
      lastStateRef.current = localContent;
    }, 800); // 800ms debounce for history snapshots

    return () => clearTimeout(timer);
  }, [localContent]);

  // Keyboard shortcut for Undo (Ctrl+Z / Cmd+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (history.length > 0 && !isSaving) {
          e.preventDefault();
          handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, isSaving]);

  useEffect(() => {
    fetchSupabaseStatus();
  }, [isAdmin]);

  if (!isAdmin) {
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginLoading(true);
      try {
        const success = await login(password);
        if (success) {
          showNotification('Successfully authenticated as Admin!', 'success');
        } else {
          showNotification('Invalid admin password. Please try again.', 'error');
        }
      } catch (error: any) {
        showNotification(`Login failed: ${error.message || 'An error occurred'}`, 'error');
      } finally {
        setLoginLoading(false);
      }
    };

    return (
      <div className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center">
        <AnimatePresence>
          {notification && (
            <Notification 
              message={notification.message} 
              type={notification.type} 
              onClear={() => setNotification(null)} 
            />
          )}
        </AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-10 rounded-3xl max-w-md w-full"
        >
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-accent" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-bold text-center mb-2">Admin Access</h1>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6 animate-pulse">
            <p className="text-emerald-500 text-[10px] uppercase font-bold tracking-widest mb-1 text-center">Server Storage Active</p>
            <p className="text-secondary text-xs text-center leading-relaxed">
              Your edits, tracks, and images are stored locally and securely on the server-side. Saves are fast and reliable.
            </p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-secondary text-[10px] uppercase font-bold tracking-widest mb-2">Admin Password</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:border-accent text-white placeholder-white/20 outline-none transition-colors"
                disabled={loginLoading}
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={loginLoading}
              className="w-full py-4 bg-white text-black font-bold tracking-widest rounded-xl hover:bg-accent hover:text-white transition-all uppercase text-[10px] disabled:opacity-50"
            >
              {loginLoading ? 'Authenticating...' : 'Access Dashboard'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  if (!localContent) return null;

  const updateLocalContent = (newContent: any) => {
    setLocalContent(newContent);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    isUndoing.current = true;
    setHistory(prev => prev.slice(0, -1));
    setLocalContent(previous);
    lastStateRef.current = previous;
    showNotification('Restored previous state', 'success');
  };

  const handleSave = async () => {
    if (!isAdmin) {
      showNotification('Save failed: You do not have admin permissions.', 'error');
      return;
    }

    try {
      setIsSaving(true);
      console.log('Sending update request with content:', localContent);
      const result = await updateContent(localContent);
      if (result.success) {
        if (result.warning) {
          // Saved locally but has Supabase warning
          showNotification(result.warning, 'error');
        } else {
          showNotification('Content updated successfully to Supabase and Server!', 'success');
        }
        setHistory([]); // Clear history on successful save
      } else {
        showNotification(result.warning || 'Failed to update content. Ensure your Supabase site_content table has been created.', 'error');
      }
    } catch (error: any) {
      console.error('Critical Save Error:', error);
      const msg = error.message ? (error.message.includes('{') ? 'Supabase Permission Denied' : error.message) : 'A system error occurred while saving.';
      showNotification(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'audio', callback: (url: string, file: File) => void) => {
    if (!isAdmin) return;
    const fileId = `${file.name}-${Date.now()}`;
    setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));

    try {
      const folder = type === 'audio' ? 'tracks' : 'images';
      const url = await uploadFile(file, folder, (progress) => {
        setUploadProgress(prev => ({ ...prev, [fileId]: progress }));
      });

      if (url) {
        callback(url, file);
        showNotification(`${file.name} uploaded successfully`, 'success');
      } else {
        showNotification(`Failed to upload ${file.name}. Check your connection or file size.`, 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showNotification(`An unexpected error occurred during upload.`, 'error');
    } finally {
      setTimeout(() => {
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
      }, 2000);
    }
  };

  const onDrop = (e: React.DragEvent, type: 'image' | 'audio', callback: (url: string, file: File) => void) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (type === 'image' && !file.type.startsWith('image/')) return;
      if (type === 'audio' && !file.type.startsWith('audio/')) return;
      handleFileUpload(file, type, callback);
    }
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput) return;
    
    if (!imageUrlInput.startsWith('http')) {
      showNotification('Please enter a valid URL starting with http:// or https://', 'error');
      return;
    }

    const newImage = {
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      url: imageUrlInput,
      caption: "",
      altText: ""
    };

    updateLocalContent({
      ...localContent,
      images: { 
        ...localContent.images, 
        gallery: [...(localContent.images.gallery || []), newImage] 
      }
    });

    setImageUrlInput('');
    setShowUrlInput(false);
    showNotification('Image added to gallery from link', 'success');
  };

  const handleAddVideoUrl = () => {
    if (!videoUrlInput) return;
    
    if (!videoUrlInput.startsWith('http')) {
      showNotification('Please enter a valid URL (starting with http:// or https://)', 'error');
      return;
    }

    const newVideo = {
      id: `vid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      youtubeUrl: videoUrlInput,
      title: "New Video",
      description: ""
    };

    updateLocalContent({
      ...localContent,
      videos: [...(localContent.videos || []), newVideo]
    });

    setVideoUrlInput('');
    setShowUrlInput(false);
    showNotification('Video added from link', 'success');
  };

  const handleDriveBrowse = async (onSelect: (url: string) => void, type: 'audio' | 'image' | 'any' = 'any') => {
    let token = googleAccessToken;
    if (!token) {
      try {
        token = await loginWithGoogleDrive();
      } catch (err) {
        showNotification('Drive login failed', 'error');
        return;
      }
    }

    if (token) {
      const mimeTypes = 
        type === 'audio' ? ['audio/*'] : 
        type === 'image' ? ['image/*'] : 
        ['audio/*', 'image/*', 'application/pdf', 'application/vnd.google-apps.form'];

      try {
        const doc = await openPicker(token, mimeTypes);
        if (doc) {
          const url = doc.url || `https://drive.google.com/uc?id=${doc.id}&export=download`;
          onSelect(url);
          showNotification('File selected from Drive', 'success');
        }
      } catch (err) {
        console.error('Picker error:', err);
        // Fallback to custom browser if picker fails
        setOnDriveFileSelect(() => onSelect);
        setIsBrowsingDrive(true);
        const files = await listDriveFiles(token);
        setDriveFiles(files);
      }
    }
  };

  const isFileMissing = (url: string) => {
    if (!url || !url.startsWith('/uploads/')) return false;
    const fileName = url.replace('/uploads/', '');
    return !existingFiles.includes(fileName);
  };

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <AnimatePresence>
        {isBrowsingDrive && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setIsBrowsingDrive(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">Google Drive Browser</h3>
                  <p className="text-xs text-secondary">Pick an audio file to use as a track</p>
                </div>
                <button 
                  onClick={() => setIsBrowsingDrive(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4 border-b border-white/5 bg-white/5">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
                  <input 
                    type="text"
                    placeholder="Search your drive..."
                    value={driveSearch}
                    onChange={(e) => setDriveSearch(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {driveFiles.filter(f => f.name.toLowerCase().includes(driveSearch.toLowerCase())).length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {driveFiles
                      .filter(f => f.name.toLowerCase().includes(driveSearch.toLowerCase()))
                      .map((file) => (
                        <button
                          key={file.id}
                          onClick={() => onDriveFileSelect(file.webContentLink || `https://drive.google.com/uc?id=${file.id}&export=download`)}
                          className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-left group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                            {file.mimeType.startsWith('audio/') ? (
                              <Music className="w-6 h-6 text-accent" />
                            ) : (
                              <Cloud className="w-6 h-6 text-secondary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold truncate text-sm">{file.name}</h4>
                            <p className="text-[10px] text-secondary/60 uppercase tracking-widest">{file.mimeType.split('/')[1]}</p>
                          </div>
                          <div className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                            Select
                          </div>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-secondary">
                    <Cloud className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">No audio files found or searching...</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <Notification 
            message={notification.message} 
            type={notification.type} 
            onClear={() => setNotification(null)} 
          />
        )}
      </AnimatePresence>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight">Dashboard</h1>
            <p className="text-secondary mt-2">Manage your music, images, and content.</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                window.location.reload();
              }}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-secondary"
              title="Reload data from server"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            {history.length > 0 && (
              <button 
                onClick={handleUndo}
                className="flex items-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-secondary hover:text-white hover:bg-white/10 rounded-full transition-all text-[10px] font-bold tracking-widest uppercase"
                title="Undo last change"
              >
                <Undo2 className="w-4 h-4" /> Undo
              </button>
            )}
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold text-[10px] tracking-widest rounded-full hover:bg-accent hover:text-white transition-all uppercase disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
            <button 
              onClick={logout}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-secondary"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1 space-y-2">
            {[
              { id: 'home', label: 'Homepage', icon: Layout },
              { id: 'about', label: 'About Page', icon: Edit3 },
              { id: 'music', label: 'Music & Tracks', icon: MusicIcon },
              { id: 'videos', label: 'Music Videos', icon: VideoIcon },
              { id: 'booking', label: 'Booking Page', icon: Calendar },
              { id: 'contact', label: 'Contact Page', icon: MessageSquare },
              { id: 'gallery', label: 'Gallery', icon: ImageIcon },
              { id: 'forms', label: 'Google Forms', icon: FileText },
              { id: 'footer', label: 'Footer & Links', icon: InfoIcon },
              { id: 'pages', label: 'Manage Pages', icon: Compass },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${
                    activeTab === tab.id 
                      ? 'bg-accent/10 border border-accent/20 text-white' 
                      : 'text-secondary hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-accent' : ''}`} />
                  <span className="font-bold text-sm">{tab.label}</span>
                </button>
              );
            })}

            <div id="supabase-diagnostics" className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4 mt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white">Supabase Cloud</h4>
                    <p className="text-[9px] text-secondary uppercase tracking-widest font-black font-sans">Sync Integration</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchSupabaseStatus}
                  disabled={loadingStatus}
                  className="p-1 px-2.5 bg-white/5 hover:bg-white/10 text-secondary hover:text-white transition-all text-[9px] rounded-lg border border-white/5 flex items-center gap-1.5 font-bold uppercase tracking-widest"
                  title="Click to perform connection tests on the database and cluster storage"
                >
                  <RotateCcw className={`w-3 h-3 ${loadingStatus ? 'animate-spin' : ''}`} />
                  {loadingStatus ? 'Checking' : 'Test Sync'}
                </button>
              </div>

              {/* LIVE DIAGNOSTICS */}
              <div className="space-y-2.5 py-1.5 border-y border-white/5 text-[11px]">
                {/* 1. CONFIG STATUS */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-secondary">App Core Keys:</span>
                  {supabaseStatus?.configured ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Detected
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-500 font-bold font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Keys Missing
                    </span>
                  )}
                </div>

                {/* 2. DATABASE STATUS */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-secondary">Database Table:</span>
                  {!supabaseStatus?.configured ? (
                    <span className="text-white/40 italic text-[10px]">Unconfigured</span>
                  ) : supabaseStatus.database.status === 'connected' ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Active Table
                    </span>
                  ) : supabaseStatus.database.status === 'missing_table' ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-500 font-bold font-sans" title="Please run SQL below to create site_content table">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                      Table Missing
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-red-400 font-bold font-sans" title={supabaseStatus.database.details}>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                      Connection Error
                    </span>
                  )}
                </div>

                {/* 3. STORAGE STATUS */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-secondary">Storage (Bucket):</span>
                  {!supabaseStatus?.configured ? (
                    <span className="text-white/40 italic text-[10px]">Unconfigured</span>
                  ) : supabaseStatus.storage.status === 'connected' ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      Bucket Active
                    </span>
                  ) : supabaseStatus.storage.status === 'missing_bucket' ? (
                    <span className="inline-flex items-center gap-1.5 text-amber-500 font-bold font-sans" title="Create a bucket named 'uploads' inside Supabase storage dashboard">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                      Need 'uploads'
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-red-500 font-bold font-sans" title={supabaseStatus.storage.details}>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      Storage Error
                    </span>
                  )}
                </div>
              </div>

              {/* KEYS SET UP TIP */}
              {!supabaseStatus?.configured && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/15 rounded-xl text-[10px] text-amber-400 leading-normal">
                  <p className="font-bold mb-1">🔑 Setup Required:</p>
                  Go to <span className="font-bold text-white">Settings → Secrets</span> in AI Studio and add:
                  <ul className="list-disc list-inside mt-1 space-y-0.5 font-mono text-[9px] text-secondary">
                    <li><code className="text-white">SUPABASE_URL</code></li>
                    <li><code className="text-white">SUPABASE_ANON_KEY</code></li>
                    <li><code className="text-white">SUPABASE_SERVICE_ROLE_KEY</code></li>
                  </ul>
                  Then restart your dev server.
                </div>
              )}

              <p className="text-[11px] text-secondary leading-relaxed">
                Run this DDL statement in your <span className="text-white font-bold">Supabase SQL Editor</span> to provision the persistence table:
              </p>
              <div className="relative bg-black/40 rounded-xl p-3 pt-8 border border-white/10 font-mono text-[10px] text-emerald-400 select-all group">
                <pre className="whitespace-pre-wrap">{`create table site_content (
  id text primary key,
  data jsonb
);`}</pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`create table site_content (\n  id text primary key,\n  data jsonb\n);`);
                    setSqlCopied(true);
                    setTimeout(() => setSqlCopied(false), 2000);
                  }}
                  className="absolute top-1.5 right-1.5 p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-secondary hover:text-white transition-all flex items-center gap-1"
                  title="Copy SQL code"
                >
                  {sqlCopied ? <span className="text-[8px] uppercase tracking-widest font-bold text-emerald-400">Copied!</span> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/15">
                <p className="text-[10px] text-secondary leading-snug">
                  <span className="font-bold text-white">Storage Tip:</span> Create a public bucket named <code className="text-secondary bg-black/30 rounded px-1.5 py-0.5 text-[9px] font-mono">uploads</code> in Supabase Storage with public read permission allowed.
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <div className="glass-panel p-8 rounded-3xl min-h-[500px]">
              {activeTab === 'contact' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-bold mb-6">Contact Information</h2>
                  
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Management Email</label>
                      <input
                        type="email"
                        value={localContent.contact?.managementEmail || ''}
                        onChange={(e) => updateLocalContent({
                          ...localContent,
                          contact: { ...(localContent.contact || {}), managementEmail: e.target.value }
                        })}
                        placeholder="mgmt@yourdomain.com"
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Press Inquiries Email</label>
                      <input
                        type="email"
                        value={localContent.contact?.pressEmail || ''}
                        onChange={(e) => updateLocalContent({
                          ...localContent,
                          contact: { ...(localContent.contact || {}), pressEmail: e.target.value }
                        })}
                        placeholder="press@yourdomain.com"
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">General Inquiries Email</label>
                      <input
                        type="email"
                        value={localContent.contact?.generalEmail || ''}
                        onChange={(e) => updateLocalContent({
                          ...localContent,
                          contact: { ...(localContent.contact || {}), generalEmail: e.target.value }
                        })}
                        placeholder="hello@yourdomain.com"
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="flex gap-4 items-start">
                      <div className="p-3 bg-accent/10 rounded-xl text-accent shrink-0">
                        <InfoIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold mb-1">Inquiry Form</h4>
                        <p className="text-xs text-secondary leading-relaxed">
                          The contact form below these cards on the Contact page sends messages directly to Google Cloud Firestore, keeping details secure and instantly organized in the list below.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Real-time received messages list */}
                  <div className="pt-6 border-t border-white/10 mt-10">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-lg font-bold">Received Messages</h3>
                        <p className="text-[10px] text-secondary font-light">Real-time inquiries sent by visitors on the Contact page</p>
                      </div>
                      <button 
                        onClick={fetchSubmissions} 
                        className="px-3 py-1.5 border border-white/10 hover:border-accent rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-accent/10 transition-colors"
                      >
                        Refresh Messages
                      </button>
                    </div>

                    {submissionsError ? (
                      <div className="bg-yellow-500/10 border border-yellow-500/15 p-6 rounded-2xl text-center space-y-4">
                        <Database className="w-8 h-8 text-yellow-500/70 mx-auto" />
                        <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Connect Database inquiries</h4>
                        <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
                          Incoming contact messages are written securely to Google Cloud Firestore database. Complete security authentication to load these messages.
                        </p>
                        <button 
                          onClick={handleFirebaseAuth}
                          className="bg-white hover:bg-accent hover:text-white text-black font-bold tracking-wider px-6 py-3 rounded-full text-[10px] uppercase transition-all"
                        >
                          Unlock Inquiries with Google
                        </button>
                      </div>
                    ) : loadingSubmissions ? (
                      <div className="text-center py-10 text-secondary text-xs">Loading live messages from Firestore...</div>
                    ) : contactMessages.length === 0 ? (
                      <div className="text-center py-12 text-secondary text-xs bg-white/5 border border-white/10 rounded-2xl">
                        No messages received yet. Submit one from the Contact page!
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {contactMessages.map((msg) => (
                          <div key={msg.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative group hover:border-white/20 transition-all">
                            <button 
                              onClick={() => handleDeleteContactMessage(msg.id)}
                              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete Message"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] font-mono text-secondary">
                              {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                            </span>
                            <div className="grid md:grid-cols-3 gap-4 mt-2 mb-4">
                              <div>
                                <span className="text-[9px] uppercase tracking-wider text-secondary font-bold">FROM</span>
                                <p className="text-xs font-medium text-white">{msg.name}</p>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase tracking-wider text-secondary font-bold">EMAIL</span>
                                <p className="text-xs font-medium text-white">{msg.email}</p>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase tracking-wider text-secondary font-bold">SUBJECT</span>
                                <p className="text-xs font-medium text-accent">{msg.subject}</p>
                              </div>
                            </div>
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-secondary font-bold">MESSAGE</span>
                              <p className="text-xs font-light text-secondary whitespace-pre-wrap leading-relaxed bg-black/20 p-4 rounded-xl mt-1 border border-white/5">{msg.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Newsletter Subscribers list */}
                  <div className="pt-10 border-t border-white/10 mt-10">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-bold">Newsletter Subscribers</h3>
                        <p className="text-[10px] text-secondary font-light">Users who signed up for "Join the Transmission"</p>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {newsletterSubscribers.length > 0 && (
                          <button
                            onClick={() => {
                              const list = newsletterSubscribers.map(s => s.email).join(', ');
                              navigator.clipboard.writeText(list);
                              showNotification('All subscriber emails copied to clipboard!', 'success');
                            }}
                            className="px-3 py-1.5 border border-white/10 hover:border-accent rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-accent/10 transition-colors flex items-center gap-1.5 bg-black/20"
                          >
                            <Copy className="w-3 h-3" /> Copy All Emails
                          </button>
                        )}
                        <button 
                          onClick={fetchSubmissions} 
                          className="px-3 py-1.5 border border-white/10 hover:border-accent rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-accent/10 transition-colors bg-black/20"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>

                    {submissionsError ? (
                      <div className="bg-yellow-500/10 border border-yellow-500/15 p-6 rounded-2xl text-center space-y-4">
                        <Database className="w-8 h-8 text-yellow-500/70 mx-auto" />
                        <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Connect Database signups</h4>
                        <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed font-light">
                          Newsletter signups are written securely to Google Cloud Firestore database. Complete security authentication to load these subscribers.
                        </p>
                      </div>
                    ) : loadingSubmissions ? (
                      <div className="text-center py-10 text-secondary text-xs">Loading live subscribers from Firestore...</div>
                    ) : newsletterSubscribers.length === 0 ? (
                      <div className="text-center py-12 text-secondary text-xs bg-white/5 border border-white/10 rounded-2xl font-light">
                        No newsletter subscribers yet. Sign up from the website's footer!
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2">
                        {newsletterSubscribers.map((sub) => (
                          <div key={sub.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between group hover:border-white/20 transition-all">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{sub.email}</p>
                              <p className="text-[9px] font-mono text-secondary mt-1 font-light">
                                Joined: {sub.createdAt?.seconds ? new Date(sub.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                              </p>
                            </div>
                            <button 
                              onClick={() => handleDeleteSubscriber(sub.id)}
                              className="p-2 rounded-xl bg-white/5 text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete Subscriber"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'booking' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-bold mb-6">Booking Information</h2>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Main Description</label>
                      <textarea
                        rows={3}
                        value={localContent.booking?.description || ''}
                        onChange={(e) => updateLocalContent({
                          ...localContent,
                          booking: { ...(localContent.booking || {}), description: e.target.value }
                        })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none resize-none font-light"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Availability Details</label>
                        <input
                          type="text"
                          value={localContent.booking?.availability || ''}
                          onChange={(e) => updateLocalContent({
                            ...localContent,
                            booking: { ...(localContent.booking || {}), availability: e.target.value }
                          })}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Base/Location</label>
                        <input
                          type="text"
                          value={localContent.booking?.base || ''}
                          onChange={(e) => updateLocalContent({
                            ...localContent,
                            booking: { ...(localContent.booking || {}), base: e.target.value }
                          })}
                          className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Booking Inquiry Email</label>
                      <input
                        type="email"
                        value={localContent.booking?.email || ''}
                        onChange={(e) => updateLocalContent({
                          ...localContent,
                          booking: { ...(localContent.booking || {}), email: e.target.value }
                        })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none font-medium"
                      />
                    </div>
                  </div>

                  {/* Real-time received booking inquiries */}
                  <div className="pt-6 border-t border-white/10 mt-10">
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h3 className="text-lg font-bold">Booking Proposals</h3>
                        <p className="text-[10px] text-secondary font-light">Inquiries securely received via the Booking inquiry form</p>
                      </div>
                      <button 
                        onClick={fetchSubmissions} 
                        className="px-3 py-1.5 border border-white/10 hover:border-accent rounded-xl text-[10px] uppercase font-bold tracking-wider hover:bg-accent/10 transition-colors"
                      >
                        Refresh Bookings
                      </button>
                    </div>

                    {submissionsError ? (
                      <div className="bg-yellow-500/10 border border-yellow-500/15 p-6 rounded-2xl text-center space-y-4">
                        <Database className="w-8 h-8 text-yellow-500/70 mx-auto" />
                        <h4 className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Connect Database inquiries</h4>
                        <p className="text-xs text-secondary max-w-md mx-auto leading-relaxed">
                          Booking proposals are written securely to Google Cloud Firestore database. Complete security authentication to load these proposals.
                        </p>
                        <button 
                          onClick={handleFirebaseAuth}
                          className="bg-white hover:bg-accent hover:text-white text-black font-bold tracking-wider px-6 py-3 rounded-full text-[10px] uppercase transition-all"
                        >
                          Unlock Inquiries with Google
                        </button>
                      </div>
                    ) : loadingSubmissions ? (
                      <div className="text-center py-10 text-secondary text-xs">Loading live proposals from Firestore...</div>
                    ) : bookingRequests.length === 0 ? (
                      <div className="text-center py-12 text-secondary text-xs bg-white/5 border border-white/10 rounded-2xl">
                        No proposals received yet. Submit one from the Booking page!
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                        {bookingRequests.map((req) => (
                          <div key={req.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative group hover:border-white/20 transition-all">
                            <div className="absolute top-4 right-4 flex items-center gap-2">
                              <select 
                                value={req.status} 
                                onChange={(e) => handleUpdateBookingStatus(req.id, e.target.value)}
                                className={`text-[9px] font-bold px-2.5 py-1.5 rounded-xl uppercase tracking-wider bg-black border border-white/10 ${
                                  req.status === 'pending' ? 'text-yellow-400' :
                                  req.status === 'confirmed' ? 'text-green-400' : 'text-gray-400'
                                }`}
                              >
                                <option value="pending" className="bg-bg text-white">Pending</option>
                                <option value="confirmed" className="bg-bg text-white">Confirmed</option>
                                <option value="cancelled" className="bg-bg text-white">Cancelled</option>
                              </select>
                              <button 
                                onClick={() => handleDeleteBooking(req.id)}
                                className="p-2 rounded-xl bg-white/5 text-secondary hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete Inquiry"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <span className="text-[10px] font-mono text-secondary">
                              {req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                            </span>
                            <div className="grid md:grid-cols-4 gap-4 mt-2 mb-4">
                              <div>
                                <span className="text-[9px] uppercase tracking-wider text-secondary font-bold">CLIENT / AGENCY</span>
                                <p className="text-xs font-medium text-white">{req.name}</p>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase tracking-wider text-secondary font-bold">EMAIL</span>
                                <p className="text-xs font-medium text-white">{req.email}</p>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase tracking-wider text-secondary font-bold">EVENT TYPE</span>
                                <p className="text-xs font-medium text-accent">{req.eventType}</p>
                              </div>
                              <div>
                                <span className="text-[9px] uppercase tracking-wider text-secondary font-bold">EVENT DATE</span>
                                <p className="text-xs font-medium text-accent">{req.date}</p>
                              </div>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase tracking-wider text-secondary font-bold">DESCRIPTION & REQUIREMENTS</span>
                              <p className="text-xs font-light text-secondary whitespace-pre-wrap leading-relaxed bg-black/20 p-4 rounded-xl mt-1 border border-white/5">{req.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'videos' && (
                <div className="space-y-12">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <h2 className="text-xl font-bold">Videos Management</h2>
                      <p className="text-xs text-secondary mt-1">Manage your music videos and performances.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border ${
                          showUrlInput 
                            ? 'bg-accent/10 border-accent/30 text-accent' 
                            : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                        }`}
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>{showUrlInput ? 'Cancel' : 'Add from Link'}</span>
                      </button>
                      <button 
                        onClick={() => {
                          const newVideo = {
                            id: `vid-${Date.now()}`,
                            title: "New Video",
                            youtubeUrl: "",
                            description: ""
                          };
                          updateLocalContent({
                            ...localContent,
                            videos: [...(localContent.videos || []), newVideo]
                          });
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 border border-accent/20 rounded-xl text-accent text-[10px] font-bold uppercase transition-all hover:bg-accent hover:text-white active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add New
                      </button>
                      <button
                        onClick={() => handleDriveBrowse((url) => {
                          const newVideo = {
                            id: `vid-${Date.now()}`,
                            title: "New Video from Drive",
                            youtubeUrl: url,
                            description: ""
                          };
                          updateLocalContent({
                            ...localContent,
                            videos: [...(localContent.videos || []), newVideo]
                          });
                        }, 'any')}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2 active:scale-95"
                      >
                        <Cloud className="w-3.5 h-3.5 text-accent" />
                        <span>Drive</span>
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {showUrlInput && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 bg-accent/5 border border-accent/10 rounded-2xl flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2 block">YouTube or Direct Video URL</label>
                            <input 
                              type="text"
                              value={videoUrlInput}
                              onChange={(e) => setVideoUrlInput(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddVideoUrl()}
                              placeholder="https://www.youtube.com/watch?v=..."
                              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none"
                              autoFocus
                            />
                          </div>
                          <button 
                            onClick={handleAddVideoUrl}
                            disabled={!videoUrlInput}
                            className="md:self-end px-8 py-3 bg-accent text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
                          >
                            Add Video
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-6">
                    {(localContent.videos || []).map((video, idx) => (
                      <div key={video.id} className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4 group">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Video Title</label>
                                <input
                                  type="text"
                                  value={video.title}
                                  onChange={(e) => {
                                    const newVideos = [...localContent.videos];
                                    newVideos[idx] = { ...video, title: e.target.value };
                                    updateLocalContent({ ...localContent, videos: newVideos });
                                  }}
                                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none font-medium"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">YouTube URL</label>
                                <input
                                  type="text"
                                  value={video.youtubeUrl}
                                  onChange={(e) => {
                                    const newVideos = [...localContent.videos];
                                    newVideos[idx] = { ...video, youtubeUrl: e.target.value };
                                    updateLocalContent({ ...localContent, videos: newVideos });
                                  }}
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none font-light"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Description (Optional)</label>
                              <textarea
                                rows={2}
                                value={video.description || ''}
                                onChange={(e) => {
                                  const newVideos = [...localContent.videos];
                                  newVideos[idx] = { ...video, description: e.target.value };
                                  updateLocalContent({ ...localContent, videos: newVideos });
                                }}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none resize-none font-light"
                              />
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              const newVideos = localContent.videos.filter(v => v.id !== video.id);
                              updateLocalContent({...localContent, videos: newVideos});
                              showNotification('Video removed', 'success');
                            }}
                            className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all rounded-xl border border-red-500/20"
                            title="Delete Video"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {(localContent.videos || []).length === 0 && (
                      <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl opacity-30">
                        <VideoIcon className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-xs font-bold tracking-widest uppercase">No videos added yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'home' && (
                <div className="space-y-8">
                  <h2 className="text-xl font-bold mb-6">General Content</h2>
                  
                  <div className="space-y-4">
                    <label className="block text-xs font-bold tracking-widest text-secondary uppercase">Artist Name</label>
                    <input
                      type="text"
                      value={localContent.artistName}
                      onChange={(e) => updateLocalContent({...localContent, artistName: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-bold tracking-widest text-secondary uppercase">Hero Title</label>
                    <input
                      type="text"
                      value={localContent.home.heroTitle}
                      onChange={(e) => updateLocalContent({...localContent, home: {...localContent.home, heroTitle: e.target.value}})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="block text-xs font-bold tracking-widest text-secondary uppercase">Hero Background</label>
                      <div className="flex flex-col gap-3">
                        <div className="relative group aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10">
                          {localContent.images.hero ? (
                            <>
                              <img src={localContent.images.hero} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <label className="cursor-pointer p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                                  <Upload className="w-6 h-6 text-white" />
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleFileUpload(file, 'image', (url) => {
                                          updateLocalContent({...localContent, images: {...localContent.images, hero: url}});
                                        });
                                      }
                                    }}
                                  />
                                </label>
                                <button 
                                  onClick={() => updateLocalContent({...localContent, images: {...localContent.images, hero: ''}})}
                                  className="p-3 bg-red-500/80 hover:bg-red-500 rounded-full transition-all"
                                  title="Delete Hero Image"
                                >
                                  <Trash2 className="w-6 h-6 text-white" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                              <div className="flex flex-col items-center gap-2">
                                <Plus className="w-8 h-8 text-secondary" />
                                <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">Add Hero Background</span>
                              </div>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(file, 'image', (url) => {
                                      updateLocalContent({...localContent, images: {...localContent.images, hero: url}});
                                    });
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                        <input
                          type="text"
                          value={localContent.images.hero}
                          onChange={(e) => updateLocalContent({...localContent, images: {...localContent.images, hero: e.target.value}})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-secondary focus:border-accent outline-none"
                          placeholder="Paste image link here"
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <label className="block text-xs font-bold tracking-widest text-secondary uppercase">Artist Portrait (Hero/About)</label>
                      <div className="flex flex-col gap-3">
                        <div className="relative group aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/10 max-w-[200px]">
                          {localContent.images.portrait ? (
                            <>
                              <img src={localContent.images.portrait} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <label className="cursor-pointer p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all">
                                  <Upload className="w-5 h-5 text-white" />
                                  <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleFileUpload(file, 'image', (url) => {
                                          updateLocalContent({...localContent, images: {...localContent.images, portrait: url}});
                                        });
                                      }
                                    }}
                                  />
                                </label>
                                <button 
                                  onClick={() => updateLocalContent({...localContent, images: {...localContent.images, portrait: ''}})}
                                  className="p-2 bg-red-500/80 hover:bg-red-500 rounded-full transition-all"
                                  title="Delete Portrait Image"
                                >
                                  <Trash2 className="w-5 h-5 text-white" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <label className="absolute inset-0 flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                              <Plus className="w-8 h-8 text-secondary" />
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(file, 'image', (url) => {
                                      updateLocalContent({...localContent, images: {...localContent.images, portrait: url}});
                                    });
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>
                        <input
                          type="text"
                          value={localContent.images.portrait}
                          onChange={(e) => updateLocalContent({...localContent, images: {...localContent.images, portrait: e.target.value}})}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] text-secondary focus:border-accent outline-none max-w-[200px]"
                          placeholder="Paste image link here"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-bold tracking-widest text-secondary uppercase">Hero Subtitle</label>
                    <textarea
                      rows={3}
                      value={localContent.home.heroSubtitle}
                      onChange={(e) => updateLocalContent({...localContent, home: {...localContent.home, heroSubtitle: e.target.value}})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none resize-none font-light"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-bold tracking-widest text-secondary uppercase">About Preview Section</label>
                    <textarea
                      rows={5}
                      value={localContent.home.aboutText}
                      onChange={(e) => updateLocalContent({...localContent, home: {...localContent.home, aboutText: e.target.value}})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none resize-none font-light"
                    />
                  </div>

                  <div className="space-y-8 pt-8 border-t border-white/5">
                    <h3 className="text-lg font-bold">In-Depth Homepage Biography</h3>
                    
                    <div className="space-y-4">
                      <label className="block text-xs font-bold tracking-widest text-secondary uppercase">Bio Title (Small Overline)</label>
                      <input
                        type="text"
                        value={localContent.home.bioTitle || ''}
                        onChange={(e) => updateLocalContent({...localContent, home: {...localContent.home, bioTitle: e.target.value}})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="block text-xs font-bold tracking-widest text-secondary uppercase">Bio Subtitle (Large Accent Text)</label>
                      <textarea
                        rows={3}
                        value={localContent.home.bioSubtitle || ''}
                        onChange={(e) => updateLocalContent({...localContent, home: {...localContent.home, bioSubtitle: e.target.value}})}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none resize-none font-light"
                      />
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold tracking-widest text-secondary uppercase">Bio Body Paragraphs</label>
                        <button 
                          onClick={() => {
                            const bioParagraphs = [...(localContent.home.bioParagraphs || [])];
                            bioParagraphs.push("");
                            updateLocalContent({...localContent, home: {...localContent.home, bioParagraphs}});
                          }}
                          className="text-[10px] font-bold text-accent px-3 py-1 bg-accent/5 rounded-lg hover:bg-accent/20 transition-colors"
                        >
                          + ADD PARAGRAPH
                        </button>
                      </div>
                      <div className="space-y-4">
                        {(localContent.home.bioParagraphs || []).map((para, idx) => (
                          <div key={idx} className="flex gap-4">
                            <textarea
                              rows={4}
                              value={para}
                              onChange={(e) => {
                                const bioParagraphs = [...(localContent.home.bioParagraphs || [])];
                                bioParagraphs[idx] = e.target.value;
                                updateLocalContent({...localContent, home: {...localContent.home, bioParagraphs}});
                              }}
                              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none resize-none font-light text-sm"
                            />
                            <button 
                              onClick={() => {
                                const bioParagraphs = [...(localContent.home.bioParagraphs || [])];
                                bioParagraphs.splice(idx, 1);
                                updateLocalContent({...localContent, home: {...localContent.home, bioParagraphs}});
                              }}
                              className="p-2 self-start text-secondary hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8 pt-8 border-t border-white/5">
                    <h3 className="text-lg font-bold">Featured Tracks</h3>
                    <p className="text-xs text-secondary mb-4">Select up to 3 tracks to feature on the homepage.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {localContent.tracks.map(track => {
                        const isFeatured = (localContent.home.featuredTracks || []).includes(track.id);
                        return (
                          <button
                            key={track.id}
                            onClick={() => {
                              let featured = [...(localContent.home.featuredTracks || [])];
                              if (isFeatured) {
                                featured = featured.filter(id => id !== track.id);
                              } else if (featured.length < 3) {
                                featured.push(track.id);
                              }
                              updateLocalContent({...localContent, home: {...localContent.home, featuredTracks: featured}});
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                              isFeatured ? 'bg-accent/10 border-accent text-white' : 'bg-white/5 border-white/10 text-secondary'
                            }`}
                          >
                            <img src={track.coverUrl || null} className="w-10 h-10 rounded-lg object-cover" />
                            <div className="overflow-hidden">
                              <p className="text-xs font-bold truncate">{track.title}</p>
                              <p className="text-[10px] opacity-50 truncate">{track.album}</p>
                            </div>
                            {isFeatured && <CheckCircle className="w-4 h-4 text-accent ml-auto flex-shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'about' && (
                <div className="space-y-12">
                  <h2 className="text-xl font-bold mb-6">About Page Deep Content</h2>
                  
                  <div className="space-y-4">
                    <label className="block text-xs font-bold tracking-widest text-secondary uppercase">Tagline</label>
                    <input
                      type="text"
                      value={localContent.about?.tagline || ''}
                      onChange={(e) => updateLocalContent({...localContent, about: {...localContent.about, tagline: e.target.value}})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none font-light"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold tracking-widest text-secondary uppercase">Biography Story Paragraphs</label>
                      <button 
                        onClick={() => {
                          const story = [...(localContent.about?.story || [])];
                          story.push("");
                          updateLocalContent({...localContent, about: {...localContent.about, story}});
                        }}
                        className="text-[10px] font-bold text-accent px-3 py-1 bg-accent/5 rounded-lg hover:bg-accent/20 transition-colors"
                      >
                        + ADD PARAGRAPH
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(localContent.about?.story || []).map((para, idx) => (
                        <div key={idx} className="flex gap-4">
                          <textarea
                            rows={4}
                            value={para}
                            onChange={(e) => {
                              const story = [...(localContent.about?.story || [])];
                              story[idx] = e.target.value;
                              updateLocalContent({...localContent, about: {...localContent.about, story}});
                            }}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none resize-none font-light text-sm"
                          />
                          <button 
                            onClick={() => {
                              const story = [...(localContent.about?.story || [])];
                              story.splice(idx, 1);
                              updateLocalContent({...localContent, about: {...localContent.about, story}});
                            }}
                            className="p-2 self-start text-secondary hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Influences */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold tracking-widest text-secondary uppercase">Influences</label>
                      <button 
                        onClick={() => {
                          const influences = [...(localContent.about?.influences || [])];
                          influences.push("");
                          updateLocalContent({...localContent, about: {...localContent.about, influences}});
                        }}
                        className="text-[10px] font-bold text-accent px-3 py-1 bg-accent/5 rounded-lg hover:bg-accent/20 transition-colors"
                      >
                        + ADD INFLUENCE
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(localContent.about?.influences || []).map((inf, idx) => (
                        <div key={idx} className="flex gap-4">
                          <input
                            type="text"
                            value={inf}
                            onChange={(e) => {
                              const influences = [...(localContent.about?.influences || [])];
                              influences[idx] = e.target.value;
                              updateLocalContent({...localContent, about: {...localContent.about, influences}});
                            }}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                          />
                          <button 
                            onClick={() => {
                              const influences = [...(localContent.about?.influences || [])];
                              influences.splice(idx, 1);
                              updateLocalContent({...localContent, about: {...localContent.about, influences}});
                            }}
                            className="p-2 text-secondary hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Milestones */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold tracking-widest text-secondary uppercase">The Legacy (Milestones)</label>
                      <button 
                        onClick={() => {
                          const milestones = [...(localContent.about?.milestones || [])];
                          milestones.push({ year: "2024", title: "New Milestone", description: "" });
                          updateLocalContent({...localContent, about: {...localContent.about, milestones}});
                        }}
                        className="text-[10px] font-bold text-accent px-3 py-1 bg-accent/5 rounded-lg hover:bg-accent/20 transition-colors"
                      >
                        + ADD MILESTONE
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(localContent.about?.milestones || []).map((m, idx) => (
                        <div key={idx} className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-4">
                          <div className="flex justify-between gap-4">
                             <div className="w-24">
                              <label className="text-[10px] text-secondary/50 uppercase font-black mb-1 block">Year</label>
                              <input
                                type="text"
                                value={m.year}
                                onChange={(e) => {
                                  const milestones = [...(localContent.about?.milestones || [])];
                                  milestones[idx] = { ...m, year: e.target.value };
                                  updateLocalContent({...localContent, about: {...localContent.about, milestones}});
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                              />
                             </div>
                             <div className="flex-1">
                              <label className="text-[10px] text-secondary/50 uppercase font-black mb-1 block">Title</label>
                              <input
                                type="text"
                                value={m.title}
                                onChange={(e) => {
                                  const milestones = [...(localContent.about?.milestones || [])];
                                  milestones[idx] = { ...m, title: e.target.value };
                                  updateLocalContent({...localContent, about: {...localContent.about, milestones}});
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                              />
                             </div>
                             <button 
                                onClick={() => {
                                  const milestones = [...(localContent.about?.milestones || [])];
                                  milestones.splice(idx, 1);
                                  updateLocalContent({...localContent, about: {...localContent.about, milestones}});
                                }}
                                className="p-2 self-end text-secondary hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                          </div>
                          <div>
                            <label className="text-[10px] text-secondary/50 uppercase font-black mb-1 block">Description</label>
                            <textarea
                              rows={2}
                              value={m.description}
                              onChange={(e) => {
                                const milestones = [...(localContent.about?.milestones || [])];
                                milestones[idx] = { ...m, description: e.target.value };
                                updateLocalContent({...localContent, about: {...localContent.about, milestones}});
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none font-light"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'music' && (
                <div className="space-y-12">
                  <div className="space-y-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Manage Albums</h2>
                    <button 
                      onClick={() => {
                        const newAlbum = {
                          id: `album-${Date.now()}`,
                          title: "New Album",
                          releaseDate: "2024",
                          coverUrl: localContent.images.portrait,
                          tracks: []
                        };
                        updateLocalContent({
                          ...localContent,
                          albums: [...(localContent.albums || []), newAlbum]
                        });
                        setEditingAlbumId(newAlbum.id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-xl text-accent text-xs font-bold uppercase transition-all hover:bg-accent hover:text-white"
                    >
                      <Plus className="w-4 h-4" /> Add Album
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(localContent.albums || []).map((album, idx) => (
                      <div key={album.id} className="space-y-4">
                        <div className="flex items-center gap-6 p-4 bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden">
                          {isFileMissing(album.coverUrl) && (
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-bl-lg animate-pulse">
                              File Missing
                            </div>
                          )}
                          <img src={album.coverUrl || null} className="w-16 h-16 rounded-xl object-cover" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold truncate">{album.title}</h3>
                            <p className="text-[10px] font-bold text-secondary tracking-widest uppercase">{album.releaseDate}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setEditingAlbumId(editingAlbumId === album.id ? null : album.id)}
                              className={`p-2 transition-colors ${editingAlbumId === album.id ? 'text-accent' : 'hover:text-accent'}`}
                            >
                              <Edit3 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => {
                                const newAlbums = localContent.albums.filter(a => a.id !== album.id);
                                updateLocalContent({...localContent, albums: newAlbums});
                                if (editingAlbumId === album.id) setEditingAlbumId(null);
                              }}
                              className="p-2 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {editingAlbumId === album.id && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 overflow-hidden"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Album Title</label>
                                <input
                                  type="text"
                                  value={album.title}
                                  onChange={(e) => {
                                    const newAlbums = [...localContent.albums];
                                    newAlbums[idx] = { ...newAlbums[idx], title: e.target.value };
                                    updateLocalContent({ ...localContent, albums: newAlbums });
                                  }}
                                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Release Date (Year)</label>
                                <input
                                  type="text"
                                  value={album.releaseDate}
                                  onChange={(e) => {
                                    const newAlbums = [...localContent.albums];
                                    newAlbums[idx] = { ...newAlbums[idx], releaseDate: e.target.value };
                                    updateLocalContent({ ...localContent, albums: newAlbums });
                                  }}
                                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Album Cover</label>
                              <div className="flex gap-4 items-start">
                                <div className="relative group w-20 h-20 bg-black/40 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                                  <img 
                                    src={album.coverUrl || 'https://via.placeholder.com/150'} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150')}
                                  />
                                  {album.coverUrl && (
                                    <button 
                                      onClick={() => {
                                        const newAlbums = [...localContent.albums];
                                        newAlbums[idx] = { ...newAlbums[idx], coverUrl: '' };
                                        updateLocalContent({ ...localContent, albums: newAlbums });
                                      }}
                                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-500"
                                      title="Remove Cover"
                                    >
                                      <Trash2 className="w-5 h-5" />
                                    </button>
                                  )}
                                </div>
                                <div className="flex-1 space-y-3">
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <input
                                      type="text"
                                      value={album.coverUrl}
                                      onChange={(e) => {
                                        const newAlbums = [...localContent.albums];
                                        newAlbums[idx] = { ...newAlbums[idx], coverUrl: e.target.value };
                                        updateLocalContent({ ...localContent, albums: newAlbums });
                                      }}
                                      className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none text-sm"
                                      placeholder="Cover image URL"
                                    />
                                  <label className="cursor-pointer px-4 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 group active:scale-95">
                                      <Upload className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
                                      <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Upload</span>
                                      <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            handleFileUpload(file, 'image', (url) => {
                                              const newAlbums = [...(localContent.albums || [])];
                                              newAlbums[idx] = { ...newAlbums[idx], coverUrl: url };
                                              updateLocalContent({ ...localContent, albums: newAlbums });
                                            });
                                          }
                                        }}
                                      />
                                    </label>
                                    <button
                                      onClick={() => handleDriveBrowse((url) => {
                                        const newAlbums = [...(localContent.albums || [])];
                                        newAlbums[idx] = { ...newAlbums[idx], coverUrl: url };
                                        updateLocalContent({ ...localContent, albums: newAlbums });
                                        setIsBrowsingDrive(false);
                                      })}
                                      className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 group active:scale-95"
                                    >
                                      <Cloud className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
                                      <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Drive</span>
                                    </button>
                                  </div>
                                  <p className="text-[9px] text-secondary/50 italic">Square format (1:1) works best for covers</p>
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-white/5 pt-6 space-y-4">
                              <h4 className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Music Store & Streaming Links (Optional)</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Spotify URL</label>
                                  <input
                                    type="text"
                                    value={album.spotifyUrl || ''}
                                    onChange={(e) => {
                                      const newAlbums = [...localContent.albums];
                                      newAlbums[idx] = { ...newAlbums[idx], spotifyUrl: e.target.value };
                                      updateLocalContent({ ...localContent, albums: newAlbums });
                                    }}
                                    placeholder="https://open.spotify.com/album/..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-accent outline-none text-white font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Apple Music URL</label>
                                  <input
                                    type="text"
                                    value={album.appleMusicUrl || ''}
                                    onChange={(e) => {
                                      const newAlbums = [...localContent.albums];
                                      newAlbums[idx] = { ...newAlbums[idx], appleMusicUrl: e.target.value };
                                      updateLocalContent({ ...localContent, albums: newAlbums });
                                    }}
                                    placeholder="https://music.apple.com/album/..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-accent outline-none text-white font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">YouTube Music URL</label>
                                  <input
                                    type="text"
                                    value={album.youtubeMusicUrl || ''}
                                    onChange={(e) => {
                                      const newAlbums = [...localContent.albums];
                                      newAlbums[idx] = { ...newAlbums[idx], youtubeMusicUrl: e.target.value };
                                      updateLocalContent({ ...localContent, albums: newAlbums });
                                    }}
                                    placeholder="https://music.youtube.com/playlist?list=..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-accent outline-none text-white font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">YouTube Video/Playlist URL</label>
                                  <input
                                    type="text"
                                    value={album.youtubeUrl || ''}
                                    onChange={(e) => {
                                      const newAlbums = [...localContent.albums];
                                      newAlbums[idx] = { ...newAlbums[idx], youtubeUrl: e.target.value };
                                      updateLocalContent({ ...localContent, albums: newAlbums });
                                    }}
                                    placeholder="https://youtube.com/playlist?list=... or watch URL"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-accent outline-none text-white font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-end pt-4">
                              <button 
                                onClick={() => setEditingAlbumId(null)}
                                className="px-6 py-2 bg-accent/10 text-accent border border-accent/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-accent hover:text-white transition-all"
                              >
                                Close Editor
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                  </div>

                  <div className="space-y-8 pt-8 border-t border-white/5">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold">Manage Tracks</h2>
                    <button 
                      onClick={() => {
                        const newTrack = {
                          id: `track-${Date.now()}`,
                          title: "New Track",
                          artist: localContent.artistName || "Artist",
                          audioUrl: "",
                          coverUrl: localContent.images.portrait,
                          duration: "0:00",
                          lyrics: ""
                        };
                        updateLocalContent({
                          ...localContent,
                          tracks: [...localContent.tracks, newTrack]
                        });
                        setEditingTrackId(newTrack.id);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/20 rounded-xl text-accent text-xs font-bold uppercase transition-all hover:bg-accent hover:text-white"
                    >
                      <Plus className="w-4 h-4" /> Add Track
                    </button>
                  </div>

                  <div className="space-y-4">
                    {localContent.tracks.map((track, idx) => (
                      <div key={track.id} className="space-y-4">
                        <div className="flex items-center gap-6 p-4 bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden">
                          {(isFileMissing(track.coverUrl) || isFileMissing(track.audioUrl)) && (
                            <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-bl-lg animate-pulse">
                              {isFileMissing(track.audioUrl) ? 'Audio Missing' : 'Art Missing'}
                            </div>
                          )}
                          <img src={track.coverUrl || null} className="w-16 h-16 rounded-xl object-cover" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold truncate">{track.title}</h3>
                            <p className="text-[10px] font-bold text-secondary tracking-widest uppercase">{track.artist}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => setEditingTrackId(editingTrackId === track.id ? null : track.id)}
                              className={`p-2 transition-colors ${editingTrackId === track.id ? 'text-accent' : 'hover:text-accent'}`}
                            >
                              <Edit3 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => {
                                const newTracks = localContent.tracks.filter(t => t.id !== track.id);
                                updateLocalContent({...localContent, tracks: newTracks});
                                if (editingTrackId === track.id) setEditingTrackId(null);
                              }}
                              className="p-2 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {editingTrackId === track.id && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 overflow-hidden"
                          >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Track Title</label>
                                <input
                                  type="text"
                                  value={track.title}
                                  onChange={(e) => {
                                    const newTracks = [...localContent.tracks];
                                    newTracks[idx] = { ...newTracks[idx], title: e.target.value };
                                    updateLocalContent({ ...localContent, tracks: newTracks });
                                  }}
                                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Artist Name</label>
                                <input
                                  type="text"
                                  value={track.artist}
                                  onChange={(e) => {
                                    const newTracks = [...localContent.tracks];
                                    newTracks[idx] = { ...newTracks[idx], artist: e.target.value };
                                    updateLocalContent({ ...localContent, tracks: newTracks });
                                  }}
                                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Album Art URL</label>
                                <div className="flex gap-4 items-start">
                                  <div className="relative group w-20 h-20 bg-black/40 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                                    <img 
                                      src={track.coverUrl || 'https://via.placeholder.com/150'} 
                                      className="w-full h-full object-cover"
                                      onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150')}
                                    />
                                    {track.coverUrl && (
                                      <button 
                                        onClick={() => {
                                          const newTracks = [...localContent.tracks];
                                          newTracks[idx] = { ...newTracks[idx], coverUrl: '' };
                                          updateLocalContent({ ...localContent, tracks: newTracks });
                                        }}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-500"
                                        title="Remove Artwork"
                                      >
                                        <Trash2 className="w-5 h-5" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex-1 space-y-3">
                                    <div className="flex flex-col sm:flex-row gap-2">
                                      <input
                                        type="text"
                                        value={track.coverUrl}
                                        onChange={(e) => {
                                          const newTracks = [...localContent.tracks];
                                          newTracks[idx] = { ...newTracks[idx], coverUrl: e.target.value };
                                          updateLocalContent({ ...localContent, tracks: newTracks });
                                        }}
                                        className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none text-sm"
                                        placeholder="Album art URL"
                                      />
                                      <label className="cursor-pointer px-4 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 group active:scale-95">
                                        <Upload className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Upload Artwork</span>
                                        <input 
                                          type="file" 
                                          className="hidden" 
                                          accept="image/*"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                              handleFileUpload(file, 'image', (url) => {
                                                const newTracks = [...localContent.tracks];
                                                newTracks[idx] = { ...newTracks[idx], coverUrl: url };
                                                updateLocalContent({ ...localContent, tracks: newTracks });
                                              });
                                            }
                                          }}
                                        />
                                      </label>
                                      <button
                                        onClick={() => handleDriveBrowse((url) => {
                                          const newTracks = [...localContent.tracks];
                                          newTracks[idx] = { ...newTracks[idx], coverUrl: url };
                                          updateLocalContent({ ...localContent, tracks: newTracks });
                                          setIsBrowsingDrive(false);
                                        }, 'image')}
                                        className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 group active:scale-95"
                                      >
                                        <Cloud className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Drive</span>
                                      </button>
                                    </div>
                                    <p className="text-[9px] text-secondary/50 italic">Square format (1:1) works best</p>
                                  </div>
                                </div>
                                {Object.entries(uploadProgress).map(([id, progress]) => {
                                  if (id.includes(track.id) && id.includes('image')) {
                                    const name = id.split('-').slice(0, -1).join('-');
                                    return <ProgressIndicator key={id} progress={progress as number} fileName={name} />;
                                  }
                                  return null;
                                })}
                              </div>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Album Name</label>
                                  <input
                                    type="text"
                                    value={track.album || ''}
                                    onChange={(e) => {
                                      const newTracks = [...localContent.tracks];
                                      newTracks[idx] = { ...newTracks[idx], album: e.target.value };
                                      updateLocalContent({ ...localContent, tracks: newTracks });
                                    }}
                                    placeholder="e.g. Echoes of the Void"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none font-light"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Duration (m:ss)</label>
                                  <input
                                    type="text"
                                    value={track.duration}
                                    onChange={(e) => {
                                      const newTracks = [...localContent.tracks];
                                      newTracks[idx] = { ...newTracks[idx], duration: e.target.value };
                                      updateLocalContent({ ...localContent, tracks: newTracks });
                                    }}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="space-y-2 flex flex-col">
                              <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Audio URL</label>
                                 <div className="flex flex-col sm:flex-row gap-2">
                                  <input
                                    type="text"
                                    value={track.audioUrl || ''}
                                    onChange={(e) => {
                                      const newTracks = [...localContent.tracks];
                                      newTracks[idx] = { ...newTracks[idx], audioUrl: e.target.value };
                                      updateLocalContent({ ...localContent, tracks: newTracks });
                                    }}
                                    placeholder="Audio file URL or upload below"
                                    className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                                  />
                                  <label className="cursor-pointer px-4 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 group active:scale-95">
                                    <Upload className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Upload Audio</span>
                                    <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="audio/*"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleFileUpload(file, 'audio', (url, f) => {
                                            const newTracks = [...localContent.tracks];
                                            const fileName = f.name.replace(/\.[^/.]+$/, "");
                                            const updatedTrack = { ...newTracks[idx], audioUrl: url };
                                            
                                            if (!updatedTrack.title || updatedTrack.title === "New Track") {
                                              updatedTrack.title = fileName;
                                            }
                                            if (!updatedTrack.artist || updatedTrack.artist === "Artist") {
                                              updatedTrack.artist = localContent.artistName || "Artist";
                                            }

                                            newTracks[idx] = updatedTrack;
                                            updateLocalContent({ ...localContent, tracks: newTracks });
                                          });
                                        }
                                      }}
                                    />
                                  </label>
                                  <button
                                    onClick={() => handleDriveBrowse((url) => {
                                      const newTracks = [...localContent.tracks];
                                      newTracks[idx] = { ...newTracks[idx], audioUrl: url };
                                      updateLocalContent({ ...localContent, tracks: newTracks });
                                      setIsBrowsingDrive(false);
                                    }, 'audio')}
                                    className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all flex items-center justify-center gap-2 group active:scale-95"
                                  >
                                    <Cloud className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
                                    <span className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">Drive</span>
                                  </button>
                                </div>
                              {Object.entries(uploadProgress).map(([id, progress]) => {
                                if (!id.includes(track.id) && id.split('-').length > 1) {
                                  // This is a simple logic to show relevant progress if needed, 
                                  // but generally showing all uploads is fine in this dash
                                }
                                const name = id.split('-').slice(0, -1).join('-');
                                return <ProgressIndicator key={id} progress={progress as number} fileName={name} />;
                              })}
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-bold text-secondary uppercase tracking-widest">Lyrics</label>
                              <textarea
                                rows={8}
                                value={track.lyrics || ''}
                                onChange={(e) => {
                                  const newTracks = [...localContent.tracks];
                                  newTracks[idx] = { ...newTracks[idx], lyrics: e.target.value };
                                  updateLocalContent({ ...localContent, tracks: newTracks });
                                }}
                                placeholder="Enter track lyrics here..."
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none resize-none font-mono text-sm"
                              />
                            </div>

                            <div className="border-t border-white/5 pt-6 space-y-4">
                              <h4 className="text-[10px] font-bold text-accent uppercase tracking-[0.2em]">Music Store & Streaming Links (Optional)</h4>
                              <p className="text-[10px] text-secondary/70">Provide links so visitors can Stream, Buy, or Listen to this song on their favorite music platforms.</p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Spotify Track URL</label>
                                  <input
                                    type="text"
                                    value={track.spotifyUrl || ''}
                                    onChange={(e) => {
                                      const newTracks = [...localContent.tracks];
                                      newTracks[idx] = { ...newTracks[idx], spotifyUrl: e.target.value };
                                      updateLocalContent({ ...localContent, tracks: newTracks });
                                    }}
                                    placeholder="https://open.spotify.com/track/..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-accent outline-none text-white font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">Apple Music Track URL</label>
                                  <input
                                    type="text"
                                    value={track.appleMusicUrl || ''}
                                    onChange={(e) => {
                                      const newTracks = [...localContent.tracks];
                                      newTracks[idx] = { ...newTracks[idx], appleMusicUrl: e.target.value };
                                      updateLocalContent({ ...localContent, tracks: newTracks });
                                    }}
                                    placeholder="https://music.apple.com/song/..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-accent outline-none text-white font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">YouTube Music URL</label>
                                  <input
                                    type="text"
                                    value={track.youtubeMusicUrl || ''}
                                    onChange={(e) => {
                                      const newTracks = [...localContent.tracks];
                                      newTracks[idx] = { ...newTracks[idx], youtubeMusicUrl: e.target.value };
                                      updateLocalContent({ ...localContent, tracks: newTracks });
                                    }}
                                    placeholder="https://music.youtube.com/watch?v=..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-accent outline-none text-white font-mono"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-semibold text-secondary uppercase tracking-wider">YouTube Video URL</label>
                                  <input
                                    type="text"
                                    value={track.youtubeUrl || ''}
                                    onChange={(e) => {
                                      const newTracks = [...localContent.tracks];
                                      newTracks[idx] = { ...newTracks[idx], youtubeUrl: e.target.value };
                                      updateLocalContent({ ...localContent, tracks: newTracks });
                                    }}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-xs focus:border-accent outline-none text-white font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-end pt-4">
                              <button 
                                onClick={() => setEditingTrackId(null)}
                                className="px-6 py-2 bg-accent/10 text-accent border border-accent/20 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-accent hover:text-white transition-all"
                              >
                                Close Editor
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => onDrop(e, 'audio', (url, f) => {
                       const fileName = f.name.replace(/\.[^/.]+$/, "");
                       const newTrack = {
                         id: `track-${Date.now()}`,
                         title: fileName,
                         artist: localContent.artistName || "Artist",
                         audioUrl: url,
                         coverUrl: localContent.images.portrait,
                         duration: "0:00",
                         lyrics: ""
                       };
                       updateLocalContent({
                         ...localContent,
                         tracks: [...localContent.tracks, newTrack]
                       });
                    })}
                    className={`mt-12 p-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center transition-all ${
                      isDragging ? 'border-accent bg-accent/5' : 'border-white/5 bg-white/[0.01]'
                    }`}
                  >
                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <Upload className={`w-6 h-6 ${isDragging ? 'text-accent' : 'text-secondary'}`} />
                    </div>
                    <p className="text-sm font-bold opacity-40 uppercase tracking-widest">
                      {isDragging ? 'Drop to upload' : 'Drag & Drop Music or Click to Upload'}
                    </p>
                    <input 
                      type="file" 
                      accept="audio/*" 
                      className="mt-4 text-xs cursor-pointer" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'audio', (url) => {
                          const newTrack = {
                            id: `track-${Date.now()}`,
                            title: file.name.replace(/\.[^/.]+$/, ""),
                            artist: localContent.artistName || "Artist",
                            audioUrl: url,
                            coverUrl: localContent.images.portrait,
                            duration: "0:00",
                            lyrics: ""
                          };
                          updateLocalContent({
                            ...localContent,
                            tracks: [...localContent.tracks, newTrack]
                          });
                        });
                      }}
                    />
                    {Object.entries(uploadProgress).map(([id, progress]) => {
                      const name = id.split('-').slice(0, -1).join('-');
                      return <ProgressIndicator key={id} progress={progress as number} fileName={name} />;
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="space-y-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-xl font-bold">Gallery Management</h2>
                    <p className="text-xs text-secondary mt-1">Add moments from your journey.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5 text-accent" />
                      <span>Upload Files</span>
                      <input 
                        type="file" 
                        multiple 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []) as File[];
                          files.forEach(file => {
                            handleFileUpload(file, 'image', (url) => {
                              const newImage = {
                                id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                                url,
                                caption: "",
                                altText: ""
                              };
                              updateLocalContent({
                                ...localContent,
                                images: { 
                                  ...localContent.images, 
                                  gallery: [...(localContent.images.gallery || []), newImage] 
                                }
                              });
                            });
                          });
                        }}
                      />
                    </label>
                    <button 
                      onClick={() => setShowUrlInput(!showUrlInput)}
                      className={`px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border ${
                        showUrlInput 
                          ? 'bg-accent/10 border-accent/30 text-accent' 
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>{showUrlInput ? 'Cancel' : 'Add from Link'}</span>
                    </button>
                    <button
                      onClick={() => handleDriveBrowse((url) => {
                        const newImage = {
                          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                          url,
                          caption: "",
                          altText: ""
                        };
                        updateLocalContent({
                          ...localContent,
                          images: { 
                            ...localContent.images, 
                            gallery: [...(localContent.images.gallery || []), newImage] 
                          }
                        });
                        setIsBrowsingDrive(false);
                      }, 'image')}
                      className="px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                    >
                      <Cloud className="w-3.5 h-3.5 text-accent" />
                      <span>Drive</span>
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showUrlInput && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 bg-accent/5 border border-accent/10 rounded-2xl flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2 block">Direct Image URL</label>
                          <input 
                            type="text"
                            value={imageUrlInput}
                            onChange={(e) => setImageUrlInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddImageUrl()}
                            placeholder="https://images.unsplash.com/photo-..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none"
                            autoFocus
                          />
                        </div>
                        <button 
                          onClick={handleAddImageUrl}
                          disabled={!imageUrlInput}
                          className="md:self-end px-8 py-3 bg-accent text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
                        >
                          Add Image
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(localContent.images.gallery || []).map((img, idx) => (
                    <motion.div 
                      key={img.id}
                      layout
                      className="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                    >
                      <div className="relative aspect-square overflow-hidden group">
                        <img src={img.url || null} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute top-2 right-2 flex gap-2">
                          <button 
                            onClick={() => {
                              const gallery = localContent.images.gallery.filter(i => i.id !== img.id);
                              updateLocalContent({...localContent, images: {...localContent.images, gallery}});
                              showNotification('Image removed from gallery', 'success');
                            }}
                            className="p-2 bg-red-500 text-white rounded-lg hover:scale-110 transition-transform shadow-lg sm:opacity-0 sm:group-hover:opacity-100 opacity-100"
                            title="Delete Image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-3 bg-black/20">
                         <div className="space-y-1">
                            <label className="text-[8px] font-bold text-secondary uppercase tracking-[0.2em] ml-1">Caption</label>
                            <input 
                              type="text"
                              value={img.caption || ''}
                              onChange={(e) => {
                                const gallery = [...localContent.images.gallery];
                                gallery[idx] = { ...img, caption: e.target.value };
                                updateLocalContent({...localContent, images: {...localContent.images, gallery}});
                              }}
                              placeholder="Describe this moment..."
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white focus:border-accent outline-none"
                            />
                         </div>
                         <div className="space-y-1">
                            <label className="text-[8px] font-bold text-secondary uppercase tracking-[0.2em] ml-1">Alt Text (Accessibility)</label>
                            <input 
                              type="text"
                              value={img.altText || ''}
                              onChange={(e) => {
                                const gallery = [...localContent.images.gallery];
                                gallery[idx] = { ...img, altText: e.target.value };
                                updateLocalContent({...localContent, images: {...localContent.images, gallery}});
                              }}
                              placeholder="Visual description for screen readers..."
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[10px] text-white focus:border-accent outline-none"
                            />
                         </div>
                      </div>
                    </motion.div>
                  ))}
                  {Object.entries(uploadProgress).map(([id, progress]) => {
                    const isGalleryUpload = id.includes('image') && !id.includes('hero') && !id.includes('portrait');
                    if (isGalleryUpload) {
                      return (
                        <div key={id} className="aspect-[4/5] bg-white/5 border border-dashed border-white/20 rounded-2xl flex items-center justify-center p-8">
                           <ProgressIndicator progress={progress as number} fileName={id.split('-')[0]} />
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

            {activeTab === 'forms' && (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                      <h2 className="text-xl font-bold">Google Forms Integration</h2>
                      <p className="text-xs text-secondary mt-1">Select forms to display or link on your site.</p>
                    </div>
                    {!googleAccessToken ? (
                      <button 
                        onClick={async () => {
                          try {
                            await loginWithGoogleDrive();
                          } catch (err) {
                            showNotification('Failed to connect to Google', 'error');
                          }
                        }}
                        className="px-6 py-3 bg-white text-black font-bold text-[10px] tracking-widest rounded-xl hover:bg-accent hover:text-white transition-all uppercase active:scale-95"
                      >
                        Connect Google Account
                      </button>
                    ) : (
                      <button 
                        onClick={async () => {
                          const forms = await listForms(googleAccessToken);
                          const newForms = forms.map((f: any) => ({
                            id: f.id,
                            name: f.name,
                            url: f.webViewLink
                          }));
                          updateLocalContent({ ...localContent, googleForms: newForms });
                          showNotification(`Found ${forms.length} forms in your Drive`, 'success');
                        }}
                        className="px-6 py-3 bg-white/5 border border-white/10 text-white font-bold text-[10px] tracking-widest rounded-xl hover:bg-white/10 transition-all uppercase flex items-center gap-2 active:scale-95"
                      >
                        <RotateCcw className="w-4 h-4" /> Refresh Forms List
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {(localContent.googleForms || []).map((form: any) => (
                      <div key={form.id} className="p-6 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm">{form.name}</h4>
                            <p className="text-[10px] text-secondary/60 uppercase tracking-widest">Google Form</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <a 
                            href={form.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-secondary hover:text-white"
                            title="Open in Google Forms"
                          >
                            <LinkIcon className="w-4 h-4" />
                          </a>
                          <button 
                            onClick={() => {
                              const newForms = localContent.googleForms?.filter((f: any) => f.id !== form.id) || [];
                              updateLocalContent({ ...localContent, googleForms: newForms });
                            }}
                            className="p-3 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all rounded-xl border border-red-500/20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {(!localContent.googleForms || localContent.googleForms.length === 0) && (
                      <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl opacity-30">
                        <FileText className="w-12 h-12 mx-auto mb-4" />
                        <p className="text-xs font-bold tracking-widest uppercase">No forms connected</p>
                        <p className="text-[10px] mt-2 text-center max-w-xs mx-auto">Connect your account and refresh to see your Google Forms. You can use these to collect fan info or newsletter signups.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            {activeTab === 'footer' && (
                <div className="space-y-12">
                  <h2 className="text-xl font-bold mb-6">Footer & Social Settings</h2>
                  
                  <div className="space-y-4">
                    <label className="block text-xs font-bold tracking-widest text-secondary uppercase">Copyright Text</label>
                    <input
                      type="text"
                      value={localContent.footer?.copyrightText || ''}
                      onChange={(e) => updateLocalContent({...localContent, footer: {...localContent.footer, copyrightText: e.target.value}})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-accent outline-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold tracking-widest text-secondary uppercase">Social Links</label>
                      <button 
                        onClick={() => {
                          const socialLinks = [...(localContent.footer?.socialLinks || [])];
                          socialLinks.push({ platform: "Instagram", url: "", iconName: "Instagram" });
                          updateLocalContent({...localContent, footer: {...localContent.footer, socialLinks}});
                        }}
                        className="text-[10px] font-bold text-accent px-3 py-1 bg-accent/5 rounded-lg hover:bg-accent/20 transition-colors"
                      >
                        + ADD LINK
                      </button>
                    </div>
                    <div className="space-y-4">
                      {(localContent.footer?.socialLinks || []).map((link, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                           <div className="flex-1">
                              <label className="text-[10px] text-secondary/50 uppercase font-black mb-1 block">Platform</label>
                              <input
                                type="text"
                                value={link.platform}
                                onChange={(e) => {
                                  const socialLinks = [...(localContent.footer?.socialLinks || [])];
                                  socialLinks[idx] = { ...link, platform: e.target.value };
                                  updateLocalContent({...localContent, footer: {...localContent.footer, socialLinks}});
                                }}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-accent outline-none"
                              />
                           </div>
                           <div className="flex-1">
                              <label className="text-[10px] text-secondary/50 uppercase font-black mb-1 block">Icon (Instagram, Twitter, Youtube, Music2, Facebook, Globe)</label>
                              <input
                                type="text"
                                value={link.iconName}
                                onChange={(e) => {
                                  const socialLinks = [...(localContent.footer?.socialLinks || [])];
                                  socialLinks[idx] = { ...link, iconName: e.target.value };
                                  updateLocalContent({...localContent, footer: {...localContent.footer, socialLinks}});
                                }}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-accent outline-none"
                              />
                           </div>
                           <div className="flex-[2]">
                              <label className="text-[10px] text-secondary/50 uppercase font-black mb-1 block">URL</label>
                              <input
                                type="text"
                                value={link.url}
                                onChange={(e) => {
                                  const socialLinks = [...(localContent.footer?.socialLinks || [])];
                                  socialLinks[idx] = { ...link, url: e.target.value };
                                  updateLocalContent({...localContent, footer: {...localContent.footer, socialLinks}});
                                }}
                                className="w-full bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-sm focus:border-accent outline-none"
                              />
                           </div>
                           <button 
                              onClick={() => {
                                const socialLinks = [...(localContent.footer?.socialLinks || [])];
                                socialLinks.splice(idx, 1);
                                updateLocalContent({...localContent, footer: {...localContent.footer, socialLinks}});
                              }}
                              className="p-2 self-end text-secondary hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            {activeTab === 'pages' && (
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
                  <div>
                    <h2 className="text-xl font-bold">Dynamic Website Pages</h2>
                    <p className="text-xs text-secondary mt-1">Configure, rename, hide, or create brand-new custom pages for your website.</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      const pages = [...(localContent.pages || [])];
                      const newPageId = `custom-${Date.now()}`;
                      pages.push({
                        id: newPageId,
                        name: "New Custom Page",
                        slug: `new-page-${Math.round(Math.random() * 1000)}`,
                        type: "custom",
                        content: "## Welcome to my new page!\n\nThis is where you can write about whatever you like. You can use markdown headers and lists too.",
                        bannerUrl: "",
                        isVisible: true
                      });
                      updateLocalContent({...localContent, pages});
                      showNotification('Created new custom page! Click Save Changes above to deploy.', 'success');
                    }}
                    className="flex items-center gap-2 text-xs font-bold bg-white text-black px-5 py-3 hover:bg-accent hover:text-white rounded-xl transition-all font-sans tracking-widest uppercase shrink-0"
                  >
                    <Plus className="w-4 h-4" /> Create Custom Page
                  </button>
                </div>

                <div className="space-y-6">
                  {(localContent.pages || []).map((page, idx) => (
                    <div key={page.id} className="glass-panel p-6 md:p-8 rounded-[32px] border border-white/5 space-y-6 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full atmosphere-gradient opacity-5 pointer-events-none" />
                      
                      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${page.type === 'predefined' ? 'bg-accent/15 text-accent' : 'bg-green-500/15 text-green-400'}`}>
                            {page.type === 'predefined' ? 'Standard Core' : 'Custom'}
                          </div>
                          <h3 className="text-base font-bold uppercase tracking-tight">{page.name || 'Untitled Page'}</h3>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold tracking-wide select-none">
                            <input 
                              type="checkbox"
                              checked={page.isVisible}
                              disabled={page.predefinedKey === 'home'} // Prevent hiding home
                              onChange={(e) => {
                                const pages = [...(localContent.pages || [])];
                                pages[idx] = { ...page, isVisible: e.target.checked };
                                updateLocalContent({...localContent, pages});
                              }}
                              className="accent-accent w-4 h-4 rounded border-white/10"
                            />
                            <span className={page.predefinedKey === 'home' ? 'text-secondary/40' : 'text-secondary hover:text-white transition-colors'}>Visible in Navbar</span>
                          </label>

                          {page.type === 'custom' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete the "${page.name}" page permanently?`)) {
                                  const pages = [...(localContent.pages || [])];
                                  pages.splice(idx, 1);
                                  updateLocalContent({...localContent, pages});
                                  showNotification('Custom page deleted locally! Click Save Changes above to commit.', 'success');
                                }
                              }}
                              className="p-2 text-secondary/60 hover:text-red-400 transition-colors"
                              title="Delete Page"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Fields */}
                      <div className="grid md:grid-cols-2 gap-6 relative z-10">
                        <div className="space-y-2">
                          <label className="text-[10px] text-secondary/60 uppercase tracking-widest font-black block">Navigation / Page Title</label>
                          <input 
                            type="text"
                            value={page.name}
                            onChange={(e) => {
                              const pages = [...(localContent.pages || [])];
                              pages[idx] = { ...page, name: e.target.value };
                              updateLocalContent({...localContent, pages});
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none transition-colors"
                            placeholder="e.g. Gallery"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] text-secondary/60 uppercase tracking-widest font-black block">URL Slug (Path)</label>
                          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                            <span className="text-secondary/50 text-sm select-none pr-1">/</span>
                            <input 
                              type="text"
                              value={page.slug}
                              disabled={page.predefinedKey === 'home'} // Home slug must be empty
                              onChange={(e) => {
                                const pages = [...(localContent.pages || [])];
                                pages[idx] = { ...page, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') };
                                updateLocalContent({...localContent, pages});
                              }}
                              className="w-full bg-transparent border-none text-sm focus:outline-none focus:ring-0 disabled:opacity-40"
                              placeholder="e.g. photos"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Layout editor for custom pages */}
                      {page.type === 'custom' && (
                        <div className="space-y-6 pt-6 border-t border-white/5 relative z-10">
                          <div className="space-y-2">
                            <label className="text-[10px] text-secondary/60 uppercase tracking-widest font-black block">Page Header Image Banner</label>
                            
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                              {page.bannerUrl && (
                                <div className="w-24 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-black/40">
                                  <img src={page.bannerUrl} alt="banner thumbnail" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>
                              )}
                              
                              <input 
                                type="text"
                                value={page.bannerUrl || ''}
                                onChange={(e) => {
                                  const pages = [...(localContent.pages || [])];
                                  pages[idx] = { ...page, bannerUrl: e.target.value };
                                  updateLocalContent({...localContent, pages});
                                }}
                                className="flex-1 w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none"
                                placeholder="Paste external image web link (http...)"
                              />

                              <div className="relative overflow-hidden shrink-0">
                                <button type="button" className="px-4 py-3 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl transition-all flex items-center gap-2 uppercase tracking-wide">
                                  <Upload className="w-3.5 h-3.5" /> Upload Cover File
                                </button>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleFileUpload(file, 'image', (url) => {
                                        const pages = [...(localContent.pages || [])];
                                        pages[idx] = { ...page, bannerUrl: url };
                                        updateLocalContent({...localContent, pages});
                                      });
                                    }
                                  }}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] text-secondary/60 uppercase tracking-widest font-black block">Page Content / Layout Description</label>
                            <textarea 
                              rows={8}
                              value={page.content || ''}
                              onChange={(e) => {
                                const pages = [...(localContent.pages || [])];
                                pages[idx] = { ...page, content: e.target.value };
                                updateLocalContent({...localContent, pages});
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-accent outline-none font-mono resize-y min-h-[160px]"
                              placeholder="Write your custom content block here... You can use standard lists or headings prefixing lines with # for headlines or - for lists."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
