import React, { useEffect, useRef } from 'react';
import { MotionPresets } from '../../engine/motionEngine';
import './Renderers.css';

export interface NumberLineItem {
  id: string;
  value: number;
  label?: string;
  isLo?: boolean;
  isHi?: boolean;
  isMid?: boolean;
  isPivot?: boolean;
  isPeakCheckLeft?: boolean;
  isPeakCheckRight?: boolean;
  isActive?: boolean;
  state?: 'default' | 'success' | 'error' | 'dimmed';
}

export interface NumberLineProps {
  items: NumberLineItem[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
}

export const NumberLine: React.FC<NumberLineProps> = ({
  items,
  title = 'NUMBER LINE CANVAS',
  subtitle = 'Binary Search Trace',
  emptyMessage = 'No data available to display.',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const cells = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('.numberline-cell')
    );
    const activeCells = cells.filter((_, i) => items[i]?.isActive || items[i]?.isMid);
    if (activeCells.length > 0) {
      MotionPresets.flashState(activeCells, '59,130,246');
    }
  }, [items]);

  if (!items || items.length === 0) {
    return (
      <div className="shared-canvas-container">
        <div className="shared-canvas-empty">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="shared-canvas-container animate-fade-in" ref={containerRef}>
      <div className="shared-canvas-header">
        <div className="canvas-header-left">
          <span className="shared-canvas-title">{title}</span>
          {subtitle && <span className="shared-canvas-subtitle">{subtitle}</span>}
        </div>
      </div>

      <div className="numberline-workspace">
        {/* Track line */}
        <div className="numberline-track" />

        {/* Markers */}
        <div className="numberline-markers">
          {items.map((item) => {
            let cellClass = 'numberline-cell';
            if (item.state === 'success') cellClass += ' cell-success';
            else if (item.state === 'error') cellClass += ' cell-error';
            else if (item.isActive || item.isMid) cellClass += ' cell-active';
            else if (item.state === 'dimmed') cellClass += ' cell-dimmed';

            return (
              <div key={item.id} className="numberline-marker">
                {/* Top label */}
                <div className="numberline-top-label">
                  {item.isPivot && 'PIVOT'}
                  {item.isPeakCheckLeft && '← CHECK'}
                  {item.isPeakCheckRight && 'CHECK →'}
                </div>

                {/* Value cell */}
                <div className={cellClass}>
                  {item.value}
                </div>

                {/* Bottom pointer labels */}
                <div className="numberline-bottom-label">
                  {item.isLo && <span className="ptr-lo">LO</span>}
                  {item.isMid && <span className="ptr-mid">MID</span>}
                  {item.isHi && <span className="ptr-hi">HI</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
