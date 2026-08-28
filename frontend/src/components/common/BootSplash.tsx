import React, { useEffect, useState } from 'react';
import { MascotLoading } from '../mascot';

/**
 * Honors the user's OS-level motion preference, live.
 */
const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
};

interface BootSplashProps {
  /**
   * The REAL application initialization state (session restore / auth check).
   * The splash never decides completion on its own — it only reacts to this.
   */
  loading: boolean;
  /** Invoked once the exit transition has finished; unmount after this. */
  onExited: () => void;
}

/**
 * Boot splash orchestrator on top of the existing mascot loading screen.
 *
 * Lifecycle (completion is gated by `loading`, never by a fake timer):
 *  1. mount         → wordmark letters stagger in, Octa idles "surprised".
 *  2. loading=false → Octa crossfades to "happy", wordmark settles, status
 *                      crossfades. If the app booted faster than the entrance
 *                      animation, we wait for the entrance to land so the
 *                      screen never flashes awkwardly (polish floor only).
 *  3. hold beat     → the happy state reads for a moment.
 *  4. exit          → overlay fades out, then `onExited` fires.
 */
export const BootSplash: React.FC<BootSplashProps> = ({ loading, onExited }) => {
  const reduced = usePrefersReducedMotion();
  const [entranceLanded, setEntranceLanded] = useState(false);
  const [holdDone, setHoldDone] = useState(false);

  // Minimum time the entrance needs to read as polished.
  const minVisible = reduced ? 350 : 1650;
  // How long the "ready" beat holds before the overlay exits.
  const completeHold = reduced ? 450 : 1350;
  // Exit fade duration (kept in sync with the CSS transition).
  const exitMs = reduced ? 250 : 650;

  // Completion is driven by the REAL loading prop; `entranceLanded` is only
  // a polish floor so a very fast boot never flashes awkwardly.
  const complete = !loading && entranceLanded;
  const exiting = complete && holdDone;

  useEffect(() => {
    const timer = window.setTimeout(() => setEntranceLanded(true), minVisible);
    return () => window.clearTimeout(timer);
  }, [minVisible]);

  // Once complete, hold the happy beat, then let the overlay exit.
  useEffect(() => {
    if (!complete) return;
    const timer = window.setTimeout(() => setHoldDone(true), completeHold);
    return () => window.clearTimeout(timer);
  }, [complete, completeHold]);

  useEffect(() => {
    if (!exiting) return;
    const timer = window.setTimeout(onExited, exitMs);
    return () => window.clearTimeout(timer);
  }, [exiting, exitMs, onExited]);

  return (
    <MascotLoading
      message="Preparing your studio"
      phase={complete ? 'complete' : 'loading'}
      exiting={exiting}
    />
  );
};
