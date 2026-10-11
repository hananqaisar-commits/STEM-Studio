import React, { useRef, useState, useLayoutEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Square,
  PlayCircle,
} from 'lucide-react';
import './Controls.css';

export interface FloatingControllerProps {
  isPlaying: boolean;
  canStepBack: boolean;
  canStepForward: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onStop?: () => void;
  onResume?: () => void;
  /** Hide and disable drag when quiz mode is active. */
  quizMode?: boolean;
  /** Optional className for additional positioning overrides. */
  className?: string;
}

interface Position {
  x: number;
  y: number;
}

interface ControllerBounds {
  parent: HTMLElement;
  left: number;
  top: number;
  width: number;
  height: number;
}

const EDGE_INSET = 12;

function getControllerBounds(element: HTMLElement): ControllerBounds | null {
  const renderer = element.closest<HTMLElement>('.renderer-section');
  const modalBody = element.closest<HTMLElement>('.fs-modal-body');
  const parent = renderer ?? modalBody ?? element.offsetParent as HTMLElement | null;
  if (!parent) return null;

  // In fullscreen the controller is a sibling of the scrollable workspace,
  // so use that visible workspace as its drag boundary while positioning it
  // relative to the modal body.
  const boundary = renderer ?? modalBody?.querySelector<HTMLElement>('.fs-workspace-scrollable') ?? parent;
  const parentRect = parent.getBoundingClientRect();
  const boundaryRect = boundary.getBoundingClientRect();

  return {
    parent,
    left: boundaryRect.left - parentRect.left - parent.clientLeft,
    top: boundaryRect.top - parentRect.top - parent.clientTop,
    width: boundary.clientWidth,
    height: boundary.clientHeight,
  };
}

function clampPosition(value: Position, bounds: ControllerBounds, width: number, height: number): Position {
  const minX = bounds.left + EDGE_INSET;
  const minY = bounds.top + EDGE_INSET;
  const maxX = Math.max(minX, bounds.left + bounds.width - width - EDGE_INSET);
  const maxY = Math.max(minY, bounds.top + bounds.height - height - EDGE_INSET);

  return {
    x: Math.min(Math.max(value.x, minX), maxX),
    y: Math.min(Math.max(value.y, minY), maxY),
  };
}

const SHORTCUTS: Record<string, string> = {
  play: 'Space',
  reset: 'R',
  back: '←',
  forward: '→',
  stop: 'S',
  resume: 'Enter',
};

