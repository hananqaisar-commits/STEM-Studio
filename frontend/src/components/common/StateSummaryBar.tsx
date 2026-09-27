import React from 'react';
import './StateSummaryBar.css';

export interface StateSummaryItem {
  key: string;
  value: string | number;
}

interface StateSummaryBarProps {
  items: StateSummaryItem[];
  className?: string;
}

/**
 * Unified state summary pill — renders key-value pairs as:
 *   KEY = value · KEY = value · ...
 *
 * Used across all renderers to show current algorithm state
 * (HEAD, TOP, FRONT/REAR, Size, Rule, etc.)
 */
export const StateSummaryBar: React.FC<StateSummaryBarProps> = ({ items, className = '' }) => {
  if (items.length === 0) return null;

  return (
    <div className={`state-summary-bar ${className}`}>
      {items.map((item, index) => (
        <React.Fragment key={item.key}>
          <span className="state-summary-item">
            <span className="state-summary-key">{item.key}</span>
            <span className="state-summary-eq">=</span>
            <span className="state-summary-value">{item.value}</span>
          </span>
          {index < items.length - 1 && (
            <span className="state-summary-sep">·</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
