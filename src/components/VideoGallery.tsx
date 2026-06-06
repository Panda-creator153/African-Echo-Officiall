import React from 'react';
import { motion } from 'motion/react';
import { Play, Youtube, ExternalLink } from 'lucide-react';
import { Video } from '../types';

interface VideoGalleryProps {
  videos: Video[];
  limit?: number;
}

const VideoGallery: React.FC<VideoGalleryProps> = ({ videos, limit }) => {
  const displayVideos = limit ? videos.slice(0, limit) : videos;

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (!videos || videos.length === 0) {
    return (
      <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
        <Youtube className="w-12 h-12 text-secondary/30 mx-auto mb-4" />
        <p className="text-secondary/50 font-mono uppercase tracking-widest text-xs">No videos available yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {displayVideos.map((video, index) => {
        const videoId = getYoutubeId(video.youtubeUrl);
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        
        return (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="group"
          >
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden mb-4 border border-white/10 group-hover:border-accent/50 transition-colors shadow-2xl">
              {videoId ? (
                <iframe
                  src={embedUrl}
                  title={video.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-white/5 text-secondary/50">
                  <span>Invalid YouTube URL</span>
                </div>
              )}
            </div>
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-medium text-white mb-1 group-hover:text-accent transition-colors leading-tight">
                  {video.title}
                </h3>
                {video.description && (
                  <p className="text-sm text-secondary/60 line-clamp-2 leading-relaxed">
                    {video.description}
                  </p>
                )}
              </div>
              <a 
                href={video.youtubeUrl} 
                target="_blank" 
                rel="noreferrer"
                className="p-2 text-secondary/40 hover:text-white transition-colors"
                title="Watch on YouTube"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default VideoGallery;
