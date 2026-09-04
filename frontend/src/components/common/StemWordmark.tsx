import React from 'react';
import DancingLetters from '@/components/ui/dancing-letters';
import './StemWordmark.css';

interface StemWordmarkProps {
  /** Plays a one-shot settle beat once loading has completed. */
  settled?: boolean;
  /** Smaller static variant for page headers (auth screens). */
  compact?: boolean;
}

/**
 * Vector "STEM / STUDIO" brand wordmark using physics-driven Dancing Letters
 * for both STEM (top, large) and STUDIO (bottom, smaller) with high-contrast light & dark theme support.
 */
export const StemWordmark: React.FC<StemWordmarkProps> = ({
  settled = false,
  compact = false,
}) => (
  <div
    className={[
      'stem-wordmark-container',
      settled ? 'is-settled' : '',
      compact ? 'stem-wordmark--compact' : '',
    ]
      .filter(Boolean)
      .join(' ')}
    role="img"
    aria-label="STEM Studio"
  >
    {/* Top Row: STEM (Premium Professional Brand Lockup) */}
    <DancingLetters
      text="STEM"
      className="gap-1.5 sm:gap-2 md:gap-3 justify-start flex-nowrap"
      letterClassName={
        compact
          ? "text-3xl md:text-4xl font-black tracking-tight text-neutral-950 dark:text-neutral-50 bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 dark:from-purple-100 dark:via-indigo-200 dark:to-white bg-clip-text text-transparent"
          : "text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-neutral-950 dark:text-neutral-50 bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-800 dark:from-purple-100 dark:via-indigo-100 dark:to-white bg-clip-text text-transparent drop-shadow-xl leading-none"
      }
    />

    {/* Bottom Row: STUDIO — Elegant vertical separation */}
    <DancingLetters
      text="STUDIO"
      className="gap-1.5 sm:gap-2 md:gap-3 justify-start flex-nowrap mt-5 md:mt-8"
      letterClassName={
        compact
          ? "text-base md:text-lg font-black tracking-[0.3em] text-purple-900 dark:text-purple-200 bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-800 dark:from-purple-300 dark:via-indigo-200 dark:to-purple-100 bg-clip-text text-transparent"
          : "text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-[0.35em] text-purple-900 dark:text-purple-200 bg-gradient-to-r from-purple-800 via-indigo-900 to-purple-900 dark:from-purple-300 dark:via-indigo-200 dark:to-purple-100 bg-clip-text text-transparent drop-shadow-lg leading-none"
      }
    />
  </div>
);
