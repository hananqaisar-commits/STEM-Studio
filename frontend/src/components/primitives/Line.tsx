import React from 'react';
import type { ElementState } from '../../engine/types/Step';
import './Primitives.css';

interface LineProps {
  x1: number | string;
  y1: number | string;
  x2: number | string;
  y2: number | string;
  state?: ElementState;
  strokeWidth?: number;
}

export const Line: React.FC<LineProps> = ({
  x1,
  y1,
  x2,
  y2,
  state = 'default',
  strokeWidth = 2.5,
}) => {
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
