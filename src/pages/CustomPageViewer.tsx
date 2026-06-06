import React from 'react';
import { motion } from 'motion/react';
import { FileText, Compass, ExternalLink } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { useParams, Navigate } from 'react-router-dom';
import SEO from '../components/SEO';

const CustomPageViewer = () => {
  const { content } = useContent();
  const { slug } = useParams<{ slug: string }>();

  if (!content) return null;

  // Find the custom page configuration
  const page = (content.pages || []).find(p => p.slug === slug);

  // If the page doesn't exist or isn't a custom page, redirect to home or handle gracefully
  if (!page || page.type !== 'custom') {
    return <Navigate to="/" replace />;
  }

  // Segment content by paragraphs for rich-text rendering
  const paragraphs = page.content
    ? page.content.split(/\n\s*\n/).filter(p => p.trim() !== '')
    : ['No content has been added to this page yet. Use the admin panel to add some!'];

  return (
    <div className="pt-40 pb-32 px-6">
      <SEO 
        title={page.name} 
        description={`Read ${page.name} from ${content.artistName}.`} 
      />
      
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Page Banner or sleek glowing box */}
          {page.bannerUrl ? (
            <div className="relative w-full h-64 md:h-96 rounded-[40px] overflow-hidden mb-16 shadow-2xl border border-white/5">
              <img
                src={page.bannerUrl}
                alt={page.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
            </div>
          ) : (
            <div className="w-full py-10 bg-white/[0.02] border border-white/5 rounded-[40px] flex items-center justify-center mb-16 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full atmosphere-gradient opacity-10 pointer-events-none" />
              <Compass className="w-16 h-16 text-accent/30 animate-pulse" />
            </div>
          )}

          {/* Header text */}
          <header className="mb-12">
            <p className="text-[10px] font-bold tracking-[0.4em] text-accent mb-4 uppercase">OFFICIAL PAGE</p>
            <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight mb-4 uppercase">
              {page.name}
            </h1>
            <div className="h-[2px] w-24 bg-accent mt-4" />
          </header>

          {/* Page Content Card Container */}
          <div className="glass-panel p-8 md:p-16 rounded-[40px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full atmosphere-gradient opacity-5 pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
              {paragraphs.map((para, index) => {
                // If paragraph looks like a subheading (e.g. starts with # or is short and all-caps)
                const isSubheading = para.startsWith('###') || para.startsWith('##') || para.startsWith('#');
                const cleanText = para.replace(/^#+\s*/, '');
                
                if (isSubheading) {
                  return (
                    <h2 key={index} className="text-2xl font-bold text-accent tracking-tight pt-4">
                      {cleanText}
                    </h2>
                  );
                }

                // If paragraph is a bullet/list item (lines starting with - or *)
                if (para.trim().startsWith('-') || para.trim().startsWith('*')) {
                  const listItems = para.split(/\n/).map(line => line.replace(/^[-*]\s*/, '').trim());
                  return (
                    <ul key={index} className="list-disc pl-6 space-y-3 text-secondary">
                      {listItems.map((item, keyIdx) => (
                        <li key={keyIdx} className="text-md leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  );
                }

                return (
                  <p key={index} className="text-secondary text-md md:text-lg leading-relaxed whitespace-pre-line">
                    {para}
                  </p>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CustomPageViewer;
