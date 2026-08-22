import React from 'react';
import type { ElementState } from '../../engine/types/Step';
import './Primitives.css';

interface LineProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  state?: ElementState;
  strokeWidth?: number;
  label?: string;
}

export const Line: React.FC<LineProps> = ({
  x1,
  y1,
  x2,
  y2,
  state = 'default',
  strokeWidth = 2,
  label,
}) => {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g className={`primitive-line-group state-${state}`}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className="primitive-line"
        strokeWidth={strokeWidth}
      />
      {label && (
        <text x={midX} y={midY - 6} className="line-label" textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
};
