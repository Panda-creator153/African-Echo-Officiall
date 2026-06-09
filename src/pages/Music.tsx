import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Download, Share2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ListMusic, CheckCircle2, Trash2, Youtube, Music as MusicIcon, Disc, ExternalLink } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { useContent } from '../context/ContentContext';
import Rating from '../components/Rating';
import SEO from '../components/SEO';
import { getClientPlaceholderSvg } from '../utils/imageFallback';

const Music = () => {
  const { playTrack, currentTrack, isPlaying, ratings, rateTrack, addToPlaylist, removeFromPlaylist, playlist } = useMusic();
  const { content, loading } = useContent();
  const [activeAlbumIndex, setActiveAlbumIndex] = useState(0);
  const [expandedTrackId, setExpandedTrackId] = useState<string | null>(null);
  const [direction, setDirection] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'releases' | 'library'>('releases');
  const [playerDeckMode, setPlayerDeckMode] = useState<'interactive' | 'embed'>('interactive');

  const getSpotifyEmbedUrl = (url?: string) => {
    if (!url) return null;
    const albumMatch = url.match(/open\.spotify\.com\/album\/([a-zA-Z0-9]+)/);
    if (albumMatch) {
      return `https://open.spotify.com/embed/album/${albumMatch[1]}?utm_source=generator&theme=0`;
    }
    const playlistMatch = url.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    if (playlistMatch) {
      return `https://open.spotify.com/embed/playlist/${playlistMatch[1]}?utm_source=generator&theme=0`;
    }
    const trackMatch = url.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
    if (trackMatch) {
      return `https://open.spotify.com/embed/track/${trackMatch[1]}?utm_source=generator&theme=0`;
    }
    return null;
  };

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (!content) return null;

  const handleAddToPlaylist = (e: React.MouseEvent, track: any) => {
    e.stopPropagation();
    addToPlaylist(track);
    setNotification(`${track.title} added to your playlist`);
  };

  const albums = content.albums || [];
  const currentAlbum = albums[activeAlbumIndex];
  
  if (!currentAlbum && albums.length > 0) {
    // Fallback if index out of bounds
    setActiveAlbumIndex(0);
  }

  const albumTracks = useMemo(() => {
    if (viewMode === 'library') return playlist;
    if (!currentAlbum) return [];
    return (content.tracks || []).filter(t => {
      if (currentAlbum.tracks && currentAlbum.tracks.includes(t.id)) return true;
      if (t.album && currentAlbum.title && t.album.trim().toLowerCase() === currentAlbum.title.trim().toLowerCase()) return true;
      return false;
    });
  }, [viewMode, currentAlbum, content.tracks, playlist]);

  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setActiveAlbumIndex((prev) => {
      let next = prev + newDirection;
      if (next < 0) next = albums.length - 1;
      if (next >= albums.length) next = 0;
      return next;
    });
  };

  const musicSchema = useMemo(() => {
    if (!content) return null;
    return {
      "@context": "https://schema.org",
      "@type": "MusicGroup",
      "name": content.artistName,
      "album": content.albums.map(album => ({
        "@type": "MusicAlbum",
        "name": album.title,
        "datePublished": album.releaseDate,
        "image": album.coverUrl,
        "track": content.tracks
          .filter(t => album.tracks.includes(t.id))
          .map(t => ({
            "@type": "MusicRecording",
            "name": t.title,
            "duration": t.duration
          }))
      }))
    };
  }, [content]);

  const toggleTrackExpansion = (trackId: string) => {
    setExpandedTrackId(expandedTrackId === trackId ? null : trackId);
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  return (
    <div className="pt-40 pb-32 px-6 overflow-hidden">
      <SEO 
        title="Discography & Releases" 
        description={`Explore the official discography of ${content.artistName}. Listen to atmospheric cinematic music and East African electronic soul.`}
        schema={musicSchema}
      />
      <div className="max-w-7xl mx-auto">
        <header className="mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <button 
                onClick={() => setViewMode('releases')}
                className={`text-[10px] font-bold tracking-[0.4em] uppercase transition-colors ${viewMode === 'releases' ? 'text-accent' : 'text-secondary hover:text-white'}`}
              >
                Discography
              </button>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <button 
                onClick={() => setViewMode('library')}
                className={`text-[10px] font-bold tracking-[0.4em] uppercase transition-colors ${viewMode === 'library' ? 'text-accent' : 'text-secondary hover:text-white'}`}
              >
                My Library ({playlist.length})
              </button>
            </div>
            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight mb-8 uppercase">
              {viewMode === 'releases' ? 'Releases' : 'Collection'}
            </h1>
            <div className="w-24 h-1 bg-accent" />
          </div>
          
          <div className="flex items-center space-x-4 mb-2">
            <span className="text-[10px] font-mono text-secondary uppercase tracking-widest">Album {activeAlbumIndex + 1} / {albums.length}</span>
            <div className="flex space-x-2">
              <button 
                onClick={() => paginate(-1)}
                className="p-3 border border-white/10 rounded-full hover:bg-accent hover:border-accent group transition-all"
              >
                <ChevronLeft className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
              <button 
                onClick={() => paginate(1)}
                className="p-3 border border-white/10 rounded-full hover:bg-accent hover:border-accent group transition-all"
              >
                <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        <AnimatePresence initial={false} custom={direction} mode="wait">
          {viewMode === 'releases' ? (
            <motion.div
              key={currentAlbum.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="grid lg:grid-cols-12 gap-16 relative"
            >
              {/* Cinematic Art Blur Backglow Accent */}
              {currentAlbum.coverUrl && (
                <div 
                  className="absolute -top-40 left-1/2 -translate-x-1/2 w-full max-w-[150%] aspect-[2/1] -z-10 opacity-30 blur-3xl pointer-events-none rounded-full transition-all duration-1000 ease-in-out"
                  style={{
                    background: `radial-gradient(circle, var(--color-accent) 0%, transparent 70%)`,
                    filter: 'blur(120px) opacity(0.25)'
                  }}
                />
              )}

              {/* Left Column: Visual 3D Vinyl Sleeve Showcase */}
              <div className="lg:col-span-5">
                <div className="sticky top-40 space-y-8">
                  {/* Rotating Vinyl Record sleeve interaction */}
                  <div className="relative group/vinyl flex items-center justify-center w-full aspect-square mb-6 select-none">
                    {/* Background Vinyl Disk */}
                    <div 
                      className={`absolute w-[94%] aspect-square rounded-full bg-[#0d0d0d] flex items-center justify-center border-[6px] border-[#181818] transition-all duration-700 ease-out z-0 overflow-hidden shadow-2xl ${
                        (currentTrack && isPlaying && (currentAlbum.tracks || []).includes(currentTrack.id))
                          ? 'translate-x-[42%] rotate-[360deg] opacity-100 scale-100' 
                          : 'group-hover/vinyl:translate-x-[36%] opacity-90 scale-95'
                      }`}
                      style={{
                        backgroundImage: `repeating-radial-gradient(circle, #0c0c0c 0px, #0c0c0c 4px, #1a1a1a 5px, #1a1a1a 9px)`,
                        animation: (currentTrack && isPlaying && (currentAlbum.tracks || []).includes(currentTrack.id)) ? 'spin 12s linear infinite' : 'none'
                      }}
                    >
                      {/* Inner Shine Accent */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none opacity-40" />
                      
                      {/* Target Sticker Label */}
                      <div className="w-[36%] aspect-square rounded-full bg-neutral-900 flex items-center justify-center border-4 border-neutral-950 shadow-inner overflow-hidden relative">
                        {currentAlbum.coverUrl ? (
                          <img 
                            src={currentAlbum.coverUrl} 
                            alt="" 
                            className="w-full h-full object-cover rounded-full" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getClientPlaceholderSvg(currentAlbum.coverUrl || '', currentAlbum.title);
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-accent/20 rounded-full flex items-center justify-center">
                            <Disc className="w-6 h-6 text-accent" />
                          </div>
                        )}
                        {/* Center Hole cutout */}
                        <div className="w-5 h-5 rounded-full bg-black/95 border border-neutral-800 absolute z-10 shadow-lg flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
                        </div>
                      </div>
                    </div>

                    {/* Front Cover Card Sleeve */}
                    <div className="relative z-10 w-full aspect-square bg-[#0c0c0c] rounded-3xl overflow-hidden shadow-[5px_25px_50px_-15px_rgba(0,0,0,0.95)] border border-white/5 transition-transform duration-700 ease-out group-hover/vinyl:-translate-x-[8%]">
                      <motion.img
                        layoutId={`album-cover-${currentAlbum.id}`}
                        src={currentAlbum.coverUrl || null}
                        alt={`${content.artistName} Album - ${currentAlbum.title}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getClientPlaceholderSvg(currentAlbum.coverUrl || '', currentAlbum.title);
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-8 opacity-0 group-hover/vinyl:opacity-100 transition-opacity duration-500">
                         <div className="flex justify-end">
                           <span className="text-[9px] bg-black/60 backdrop-blur-md text-accent border border-accent/20 px-3 py-1 rounded-md font-mono uppercase tracking-widest font-bold">
                             {currentAlbum.releaseDate} Release
                           </span>
                         </div>
                         <div className="space-y-1">
                           <p className="text-[9px] text-accent font-bold uppercase tracking-[0.2em]">Official Album</p>
                           <h3 className="text-xl font-bold tracking-tight text-white uppercase">{currentAlbum.title}</h3>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Era Title Block */}
                  <div className="px-1 space-y-1">
                    <span className="text-[10px] font-bold text-accent uppercase tracking-[0.2em] font-mono block">Artist LP Experience</span>
                    <h2 className="text-4xl md:text-5xl font-display font-extrabold tracking-tight uppercase text-white leading-none">
                      {currentAlbum.title}
                    </h2>
                    <div className="flex items-center gap-3.5 pt-2 text-xs text-secondary font-medium font-sans">
                      <span>Era {currentAlbum.releaseDate}</span>
                      <div className="w-1 h-1 rounded-full bg-white/20" />
                      <span>{albumTracks.length} tracks catalogued</span>
                    </div>
                  </div>

                  {/* Album Level Streaming / Store Links (Redesigned with official brand layouts) */}
                  {(currentAlbum.spotifyUrl || currentAlbum.appleMusicUrl || currentAlbum.youtubeMusicUrl || currentAlbum.youtubeUrl) && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-3.5 backdrop-blur-md">
                      <h3 className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase flex items-center gap-2">
                        <Disc className="w-3.5 h-3.5 text-accent animate-[spin_4s_linear_infinite]" />
                        <span>Stream / Purchase Platform</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-3.5">
                        {currentAlbum.spotifyUrl && (
                          <a
                            href={currentAlbum.spotifyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 bg-black/40 border border-white/5 hover:border-[#1DB954]/55 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all hover:bg-[#1DB954]/10 group text-[#1DB954]"
                          >
                            <Disc className="w-4 h-4 text-[#1DB954] group-hover:rotate-45 transition-transform" />
                            <span className="text-white font-mono text-[10px]">Spotify</span>
                          </a>
                        )}
                        {currentAlbum.appleMusicUrl && (
                          <a
                            href={currentAlbum.appleMusicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 bg-black/40 border border-white/5 hover:border-[#FC3C44]/55 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all hover:bg-[#FC3C44]/10 group text-[#FC3C44]"
                          >
                            <MusicIcon className="w-4 h-4 text-[#FC3C44] group-hover:scale-110 transition-transform" />
                            <span className="text-white font-mono text-[10px]">Apple Music</span>
                          </a>
                        )}
                        {currentAlbum.youtubeMusicUrl && (
                          <a
                            href={currentAlbum.youtubeMusicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 bg-black/40 border border-white/5 hover:border-[#FF0000]/55 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all hover:bg-[#FF0000]/10 group text-[#FF0000]"
                          >
                            <Youtube className="w-4 h-4 text-[#FF0000] group-hover:scale-110 transition-transform" />
                            <span className="text-white font-mono text-[10px]">YT Music</span>
                          </a>
                        )}
                        {currentAlbum.youtubeUrl && (
                          <a
                            href={currentAlbum.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-4 py-3 bg-black/40 border border-white/5 hover:border-red-500/55 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all hover:bg-red-500/10 group text-red-500"
                          >
                            <Youtube className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
                            <span className="text-white font-mono text-[10px]">YouTube Video</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Album Level Auxiliary Actions */}
                  <div className="flex space-x-3.5">
                     <button className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white/5 hover:bg-white/10 active:scale-95 text-xs text-white border border-white/10 rounded-xl transition-all uppercase tracking-widest font-black">
                       <Download className="w-4 h-4 text-accent" />
                       <span>Download Digital Booklet</span>
                     </button>
                     <button 
                       onClick={() => {
                         navigator.clipboard.writeText(`${window.location.origin}/music?album=${currentAlbum.id}`);
                         setNotification("Album share link copied!");
                       }}
                       className="p-3.5 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl text-white transition-all"
                       title="Share Release"
                     >
                       <Share2 className="w-4 h-4" />
                     </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Double Player Deck & Tracklist */}
              <div className="lg:col-span-7 pt-4 space-y-6">
                
                {/* Embedded Stream Toggle Controller */}
                {getSpotifyEmbedUrl(currentAlbum.spotifyUrl) && (
                  <div className="flex bg-neutral-900/60 p-1 rounded-full border border-white/10 max-w-sm ml-1 select-none">
                    <button
                      onClick={() => setPlayerDeckMode('interactive')}
                      className={`flex-1 py-2 rounded-full text-[10px] font-mono tracking-widest uppercase font-black transition-all ${
                        playerDeckMode === 'interactive' 
                          ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                          : 'text-secondary hover:text-white'
                      }`}
                    >
                      Bespoke Preview
                    </button>
                    <button
                      onClick={() => setPlayerDeckMode('embed')}
                      className={`flex-1 py-2 rounded-full text-[10px] font-mono tracking-widest uppercase font-black transition-all flex items-center justify-center gap-1.5 ${
                        playerDeckMode === 'embed' 
                          ? 'bg-[#1DB954] text-black shadow-lg shadow-[#1DB954]/25 font-black' 
                          : 'text-secondary hover:text-white'
                      }`}
                    >
                      <Disc className={`w-3.5 h-3.5 ${playerDeckMode === 'embed' ? 'text-black animate-[spin_5s_linear_infinite]' : 'text-secondary'}`} />
                      <span>Spotify Player</span>
                    </button>
                  </div>
                )}

                {/* Main Action Deck Container */}
                <AnimatePresence mode="wait">
                  {playerDeckMode === 'embed' && getSpotifyEmbedUrl(currentAlbum.spotifyUrl) ? (
                    <motion.div
                      key="embed-player"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="w-full bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 space-y-5 backdrop-blur-md"
                    >
                      <div className="flex items-start gap-4 border-b border-white/5 pb-5">
                        <Disc className="w-6 h-6 text-[#1DB954] animate-[spin_5s_linear_infinite] mt-0.5 shrink-0" />
                        <div>
                          <h4 className="text-sm font-bold uppercase tracking-wider text-white font-display">Native High Fidelity Stream</h4>
                          <p className="text-[11px] text-secondary leading-relaxed mt-1 font-sans">
                            Stream the complete mastered tracks directly through the Spotify Frame. Premium accounts will listen to complete full length songs without leaving the site.
                          </p>
                        </div>
                      </div>
                      <div className="overflow-hidden rounded-2xl shadow-2xl bg-black border border-white/5">
                        <iframe
                          src={getSpotifyEmbedUrl(currentAlbum.spotifyUrl) || undefined}
                          width="100%"
                          height="400"
                          frameBorder="0"
                          allowFullScreen={false}
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                          loading="lazy"
                        />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="interactive-tracks"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {albumTracks.length === 0 ? (
                        <div className="py-20 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                          <p className="text-sm text-secondary italic font-light">No tracks linked to this release yet.</p>
                        </div>
                      ) : (
                        albumTracks.map((track, index) => (
                          <motion.div
                            key={track.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.04 }}
                            className={`group flex flex-col rounded-2xl transition-all cursor-pointer overflow-hidden border border-transparent ${
                              currentTrack?.id === track.id 
                                ? 'bg-white/10 border-white/5' 
                                : 'hover:bg-white/[0.04] hover:border-white/5'
                            }`}
                            onClick={() => {
                              setExpandedTrackId(expandedTrackId === track.id ? null : track.id);
                            }}
                          >
                            <div className="flex items-center justify-between p-5 md:p-6">
                              <div className="flex items-center space-x-5 min-w-0 flex-1">
                                <span className="text-xs font-mono text-secondary w-5 shrink-0">
                                  {(index + 1).toString().padStart(2, '0')}
                                </span>
                                
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playTrack(track, albumTracks);
                                  }}
                                  className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-accent active:scale-95 transition-all shrink-0"
                                  title="Listen & Stream"
                                >
                                  <ExternalLink className="w-4 h-4 text-white" />
                                </button>
                                
                                <div className="min-w-0 pr-4">
                                  <h4 className={`text-base md:text-lg font-bold group-hover:text-accent transition-colors truncate ${
                                    currentTrack?.id === track.id ? 'text-accent' : 'text-white'
                                  }`}>
                                    {track.title}
                                  </h4>
                                  <p className="text-xs text-secondary/75 font-medium truncate mt-0.5">{track.artist}</p>
                                </div>
                              </div>

                              <div className="flex items-center space-x-4 md:space-x-6 shrink-0">
                                {(() => {
                                  const isInPlaylist = playlist.some(p => p.id === track.id);
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isInPlaylist) {
                                          removeFromPlaylist(track.id);
                                        } else {
                                          handleAddToPlaylist(e, track);
                                        }
                                      }}
                                      className={`p-2 transition-colors group/playlist relative ${isInPlaylist ? 'text-accent' : 'text-secondary hover:text-accent'}`}
                                      title={isInPlaylist ? "Remove from Library" : "Add to Library"}
                                    >
                                      {isInPlaylist ? <CheckCircle2 className="w-4 h-4" /> : <ListMusic className="w-4 h-4" />}
                                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neutral-900 border border-white/10 text-white text-[8px] font-bold px-2 py-1 rounded opacity-0 group-hover/playlist:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">
                                        {isInPlaylist ? 'Remove Library' : 'Add Library'}
                                      </span>
                                    </button>
                                  );
                                })()}
                                
                                {track.audioUrl ? (
                                  <button 
                                    className="p-2 text-secondary hover:text-accent transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(track.audioUrl, '_blank');
                                    }}
                                    title="Download mp3"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <div className="flex items-center space-x-1.5">
                                    {track.spotifyUrl && (
                                      <a
                                        href={track.spotifyUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 bg-white/5 hover:bg-[#1DB954]/15 border border-white/10 hover:border-[#1DB954]/50 rounded-lg text-[#1DB954] transition-all"
                                        title="Stream on Spotify"
                                      >
                                        <Disc className="w-3.5 h-3.5 animate-[spin_8s_linear_infinite]" />
                                      </a>
                                    )}
                                    {track.appleMusicUrl && (
                                      <a
                                        href={track.appleMusicUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 bg-white/5 hover:bg-[#FC3C44]/15 border border-white/10 hover:border-[#FC3C44]/50 rounded-lg text-[#FC3C44] transition-all"
                                        title="Hear on Apple Music"
                                      >
                                        <MusicIcon className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                    {track.youtubeMusicUrl && (
                                      <a
                                        href={track.youtubeMusicUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 bg-white/5 hover:bg-[#FF0000]/15 border border-white/10 hover:border-[#FF0000]/50 rounded-lg text-[#FF0000] transition-all"
                                        title="Stream on YT Music"
                                      >
                                        <Youtube className="w-3.5 h-3.5" />
                                      </a>
                                    )}
                                  </div>
                                )}
                                
                                <span className="text-xs font-mono text-secondary shrink-0 hidden sm:block">{track.duration}</span>
                                
                                <div className="text-secondary group-hover:text-white transition-colors shrink-0">
                                  {expandedTrackId === track.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </div>
                              </div>
                            </div>
                            
                            <AnimatePresence>
                              {expandedTrackId === track.id && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="bg-black/20 border-t border-white/5"
                                >
                                  <div className="p-6 md:p-8 md:pl-24 flex flex-col md:flex-row gap-8 md:gap-12">
                                    <div className="flex-1">
                                      <h5 className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase mb-4 font-mono">Official Lyrics</h5>
                                      {track.lyrics ? (
                                        <pre className="text-sm text-secondary/90 font-sans leading-relaxed whitespace-pre-wrap italic">
                                          {track.lyrics}
                                        </pre>
                                      ) : (
                                        <p className="text-xs text-secondary/35 italic font-sans">Official lyrics have not been published for this transmission.</p>
                                      )}
                                    </div>
                                    
                                    <div className="md:w-64 space-y-6 shrink-0">
                                      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl">
                                        <h5 className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase mb-3 font-mono">Listener Rating</h5>
                                        <Rating 
                                          rating={ratings[track.id] || 0} 
                                          onRate={(val) => rateTrack(track.id, val)} 
                                          size={20}
                                        />
                                      </div>
                                      
                                      {(track.spotifyUrl || track.appleMusicUrl || track.youtubeMusicUrl || track.youtubeUrl) && (
                                        <div className="pt-5 border-t border-white/5 space-y-3">
                                          <h5 className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase font-mono">Stream Track</h5>
                                          <div className="grid grid-cols-1 gap-2 border border-white/5 p-3 rounded-xl bg-black/40">
                                            {track.spotifyUrl && (
                                              <a
                                                href={track.spotifyUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-900 border border-white/5 hover:border-[#1DB954]/50 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all hover:bg-[#1DB954]/10 text-white group"
                                              >
                                                <span>Spotify</span>
                                                <Disc className="w-3.5 h-3.5 text-[#1DB954] group-hover:rotate-45 transition-transform shrink-0" />
                                              </a>
                                            )}
                                            {track.appleMusicUrl && (
                                              <a
                                                href={track.appleMusicUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-900 border border-white/5 hover:border-[#FC3C44]/50 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all hover:bg-[#FC3C44]/10 text-white group"
                                              >
                                                <span>Apple Music</span>
                                                <MusicIcon className="w-3.5 h-3.5 text-[#FC3C44] group-hover:scale-110 transition-transform shrink-0" />
                                              </a>
                                            )}
                                            {track.youtubeMusicUrl && (
                                              <a
                                                href={track.youtubeMusicUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-900 border border-white/5 hover:border-[#FF0000]/50 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all hover:bg-[#FF0000]/10 text-white group"
                                              >
                                                <span>YT Music</span>
                                                <Youtube className="w-3.5 h-3.5 text-[#FF0000] group-hover:scale-110 transition-transform shrink-0" />
                                              </a>
                                            )}
                                            {track.youtubeUrl && (
                                              <a
                                                href={track.youtubeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-900 border border-white/5 hover:border-red-500/50 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all hover:bg-red-500/10 text-white group"
                                              >
                                                <span>YouTube Video</span>
                                                <Youtube className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform shrink-0" />
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="pt-5 border-t border-white/5">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(`${window.location.origin}/music?track=${track.id}`);
                                            setNotification("Share link copied of Track!");
                                          }}
                                          className="flex items-center space-x-3.5 text-[10px] font-bold tracking-widest text-secondary hover:text-white transition-colors uppercase font-mono"
                                        >
                                          <Share2 className="w-4 h-4 text-accent" />
                                          <span>Share Track Link</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl"
            >
              {playlist.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl bg-white/5">
                  <ListMusic className="w-12 h-12 text-secondary mx-auto mb-6 opacity-20" />
                  <h3 className="text-xl font-bold mb-2 uppercase tracking-tight">Your collection is empty</h3>
                  <p className="text-sm text-secondary max-w-md mx-auto font-light">
                    Browse the discography and add your favorite tracks to your personal library.
                  </p>
                  <button 
                    onClick={() => setViewMode('releases')}
                    className="mt-8 px-8 py-3 bg-accent text-white text-[10px] font-bold uppercase tracking-widest rounded-full hover:scale-105 transition-transform"
                  >
                    Browse Music
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {playlist.map((track, index) => (
                    <motion.div
                      key={track.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`group flex flex-col rounded-2xl transition-all cursor-pointer overflow-hidden border border-transparent ${
                        currentTrack?.id === track.id 
                          ? 'bg-white/10 border-white/5' 
                          : 'hover:bg-white/5 hover:border-white/5'
                      }`}
                      onClick={() => {
                        playTrack(track, playlist);
                        setExpandedTrackId(expandedTrackId === track.id ? null : track.id);
                      }}
                    >
                      <div className="flex items-center justify-between p-6">
                        <div className="flex items-center space-x-6">
                          <img 
                            src={track.coverUrl || null} 
                            alt={`${track.title} by ${track.artist}`}
                            className="w-12 h-12 rounded-lg object-cover" 
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = getClientPlaceholderSvg(track.coverUrl || '', track.title);
                            }}
                          />
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                            currentTrack?.id === track.id ? 'bg-accent scale-110 shadow-[0_0_20px_rgba(var(--accent-rgb),0.4)]' : 'bg-white/5 group-hover:bg-accent'
                          }`}>
                             {currentTrack?.id === track.id && isPlaying ? (
                               <div className="flex items-end space-x-1 h-3">
                                  <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-[2px] bg-white" />
                                  <motion.div animate={{ height: [8, 4, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-[2px] bg-white" />
                                  <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.7 }} className="w-[2px] bg-white" />
                               </div>
                             ) : (
                               <Play className="w-4 h-4 fill-current text-white" />
                             )}
                          </div>
                          <div>
                            <h4 className={`text-lg font-bold group-hover:text-accent transition-colors ${
                              currentTrack?.id === track.id ? 'text-accent' : 'text-white'
                            }`}>
                              {track.title}
                            </h4>
                            <p className="text-xs text-secondary">{track.artist}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6">
                          <button 
                            className="p-2 text-secondary hover:text-red-400 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromPlaylist(track.id);
                            }}
                            title="Remove from Library"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <span className="text-xs font-mono text-secondary">{track.duration}</span>
                          <div className="text-secondary group-hover:text-white transition-colors">
                            {expandedTrackId === track.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      <AnimatePresence>
                        {expandedTrackId === track.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="bg-black/20 border-t border-white/5"
                          >
                            <div className="p-8 pl-24 flex flex-col md:flex-row gap-12">
                              <div className="flex-1">
                                <h5 className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase mb-4">Lyrics</h5>
                                {track.lyrics ? (
                                  <pre className="text-sm text-secondary font-sans leading-relaxed whitespace-pre-wrap italic">
                                    {track.lyrics}
                                  </pre>
                                ) : (
                                  <p className="text-xs text-secondary/30 italic">No lyrics available for this track.</p>
                                )}
                              </div>
                              
                              <div className="md:w-64 space-y-6">
                                <div>
                                  <h5 className="text-[10px] font-bold tracking-[0.2em] text-accent uppercase mb-4">Your Rating</h5>
                                  <Rating 
                                    rating={ratings[track.id] || 0} 
                                    onRate={(val) => rateTrack(track.id, val)} 
                                    size={20}
                                  />
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legendary Discography Catalog / Era Archive */}
        {viewMode === 'releases' && albums.length > 1 && (
          <div className="mt-36 border-t border-white/5 pt-20 space-y-12">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-accent uppercase tracking-[0.3em] font-mono">COMPLETE COLLECTOR'S HUB</span>
                <h3 className="text-3xl md:text-4xl font-display font-extrabold uppercase text-white mt-1">THE DISCOGRAPHY</h3>
                <p className="text-xs text-secondary/70 mt-2 max-w-lg font-sans">Explore the sonic eras of African Echo. Click on any album below to load its interactive tracklist, lyrics, ratings and streaming deck.</p>
              </div>
              <span className="text-xs font-mono text-secondary px-4 py-2 bg-white/5 rounded-full border border-white/5">
                {albums.length} Official Eras
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {albums.map((album, idx) => {
                const isCurrent = idx === activeAlbumIndex;
                const albumTracksCount = (content.tracks || []).filter(track => {
                  if (album.tracks && album.tracks.includes(track.id)) return true;
                  if (track.album && album.title && track.album.trim().toLowerCase() === album.title.trim().toLowerCase()) return true;
                  return false;
                }).length;

                return (
                  <motion.div
                    key={album.id}
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    onClick={() => {
                      setDirection(idx > activeAlbumIndex ? 1 : -1);
                      setActiveAlbumIndex(idx);
                      // Scroll smoothly to top of releases
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`group/card relative flex flex-col rounded-3xl cursor-pointer overflow-hidden backdrop-blur-md transition-all duration-300 border ${
                      isCurrent 
                        ? 'bg-white/10 border-accent/45 shadow-[0_15px_30px_rgba(var(--accent-rgb),0.15)]' 
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Cover Art Wrapper */}
                    <div className="relative aspect-square w-full overflow-hidden">
                      <img 
                        src={album.coverUrl || null} 
                        alt={`${album.title} Release Cover`}
                        className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-700 ease-out" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = getClientPlaceholderSvg(album.coverUrl || '', album.title);
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover/card:opacity-90 transition-opacity" />
                      
                      {/* Interactive Era Hover Badge */}
                      <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md text-[8px] font-mono text-accent border border-accent/20 tracking-widest font-bold uppercase">
                        {album.releaseDate}
                      </div>

                      {/* Floating Play Indicator */}
                      <div className="absolute inset-x-0 bottom-0 p-6 transform translate-y-2 opacity-0 group-hover/card:translate-y-0 group-hover/card:opacity-100 transition-all duration-300 flex justify-between items-center z-10">
                        <span className="text-[9px] font-bold text-accent uppercase tracking-widest flex items-center gap-1.5 bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-accent/10">
                          <Disc className="w-3 h-3 text-accent animate-spin" />
                          <span>Load Era</span>
                        </span>
                      </div>
                    </div>

                    {/* Metadata Panel */}
                    <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        {isCurrent && (
                          <span className="text-[8px] font-bold text-accent uppercase tracking-widest font-mono block mb-1">
                            ● Currently Selected
                          </span>
                        )}
                        <h4 className="text-md font-bold uppercase text-white truncate group-hover/card:text-accent transition-colors">
                          {album.title}
                        </h4>
                        <p className="text-[10px] font-mono text-secondary mt-1">
                          {albumTracksCount} {albumTracksCount === 1 ? 'TRACK' : 'TRACKS'} AVAILABLE
                        </p>
                      </div>

                      {/* Streaming Quick Badges */}
                      {(album.spotifyUrl || album.appleMusicUrl || album.youtubeMusicUrl) && (
                        <div className="flex items-center gap-1.5 pt-3 border-t border-white/5 font-sans">
                          <span className="text-[8px] font-mono text-secondary uppercase tracking-wider mr-1">Stream:</span>
                          {album.spotifyUrl && (
                            <a
                              href={album.spotifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 px-1.5 bg-black/60 hover:bg-[#1DB954]/15 border border-white/10 hover:border-[#1DB954]/50 rounded text-[9px] font-semibold text-[#1DB954] transition-all flex items-center gap-1"
                              title="Spotify Link"
                            >
                              <Disc className="w-2.5 h-2.5" />
                              <span>SP</span>
                            </a>
                          )}
                          {album.appleMusicUrl && (
                            <a
                              href={album.appleMusicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 px-1.5 bg-black/60 hover:bg-[#FC3C44]/15 border border-white/10 hover:border-[#FC3C44]/50 rounded text-[9px] font-semibold text-[#FC3C44] transition-all flex items-center gap-1"
                              title="Apple Music Link"
                            >
                              <MusicIcon className="w-2.5 h-2.5" />
                              <span>AM</span>
                            </a>
                          )}
                          {album.youtubeMusicUrl && (
                            <a
                              href={album.youtubeMusicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 px-1.5 bg-black/60 hover:bg-[#FF0000]/15 border border-white/10 hover:border-[#FF0000]/50 rounded text-[9px] font-semibold text-[#FF0000] transition-all flex items-center gap-1"
                              title="YouTube Music Link"
                            >
                              <Youtube className="w-2.5 h-2.5" />
                              <span>YT</span>
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="bg-accent text-white px-6 py-4 rounded-full shadow-2xl flex items-center space-x-3 backdrop-blur-md border border-white/20">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm font-bold tracking-tight">{notification}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Music;
