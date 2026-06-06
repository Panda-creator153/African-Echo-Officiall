import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      // Show button if page is scrolled beyond 50% of viewport height
      if (window.scrollY > window.innerHeight * 0.5) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.5, y: 10 }}
          onClick={scrollToTop}
          className="fixed bottom-32 right-8 z-40 bg-accent text-white p-4 rounded-full shadow-[0_0_30px_rgba(var(--accent-rgb),0.3)] hover:shadow-[0_0_50px_rgba(var(--accent-rgb),0.5)] transition-shadow group overflow-hidden"
          aria-label="Back to top"
        >
          {/* Shine effect */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent"
            animate={{ 
              x: [-100, 100],
            }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              repeatDelay: 2
            }}
          />
          <ArrowUp className="w-5 h-5 relative z-10 transform group-hover:-translate-y-1 transition-transform" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default BackToTop;
