import React, { useState, useRef, useCallback } from 'react';
import './ResizableCard.css';

interface ResizableCardProps {
  children: React.ReactNode;
  className?: string;
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: string | number;
  defaultHeight?: string | number;
}

export const ResizableCard: React.FC<ResizableCardProps> = ({
  children,
  className = '',
  minWidth = 240,
  minHeight = 150,
  defaultWidth,
  defaultHeight,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width?: number; height?: number }>({});
  const isDraggingRef = useRef(false);

  const startResize = useCallback(
    (direction: 'top' | 'bottom' | 'left' | 'right' | 'corner') => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const el = cardRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = rect.width;
      const startHeight = rect.height;

      isDraggingRef.current = true;
      el.setPointerCapture(e.pointerId);

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (!isDraggingRef.current) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;

        if (direction === 'right' || direction === 'corner') {
          newWidth = Math.max(minWidth, startWidth + dx);
        } else if (direction === 'left') {
          newWidth = Math.max(minWidth, startWidth - dx);
        }

        if (direction === 'bottom' || direction === 'corner') {
          newHeight = Math.max(minHeight, startHeight + dy);
        } else if (direction === 'top') {
          newHeight = Math.max(minHeight, startHeight - dy);
        }

        setDimensions({
          width: direction === 'top' || direction === 'bottom' ? dimensions.width : newWidth,
          height: direction === 'left' || direction === 'right' ? dimensions.height : newHeight,
        });
      };

      const onPointerUp = (upEvent: PointerEvent) => {
        isDraggingRef.current = false;
        try {
          el.releasePointerCapture(upEvent.pointerId);
        } catch {
          // ignore if already released
        }
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    },
    [dimensions, minWidth, minHeight]
  );

  const style: React.CSSProperties = {
    width: dimensions.width ? `${dimensions.width}px` : defaultWidth ?? '100%',
    height: dimensions.height ? `${dimensions.height}px` : defaultHeight ?? '100%',
    position: 'relative',
  };

  return (
    <div ref={cardRef} className={`resizable-card-container ${className}`} style={style}>
      {children}
      <div className="resize-handle handle-top" onPointerDown={startResize('top')} title="Drag to resize top" />
      <div className="resize-handle handle-bottom" onPointerDown={startResize('bottom')} title="Drag to resize bottom" />
      <div className="resize-handle handle-left" onPointerDown={startResize('left')} title="Drag to resize left" />
      <div className="resize-handle handle-right" onPointerDown={startResize('right')} title="Drag to resize right" />
      <div className="resize-handle handle-corner" onPointerDown={startResize('corner')} title="Drag to resize corner" />
    </div>
  );
};
