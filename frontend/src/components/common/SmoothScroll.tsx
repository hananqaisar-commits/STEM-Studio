import { useEffect } from 'react';
import { ReactLenis, useLenis } from 'lenis/react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import 'lenis/dist/lenis.css';

gsap.registerPlugin(ScrollTrigger);

/**
 * Keeps Lenis and GSAP on one animation clock. Components can continue to use
 * ScrollTrigger normally; Lenis supplies the smoother scroll position beneath it.
 */
const LenisGsapSync = () => {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    const syncScrollTrigger = () => ScrollTrigger.update();
    const tick = (time: number) => lenis.raf(time * 1000);

    lenis.on('scroll', syncScrollTrigger);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    return () => {
      lenis.off('scroll', syncScrollTrigger);
      gsap.ticker.remove(tick);
    };
  }, [lenis]);

  return null;
};

export const SmoothScroll: React.FC<React.PropsWithChildren> = ({ children }) => (
  <ReactLenis
    root
    options={{
      autoRaf: false,
      anchors: true,
      // Lenis defaults this to true. Keeping it explicit documents the
      // accessibility contract and makes programmatic scrolling instant too.
      respectReducedMotion: true,
    }}
  >
    <LenisGsapSync />
    {children}
  </ReactLenis>
);
