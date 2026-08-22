import React from 'react';
import type { ElementState } from '../../engine/types/Step';
import './Primitives.css';

interface LineProps {
  x1: number | string;
  y1: number;
  x2: number | string;
  y2: number;
  state?: ElementState;
  strokeWidth?: number;
  curved?: boolean;
}

export const Line: React.FC<LineProps> = ({
  x1,
  y1,
  x2,
  y2,
  state = 'default',
  strokeWidth = 2,
  curved = true,
}) => {
  if (curved) {
    // Calculate cubic bezier control points for a smooth organic vertical tree connection
    const midY = y1 + (y2 - y1) / 2;
    const pathD = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

    return (
      <path
        d={pathD}
        className={`primitive-line line-state-${state}`}
        strokeWidth={strokeWidth}
        fill="none"
      />
    );
  }

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      className={`primitive-line line-state-${state}`}
      strokeWidth={strokeWidth}
    />
  );
};
