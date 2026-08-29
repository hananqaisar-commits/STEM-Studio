import React, { useState, useRef, useCallback } from 'react';
import './ResizableStudioLayout.css';

interface ResizableStudioLayoutProps {
  leftContent: React.ReactNode;
  rightContent: React.ReactNode;
  bottomContent?: React.ReactNode;
  initialLeftPercent?: number; // e.g. 68%
  minLeftPercent?: number;     // e.g. 40%
  maxLeftPercent?: number;     // e.g. 85%
  className?: string;
}

export const ResizableStudioLayout: React.FC<ResizableStudioLayoutProps> = ({
  leftContent,
  rightContent,
  bottomContent,
  initialLeftPercent = 68,
  minLeftPercent = 40,
  maxLeftPercent = 85,
  className = '',
}) => {
  const [leftPercent, setLeftPercent] = useState<number>(initialLeftPercent);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);

  const startDragging = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const container = containerRef.current;
    if (!container) return;

    container.setPointerCapture(e.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const rect = container.getBoundingClientRect();
      const offsetX = moveEvent.clientX - rect.left;
      const newPercent = (offsetX / rect.width) * 100;
      const clamped = Math.min(Math.max(newPercent, minLeftPercent), maxLeftPercent);
      setLeftPercent(clamped);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      isDraggingRef.current = false;
      try {
        container.releasePointerCapture(upEvent.pointerId);
      } catch {
        // ignore if released
      }
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [minLeftPercent, maxLeftPercent]);

  const handleDoubleClick = () => {
    setLeftPercent(initialLeftPercent);
  };

  return (
    <div ref={containerRef} className={`studio-workbench-container ${className}`}>
      <div className="studio-top-grid">
        <div className="studio-main-panel" style={{ flex: `0 0 ${leftPercent}%` }}>
          {leftContent}
        </div>

        <div
          className="studio-split-handle"
          onPointerDown={startDragging}
          onDoubleClick={handleDoubleClick}
          title="Drag to resize workspace (Double-click to reset)"
          role="separator"
          aria-orientation="vertical"
        >
          <div className="split-handle-grip" />
        </div>

        <div className="studio-rail-panel" style={{ flex: `0 0 calc(${100 - leftPercent}% - 14px)` }}>
          {rightContent}
        </div>
      </div>

      {bottomContent && (
        <div className="studio-bottom-section">
          {bottomContent}
        </div>
      )}
    </div>
  );
};

export default ResizableStudioLayout;