export const FloatingController: React.FC<FloatingControllerProps> = ({
  isPlaying,
  canStepBack,
  canStepForward,
  onPlay,
  onPause,
  onReset,
  onStepBack,
  onStepForward,
  onStop,
  onResume,
  quizMode = false,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startY: 0,
    initialLeft: 0,
    initialTop: 0,
  });
  const positionRef = useRef<Position>({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPositioned, setIsPositioned] = useState(false);

  const updatePosition = useCallback((next: Position) => {
    positionRef.current = next;
    setPosition(next);
  }, []);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const placeController = () => {
      const currentElement = containerRef.current;
      if (!currentElement) return;
      const bounds = getControllerBounds(currentElement);
      if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;

      const width = currentElement.offsetWidth;
      const height = currentElement.offsetHeight;
      if (width <= 0 || height <= 0) return;

      const next = hasDraggedRef.current
        ? clampPosition(positionRef.current, bounds, width, height)
        : clampPosition({
            x: bounds.left + (bounds.width - width) / 2,
            y: bounds.top + bounds.height - height - EDGE_INSET,
          }, bounds, width, height);

      updatePosition(next);
      setIsPositioned(true);
    };

    placeController();
    const bounds = getControllerBounds(el);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(placeController) : null;
    if (bounds) {
      observer?.observe(bounds.parent);
      const boundary = bounds.parent.matches('.renderer-section')
        ? bounds.parent
        : bounds.parent.querySelector<HTMLElement>('.fs-workspace-scrollable');
      if (boundary && boundary !== bounds.parent) observer?.observe(boundary);
    }
    observer?.observe(el);
    window.addEventListener('resize', placeController);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', placeController);
    };
  }, [updatePosition]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) onPause();
    else onPlay();
  }, [isPlaying, onPause, onPlay]);

  const handleStop = useCallback(() => {
    onStop ? onStop() : onReset();
  }, [onStop, onReset]);

  const handleResume = useCallback(() => {
    onResume ? onResume() : onPlay();
  }, [onResume, onPlay]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (quizMode) return;
    
    const target = e.target as HTMLElement;
    if (!target.closest('.floating-controller-grip')) return;

    const el = containerRef.current;
    if (!el) return;
    e.preventDefault();
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: positionRef.current.x,
      initialTop: positionRef.current.y,
    };
    setIsDragging(true);
    el.setPointerCapture(e.pointerId);
  }, [quizMode]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging || quizMode) return;
    const el = containerRef.current;
    if (!el) return;

    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const bounds = getControllerBounds(el);
    if (!bounds) return;

    const next = clampPosition({
      x: dragRef.current.initialLeft + dx,
      y: dragRef.current.initialTop + dy,
    }, bounds, el.offsetWidth, el.offsetHeight);

    hasDraggedRef.current = true;
    updatePosition(next);
  }, [quizMode, updatePosition]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.isDragging = false;
    setIsDragging(false);
    const el = containerRef.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
  }, []);

  if (quizMode) return null;

  return (
    <div
      ref={containerRef}
      className={`floating-controller ${isDragging ? 'is-dragging' : ''} ${isPositioned ? 'is-positioned' : ''} ${className}`}
      style={isPositioned ? { left: position.x, top: position.y } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      role="toolbar"
      aria-label="Playback controls"
    >
      <div className="floating-controller-grip" title="Drag to move controller">
        <span className="grip-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </div>

      <div className="floating-controller-buttons">
        <ControlButton
          label={isPlaying ? 'Pause' : 'Play'}
          shortcut={SHORTCUTS.play}
          onClick={handleTogglePlay}
          variant="primary"
          aria-pressed={isPlaying}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
        </ControlButton>

        <ControlButton
          label="Reset"
          shortcut={SHORTCUTS.reset}
          onClick={onReset}
          disabled={false}
        >
          <RotateCcw size={16} />
        </ControlButton>

        <ControlButton
          label="Back"
          shortcut={SHORTCUTS.back}
          onClick={onStepBack}
          disabled={!canStepBack}
        >
          <SkipBack size={16} />
        </ControlButton>

        <ControlButton
          label="Next"
          shortcut={SHORTCUTS.forward}
          onClick={onStepForward}
          disabled={!canStepForward}
        >
          <SkipForward size={16} />
        </ControlButton>

        <ControlButton
          label="Resume"
          shortcut={SHORTCUTS.resume}
          onClick={handleResume}
          disabled={isPlaying}
        >
          <PlayCircle size={16} />
        </ControlButton>

        <ControlButton
          label="Stop"
          shortcut={SHORTCUTS.stop}
          onClick={handleStop}
          disabled={!isPlaying && canStepBack === false && canStepForward === false}
        >
          <Square size={14} />
        </ControlButton>
      </div>
    </div>
  );
};

interface ControlButtonProps {
  label: string;
  shortcut: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary';
  children: React.ReactNode;
  'aria-pressed'?: boolean;
}

const ControlButton: React.FC<ControlButtonProps> = ({
  label,
  shortcut,
  onClick,
  disabled = false,
  variant = 'default',
  children,
  'aria-pressed': ariaPressed,
}) => {
  return (
    <button
      type="button"
      className={`fc-icon-btn ${variant === 'primary' ? 'fc-icon-btn-primary' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label} (${shortcut})`}
      aria-pressed={ariaPressed}
      title={`${label} (${shortcut})`}
    >
      {children}
    </button>
  );
};
