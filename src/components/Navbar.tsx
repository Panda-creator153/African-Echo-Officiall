import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Menu, Search, Play, Volume2, VolumeX } from 'lucide-react';
import { ARTIST_NAME, TRACKS, ALBUMS } from '../constants';
import { useMusic } from '../context/MusicContext';
import { useContent } from '../context/ContentContext';

const Navbar = () => {
  const location = useLocation();
  const { currentTrack, isPlaying, togglePlay, playTrack, masterVolume, setMasterVolume } = useMusic();
  const { content } = useContent();
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const navItems = (content?.pages || [])
    .filter(p => p.isVisible)
    .map(p => ({
      name: p.name.toUpperCase(),
      path: p.slug === '' ? '/' : `/${p.slug}`
    }));


  const toggleMenu = () => setIsOpen(!isOpen);

  const filteredTracks = searchQuery.trim() === '' ? [] : TRACKS.filter(track => 
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAlbums = searchQuery.trim() === '' ? [] : ALBUMS.filter(album => 
    album.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 px-6 py-8 flex justify-between items-center mix-blend-difference">
        <Link to="/" className="text-2xl font-display font-bold tracking-tighter text-white">
          {ARTIST_NAME}
        </Link>
        
        <div className="flex items-center space-x-12">
          <div className="hidden md:flex space-x-12">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`text-xs font-semibold tracking-widest hover:text-accent transition-colors relative ${
                  location.pathname === item.path ? 'text-accent' : 'text-white'
                }`}
              >
                {item.name}
                {location.pathname === item.path && (
                  <motion.div
                    layoutId="nav-underline"
                    className="absolute -bottom-1 left-0 w-full h-[1px] bg-accent"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>

          <button 
            onClick={() => setIsSearchOpen(true)}
            className="text-white hover:text-accent transition-colors"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>
          
          {currentTrack?.audioUrl && (
            <div className="flex items-center space-x-4">
              <button
                onClick={togglePlay}
                className={`text-white hover:text-accent transition-all flex items-center space-x-2 ${isPlaying ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
                aria-label={isPlaying ? "Mute Background Music" : "Play Background Music"}
              >
                {isPlaying ? (
                  <div className="flex items-end space-x-0.5 h-3">
                    <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-[1.5px] bg-accent" />
                    <motion.div animate={{ height: [8, 3, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-[1.5px] bg-accent" />
                    <motion.div animate={{ height: [3, 7, 3] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-[1.5px] bg-accent" />
                  </div>
                ) : <VolumeX className="w-5 h-5" />}
                <span className="text-[8px] font-bold tracking-widest hidden lg:block"> SOUND </span>
              </button>

              <div className="hidden lg:flex items-center space-x-2 group/mastervol w-24">
                <Volume2 className="w-3 h-3 text-white/40 group-hover/mastervol:text-accent transition-colors" />
                <div className="flex-1 h-[2px] bg-white/10 rounded-full relative overflow-hidden">
                  <motion.div 
                    className="absolute top-0 left-0 h-full bg-accent"
                    style={{ width: `${masterVolume * 100}%` }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={masterVolume}
                    onChange={(e) => setMasterVolume(Number(e.target.value))}
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="md:hidden">
            <button 
              onClick={toggleMenu}
              className="text-white text-xs font-bold tracking-widest flex items-center space-x-2"
            >
              <span>{isOpen ? 'CLOSE' : 'MENU'}</span>
              {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl p-6 md:p-20"
          >
            <div className="max-w-4xl mx-auto h-full flex flex-col">
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-xs font-bold tracking-[0.4em] text-accent uppercase">Search</h2>
                <button 
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="text-white hover:text-accent transition-colors"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <input
                ref={searchInputRef}
                type="text"
                placeholder="TYPE TO SEARCH TRACKS OR ALBUMS..."
                className="w-full bg-transparent border-b border-white/20 py-6 text-2xl md:text-5xl font-display font-medium tracking-tight text-white placeholder:text-white/10 outline-none focus:border-accent transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <div className="mt-12 flex-1 overflow-y-auto no-scrollbar">
                {searchQuery.trim() !== '' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    {filteredTracks.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-bold tracking-widest text-secondary mb-6 uppercase">Tracks</h3>
                        <div className="space-y-4">
                          {filteredTracks.map((track) => (
                            <div 
                              key={track.id} 
                              className="group flex items-center gap-4 cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors"
                              onClick={() => {
                                playTrack(track, filteredTracks);
                                setIsSearchOpen(false);
                              }}
                            >
                              <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                <img src={track.coverUrl || null} alt={track.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Play className="w-4 h-4 fill-white" />
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-bold tracking-tight">{track.title}</h4>
                                <p className="text-[10px] text-secondary tracking-widest">{track.artist}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredAlbums.length > 0 && (
                      <div>
                        <h3 className="text-[10px] font-bold tracking-widest text-secondary mb-6 uppercase">Albums</h3>
                        <div className="space-y-4">
                          {filteredAlbums.map((album) => (
                            <Link 
                              key={album.id} 
                              to="/music"
                              className="group flex items-center gap-4 p-2 rounded-lg hover:bg-white/5 transition-colors"
                              onClick={() => setIsSearchOpen(false)}
                            >
                              <div className="w-12 h-12 rounded overflow-hidden flex-shrink-0">
                                <img src={album.coverUrl || null} alt={album.title} className="w-full h-full object-cover" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold tracking-tight">{album.title}</h4>
                                <p className="text-[10px] text-secondary tracking-widest">{album.releaseDate}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredTracks.length === 0 && filteredAlbums.length === 0 && (
                      <div className="col-span-full py-20 text-center">
                        <p className="text-sm text-secondary tracking-widest">NO RESULTS FOUND FOR "{searchQuery.toUpperCase()}"</p>
                      </div>
                    )}
                  </div>
                )}
                {searchQuery.trim() === '' && (
                  <div className="py-20 text-center opacity-20">
                    <Search className="w-12 h-12 mx-auto mb-4" />
                    <p className="text-xs font-bold tracking-[0.4em]">START TYPING...</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex flex-col"
          >
            {/* Fullscreen Mobile Overlay Header */}
            <div className="px-6 py-8 flex justify-between items-center w-full">
              <Link to="/" onClick={() => setIsOpen(false)} className="text-2xl font-display font-bold tracking-tighter text-white">
                {ARTIST_NAME}
              </Link>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white text-xs font-bold tracking-widest flex items-center space-x-2"
              >
                <span>CLOSE</span>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Centered Navigation Links with clear tap targets */}
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 pb-16">
              {navItems.map((item, idx) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Link
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`text-4xl font-display font-bold tracking-tighter hover:text-accent transition-colors block py-2 px-6 ${
                      location.pathname === item.path ? 'text-accent' : 'text-white'
                    }`}
                  >
                    {item.name}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
