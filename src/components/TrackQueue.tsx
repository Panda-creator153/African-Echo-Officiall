import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, GripVertical, Trash2, ChevronUp, ChevronDown, Music as MusicIcon, Play } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { Track } from '../types';

interface TrackQueueProps {
  isOpen: boolean;
  onClose: () => void;
}

const TrackQueue: React.FC<TrackQueueProps> = ({ isOpen, onClose }) => {
  const { queue, currentTrack, setQueue, removeFromQueue, playTrack } = useMusic();

  const moveTrack = (index: number, direction: 'up' | 'down') => {
    const newQueue = [...queue];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newQueue.length) return;
    
    const [movedItem] = newQueue.splice(index, 1);
    newQueue.splice(targetIndex, 0, movedItem);
    setQueue(newQueue);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-black/95 border-l border-white/5 z-[70] shadow-2xl flex flex-col"
          >
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-display font-bold tracking-tight">Up Next</h2>
                <p className="text-[10px] font-bold tracking-[0.3em] text-secondary mt-1 uppercase">
                  {queue.length} {queue.length === 1 ? 'Track' : 'Tracks'} in Queue
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-full transition-colors text-secondary hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
              {queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-20">
                  <MusicIcon className="w-12 h-12 mb-4" />
                  <p className="text-xs font-bold tracking-widest uppercase">Your queue is empty</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {queue.map((track, index) => {
                    const isCurrent = currentTrack?.id === track.id;
                    
                    return (
                      <motion.div
                        key={`${track.id}-${index}`}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`group p-4 rounded-2xl border transition-all ${
                          isCurrent 
                            ? 'bg-accent/10 border-accent/20' 
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                            <img src={track.coverUrl || null} alt={track.title} className="w-full h-full object-cover" />
                            {isCurrent && (
                              <div className="absolute inset-0 bg-accent/40 flex items-center justify-center">
                                <motion.div 
                                  animate={{ scale: [1, 1.2, 1] }} 
                                  transition={{ repeat: Infinity, duration: 1 }}
                                  className="w-2 h-2 bg-white rounded-full" 
                                />
                              </div>
                            )}
                            <button 
                              onClick={() => playTrack(track)}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                            >
                              <Play className="w-4 h-4 fill-white text-white" />
                            </button>
                          </div>

                          <div className="flex-1 min-w-0">
                            <h3 className={`text-sm font-bold truncate ${isCurrent ? 'text-accent' : 'text-white'}`}>
                              {track.title}
                            </h3>
                            <p className="text-[10px] font-bold tracking-widest text-secondary mt-0.5 truncate uppercase">
                              {track.artist}
                            </p>
                          </div>

                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex flex-col">
                              <button 
                                onClick={() => moveTrack(index, 'up')}
                                disabled={index === 0}
                                className="p-1 hover:text-accent disabled:opacity-20 transition-colors"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => moveTrack(index, 'down')}
                                disabled={index === queue.length - 1}
                                className="p-1 hover:text-accent disabled:opacity-20 transition-colors"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                            </div>
                            <button 
                              onClick={() => removeFromQueue(track.id)}
                              className="p-2 text-secondary hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            <div className="p-8 border-t border-white/5 bg-black/40 backdrop-blur-xl">
              <button 
                onClick={() => onClose()}
                className="w-full py-4 border border-white text-[10px] font-black tracking-[0.3em] hover:bg-white hover:text-black transition-all uppercase"
              >
                Close Queue
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TrackQueue;
