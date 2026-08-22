import React from 'react';
import type { ElementState } from '../../engine/types/Step';
import './Primitives.css';

interface ArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  state?: ElementState;
  strokeWidth?: number;
  label?: string;
  markerId?: string;
}

export const Arrow: React.FC<ArrowProps> = ({
  x1,
  y1,
  x2,
  y2,
  state = 'default',
  strokeWidth = 2,
  label,
  markerId = 'arrowhead',
}) => {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g className={`primitive-arrow-group state-${state}`}>
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" className="arrow-head-fill" />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className="primitive-line"
        strokeWidth={strokeWidth}
        markerEnd={`url(#${markerId})`}
      />
      {label && (
        <text x={midX} y={midY - 6} className="line-label" textAnchor="middle">
          {label}
        </text>
      )}
    </g>
  );
};
