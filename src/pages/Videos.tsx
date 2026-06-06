import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Youtube, Play } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import VideoGallery from '../components/VideoGallery';
import SEO from '../components/SEO';

const Videos: React.FC = () => {
  const { content, loading } = useContent();

  const videoSchema = useMemo(() => {
    if (!content || !content.videos) return null;
    return {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": content.videos.map((video, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "VideoObject",
          "name": video.title,
          "description": video.description || `Music video for ${video.title} by ${content.artistName}`,
          "thumbnailUrl": video.thumbnailUrl || "",
          "uploadDate": new Date().toISOString(),
          "contentUrl": video.youtubeUrl || "",
          "embedUrl": (video.youtubeUrl || "").replace('watch?v=', 'embed/'),
          "interactionCount": "0"
        }
      }))
    };
  }, [content]);

  if (!content) return null;

  return (
    <div className="pt-32 pb-20 px-4">
      <SEO 
        title="Official Music Videos" 
        description={`Watch the official music videos and visual experiences from ${content.artistName}. Explore the artistic vision and Ugandan soul through film.`} 
        schema={videoSchema}
      />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] uppercase tracking-[0.2em] font-bold mb-6"
          >
            <Youtube className="w-3 h-3" />
            <span>Visual Experience</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold mb-6 tracking-tighter"
          >
            Music <span className="text-stroke text-transparent">Videos</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-secondary/60 max-w-2xl mx-auto text-lg"
          >
            Witness the artistic vision behind the sound. Explorations of light, movement, and the Ugandan soul.
          </motion.p>
        </div>

        <VideoGallery videos={content.videos || []} />

        {/* Featured Video Callout */}
        {content.videos && content.videos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mt-32 p-8 md:p-16 rounded-[2rem] bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-accent/10 transition-colors">
              <Play className="w-48 h-48 -rotate-12" />
            </div>
            
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl font-bold mb-4">Official YouTube Channel</h2>
              <p className="text-secondary/60 mb-8 text-lg">
                Subscribe for exclusive behind-the-scenes content, live performances, and the latest music video premieres.
              </p>
              <a 
                href={content.footer.socialLinks.find(s => s.platform === 'YouTube')?.url || 'https://youtube.com'} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-accent text-white font-bold tracking-widest rounded-full hover:shadow-[0_0_30px_rgba(var(--accent-rgb),0.3)] transition-all uppercase text-[10px]"
              >
                <Youtube className="w-4 h-4" />
                SUBSCRIBE NOW
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Videos;
