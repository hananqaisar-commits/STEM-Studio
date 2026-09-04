import React, { useState, useEffect, useCallback } from 'react';
import { LazyMotion, domAnimation, m, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import './ScrollToTop.css';

export const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {isVisible && (
          <m.button
            initial={{ scale: 0.7, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.7, opacity: 0, y: 10 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className="scroll-to-top-fab"
            title="Scroll to Top"
            aria-label="Scroll to Top"
          >
            <ArrowUp size={18} />
          </m.button>
        )}
      </AnimatePresence>
    </LazyMotion>
  );
};

export default ScrollToTop;
