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
 * for both STEM (top, large) and STUDIO (bottom, smaller) with light & dark theme support.
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
    {/* Top Row: STEM */}
    <DancingLetters
      text="STEM"
      className="gap-1 md:gap-2 justify-start flex-nowrap"
      letterClassName={
        compact
          ? "text-3xl md:text-4xl font-black tracking-tight bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 dark:from-purple-300 dark:via-violet-300 dark:to-indigo-300 bg-clip-text text-transparent"
          : "text-6xl md:text-7xl lg:text-8xl font-black tracking-tight bg-gradient-to-r from-purple-600 via-indigo-600 to-violet-600 dark:from-purple-300 dark:via-indigo-300 dark:to-violet-300 bg-clip-text text-transparent drop-shadow-md"
      }
    />

    {/* Bottom Row: STUDIO */}
    <DancingLetters
      text="STUDIO"
      className="gap-1 md:gap-1.5 justify-start flex-nowrap mt-1 md:mt-2"
      letterClassName={
        compact
          ? "text-base md:text-lg font-extrabold tracking-[0.25em] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300 bg-clip-text text-transparent opacity-90"
          : "text-2xl md:text-3xl lg:text-4xl font-black tracking-[0.3em] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300 bg-clip-text text-transparent opacity-95"
      }
    />
  </div>
);
