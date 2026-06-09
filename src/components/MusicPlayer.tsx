import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Volume2, ListMusic, Heart, Check, Repeat } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { useLocation } from 'react-router-dom';
import { ARTIST_NAME } from '../constants';
import Rating from './Rating';
import TrackQueue from './TrackQueue';
import Visualizer from './Visualizer';
import { getClientPlaceholderSvg } from '../utils/imageFallback';

const MusicPlayer = () => {
  const { 
    currentTrack, 
    isPlaying, 
    togglePlay, 
    progress, 
    duration, 
    seek, 
    volume, 
    setVolume, 
    isLooping,
    toggleLoop,
    nextTrack, 
    prevTrack,
    ratings,
    rateTrack,
    playlist,
    addToPlaylist,
    removeFromPlaylist,
    error,
    clearError
  } = useMusic();

  const location = useLocation();
  const [showLyrics, setShowLyrics] = React.useState(false);
  const [showQueue, setShowQueue] = React.useState(false);
  const [showLibraryNotification, setShowLibraryNotification] = useState(false);

  // Hide on admin page, home page, or if no track is selected or if track has no audioUrl
  if (location.pathname === '/admin' || location.pathname === '/' || !currentTrack || !currentTrack.audioUrl) return null;

  const isInPlaylist = playlist.some(t => t.id === currentTrack.id);

  const handlePlaylistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInPlaylist) {
      removeFromPlaylist(currentTrack.id);
    } else {
      addToPlaylist(currentTrack);
      setShowLibraryNotification(true);
      setTimeout(() => setShowLibraryNotification(false), 2000);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 w-full z-50 p-2 sm:p-3 pb-1.5 sm:pb-2.5"
    >
      {/* Playback error alerts are caught silently under the hood to ensure a polished player aesthetic */}

      <div className="glass-panel rounded-lg max-w-3xl mx-auto px-3 py-1.5 flex flex-col shadow-[0_10px_35px_rgba(0,0,0,0.4)] relative group overflow-hidden">
        {/* Glow effect & Visualizer background */}
        <div className="absolute inset-0 bg-accent/5 rounded-lg blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute bottom-0 left-0 w-full h-8 -z-5 pointer-events-auto opacity-10">
          <Visualizer barCount={32} className="w-full h-full" />
        </div>
        
        {/* Progress bar at the top of the player */}
        <div className="absolute top-0 left-0 w-full h-0.5 bg-white/5 rounded-t-lg overflow-hidden cursor-pointer group/progress">
          <motion.div
            className="h-full bg-accent relative"
            style={{ width: `${(progress / duration) * 100}%` }}
          >
             <div className="absolute right-0 top-1/2 -track-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform" />
          </motion.div>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={progress}
            onChange={(e) => seek(Number(e.target.value))}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between w-full relative z-10 gap-4">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="relative group/cover shrink-0">
              <img
                src={currentTrack.coverUrl || null}
                alt={`Now playing: ${currentTrack.title} by ${currentTrack.artist}`}
                className="w-10 h-10 rounded object-cover shadow-lg transition-transform duration-500 group-hover/cover:scale-105"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = getClientPlaceholderSvg(currentTrack.coverUrl || '', currentTrack.title);
                }}
              />
              {isPlaying && (
                <div className="absolute -bottom-0.5 -right-0.5 flex items-end space-x-0.5 h-2.5 bg-black/60 backdrop-blur-md p-0.5 rounded-sm">
                  <motion.div animate={{ height: [2, 8, 2] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-[1px] bg-accent" />
                  <motion.div animate={{ height: [6, 2, 6] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-[1px] bg-accent" />
                  <motion.div animate={{ height: [2, 7, 2] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-[1px] bg-accent" />
                </div>
              )}
            </div>
            <div className="overflow-hidden min-w-0">
              <div className="flex items-center gap-1.5">
                <motion.h4 
                  key={currentTrack.title}
                  initial={{ y: 3, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="text-[11px] sm:text-xs font-bold truncate tracking-tight text-white/90"
                >
                  {currentTrack.title}
                </motion.h4>
                <button
                  onClick={handlePlaylistToggle}
                  className={`p-1 transition-all shrink-0 ${isInPlaylist ? 'text-accent' : 'text-secondary hover:text-white'}`}
                  title={isInPlaylist ? "Remove from Library" : "Add to Library"}
                >
                  {isInPlaylist ? <Check className="w-3 h-3" /> : <Heart className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-[8px] font-bold tracking-widest text-secondary truncate mt-0.5 pb-0.5 opacity-60 uppercase">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="flex flex-col items-center shrink-0">
            <div className="flex items-center space-x-2 sm:space-x-5">
              <button 
                onClick={prevTrack}
                className="text-secondary hover:text-white transition-colors transform hover:-translate-x-0.5 hidden sm:block"
              >
                <SkipBack className="w-3.5 h-3.5 fill-current" />
              </button>
              <button
                onClick={togglePlay}
                className="bg-white text-black rounded-full p-2 hover:bg-accent hover:text-white transition-all transform hover:scale-105 shadow-md"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
              <button 
                onClick={nextTrack}
                className="text-secondary hover:text-white transition-colors transform hover:translate-x-0.5"
              >
                <SkipForward className="w-3.5 h-3.5 fill-current" />
              </button>
              <button 
                onClick={toggleLoop}
                className={`transition-colors transform hover:scale-110 hidden sm:block ${isLooping ? 'text-accent' : 'text-secondary hover:text-white'}`}
                title={isLooping ? "Disable Loop" : "Enable Loop"}
              >
                <Repeat className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 flex-1 min-w-0">
            <button 
              onClick={() => setShowQueue(!showQueue)}
              className={`p-1.5 rounded-full transition-colors ${showQueue ? 'text-accent' : 'text-secondary hover:text-white'}`}
              title="View Queue"
            >
              <ListMusic className="w-4 h-4" />
            </button>
            
            <div className="flex items-center space-x-1.5 group/vol hidden sm:flex">
              <Volume2 className="w-2.5 h-2.5 text-secondary group-hover/vol:text-white transition-colors" />
              <div className="w-10 h-[1px] bg-white/10 rounded-full relative overflow-hidden">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-white/30"
                  style={{ width: `${volume * 100}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="text-[7px] font-mono text-secondary tabular-nums opacity-30 hidden md:block">
              {formatTime(progress)}
            </div>
          </div>
        </div>

        <TrackQueue isOpen={showQueue} onClose={() => setShowQueue(false)} />

        <AnimatePresence>
          {showLyrics && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 100 }}
              className="mt-6 border-t border-white/5 pt-6"
            >
              <div className="max-h-[250px] overflow-y-auto no-scrollbar scroll-smooth">
                <div className="text-center pb-8">
                  <p className="text-secondary/40 text-[8px] font-black tracking-[0.4em] mb-6 uppercase">Lyrics</p>
                  <p className="text-white text-lg md:text-xl font-display font-medium tracking-tight leading-relaxed whitespace-pre-line max-w-2xl mx-auto italic">
                    {currentTrack.lyrics || "No lyrics available for this track."}
                  </p>
                  <p className="mt-8 text-[8px] font-bold tracking-widest text-secondary/30 uppercase">— {ARTIST_NAME} —</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default MusicPlayer;
