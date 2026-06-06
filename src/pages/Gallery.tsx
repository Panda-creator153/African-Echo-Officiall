import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useContent } from '../context/ContentContext';
import { X } from 'lucide-react';
import SEO from '../components/SEO';

const Gallery = () => {
  const { content, loading } = useContent();
  const [selectedImage, setSelectedImage] = useState<any>(null);

  const gallerySchema = useMemo(() => {
    if (!content) return null;
    return {
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      "name": `${content.artistName} Visual Archive`,
      "description": `Official photo gallery of ${content.artistName}. Capturing moments, performances and the visual aesthetic of East African electronic soul.`,
      "image": content.images.gallery.map(img => ({
        "@type": "ImageObject",
        "url": img.url,
        "caption": img.caption || img.altText
      }))
    };
  }, [content]);

  if (!content) return null;

  return (
    <div className="pt-40 pb-32 px-6">
      <SEO 
        title="Visual Archive & Gallery" 
        description={`Explore the visual journey of ${content.artistName}. Official photography, performance moments, and cinematic visuals.`}
        schema={gallerySchema}
      />
      <div className="max-w-7xl mx-auto">
        <header className="mb-24">
          <p className="text-[10px] font-bold tracking-[0.4em] text-accent mb-4 uppercase underline underline-offset-8">Visuals</p>
          <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight mb-8 uppercase">Gallery</h1>
          <div className="w-24 h-[1px] bg-white/20" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[300px]">
          {content.images.gallery.map((img, idx) => (
            <motion.div
              key={img.id || idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedImage(img)}
              className={`relative overflow-hidden rounded-3xl group cursor-pointer ${
                idx === 0 ? 'md:col-span-2 md:row-span-2' : 
                idx === 3 ? 'md:row-span-2' : ''
              }`}
            >
              <img
                src={img.url || null}
                alt={img.altText || `${content.artistName} Gallery Image ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-8">
                 <p className="text-[10px] font-bold tracking-[0.3em] text-accent mb-2 uppercase opacity-70">
                   {idx < 9 ? `0${idx + 1}` : idx + 1} / Visual Archive
                 </p>
                 <h3 className="text-xl font-display font-bold tracking-tight text-white mb-2">
                   {img.caption || 'SYSTEM TRANSMISSION'}
                 </h3>
                 <p className="text-[8px] font-mono text-secondary uppercase tracking-widest">
                   {img.altText || 'No metadata available'}
                 </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Image Modal */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[1000] flex items-center justify-center p-6 md:p-20 bg-black/95 backdrop-blur-sm"
              onClick={() => setSelectedImage(null)}
            >
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-10 right-10 p-4 bg-white/5 border border-white/10 rounded-full text-white hover:bg-white hover:text-black transition-all z-[1001]"
                onClick={() => setSelectedImage(null)}
              >
                <X className="w-6 h-6" />
              </motion.button>

              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative max-w-6xl w-full h-full flex flex-col items-center justify-center gap-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative w-full h-[70vh] md:h-[80vh] group">
                  <img
                    src={selectedImage.url || null}
                    alt={selectedImage.altText || selectedImage.caption}
                    className="w-full h-full object-contain rounded-2xl shadow-2xl"
                  />
                </div>
                
                <div className="w-full text-center space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h2 className="text-2xl md:text-4xl font-display font-bold tracking-tight uppercase">
                      {selectedImage.caption || 'Untitled Fragment'}
                    </h2>
                    {selectedImage.altText && (
                      <p className="text-[10px] md:text-xs font-mono text-secondary uppercase tracking-[0.4em] mt-4 opacity-60">
                        {selectedImage.altText}
                      </p>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Gallery;
