import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Play, ArrowRight } from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { useContent } from '../context/ContentContext';
import Newsletter from '../components/Newsletter';
import SEO from '../components/SEO';
import VideoGallery from '../components/VideoGallery';
import { getClientPlaceholderSvg } from '../utils/imageFallback';

const MusicTrackSkeleton = () => (
  <div className="animate-pulse">
    <div className="aspect-square bg-white/5 rounded-2xl mb-6" />
    <div className="h-6 bg-white/10 rounded w-3/4 mb-2" />
    <div className="h-4 bg-white/5 rounded w-1/2" />
  </div>
);

const Home = () => {
  const { playTrack } = useMusic();
  const { content, loading } = useContent();

  const artistSchema = useMemo(() => {
    if (!content) return null;
    return {
      "@context": "https://schema.org",
      "@type": "MusicGroup",
      "name": content.artistName,
      "description": content.home.aboutText,
      "genre": ["Electronic Soul", "Cinematic Music", "East African Music"],
      "location": {
        "@type": "Place",
        "name": "Kampala, Uganda"
      },
      "url": window.location.origin,
      "image": content.images.hero,
      "sameAs": content.footer.socialLinks.map(link => link.url).filter(url => url !== '#')
    };
  }, [content]);

  if (!content) return null;

  const featuredTracks = (content.tracks || []).filter(t => (content.home?.featuredTracks || []).includes(t.id));

  return (
    <div className="relative">
      <SEO 
        title="Official Website"
        description={`${content.artistName} is a Ugandan singer and songwriter. ${content.home.heroSubtitle}`}
        schema={artistSchema}
      />
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <motion.div
           initial={{ scale: 1.1, opacity: 0 }}
           animate={{ scale: 1, opacity: 0.6 }}
           transition={{ duration: 2, ease: "easeOut" }}
           className="absolute inset-0 z-0"
        >
          <img
            src={content.images.hero || null}
            alt={`${content.artistName} - Soulful Ugandan Singer & Songwriter Hero Background`}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getClientPlaceholderSvg(content.images.hero || '', `${content.artistName} - Soulful Ugandan Singer & Songwriter Hero Background`);
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black" />
        </motion.div>

        <div className="relative z-10 text-center px-6">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-[10px] font-bold tracking-[0.4em] text-accent mb-6"
          >
            NEW SINGLE OUT NOW
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-7xl md:text-[10rem] font-display font-bold tracking-tighter leading-[0.8] mb-12 cinematic-text"
          >
            {content.home.heroTitle}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="text-secondary max-w-xl mx-auto mb-12 text-sm md:text-lg font-light tracking-wide"
          >
            {content.home.heroSubtitle}
          </motion.p>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            onClick={() => featuredTracks[0] && playTrack(featuredTracks[0])}
            className="group flex items-center space-x-4 bg-white text-black px-8 py-5 rounded-full font-bold text-xs tracking-widest hover:bg-accent hover:text-white transition-all transform hover:scale-105"
          >
            <span>LISTEN TO {featuredTracks[0]?.title.toUpperCase() || 'LATEST'}</span>
            <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center group-hover:bg-white">
               <Play className="w-3 h-3 fill-current text-white group-hover:text-black" />
            </div>
          </motion.button>
        </div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 opacity-50"
        >
          <div className="w-[1px] h-12 bg-white" />
          <span className="text-[10px] font-bold tracking-widest">SCROLL</span>
        </motion.div>
      </section>

      {/* Featured Music */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-16">
          <div>
             <p className="text-[10px] font-bold tracking-widest text-secondary mb-4 underline decoration-accent underline-offset-8">SOUNDS</p>
             <h2 className="text-4xl md:text-5xl font-display font-bold tracking-tight">LATEST RELEASES</h2>
          </div>
          <a href="/music" className="hidden md:flex items-center text-xs font-bold tracking-widest hover:text-accent transition-colors group">
            SEE DISCOGRAPHY <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredTracks.map((track, idx) => (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="group cursor-pointer"
              onClick={() => playTrack(track, featuredTracks)}
            >
              <div className="relative aspect-square overflow-hidden rounded-xl mb-4">
                <img
                  src={track.coverUrl || null}
                  alt={track.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getClientPlaceholderSvg(track.coverUrl || '', track.title);
                  }}
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform">
                    <Play className="w-6 h-6 fill-current" />
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-1">{track.title}</h3>
              <p className="text-secondary text-sm">{track.artist} — {track.duration}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Promotional Section */}
      <section className="py-32 bg-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <img
              src={content.images.portrait || null}
              alt="Portrait"
              className="rounded-[40px] shadow-2xl grayscale hover:grayscale-0 transition-all duration-1000"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = getClientPlaceholderSvg(content.images.portrait || '', 'portrait');
              }}
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl md:text-7xl font-display font-bold leading-[0.9] mb-8">TRANSCENDING THE AUDIBLE.</h2>
            <p className="text-secondary text-lg mb-12 font-light leading-relaxed">
              {content.home.aboutText}
            </p>
            <button className="border border-white/20 px-10 py-5 rounded-full text-xs font-bold tracking-widest hover:bg-white hover:text-black transition-colors">
              THE JOURNEY
            </button>
          </motion.div>
        </div>
      </section>

      {/* Biography Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-20">
             <div className="md:w-1/3">
                <p className="text-[10px] font-bold tracking-widest text-accent mb-4 uppercase">
                  {content.home.bioTitle || "The Visionary"}
                </p>
                <h2 className="text-5xl font-display font-bold mb-8 uppercase">
                  {content.artistName}
                </h2>
                <div className="w-12 h-[1px] bg-white/20" />
             </div>
             <div className="md:w-2/3 space-y-8">
                {content.home.bioSubtitle && (
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-2xl font-light leading-relaxed"
                  >
                    {content.home.bioSubtitle}
                  </motion.p>
                )}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="text-secondary leading-relaxed space-y-6"
                >
                  {(content.home.bioParagraphs || []).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </motion.div>
             </div>
          </div>
        </div>
      </section>

      {/* Music Videos Section */}
      <section className="py-32 bg-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <header className="flex justify-between items-end mb-20">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-secondary mb-4 uppercase underline decoration-accent underline-offset-8">Visuals</p>
              <h2 className="text-5xl md:text-6xl font-display font-bold tracking-tight uppercase">MUSIC VIDEOS</h2>
            </div>
            <a href="/videos" className="hidden md:flex items-center text-xs font-bold tracking-widest hover:text-accent transition-colors group">
              VIEW ALL <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </a>
          </header>

          <VideoGallery videos={content.videos || []} limit={3} />
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-20">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-secondary mb-4 uppercase underline decoration-accent underline-offset-8">Gallery</p>
              <h2 className="text-5xl md:text-6xl font-display font-bold tracking-tight">MOMENTS IN TIME</h2>
            </div>
            <a href="/gallery" className="hidden md:flex items-center text-xs font-bold tracking-widest hover:text-accent transition-colors group">
              VIEW ALL <ArrowRight className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {content.images.gallery.slice(0, 4).map((img, idx) => (
              <motion.div
                key={img.id || idx}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative aspect-square overflow-hidden rounded-2xl group cursor-pointer"
              >
                <img
                  src={img.url || null}
                  alt={img.altText || `Gallery ${idx}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = getClientPlaceholderSvg(img.url || '', img.altText || `Gallery ${idx}`);
                  }}
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Newsletter />
    </div>
  );
};

export default Home;
