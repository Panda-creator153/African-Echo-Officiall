import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { MusicProvider } from './context/MusicContext';
import { ContentProvider, useContent } from './context/ContentContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import MusicPlayer from './components/MusicPlayer';
import BackToTop from './components/BackToTop';

// Pages
import Home from './pages/Home';
import About from './pages/About';
import Music from './pages/Music';
import Videos from './pages/Videos';
import Gallery from './pages/Gallery';
import Booking from './pages/Booking';
import Contact from './pages/Contact';
import Admin from './pages/Admin';
import CustomPageViewer from './pages/CustomPageViewer';

const CustomRoute = Route as any;

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

function AppContent() {
  const { content } = useContent();

  const getPageElement = (key: string) => {
    switch (key) {
      case 'home': return <Home />;
      case 'about': return <About />;
      case 'music': return <Music />;
      case 'videos': return <Videos />;
      case 'gallery': return <Gallery />;
      case 'booking': return <Booking />;
      case 'contact': return <Contact />;
      default: return null;
    }
  };

  return (
    <div className="bg-bg text-white min-h-screen selection:bg-accent selection:text-white pb-24">
      <ScrollToTop />
      <Navbar />
      <main>
        <Routes>
          {/* Admin is always available */}
          <Route path="/admin" element={<Admin />} />

          {/* Dynamically register visible pages */}
          {(content?.pages || [])
            .filter(page => page.isVisible)
            .map(page => {
              if (page.type === 'predefined' && page.predefinedKey) {
                const element = getPageElement(page.predefinedKey);
                return element ? (
                  <CustomRoute
                    key={page.id}
                    path={page.slug === '' ? '/' : `/${page.slug}`}
                    element={element}
                  />
                ) : null;
              } else if (page.type === 'custom') {
                return (
                  <CustomRoute
                    key={page.id}
                    path={`/${page.slug}`}
                    element={<CustomPageViewer />}
                  />
                );
              }
              return null;
            })}

          {/* Soft fallback redirects to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <MusicPlayer />
      <BackToTop />
      
      {/* Background Atmosphere */}
      <div className="fixed inset-0 z-[-1] pointer-events-none atmosphere-gradient opacity-40" />
    </div>
  );
}


export default function App() {
  return (
    <Router>
      <ContentProvider>
        <MusicProvider>
          <AppContent />
        </MusicProvider>
      </ContentProvider>
    </Router>
  );
}
