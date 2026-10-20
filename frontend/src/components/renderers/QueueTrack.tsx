import React, { useEffect, useRef } from 'react';
import { MotionPresets } from '../../engine/motionEngine';
import './Renderers.css';

export interface QueueTrackItem {
  id: string;
  value: string | number;
  isActive?: boolean;
  isEliminated?: boolean;
}

export interface QueueTrackProps {
  items: QueueTrackItem[];
  capacity?: number;
  isRingMode?: boolean;
  frontIndex?: number;
  rearIndex?: number;
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
}

export const QueueTrack: React.FC<QueueTrackProps> = ({
  items = [],
  capacity = 6,
  isRingMode = false,
  frontIndex = 0,
  rearIndex = 0,
  title = 'QUEUE TRACK CANVAS',
  subtitle = 'Queue / Ring Buffer Trace',
  emptyMessage = 'No items in queue.',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const activeEls = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('.queuetrack-cell.is-active')
    );
    activeEls.forEach((el) => MotionPresets.flashState(el, '59,130,246'));
  }, [items]);

  // Build ring slots (fill with items or null)
  const ringSlots: (QueueTrackItem | null)[] = isRingMode
    ? Array.from({ length: capacity }, (_, i) => items[i] || null)
    : [];

  return (
    <div className="shared-canvas-container animate-fade-in" ref={containerRef}>
      <div className="shared-canvas-header">
        <div className="canvas-header-left">
          <span className="shared-canvas-title">{title}</span>
          {subtitle && <span className="shared-canvas-subtitle">{subtitle}</span>}
        </div>
      </div>

      <div className="queuetrack-workspace">
        {!isRingMode ? (
          /* ── Linear Mode ────────────────────────── */
          <div className="queuetrack-linear">
            {items.length === 0 ? (
              <div className="shared-canvas-empty">{emptyMessage}</div>
            ) : (
              items.map((item) => {
                let cellClass = 'queuetrack-cell';
                if (item.isActive) cellClass += ' is-active';
                if (item.isEliminated) cellClass += ' is-eliminated';

                return (
                  <div key={item.id} className={cellClass}>
                    {item.value}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* ── Ring Mode ──────────────────────────── */
          <div className="queuetrack-ring">
            <div className="queuetrack-ring-track">
              {ringSlots.map((item, idx) => {
                const angle = (idx / capacity) * 360;
                const radius = 110;
                const x = Math.cos((angle - 90) * (Math.PI / 180)) * radius;
                const y = Math.sin((angle - 90) * (Math.PI / 180)) * radius;

                const isFront = frontIndex === idx;
                const isRear = rearIndex === idx;
                const isEmpty = !item || item.isEliminated;

                let cellClass = 'queuetrack-cell ring-cell';
                if (!isEmpty && item?.isActive) cellClass += ' is-active';
                if (isEmpty) cellClass += ' is-empty';

                return (
                  <div
                    key={idx}
                    className="queuetrack-ring-slot"
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                  >
                    <div className={cellClass}>
                      {!isEmpty ? item!.value : ''}
                    </div>

                    {/* Front / Rear pointers */}
                    {(isFront || isRear) && (
                      <div className="queuetrack-ptr">
                        {isFront && <span className="ptr-front">F</span>}
                        {isRear && <span className="ptr-rear">R</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
