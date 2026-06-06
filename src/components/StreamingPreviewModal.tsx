import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink, RefreshCw, ShoppingCart, Disc, Compass } from 'lucide-react';
import { Track } from '../types';

interface StreamingPreviewModalProps {
  track: Track | null;
  onClose: () => void;
}

const StreamingPreviewModal: React.FC<StreamingPreviewModalProps> = ({ track, onClose }) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!track) return null;

  // Generate fallback search links if explicit ones aren't defined in the database
  const getSpotifyUrl = () => {
    return track.spotifyUrl || `https://open.spotify.com/search/${encodeURIComponent(track.title.trim() + " " + track.artist.trim())}`;
  };

  const getAppleMusicUrl = () => {
    return track.appleMusicUrl || `https://music.apple.com/us/search?term=${encodeURIComponent(track.title.trim() + " " + track.artist.trim())}`;
  };

  const getTidalUrl = () => {
    return `https://listen.tidal.com/search?q=${encodeURIComponent(track.title.trim() + " " + track.artist.trim())}`;
  };

  const getYoutubeMusicUrl = () => {
    return track.youtubeMusicUrl || `https://music.youtube.com/search?q=${encodeURIComponent(track.title.trim() + " " + track.artist.trim())}`;
  };

  const getDeezerUrl = () => {
    return `https://www.deezer.com/search/${encodeURIComponent(track.title.trim() + " " + track.artist.trim())}`;
  };

  const getAmazonMusicUrl = () => {
    return `https://music.amazon.com/search/${encodeURIComponent(track.title.trim() + " " + track.artist.trim())}`;
  };

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-[100] flex items-start justify-center p-4 overflow-y-auto cursor-pointer"
      >
        {/* Backdrop visual - styled like the warm, soft, flesh/sand side border of the image */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-neutral-950/80 backdrop-blur-lg"
        >
          {/* Subtle warm lighting gradient behind */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,163,115,0.12)_0%,transparent_70%)]" />
        </motion.div>

        {/* Smartphone-scaled / Lnk.to inspired container with sand-colored side gutters */}
        <motion.div
          initial={{ scale: 0.95, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, y: 20, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
          className="relative my-auto w-full max-w-sm bg-[#EBDCD3] rounded-[32px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-white/5 p-3.5 z-10 font-sans text-black cursor-default"
        >
          {/* Main White Smartlink Sheet */}
          <div className="bg-white rounded-[24px] overflow-hidden flex flex-col p-5 shadow-inner">
            
            {/* Elegant Header Area */}
            <div className="relative flex justify-between items-center pb-4 border-b border-gray-150 mb-4">
              <div className="min-w-0 flex-1">
                <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-[0.25em] font-mono block">Artist Catalog</span>
                <h3 className="text-md font-sans font-black uppercase text-neutral-900 tracking-tight truncate leading-none mt-1">
                  {track.artist}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-3 hover:bg-neutral-100 rounded-full text-neutral-500 hover:text-black transition-all cursor-pointer flex items-center justify-center shrink-0 -mr-2"
                title="Back to site"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Release Cover Card Presentation */}
            <div className="flex flex-col items-center text-center mt-2 mb-6">
              <div className="relative w-36 h-36 rounded-2xl overflow-hidden shadow-md border border-neutral-100 mb-4 group">
                <img
                  src={track.coverUrl || undefined}
                  alt={track.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/5" />
              </div>
              <h2 className="text-xl font-sans font-black text-neutral-900 uppercase tracking-tight leading-snug max-w-[240px]">
                {track.title}
              </h2>
              <p className="text-[11px] text-neutral-500 font-medium tracking-wide uppercase mt-1">
                Official Single
              </p>
            </div>

            {/* Smartlink platform rows following the Michael Jackson model from screenshot */}
            <div className="space-y-[1px] bg-neutral-100 border border-neutral-100 rounded-xl overflow-hidden">
              
              {/* Apple Music Row */}
              <div className="flex items-center justify-between p-4 bg-white hover:bg-neutral-50 transition-colors">
                <div className="flex items-center gap-3">
                  {/* Rounded red icon with double note */}
                  <div className="w-8 h-8 rounded-[6px] bg-[#FC3C44] flex items-center justify-center text-white shrink-0 shadow-sm">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5c0 .28-.22.5-.5.5s-.5-.22-.5-.5.22-.5.5-.5.5.22.5.5zm-.19-5.32c-.11.1-.24.16-.39.18l-1.5.2V15c0 .55-.45 1-1 1s-1-.45-1-1v-4c0-.55.45-1 1-1l1.5-.2V8c0-.55.45-1 1-1s1 .45 1 1v2c0 .26-.1.52-.29.7-.01.01-.21.21-.32.32h-.1z" className="hidden" />
                      {/* Accurate Note symbol */}
                      <path d="M17.5 6.5l-6 1.5v7.88c0 1.45-1.12 2.62-2.5 2.62S6.5 17.33 6.5 15.88s1.12-2.62 2.5-2.62c.49 0 .94.15 1.33.41V9l7.17-1.79v5.67c0 1.45-1.12 2.62-2.5 2.62s-2.5-1.17-2.5-2.62c0-1.45 1.12-2.62 2.5-2.62.49 0 .94.15 1.33.41V6.5h.17z" fill="white"/>
                    </svg>
                  </div>
                  <span className="font-sans font-bold text-neutral-800 text-[14px] tracking-tight">Apple Music</span>
                </div>
                <a
                  href={getAppleMusicUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="bg-[#EEF1F4] hover:bg-[#E1E4E7] text-[#1E2022] font-semibold text-xs py-1.5 px-5 rounded-md transition-all uppercase tracking-wider font-mono shadow-sm"
                >
                  Play
                </a>
              </div>

              {/* Spotify Row */}
              <div className="flex items-center justify-between p-4 bg-white hover:bg-neutral-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center text-white shrink-0 shadow-sm">
                    <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.565.387-.86.207-2.377-1.454-5.37-1.783-8.893-.982-.336.076-.67-.135-.746-.472-.076-.336.135-.67.472-.746 3.855-.88 7.15-.502 9.82 1.134.296.182.387.567.207.859zm1.226-2.72c-.226.367-.707.487-1.074.26-2.72-1.672-6.87-2.155-10.076-1.182-.41.124-.843-.105-.968-.515-.124-.41.105-.843.515-.968 3.666-1.112 8.24-.57 11.343 1.334.366.226.487.707.26 1.071zm.106-2.833C14.384 8.78 8.441 8.583 5.003 9.626c-.529.16-.1.9-.17.1 .07-.53-.16-.9-.1-.17-.07.53-.16.9-.53.16-3.83-1.162-10.4-1.385-14.117.886-.53.16-1.07-.15-.24-.68.16-.53.69-1.07.24-.68-.16-4.23-1.28-11.454-1.033-15.82 2.295-.8 2.428-1.554.498-1.78.17-.498.172-.82-.24-.967-.323-.15-.658.073-.81.4-.2.43-.8 4.63 1.208 12.375 1.12 15.65 1.137.2.43.32.1.24-.1" />
                    </svg>
                  </div>
                  <span className="font-sans font-bold text-neutral-800 text-[14px] tracking-tight">Spotify</span>
                </div>
                <a
                  href={getSpotifyUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="bg-[#EEF1F4] hover:bg-[#E1E4E7] text-[#1E2022] font-semibold text-xs py-1.5 px-5 rounded-md transition-all uppercase tracking-wider font-mono shadow-sm"
                >
                  Play
                </a>
              </div>

              {/* Tidal Row */}
              <div className="flex items-center justify-between p-4 bg-white hover:bg-neutral-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[4px] bg-black flex items-center justify-center text-white shrink-0 shadow-sm">
                    <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M12 1.5l3.5 3.5-3.5 3.5-3.5-3.5L12 1.5zm0 7l3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5zm7-3.5l3.5 3.5-3.5 3.5-3.5-3.5 3.5-3.5zM5 5L8.5 8.5 5 12 1.5 8.5 5 5z" />
                    </svg>
                  </div>
                  <span className="font-black text-xs uppercase tracking-[0.18em] text-neutral-900 leading-none">Tidal</span>
                </div>
                <a
                  href={getTidalUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="bg-[#EEF1F4] hover:bg-[#E1E4E7] text-[#1E2022] font-semibold text-xs py-1.5 px-5 rounded-md transition-all uppercase tracking-wider font-mono shadow-sm"
                >
                  Play
                </a>
              </div>

              {/* YouTube Row */}
              <div className="flex items-center justify-between p-4 bg-white hover:bg-neutral-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[6px] bg-[#FF0000] flex items-center justify-center text-white shrink-0 shadow-sm">
                    <svg className="w-5.5 h-5.5 fill-current" viewBox="0 0 24 24">
                      <path d="M23.498 6.163a3.003 3.003 0 00-2.11-2.11C19.518 3.5 12 3.5 12 3.5s-7.519 0-9.388.553a3.003 3.003 0 00-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 002.11 2.11c1.87.553 9.388.553 9.388.553s7.518 0 9.388-.553a3.003 3.003 0 002.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" fill="white" />
                    </svg>
                  </div>
                  <span className="font-sans font-black text-[13px] tracking-tight uppercase text-neutral-800">YouTube</span>
                </div>
                <a
                  href={track.youtubeUrl || getYoutubeMusicUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="bg-[#EEF1F4] hover:bg-[#E1E4E7] text-[#1E2022] font-semibold text-xs py-1.5 px-5 rounded-md transition-all uppercase tracking-wider font-mono shadow-sm"
                >
                  Play
                </a>
              </div>

              {/* Deezer Row */}
              <div className="flex items-center justify-between p-4 bg-white hover:bg-neutral-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[6px] bg-[#00C7F2] flex items-center justify-center text-white shrink-0 shadow-sm overflow-hidden">
                    {/* Retro equalizer stack representing Deezer */}
                    <div className="flex items-end gap-[2px] h-3.5 text-white">
                      <div className="w-[3px] h-3 bg-white" />
                      <div className="w-[3px] h-3.5 bg-white" />
                      <div className="w-[3px] h-2 bg-white" />
                      <div className="w-[3px] h-4 bg-white" />
                    </div>
                  </div>
                  <span className="font-sans font-black text-neutral-800 tracking-tight text-[13px] uppercase">Deezer</span>
                </div>
                <a
                  href={getDeezerUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="bg-[#EEF1F4] hover:bg-[#E1E4E7] text-[#1E2022] font-semibold text-xs py-1.5 px-5 rounded-md transition-all uppercase tracking-wider font-mono shadow-sm"
                >
                  Play
                </a>
              </div>

              {/* Amazon Music Row */}
              <div className="flex items-center justify-between p-4 bg-white hover:bg-neutral-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[6px] bg-[#146B81] flex items-center justify-center text-white shrink-0 shadow-sm">
                    <svg className="w-4.5 h-4.5 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4 11h-3v3c0 .55-.45 1-1 1s-1-.45-1-1v-3H8c-.55 0-1-.45-1-1s.45-1 1-1h3V9c0-.55.45-1 1-1s1 .45 1 1v3h3c.55 0 1 .45 1 1s-.45 1-1 1z" className="hidden" />
                      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" fill="none"/>
                      <path d="M8 12a4 4 0 008 0" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="font-sans font-extrabold text-neutral-800 text-[13px]">Amazon Music</span>
                </div>
                <a
                  href={getAmazonMusicUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="bg-[#EEF1F4] hover:bg-[#E1E4E7] text-[#1E2022] font-semibold text-xs py-1.5 px-5 rounded-md transition-all uppercase tracking-wider font-mono shadow-sm"
                >
                  CD/Vinyl
                </a>
              </div>

            </div>

            {/* Custom Bottom branding section */}
            <div className="text-center mt-5 pt-3.5 border-t border-neutral-100 flex items-center justify-center gap-1.5 text-neutral-400 font-mono text-[8.5px] uppercase tracking-widest">
              <span>Smartlink powered by</span>
              <span className="font-sans font-black text-neutral-700">African Echo Studio</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default StreamingPreviewModal;
