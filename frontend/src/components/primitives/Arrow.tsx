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
  /** Shorten the shaft so its ends meet the visible edges of graph nodes. */
  endpointInset?: number;
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
  endpointInset = 0,
}) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const startX = x1 + ux * endpointInset;
  const startY = y1 + uy * endpointInset;
  const endX = x2 - ux * endpointInset;
  const endY = y2 - uy * endpointInset;
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const labelWidth = label ? Math.max(18, label.length * 7 + 8) : 0;

  return (
    <g className={`primitive-arrow-group state-${state}`}>
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="7"
          markerUnits="userSpaceOnUse"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" className="arrow-head-fill" />
        </marker>
      </defs>
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        className="primitive-line"
        strokeWidth={strokeWidth}
        markerEnd={`url(#${markerId})`}
      />
      {label && (
        <g className="arrow-label">
          <rect x={midX - labelWidth / 2} y={midY - 16} width={labelWidth} height={15} rx="5" className="arrow-label-bg" />
          <text x={midX} y={midY - 5} className="line-label" textAnchor="middle">{label}</text>
        </g>
      )}
    </g>
  );
};
