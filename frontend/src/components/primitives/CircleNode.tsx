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
        {/* Inner highlight ring for depth */}
        <div
          style={{
            position: 'absolute',
            top: '3px',
            left: '3px',
            right: '3px',
            bottom: '3px',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            pointerEvents: 'none',
          }}
        />
        <span style={{ position: 'relative', zIndex: 2 }}>{value}</span>
      </div>
      {label && <span className="node-label">{label}</span>}
    </div>
  );
};
