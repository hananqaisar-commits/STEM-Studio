import React, { useMemo } from 'react';
import type { MascotExpression, MascotSize } from './MascotState';
import './Mascot.css';

// ── SVG imports ─────────────────────────────────────────────────────
// Each expression maps to an SVG asset: octa-<expression>.svg
import confusedSvg from './octa-confused.svg';
import excitedSvg from './octa-excited.svg';
import focusedSvg from './octa-focused.svg';
import happySvg from './octa-happy.svg';
import helpingSvg from './octa-helping.svg';
import neutralSvg from './octa-neutral.svg';
import readingSvg from './octa-reading.svg';
import reviewSvg from './octa-review.svg';
import sadSvg from './octa-sad.svg';
import surprisedSvg from './octa-surprised.svg';
import thinkingSvg from './octa-thinking.svg';
import tiredSvg from './octa-tired.svg';

const SVG_MAP: Record<MascotExpression, string> = {
  neutral: neutralSvg,
  happy: happySvg,
  focused: focusedSvg,
  thinking: thinkingSvg,
  reading: readingSvg,
  excited: excitedSvg,
  confused: confusedSvg,
  surprised: surprisedSvg,
  tired: tiredSvg,
  sad: sadSvg,
  helping: helpingSvg,
  review: reviewSvg,
  listening: focusedSvg,
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
  /** Whether mascot reacts to hover (breathing/pulse). */
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
 * Renders a pre-authored SVG asset matching the given expression.
 * Animations are handled via CSS classes (idle breathing, hover).
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
  const src = SVG_MAP[expression] ?? SVG_MAP.neutral;
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
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="octa-img"
        draggable={false}
        loading="lazy"
      />
    </span>
  );
};

export default Octa;
