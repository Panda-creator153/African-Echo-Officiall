import React from 'react';
import { motion } from 'motion/react';
import { useContent } from '../context/ContentContext';
import { Music, Mic2, Heart, Award } from 'lucide-react';
import SEO from '../components/SEO';

const About = () => {
  const { content, loading } = useContent();

  if (!content) return null;

  const tagline = content.about?.tagline || "Crafting sonic narratives that bridge the gap between ancient heritage and the pulse of tomorrow.";
  const story = content.about?.story || [];
  const influences = content.about?.influences || [];
  const milestones = content.about?.milestones || [];

  const musicGroupSchema = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    "name": "African Echo",
    "description": "The story and journey of African Echo, a Ugandan visionary singer and songwriter based in Kampala.",
    "genre": "Cinematic Soul / Afro-Fusion",
    "homeLocation": {
      "@type": "Place",
      "name": "Kampala, Uganda"
    },
    "url": "https://africanecho.workers.dev"
  };

  return (
    <div className="pt-40 pb-32 px-6">
      <SEO 
        title="About African Echo" 
        description="The story and journey of African Echo, a Ugandan visionary singer and songwriter based in Kampala." 
        schema={musicGroupSchema}
      />
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <header className="mb-24 flex flex-col md:flex-row gap-12 items-end">
          <div className="md:w-2/3">
            <p className="text-[10px] font-bold tracking-[0.4em] text-accent mb-4 uppercase underline underline-offset-8">The Artist</p>
            <h1 className="text-6xl md:text-8xl font-display font-bold tracking-tight mb-8 uppercase">{content.artistName}</h1>
            <p className="text-xl text-secondary leading-relaxed max-w-2xl font-light">
              {tagline}
            </p>
          </div>
          <div className="md:w-1/3 flex justify-start md:justify-end">
            <div className="border border-white/10 p-8 rounded-2xl bg-white/[0.02] backdrop-blur-sm">
              <div className="flex items-center space-x-3 mb-4">
                <Mic2 className="text-accent w-5 h-5" />
                <span className="text-[10px] font-bold tracking-widest">VOCALIST / WRITER</span>
              </div>
              <div className="flex items-center space-x-3">
                <Music className="text-accent w-5 h-5" />
                <span className="text-[10px] font-bold tracking-widest">KAMPALA, UGANDA</span>
              </div>
            </div>
          </div>
        </header>

        {/* Biography Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-24 mb-32 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="aspect-[4/5] bg-white/5 rounded-3xl overflow-hidden relative"
          >
            <img
              src={content.images.portrait || null}
              alt={`Portrait of ${content.artistName} - Ugandan Singer & Songwriter`}
              className="w-full h-full object-cover grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
          </motion.div>

          <div>
            <h2 className="text-4xl font-display font-bold mb-10 tracking-tight uppercase">Story So Far</h2>
            <div className="space-y-6 text-secondary leading-relaxed font-light">
              {story.map((paragraph, idx) => (
                <p key={idx}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>

        {/* Influences & Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-32">
          <div className="p-10 bg-white/[0.03] border border-white/5 rounded-3xl">
            <Heart className="w-8 h-8 text-accent mb-6" />
            <h3 className="text-xl font-bold mb-6 italic tracking-tight uppercase">Influences</h3>
            <ul className="space-y-3">
              {influences.map((item, idx) => (
                <li key={idx} className="text-xs font-bold tracking-widest text-secondary flex items-center">
                  <span className="w-1.5 h-1.5 bg-accent rounded-full mr-3" />
                  {item.toUpperCase()}
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 p-10 bg-accent text-black rounded-3xl overflow-hidden relative">
            <Award className="w-24 h-24 absolute -bottom-4 -right-4 opacity-10" />
            <h3 className="text-4xl font-display font-bold mb-8 tracking-tight uppercase">The Echo Legacy</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              {milestones.map((m, idx) => (
                <div key={idx}>
                  <p className="text-[10px] font-black tracking-widest mb-1 opacity-50 uppercase">{m.year}</p>
                  <h4 className="text-lg font-bold mb-2 uppercase leading-none">{m.title}</h4>
                  <p className="text-sm font-medium leading-tight opacity-70">{m.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <footer className="text-center">
          <div className="inline-block p-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent w-full mb-12" />
          <h2 className="text-2xl font-display font-bold tracking-widest mb-8">DISCOVER THE SOUND</h2>
          <a href="/music" className="inline-block border border-white px-10 py-4 text-xs font-black tracking-[0.3em] hover:bg-white hover:text-black transition-all">
            EXPLORE DISCOGRAPHY
          </a>
        </footer>
      </div>
    </div>
  );
};

export default About;
