import React, { useEffect, useRef } from 'react';
import { MotionPresets } from '../../engine/motionEngine';
import './Renderers.css';

export interface IntervalItem {
  id: string;
  label: string;
  start: number;
  end: number;
  isSelected?: boolean;
  isRejected?: boolean;
  isActive?: boolean;
}

export interface TimelineIntervalProps {
  intervals: IntervalItem[];
  minTime?: number;
  maxTime?: number;
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
}

export const TimelineInterval: React.FC<TimelineIntervalProps> = ({
  intervals,
  minTime = 0,
  maxTime = 24,
  title = 'TIMELINE INTERVAL CANVAS',
  subtitle = 'Greedy Scheduling Trace',
  emptyMessage = 'No intervals provided.',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const activeBars = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('.timeline-bar.is-active, .timeline-bar.is-selected')
    );
    activeBars.forEach((el) => MotionPresets.flashState(el, '34,197,94'));
  }, [intervals]);

  if (!intervals || intervals.length === 0) {
    return (
      <div className="shared-canvas-container">
        <div className="shared-canvas-empty">{emptyMessage}</div>
      </div>
    );
  }

  const range = maxTime - minTime || 1;

  return (
    <div className="shared-canvas-container animate-fade-in" ref={containerRef}>
      <div className="shared-canvas-header">
        <div className="canvas-header-left">
          <span className="shared-canvas-title">{title}</span>
          {subtitle && <span className="shared-canvas-subtitle">{subtitle}</span>}
        </div>
      </div>

      <div className="timeline-workspace">
        {/* Time axis */}
        <div className="timeline-axis">
          {Array.from({ length: maxTime - minTime + 1 }).map((_, i) => (
            <div key={i} className="timeline-tick">
              <div className="timeline-tick-mark" />
              <span className="timeline-tick-label">{minTime + i}</span>
            </div>
          ))}
        </div>

        {/* Interval bars */}
        <div className="timeline-bars">
          {intervals.map((interval) => {
            const startPct = ((interval.start - minTime) / range) * 100;
            const widthPct = ((interval.end - interval.start) / range) * 100;

            let barClass = 'timeline-bar';
            if (interval.isActive) barClass += ' is-active';
            else if (interval.isSelected) barClass += ' is-selected';
            else if (interval.isRejected) barClass += ' is-rejected';

            return (
              <div key={interval.id} className="timeline-bar-row">
                <div
                  className={barClass}
                  style={{
                    left: `${startPct}%`,
                    width: `${widthPct}%`,
                  }}
                >
                  <span className="timeline-bar-label">
                    {interval.label} ({interval.start}–{interval.end})
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
