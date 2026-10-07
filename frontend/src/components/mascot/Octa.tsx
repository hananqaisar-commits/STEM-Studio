import React, { useMemo } from 'react';
import type { MascotExpression, MascotSize } from './MascotState';
import './Mascot.css';

// Individually cropped transparent states from Octa's plush sprite sheet.
import angrySprite from './fluffy/octa-angry.webp';
import excitedSprite from './fluffy/octa-excited.webp';
import focusedSprite from './fluffy/octa-focused.webp';
import happySprite from './fluffy/octa-happy.webp';
import helpingSprite from './fluffy/octa-helping.webp';
import listeningSprite from './fluffy/octa-listening.webp';
import neutralSprite from './fluffy/octa-neutral.webp';
import sadSprite from './fluffy/octa-sad.webp';
import surprisedSprite from './fluffy/octa-surprised.webp';
import thinkingSprite from './fluffy/octa-thinking.webp';
import tiredSprite from './fluffy/octa-tired.webp';
import winkSprite from './fluffy/octa-wink.webp';

const SPRITE_MAP: Record<MascotExpression, string> = {
  neutral: neutralSprite,
  happy: happySprite,
  focused: focusedSprite,
  thinking: thinkingSprite,
  reading: focusedSprite,
  excited: excitedSprite,
  confused: thinkingSprite,
  surprised: surprisedSprite,
  tired: tiredSprite,
  sad: sadSprite,
  helping: helpingSprite,
  review: focusedSprite,
  listening: listeningSprite,
  wink: winkSprite,
  angry: angrySprite,
};

const SIZE_PX: Record<MascotSize, number> = {
  tiny: 56,
  small: 84,
  medium: 140,
  large: 200,
  xl: 340,
};

export interface OctaProps {
  expression?: MascotExpression;
  size?: MascotSize | number;
  /** Whether Octa has gentle idle movement and a hover response. */
  interactive?: boolean;
  /** Extra className for the wrapper. */
  className?: string;
  /** Inline style for the wrapper. */
  style?: React.CSSProperties;
  /** Accessible label. Defaults to expression name. */
  label?: string;
}

/**
 * Octa — the STEM Studio mascot.
 * Renders a high-resolution plush sprite for the current expression.
 * CSS adds gentle idle movement and a small hover reaction.
 */
export const Octa: React.FC<OctaProps> = ({
  expression = 'neutral',
  size = 'medium',
  interactive = true,
  className = '',
  style,
  label,
}) => {
  const px = typeof size === 'number' ? size : SIZE_PX[size];
  const src = SPRITE_MAP[expression] ?? SPRITE_MAP.neutral;
  const accessibleLabel = label ?? `Octa the mascot, ${expression}`;

  const wrapperClass = useMemo(() => {
    const parts = ['octa-wrapper'];
    if (interactive) parts.push('octa-interactive');
    if (className) parts.push(className);
    return parts.join(' ');
  }, [interactive, className]);

  return (
    <span
      className={wrapperClass}
      style={{ width: px, height: px, ...style }}
      role="img"
      aria-label={accessibleLabel}
      data-expression={expression}
    >
      <span className="octa-stage" aria-hidden="true">
        <img
          key={expression}
          src={src}
          alt=""
          className="octa-img"
          draggable={false}
          loading="lazy"
          decoding="async"
        />
      </span>
    </span>
  );
};

export default Octa;
