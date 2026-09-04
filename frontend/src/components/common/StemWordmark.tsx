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
 * Vector "STEM / STUDIO" brand wordmark using physics-driven Dancing Letters.
 */
export const StemWordmark: React.FC<StemWordmarkProps> = ({
  settled = false,
  compact = false,
}) => (
  <div
    className={[
      'stem-wordmark',
      settled ? 'is-settled' : '',
      compact ? 'stem-wordmark--compact' : '',
    ]
      .filter(Boolean)
      .join(' ')}
    role="img"
    aria-label="STEM Studio"
  >
    <DancingLetters
      text="STEM"
      className="gap-1"
      letterClassName={
        compact
          ? "text-3xl md:text-4xl font-extrabold bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600 dark:from-purple-300 dark:via-purple-400 dark:to-indigo-300 bg-clip-text text-transparent"
          : "text-5xl md:text-6xl lg:text-7xl font-extrabold bg-gradient-to-br from-purple-500 via-violet-600 to-indigo-600 dark:from-purple-300 dark:via-purple-400 dark:to-indigo-300 bg-clip-text text-transparent drop-shadow-sm"
      }
    />
    <span className="stem-wordmark__sub" aria-hidden="true">
      Studio
    </span>
  </div>
);
