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
  endpointInset?: number;
}

export const Line: React.FC<LineProps> = ({
  x1,
  y1,
  x2,
  y2,
  state = 'default',
  strokeWidth = 2.5,
  endpointInset = 0,
}) => {
  const fromX = Number(x1);
  const fromY = Number(y1);
  const toX = Number(x2);
  const toY = Number(y2);
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const startX = endpointInset ? fromX + ux * endpointInset : x1;
  const startY = endpointInset ? fromY + uy * endpointInset : y1;
  const endX = endpointInset ? toX - ux * endpointInset : x2;
  const endY = endpointInset ? toY - uy * endpointInset : y2;
  return (
    <line
      x1={startX}
      y1={startY}
      x2={endX}
      y2={endY}
      className={`primitive-line line-state-${state}`}
      strokeWidth={strokeWidth}
    />
  );
};
