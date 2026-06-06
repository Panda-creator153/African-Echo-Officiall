import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  signOut,
  User
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { Video, CustomPage } from '../types';

interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  altText?: string;
}

interface Album {
  id: string;
  title: string;
  releaseDate: string;
  coverUrl: string;
  tracks: string[];
}

interface SiteContent {
  artistName: string;
  home: {
    heroTitle: string;
    heroSubtitle: string;
    aboutText: string;
    featuredTracks: string[];
    bioTitle: string;
    bioSubtitle: string;
    bioParagraphs: string[];
  };
  images: {
    hero: string;
    portrait: string;
    gallery: GalleryImage[];
  };
  tracks: any[];
  albums: Album[];
  videos: Video[];
  booking: {
    description: string;
    availability: string;
    base: string;
    email: string;
  };
  contact: {
    managementEmail: string;
    pressEmail: string;
    generalEmail: string;
  };
  footer: {
    socialLinks: { platform: string; url: string; iconName: string }[];
    copyrightText: string;
  };
  about: {
    tagline: string;
    story: string[];
    influences: string[];
    milestones: { year: string; title: string; description: string }[];
  };
  googleForms?: {
    id: string;
    name: string;
    url: string;
  }[];
  pages?: CustomPage[];
}

interface ContentContextType {
  content: SiteContent | null;
  loading: boolean;
  existingFiles: string[];
  refreshContent: () => Promise<void>;
  updateContent: (newContent: SiteContent) => Promise<{ success: boolean; warning?: string }>;
  uploadFile: (file: File, folder?: string, onProgress?: (progress: number) => void) => Promise<string | null>;
  user: { email: string } | null;
  isAdmin: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  googleAccessToken: string | null;
  loginWithGoogleDrive: () => Promise<string | null>;
  listDriveFiles: (token: string) => Promise<any[]>;
  listForms: (token: string) => Promise<any[]>;
  openPicker: (token: string, mimeTypes: string[]) => Promise<any>;
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export const ContentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initial skeleton to avoid "null" crashes while loading
  const defaultPages: CustomPage[] = [
    { id: 'p1', name: 'HOME', slug: '', type: 'predefined', predefinedKey: 'home', isVisible: true },
    { id: 'p2', name: 'ABOUT', slug: 'about', type: 'predefined', predefinedKey: 'about', isVisible: true },
    { id: 'p3', name: 'MUSIC', slug: 'music', type: 'predefined', predefinedKey: 'music', isVisible: true },
    { id: 'p4', name: 'VIDEOS', slug: 'videos', type: 'predefined', predefinedKey: 'videos', isVisible: true },
    { id: 'p5', name: 'GALLERY', slug: 'gallery', type: 'predefined', predefinedKey: 'gallery', isVisible: true },
    { id: 'p6', name: 'BOOKING', slug: 'booking', type: 'predefined', predefinedKey: 'booking', isVisible: true },
    { id: 'p7', name: 'CONTACT', slug: 'contact', type: 'predefined', predefinedKey: 'contact', isVisible: true },
  ];

  const initialSkeleton: SiteContent = {
    artistName: "...",
    home: { heroTitle: "...", heroSubtitle: "...", aboutText: "...", featuredTracks: [], bioTitle: "", bioSubtitle: "", bioParagraphs: [] },
    images: { hero: "", portrait: "", gallery: [] },
    tracks: [],
    albums: [],
    videos: [],
    booking: { description: "", availability: "", base: "", email: "" },
    contact: { managementEmail: "", pressEmail: "", generalEmail: "" },
    footer: { socialLinks: [], copyrightText: "" },
    about: { tagline: "", story: [], influences: [], milestones: [] },
    pages: defaultPages
  };

  const [content, setContent] = useState<SiteContent | null>(initialSkeleton);
  const [loading, setLoading] = useState(true);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // Fetch content from the backend /api/content
  const fetchContent = async () => {
    setLoading(true);
    try {
      console.log('Fetching content from local server /api/content...');
      const res = await fetch('/api/content', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          // Fallback to standard hardcoded pages list if the json from server doesn't contain pages list yet
          if (!data.pages || !Array.isArray(data.pages) || data.pages.length === 0) {
            data.pages = defaultPages;
          }
          setContent(data);
          console.log('Content loaded successfully from /api/content', data.pages);
        } else {
          console.error('Fetch content returned non-JSON content');
        }
      } else {
        console.error('Failed to fetch content:', res.statusText);
      }
    } catch (err) {
      console.error('Failed to fetch content:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing files from server uploads
  const fetchExistingFiles = async () => {
    try {
      const res = await fetch('/api/check-files', {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setExistingFiles(data.files || []);
        } else {
          console.warn('fetchExistingFiles returned non-JSON content');
        }
      }
    } catch (err) {
      console.error('Failed to fetch existing files:', err);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  useEffect(() => {
    fetchExistingFiles();
  }, [content]); // Refresh when content changes as it might mean new uploads

  // Load and verify existing admin token on startup
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');
      if (token) {
        try {
          const res = await fetch('/api/admin/verify', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.valid) {
              setUser({ email: data.email || 'silinkjay43@gmail.com' });
              setIsAdmin(true);
              return;
            }
          }
        } catch (error) {
          console.error('Error verifying token:', error);
        }
        // If verify failed or invalid token
        localStorage.removeItem('admin_token');
      }
      setUser(null);
      setIsAdmin(false);
    };
    checkAuth();
  }, []);

