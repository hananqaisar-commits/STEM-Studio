import React, { useState } from 'react';
import { Code, Play } from 'lucide-react';
import './Debugger.css';

interface CodeDebuggerPanelProps {
  pseudocode: string[];
  activeLine?: number;
  breakpoints: number[];
  onToggleBreakpoint: (lineNumber: number) => void;
  variables?: Record<string, string | number | boolean | null>;
}

export const CodeDebuggerPanel: React.FC<CodeDebuggerPanelProps> = ({
  pseudocode,
  activeLine,
  breakpoints,
  onToggleBreakpoint,
  variables = {},
}) => {
  const [hoveredVar, setHoveredVar] = useState<{ name: string; val: any; x: number; y: number } | null>(null);

  const handleLineHover = (e: React.MouseEvent, lineText: string) => {
    // Find any matching variable name in lineText
    const foundVar = Object.keys(variables).find((varName) => lineText.includes(varName));
    if (foundVar && variables[foundVar] !== undefined) {
      setHoveredVar({
        name: foundVar,
        val: variables[foundVar],
        x: e.clientX + 10,
        y: e.clientY - 25,
      });
    } else {
      setHoveredVar(null);
    }
  };

  return (
    <div className="code-debugger-panel">
      <div className="panel-header">
        <Code size={16} />
        <span>VS CODE SOURCE DEBUGER</span>
        <span className="bp-hint">(Click line # to set Breakpoint)</span>
      </div>

      <div className="code-editor-gutter-container">
        {pseudocode.map((line, idx) => {
          const lineNumber = idx + 1;
          const isCurrentLine = activeLine === lineNumber;
          const hasBreakpoint = breakpoints.includes(lineNumber);

          return (
            <div
              key={idx}
              className={`code-editor-line ${isCurrentLine ? 'active-execution-line' : ''}`}
              onMouseMove={(e) => handleLineHover(e, line)}
              onMouseLeave={() => setHoveredVar(null)}
            >
              {/* Gutter / Breakpoint Dot */}
              <div
                className="line-gutter"
                onClick={() => onToggleBreakpoint(lineNumber)}
                title={hasBreakpoint ? `Remove Breakpoint at line ${lineNumber}` : `Set Breakpoint at line ${lineNumber}`}
              >
                {hasBreakpoint && <div className="red-breakpoint-dot" />}
                {isCurrentLine && <Play size={10} className="current-line-arrow" />}
                <span className="line-number">{lineNumber}</span>
              </div>

              {/* Code Line Content */}
              <div className="line-text">
                <code>{line}</code>
              </div>
            </div>
          );
        })}
      </div>

      {/* Variable Hover Tooltip */}
      {hoveredVar && (
        <div
          className="vscode-hover-tooltip animate-fade-in"
          style={{ left: `${hoveredVar.x}px`, top: `${hoveredVar.y}px` }}
        >
          <span className="tooltip-var-name">{hoveredVar.name}:</span>
          <span className="tooltip-var-val">{String(hoveredVar.val)}</span>
        </div>
      )}
    </div>
  );
};
