import React, { useState } from 'react';
import { Instagram, Twitter, Youtube, Music2, Facebook, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useContent } from '../context/ContentContext';

const IconMap: { [key: string]: any } = {
  Instagram,
  Twitter,
  Youtube,
  Music2,
  Facebook,
  Globe
};

interface SocialIconProps {
  Icon: any;
  label: string;
  href: string;
  key?: React.Key;
}

const SocialIcon = ({ Icon, label, href }: SocialIconProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative flex flex-col items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.8 }}
            className="absolute -top-10 px-3 py-1 bg-white text-black text-[10px] font-bold tracking-widest rounded-md shadow-xl pointer-events-none whitespace-nowrap z-50"
          >
            {label.toUpperCase()}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-white" />
          </motion.div>
        )}
      </AnimatePresence>
      <a 
        href={href} 
        aria-label={label} 
        target="_blank"
        rel="noopener noreferrer"
        className="text-secondary hover:text-white transition-colors"
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
      </a>
    </div>
  );
};

const Footer = () => {
  const { content } = useContent();

  if (!content) return null;

  const footerLinks = (content.pages || [])
    .filter(p => p.isVisible)
    .map(p => ({
      name: p.name.toUpperCase(),
      path: p.slug === '' ? '/' : `/${p.slug}`
    }));

  return (
    <footer className="pt-20 pb-32 px-6 border-t border-white/5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
        <div>
          <h2 className="text-3xl font-display font-bold tracking-tighter mb-4 uppercase">{content.artistName}</h2>
          <p className="text-secondary text-sm">{content.footer.copyrightText}</p>
        </div>

        <div className="flex space-x-8">
          {content.footer.socialLinks.map((link, idx) => {
            const Icon = IconMap[link.iconName] || Globe;
            return (
              <SocialIcon 
                key={idx} 
                Icon={Icon} 
                label={link.platform} 
                href={link.url} 
              />
            );
          })}
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-center">
          <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center text-[10px] font-bold tracking-widest">
            {footerLinks.map(link => (
              <Link key={link.name} to={link.path} className="hover:text-accent transition-colors">{link.name}</Link>
            ))}
          </div>
          <div className="flex space-x-12 text-[10px] font-bold tracking-widest text-secondary">
            <Link to="/admin" className="hover:text-white transition-colors opacity-30 hover:opacity-100">ADMIN</Link>
            <a href="#" className="hover:text-white transition-colors">PRIVACY POLICY</a>
            <a href="#" className="hover:text-white transition-colors">TERMS OF SERVICE</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