  const login = async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ password })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.token) {
          localStorage.setItem('admin_token', data.token);
          setUser({ email: 'silinkjay43@gmail.com' });
          setIsAdmin(true);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const loginWithGoogleDrive = async (): Promise<string | null> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/drive.readonly');
      
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        return credential.accessToken;
      }
      return null;
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.warn('Drive login: popup already open or cancelled.');
        return null;
      }
      console.error('Drive login error:', error);
      throw error;
    }
  };

  const listDriveFiles = async (token: string) => {
    try {
      const q = encodeURIComponent("mimeType contains 'audio/' and trashed = false");
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,thumbnailLink,webContentLink)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.files || [];
      }
      return [];
    } catch (error) {
      console.error('Drive listing error:', error);
      return [];
    }
  };

  const listForms = async (token: string) => {
    try {
      const q = encodeURIComponent("mimeType = 'application/vnd.google-apps.form' and trashed = false");
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.files || [];
      }
      return [];
    } catch (error) {
      console.error('Forms listing error:', error);
      return [];
    }
  };

  const openPicker = async (token: string, mimeTypes: string[]) => {
    return new Promise((resolve) => {
      const loadPicker = () => {
        const google = (window as any).google;
        const view = new google.picker.DocsView()
          .setMimeTypes(mimeTypes.join(','))
          .setMode(google.picker.DocsViewMode.GRID);

        const projectNumber = firebaseConfig.appId.split(':')[1];
        const picker = new google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(token)
          .setDeveloperKey(import.meta.env.VITE_GOOGLE_PICKER_API_KEY || firebaseConfig.apiKey)
          .setAppId(projectNumber)
          .setOrigin(window.location.protocol + '//' + window.location.host)
          .setCallback((data: any) => {
            if (data.action === google.picker.Action.PICKED) {
              resolve(data.docs[0]);
            } else if (data.action === google.picker.Action.CANCEL) {
              resolve(null);
            }
          })
          .build();
        picker.setVisible(true);
      };

      if (!(window as any).google?.picker) {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
          (window as any).gapi.load('picker', { callback: loadPicker });
        };
        document.body.appendChild(script);
        script.id = 'google-picker-api';
      } else {
        loadPicker();
      }
    });
  };

  const logout = async () => {
    try {
      localStorage.removeItem('admin_token');
      setUser(null);
      setIsAdmin(false);
      setGoogleAccessToken(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateContent = async (newContent: SiteContent): Promise<{ success: boolean; warning?: string }> => {
    if (!isAdmin) {
      console.error('Update failed: User is not an admin');
      return { success: false, warning: 'User is not an admin' };
    }

    if (!newContent.artistName || !newContent.home || !newContent.contact) {
      console.error('Update failed: Content object is incomplete. artistName, home, and contact are required.', newContent);
      return { success: false, warning: 'Content object is incomplete' };
    }

    try {
      console.log('Saving content directly to local server-side JSON (/api/content)...');
      const token = localStorage.getItem('admin_token');
      if (!token) {
        console.error('No authenticated token');
        return { success: false, warning: 'No authenticated token found' };
      }

      const res = await fetch('/api/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newContent)
      });

      if (res.ok) {
        setContent(newContent);
        const data = await res.json().catch(() => ({}));
        console.log('Successfully saved to local JSON server store');
        return { success: true, warning: data.warning };
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Server save error:', errData.error || res.statusText);
        return { success: false, warning: errData.error || res.statusText };
      }
    } catch (error: any) {
      console.error('Content update failed:', error);
      return { success: false, warning: error.message || 'Unknown network error' };
    }
  };

  const uploadFile = (file: File, folder: string = 'general', onProgress?: (progress: number) => void): Promise<string | null> => {
    return new Promise(async (resolve) => {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        console.error('Upload failed: User is not authenticated');
        return resolve(null);
      }
      
      try {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          const contentType = xhr.getResponseHeader('content-type') || '';
          
          if (xhr.status >= 200 && xhr.status < 300) {
            // First, try parsing the response directly as JSON - fully robust to any missing or stripped Content-Type headers
            try {
              const response = JSON.parse(xhr.responseText);
              if (response && response.url) {
                resolve(response.url);
                return;
              }
            } catch (jsonErr) {
              // Ignore parse error here to log a more descriptive message below
            }

            // If we are here, parsing failed or was empty
            const preview = xhr.responseText.substring(0, 120);
            console.error(`Upload returned non-JSON response with status ${xhr.status}. Content-Type: ${contentType}. Body preview: ${preview}`);
            resolve(null);
          } else {
            console.error(`Upload failed with status ${xhr.status}:`, xhr.statusText);
            resolve(null);
          }
        });

        xhr.addEventListener('error', () => {
          console.error('Upload error');
          resolve(null);
        });

        xhr.open('POST', '/api/upload');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.send(formData);
      } catch (error) {
        console.error('Error in uploadFile helper:', error);
        resolve(null);
      }
    });
  };

  return (
    <ContentContext.Provider value={{ 
      content, 
      loading, 
      existingFiles,
      refreshContent: fetchContent,
      updateContent, 
      uploadFile,
      user,
      isAdmin,
      login,
      logout,
      googleAccessToken,
      loginWithGoogleDrive,
      listDriveFiles,
      listForms,
      openPicker
    }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) throw new Error('useContent must be used within a ContentProvider');
  return context;
};
