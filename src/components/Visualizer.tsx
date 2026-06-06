import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMusic } from '../context/MusicContext';
import { Settings2, X } from 'lucide-react';

interface VisualizerProps {
  barCount?: number;
  className?: string;
  initialColor?: string;
}

const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 78, b: 0 };
};

const Visualizer: React.FC<VisualizerProps> = ({ barCount: initialBarCount = 32, className = "", initialColor = "#ff4e00" }) => {
  const { analyser, isPlaying } = useMusic();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(null);

  const [count, setCount] = useState(initialBarCount);
  const [color, setColor] = useState(initialColor);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        canvas.width = entry.contentRect.width * window.devicePixelRatio;
        canvas.height = entry.contentRect.height * window.devicePixelRatio;
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const { r, g, b } = hexToRgb(color);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / count) * 0.8;
      const gap = (width / count) * 0.2;
      
      for (let i = 0; i < count; i++) {
        const index = Math.floor((i / count) * (bufferLength / 2));
        const val = dataArray[index];
        const barHeight = (val / 255) * height;

        const x = i * (barWidth + gap);
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(0, y, 0, height);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.2)`);

        ctx.fillStyle = gradient;
        
        const radius = barWidth / 2;
        ctx.beginPath();
        if (barHeight > radius * 2) {
            ctx.roundRect(x, y, barWidth, barHeight, radius);
        } else {
            ctx.roundRect(x, height - 2, barWidth, 2, 1);
        }
        ctx.fill();
      }
    };

    if (isPlaying) {
      draw();
    } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / count) * 0.8;
        const gap = (canvas.width / count) * 0.2;
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.2)`;
        for (let i = 0; i < count; i++) {
            ctx.beginPath();
            ctx.roundRect(i * (barWidth + gap), canvas.height - 2, barWidth, 2, 1);
            ctx.fill();
        }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isPlaying, count, color]);

  return (
    <div ref={containerRef} className={`relative w-full h-full group/viz ${className}`}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full opacity-60 grayscale hover:grayscale-0 transition-all duration-700"
      />

      {/* Controls Toggle */}
      <button 
        onClick={() => setShowControls(!showControls)}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 border border-white/10 text-white/40 hover:text-white hover:bg-black/60 opacity-40 hover:opacity-100 transition-all z-20 pointer-events-auto"
        title="Visualizer Settings"
      >
        <Settings2 className="w-3.5 h-3.5" />
      </button>

      {/* Controls Panel */}
      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-8 right-2 p-3 rounded-xl glass-panel border border-white/10 z-30 w-40 space-y-3 pointer-events-auto shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold tracking-widest text-secondary uppercase">Visualizer</span>
              <button onClick={() => setShowControls(false)} className="text-secondary hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <label className="text-[9px] text-secondary font-bold uppercase">Bars</label>
                <span className="text-[9px] text-white font-mono">{count}</span>
              </div>
              <input 
                type="range" 
                min="8" 
                max="128" 
                step="8"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-accent"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] text-secondary font-bold uppercase block">Color</label>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-6 h-6 rounded bg-transparent border-0 cursor-pointer p-0"
                />
                <span className="text-[9px] text-white font-mono uppercase">{color}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Visualizer;
