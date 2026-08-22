import React, { useState, useRef, useEffect } from 'react';
import { GripHorizontal, Play, Pause, SkipForward, RotateCcw, ChevronRight, ChevronDown, Bug, Layers, ListFilter } from 'lucide-react';
import './Debugger.css';

interface FloatingDebuggerProps {
  variables?: Record<string, string | number | boolean | null>;
  callStack?: string[];
  breakpoints: number[];
  currentStepIndex: number;
  totalSteps: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onClose?: () => void;
}

export const FloatingDebugger: React.FC<FloatingDebuggerProps> = ({
  variables = {},
  callStack = [],
  breakpoints,
  currentStepIndex,
  totalSteps,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onReset,
}) => {
  // Floating position state (default top-right offset)
  const [position, setPosition] = useState({ x: window.innerWidth - 380, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Accordion collapse states
  const [openVariables, setOpenVariables] = useState(true);
  const [openCallStack, setOpenCallStack] = useState(true);
  const [openBreakpoints, setOpenBreakpoints] = useState(true);

  // Mouse Drag Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = Math.max(10, Math.min(window.innerWidth - 360, e.clientX - dragOffsetRef.current.x));
      const newY = Math.max(64, Math.min(window.innerHeight - 200, e.clientY - dragOffsetRef.current.y));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const variableEntries = Object.entries(variables);

  return (
    <div
      className={`floating-debugger-window ${isDragging ? 'dragging' : ''}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* Draggable Header */}
      <div className="debugger-header" onMouseDown={handleMouseDown}>
        <div className="header-title">
          <Bug size={16} className="debugger-bug-icon" />
          <span>VS Code Debugger</span>
        </div>
        <span title="Drag to move panel"><GripHorizontal size={18} className="drag-handle" /></span>
      </div>

      {/* IDE Debug Toolbar */}
      <div className="debugger-toolbar">
        <button
          className={`debug-action-btn ${isPlaying ? 'pause' : 'play'}`}
          onClick={onTogglePlay}
          title={isPlaying ? 'Pause (F5)' : 'Continue (F5)'}
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>

        <button
          className="debug-action-btn"
          onClick={onStepForward}
          disabled={currentStepIndex >= totalSteps - 1}
          title="Step Over (F10)"
        >
          <SkipForward size={14} />
        </button>

        <button className="debug-action-btn" onClick={onReset} title="Restart (Ctrl+Shift+F5)">
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Accordion Sections */}
      <div className="debugger-body">
        {/* 1. SCOPE VARIABLES */}
        <div className="debugger-accordion">
          <button
            className="accordion-header"
            onClick={() => setOpenVariables(!openVariables)}
          >
            {openVariables ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="accordion-title">VARIABLES (SCOPE)</span>
            <span className="badge">{variableEntries.length}</span>
          </button>

          {openVariables && (
            <div className="accordion-content variable-tree">
              {variableEntries.length === 0 ? (
                <span className="empty-text">No active variables in scope</span>
              ) : (
                variableEntries.map(([key, val]) => (
                  <div key={key} className="var-item">
                    <span className="var-name">{key}:</span>
                    <span className={`var-value val-type-${typeof val}`}>
                      {val === null ? 'null' : String(val)}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 2. CALL STACK */}
        <div className="debugger-accordion">
          <button
            className="accordion-header"
            onClick={() => setOpenCallStack(!openCallStack)}
          >
            {openCallStack ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Layers size={14} style={{ marginRight: 4 }} />
            <span className="accordion-title">CALL STACK</span>
          </button>

          {openCallStack && (
            <div className="accordion-content stack-list">
              {callStack.length === 0 ? (
                <div className="stack-item active">main()</div>
              ) : (
                callStack.map((frame, idx) => (
                  <div key={idx} className={`stack-item ${idx === callStack.length - 1 ? 'active' : ''}`}>
                    <span className="stack-arrow">➜</span>
                    <span>{frame}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 3. BREAKPOINTS */}
        <div className="debugger-accordion">
          <button
            className="accordion-header"
            onClick={() => setOpenBreakpoints(!openBreakpoints)}
          >
            {openBreakpoints ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <ListFilter size={14} style={{ marginRight: 4 }} />
            <span className="accordion-title">BREAKPOINTS</span>
            <span className="badge">{breakpoints.length}</span>
          </button>

          {openBreakpoints && (
            <div className="accordion-content breakpoints-list">
              {breakpoints.length === 0 ? (
                <span className="empty-text">Click code line numbers to set breakpoints</span>
              ) : (
                breakpoints.map((lineNum) => (
                  <div key={lineNum} className="breakpoint-item">
                    <div className="bp-dot" />
                    <span>Line {lineNum}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
