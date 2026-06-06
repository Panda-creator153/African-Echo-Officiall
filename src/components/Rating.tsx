import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';

interface RatingProps {
  rating: number;
  onRate: (rating: number) => void;
  maxRating?: number;
  size?: number;
  className?: string;
}

const Rating: React.FC<RatingProps> = ({ 
  rating, 
  onRate, 
  maxRating = 5, 
  size = 16,
  className = ""
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  return (
    <div className={`flex items-center space-x-1 ${className}`} onMouseLeave={() => setHoverRating(null)}>
      {[...Array(maxRating)].map((_, i) => {
        const starValue = i + 1;
        const isActive = (hoverRating !== null ? hoverRating : rating) >= starValue;
        
        return (
          <motion.button
            key={i}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              onRate(starValue);
            }}
            onMouseEnter={() => setHoverRating(starValue)}
            className="focus:outline-none transition-colors"
          >
            <Star
              size={size}
              className={`${
                isActive 
                  ? 'fill-accent text-accent shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]' 
                  : 'text-white/20'
              } transition-colors duration-300`}
            />
          </motion.button>
        );
      })}
    </div>
  );
};

export default Rating;
