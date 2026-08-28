import React from 'react';
import './StemWordmark.css';

const LETTERS = ['S', 'T', 'E', 'M'] as const;

interface StemWordmarkProps {
  /** Plays a one-shot settle beat once loading has completed. */
  settled?: boolean;
  /** Smaller static variant for page headers (auth screens). */
  compact?: boolean;
}

/**
 * Vector "STEM / STUDIO" brand wordmark.
 *
 * Rendered as real text with a brand gradient clip (no raster assets) so it
 * stays crisp, scalable, theme-aware and fully animatable. Letters enter with
 * a staggered lift; the whole lockup breathes gently while loading and plays
 * a single settle beat when `settled` becomes true.
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
    <span className="stem-wordmark__letters" aria-hidden="true">
      {LETTERS.map((letter, index) => (
        <span
          key={letter}
          className="stem-wordmark__letter"
          style={{ '--letter-index': index } as React.CSSProperties}
        >
          {letter}
        </span>
      ))}
    </span>
    <span className="stem-wordmark__sub" aria-hidden="true">
      Studio
    </span>
  </div>
);
