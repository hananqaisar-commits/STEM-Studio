import React from 'react';
import type { ElementState } from '../../engine/types/Step';
import './Primitives.css';

interface BarProps {
  value: number;
  heightPercent: number;
  state?: ElementState;
  showValue?: boolean;
  width?: string | number;
}

export const Bar: React.FC<BarProps> = ({
  value,
  heightPercent,
  state = 'default',
  showValue = true,
  width,
}) => {
  return (
    <div className={`primitive-bar-container state-${state}`} style={{ width }}>
      {showValue && <span className="bar-value">{value}</span>}
      <div
        className="primitive-bar-fill"
        style={{ height: `${Math.max(5, heightPercent)}%` }}
      >
        <div className="bar-glow" />
      </div>
    </div>
  );
};
