import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { Track } from '../types';
import { useContent } from './ContentContext';
import StreamingPreviewModal from '../components/StreamingPreviewModal';

interface MusicContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlay: () => void;
  progress: number;
  duration: number;
  seek: (time: number) => void;
  volume: number;
  setVolume: (v: number) => void;
  masterVolume: number;
  setMasterVolume: (v: number) => void;
  isLooping: boolean;
  toggleLoop: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  ratings: Record<string, number>;
  rateTrack: (trackId: string, rating: number) => void;
  playlist: Track[];
  addToPlaylist: (track: Track) => void;
  removeFromPlaylist: (trackId: string) => void;
  queue: Track[];
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  setQueue: (tracks: Track[]) => void;
  clearQueue: () => void;
  analyser: AnalyserNode | null;
  error: string | null;
  clearError: () => void;
  selectedStreamingTrack: Track | null;
  setSelectedStreamingTrack: (track: Track | null) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [error, setError] = useState<string | null>(null);
  const [masterVolume, setMasterVolumeState] = useState(() => {
    const saved = localStorage.getItem('master_volume');
    return saved ? Number(saved) : 1;
  });
  const [isLooping, setIsLooping] = useState(true);
  const [queue, setQueueState] = useState<Track[]>([]);
  const [playlist, setPlaylist] = useState<Track[]>(() => {
    const saved = localStorage.getItem('user_playlist');
    return saved ? JSON.parse(saved) : [];
  });
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('track_ratings');
    return saved ? JSON.parse(saved) : {};
  });
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [selectedStreamingTrack, setSelectedStreamingTrack] = useState<Track | null>(null);
  const { content, loading, existingFiles } = useContent();
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [publicStoragePrefix, setPublicStoragePrefix] = useState<string>('');
  const [activeSrc, setActiveSrc] = useState<string>('');
  const [sourcesList, setSourcesList] = useState<string[]>([]);
  const [sourceIndex, setSourceIndex] = useState<number>(0);

  // Fetch Supabase status to get storage public prefix on startup
  useEffect(() => {
    fetch('/api/supabase-status')
      .then(r => r.json())
      .then(data => {
        if (data.configured && data.publicStoragePrefix) {
          setPublicStoragePrefix(data.publicStoragePrefix);
        }
      })
      .catch(e => console.warn('Could not load supabase status for music player prefix fallback:', e));
  }, []);

  const getCleanFilename = (url: string): string | null => {
    if (!url) return null;
    if (url.startsWith('/uploads/')) {
      return url.replace('/uploads/', '');
    }
    if (url.includes('/storage/v1/object/public/')) {
      const parts = url.split('/');
      return parts[parts.length - 1];
    }
    return null;
  };

  const getSourcesForTrack = (track: Track): string[] => {
    const url = track.audioUrl;
    if (!url) return [];
    
    const sources: string[] = [url];
    const filename = getCleanFilename(url);
    
    if (filename) {
      if (url.startsWith('/uploads/')) {
        if (publicStoragePrefix) {
          const supabaseUrl = `${publicStoragePrefix}/${filename}`;
          if (!sources.includes(supabaseUrl)) {
            sources.push(supabaseUrl);
          }
        } else if (content?.tracks) {
          const foundPrefix = content.tracks
            .map((t: any) => t.audioUrl)
            .find((u: string) => u && u.includes('/storage/v1/object/public/'));
          if (foundPrefix) {
            const match = foundPrefix.match(/(https:\/\/.*\/storage\/v1\/object\/public\/[^\/]+)/);
            if (match) {
              const guessedUrl = `${match[1]}/${filename}`;
              if (!sources.includes(guessedUrl)) {
                sources.push(guessedUrl);
              }
            }
          }
        }
      } else if (url.includes('/storage/v1/object/public/')) {
        const localUrl = `/uploads/${filename}`;
        if (!sources.includes(localUrl)) {
          sources.push(localUrl);
        }
      }
    }
    
    return sources;
  };

  useEffect(() => {
    if (currentTrack) {
      const sources = getSourcesForTrack(currentTrack);
      setSourcesList(sources);
      setSourceIndex(0);
      setActiveSrc(sources[0] || '');
    } else {
      setSourcesList([]);
      setSourceIndex(0);
      setActiveSrc('');
    }
  }, [currentTrack, publicStoragePrefix, content]);

  const checkFileExists = (url: string) => {
    if (!url || !url.startsWith('/uploads/')) return true; // Assume external or relative assets exist
    const fileName = url.replace('/uploads/', '');
    return existingFiles.includes(fileName);
  };
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const setupAudioContext = () => {
    if (!audioContextRef.current && audioRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);
      analyserRef.current.fftSize = 256;
      setAnalyser(analyserRef.current);
    }
    
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const handlePlaybackErrorRef = useRef<((err: any) => void) | null>(null);
  
  handlePlaybackErrorRef.current = (err: any) => {
    // Only handle playback errors and show warnings if the user is actively trying to play a track
    if (!isPlaying || !currentTrack) {
      console.log('Audio error ignored because player is paused, preloading, or starting up.');
      return;
    }
    const nextIndex = sourceIndex + 1;
    if (nextIndex < sourcesList.length) {
      console.log(`Fallback: Audio source failed. Trying alternate source indices: ${nextIndex}/${sourcesList.length} - ${sourcesList[nextIndex]}`);
      setSourceIndex(nextIndex);
      setActiveSrc(sourcesList[nextIndex]);
    } else {
      setIsPlaying(false);
      const trackTitle = currentTrack.title || 'Track';
      const filename = getCleanFilename(currentTrack.audioUrl || '');
      const helpMsg = filename 
        ? `Could not play "${trackTitle}". The file could not be found or played from either the local server or Supabase.`
        : `Could not play "${trackTitle}". The file may be missing or unsupported.`;
      setError(helpMsg);
    }
  };

  useEffect(() => {
    localStorage.setItem('track_ratings', JSON.stringify(ratings));
  }, [ratings]);

  useEffect(() => {
    localStorage.setItem('user_playlist', JSON.stringify(playlist));
  }, [playlist]);

  useEffect(() => {
    if (loading) return;

    if (!currentTrack) {
      if (content?.tracks && content.tracks.length > 0) {
        setCurrentTrack(content.tracks[0]);
      } else if (!content) {
        // Only load constants if we truly have no content (e.g. first time setup)
        import('../constants').then(({ TRACKS }) => {
          if (TRACKS && TRACKS.length > 0) {
            setCurrentTrack(TRACKS[0]);
          }
        });
      }
    }
  }, [content, loading]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.volume = volume * masterVolume;

    const updateProgress = () => {
      setProgress(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      nextTrack();
    };

    const handleError = (e: Event) => {
      console.warn('Audio element error status active:', audio.error);
      handlePlaybackErrorRef.current?.(audio.error || new Error('Loading error'));
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [volume, masterVolume]);

  const lastLoadedUrlRef = useRef<string>('');

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const managePlayback = async () => {
      if (currentTrack && activeSrc) {
        
        // Load track if URL changed
        if (lastLoadedUrlRef.current !== activeSrc) {
          try {
            audio.pause();
            lastLoadedUrlRef.current = activeSrc;
            audio.src = activeSrc;
            audio.load();
          } catch (e) {
            console.error('Error loading audio:', e);
          }
        }

        if (isPlaying) {
          try {
            if (audio.src) {
              await audio.play();
            }
          } catch (error: any) {
            if (error.name === 'AbortError') {
              // Interrupted by another load/pause, ignore
            } else if (error.name === 'NotAllowedError') {
              console.warn('Playback not allowed (user interaction required):', error);
              setIsPlaying(false);
            } else {
              console.warn(`Playback failed for source: ${activeSrc}. Error: ${error.name || error}`, error);
              handlePlaybackErrorRef.current?.(error);
            }
          }
        } else {
          audio.pause();
        }
      } else {
        audio.pause();
        audio.src = "";
        lastLoadedUrlRef.current = '';
      }
    };

    managePlayback();
  }, [currentTrack, activeSrc, isPlaying]);

  const playTrack = (track: Track, newQueue?: Track[]) => {
    setSelectedStreamingTrack(track);
  };

  const togglePlay = () => {
    setupAudioContext();
    setIsPlaying(!isPlaying);
  };

  const toggleLoop = () => setIsLooping(!isLooping);

  const seek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
    if (audioRef.current) {
      audioRef.current.volume = v * masterVolume;
    }
  };

  const setMasterVolume = (v: number) => {
    setMasterVolumeState(v);
    localStorage.setItem('master_volume', v.toString());
    if (audioRef.current) {
      audioRef.current.volume = volume * v;
    }
  };

  const nextTrack = () => {
    if (queue.length > 0) {
      const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
      if (currentIndex !== -1 && currentIndex < queue.length - 1) {
        setCurrentTrack(queue[currentIndex + 1]);
        setIsPlaying(true);
        return;
      } else if (isLooping && queue.length > 0) {
        setCurrentTrack(queue[0]);
        setIsPlaying(true);
        return;
      }
    }

    if (content?.tracks && content.tracks.length > 0) {
      const currentIndex = content.tracks.findIndex((t: Track) => t.id === currentTrack?.id);
      if (currentIndex === -1) {
        setCurrentTrack(content.tracks[0]);
      } else {
        const nextIndex = (currentIndex + 1) % content.tracks.length;
        if (nextIndex === 0 && !isLooping) {
          setIsPlaying(false);
          return;
        }
        setCurrentTrack(content.tracks[nextIndex]);
      }
      setIsPlaying(true);
      return;
    }

    import('../constants').then(({ TRACKS }) => {
      const currentIndex = TRACKS.findIndex(t => t.id === currentTrack?.id);
      if (currentIndex === -1) {
        setCurrentTrack(TRACKS[0]);
      } else {
        const nextIndex = (currentIndex + 1) % TRACKS.length;
        if (nextIndex === 0 && !isLooping) {
          setIsPlaying(false);
          return;
        }
        setCurrentTrack(TRACKS[nextIndex]);
      }
      setIsPlaying(true);
    });
  };

  const prevTrack = () => {
    if (queue.length > 0) {
      const currentIndex = queue.findIndex(t => t.id === currentTrack?.id);
      if (currentIndex > 0) {
        setCurrentTrack(queue[currentIndex - 1]);
        setIsPlaying(true);
        return;
      }
    }

    if (content?.tracks && content.tracks.length > 0) {
      const currentIndex = content.tracks.findIndex((t: Track) => t.id === currentTrack?.id);
      if (currentIndex === -1) {
        setCurrentTrack(content.tracks[content.tracks.length - 1]);
      } else {
        const prevIndex = (currentIndex - 1 + content.tracks.length) % content.tracks.length;
        setCurrentTrack(content.tracks[prevIndex]);
      }
      setIsPlaying(true);
      return;
    }

    import('../constants').then(({ TRACKS }) => {
      const currentIndex = TRACKS.findIndex(t => t.id === currentTrack?.id);
      const prevIndex = (currentIndex - 1 + TRACKS.length) % TRACKS.length;
      setCurrentTrack(TRACKS[prevIndex]);
      setIsPlaying(true);
    });
  };

  const addToQueue = (track: Track) => {
    setQueueState(prev => [...prev, track]);
  };

  const removeFromQueue = (trackId: string) => {
    setQueueState(prev => prev.filter(t => t.id !== trackId));
  };

  const setQueue = (tracks: Track[]) => {
    setQueueState(tracks);
  };

  const clearQueue = () => {
    setQueueState([]);
  };

  const rateTrack = (trackId: string, rating: number) => {
    setRatings(prev => ({
      ...prev,
      [trackId]: rating
    }));
  };

  const addToPlaylist = (track: Track) => {
    setPlaylist(prev => {
      if (prev.find(t => t.id === track.id)) return prev;
      return [...prev, track];
    });
  };

  const removeFromPlaylist = (trackId: string) => {
    setPlaylist(prev => prev.filter(t => t.id !== trackId));
  };

  const clearError = () => setError(null);

  return (
    <MusicContext.Provider value={{ 
      currentTrack, isPlaying, playTrack, togglePlay, progress, duration, seek, 
      volume, setVolume, masterVolume, setMasterVolume, isLooping, toggleLoop, nextTrack, prevTrack, ratings, rateTrack,
      playlist, addToPlaylist, removeFromPlaylist,
      queue, addToQueue, removeFromQueue, setQueue, clearQueue,
      analyser,
      error,
      clearError,
      selectedStreamingTrack,
      setSelectedStreamingTrack
    }}>
      {children}
      <StreamingPreviewModal
        track={selectedStreamingTrack}
        onClose={() => setSelectedStreamingTrack(null)}
      />
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within MusicProvider');
  return context;
};
