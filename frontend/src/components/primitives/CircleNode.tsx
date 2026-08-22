import React from 'react';
import type { ElementState } from '../../engine/types/Step';
import './Primitives.css';

interface CircleNodeProps {
  value: string | number;
  state?: ElementState;
  size?: number;
  label?: string;
  onClick?: () => void;
}

export const CircleNode: React.FC<CircleNodeProps> = ({
  value,
  state = 'default',
  size = 48,
  label,
  onClick,
}) => {
  return (
    <div className="node-wrapper" onClick={onClick}>
      <div
        className={`primitive-circle-node state-${state}`}
        style={{ width: size, height: size, fontSize: size * 0.36 }}
      >
        <span>{value}</span>
      </div>
      {label && <span className="node-label">{label}</span>}
    </div>
  );
};
