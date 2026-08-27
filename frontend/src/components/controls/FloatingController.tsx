import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Square,
  Zap,
} from 'lucide-react';
import { Octa } from '../mascot';
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

  const [position, setPosition] = useState<Position>({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);

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
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialLeft: rect.left,
      initialTop: rect.top,
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

    const parent = el.offsetParent as HTMLElement | null;
    const parentRect = parent?.getBoundingClientRect() ?? {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };

    const newLeft = Math.min(
      Math.max(0, dragRef.current.initialLeft - parentRect.left + dx),
      parentRect.width - el.offsetWidth
    );
    const newTop = Math.min(
      Math.max(0, dragRef.current.initialTop - parentRect.top + dy),
      parentRect.height - el.offsetHeight
    );

    setPosition({ x: newLeft, y: newTop });
  }, [quizMode]);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.isDragging = false;
    setIsDragging(false);
    containerRef.current?.releasePointerCapture(e.pointerId);
  }, []);

  // Keep the controller inside the viewport on resize.
  useEffect(() => {
    const handleResize = () => {
      const el = containerRef.current;
      if (!el) return;
      const parent = el.offsetParent as HTMLElement | null;
      const parentRect = parent?.getBoundingClientRect() ?? {
        width: window.innerWidth,
        height: window.innerHeight,
      };
      setPosition((prev) => ({
        x: Math.min(prev.x, Math.max(0, parentRect.width - el.offsetWidth)),
        y: Math.min(prev.y, Math.max(0, parentRect.height - el.offsetHeight)),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (quizMode) return null;

  return (
    <div
      ref={containerRef}
      className={`floating-controller ${isDragging ? 'is-dragging' : ''} ${className}`}
      style={{
        left: position.x,
        top: position.y,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      role="toolbar"
      aria-label="Playback controls"
    >
      <div className="floating-controller-grip" title="Drag to move">
        <Octa expression="helping" size="tiny" interactive={false} />
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
          <Zap size={16} />
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
      className={`fc-btn ${variant === 'primary' ? 'fc-btn-primary' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label} (${shortcut})`}
      aria-pressed={ariaPressed}
      title={`${label} (${shortcut})`}
    >
      {children}
      <span className="fc-btn-shortcut" aria-hidden="true">
        {shortcut}
      </span>
    </button>
  );
};
