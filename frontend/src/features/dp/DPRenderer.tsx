import React, { useEffect, useRef } from 'react';
import { Maximize2 } from 'lucide-react';
import type { ArrayStep } from '../../engine/types/Step';
import { MotionPresets } from '../../engine/motionEngine';

interface DPRendererProps {
  currentStep: ArrayStep | null;
  onToggleFullscreen?: () => void;
}

export const DPRenderer: React.FC<DPRendererProps> = ({
  currentStep,
  onToggleFullscreen,
}) => {
  if (!currentStep) {
    return (
      <div className="sorting-canvas-empty">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.35, marginBottom: '0.5rem' }}>
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <rect x="24" y="4" width="16" height="16" rx="2" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <rect x="4" y="24" width="16" height="16" rx="2" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <rect x="24" y="24" width="16" height="16" rx="2" stroke="#64748b" strokeWidth="1.5" fill="none" />
          </svg>
          <span style={{ fontWeight: 600, opacity: 0.7 }}>No DP data available</span>
          <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>Run a DP algorithm to visualize the table</span>
        </div>
      </div>
    );
  }

  const { array, comparingIndices = [], sortedIndices = [], variables = {} } = currentStep;
  const isGrid = variables.isGrid === true;
  const rows = typeof variables.rows === 'number' ? variables.rows : 0;
  const cols = typeof variables.cols === 'number' ? variables.cols : 0;

  if (isGrid && rows > 0 && cols > 0) {
    return <GridRenderer array={array} comparingIndices={comparingIndices} sortedIndices={sortedIndices} rows={rows} cols={cols} variables={variables} onToggleFullscreen={onToggleFullscreen} />;
  }

  return <BarRenderer array={array} comparingIndices={comparingIndices} sortedIndices={sortedIndices} variables={variables} onToggleFullscreen={onToggleFullscreen} />;
};

/* ── 1D Bar Renderer ─────────────────────────────────────────────────── */
interface BarProps {
  array: number[];
  comparingIndices: number[];
  sortedIndices: number[];
  variables: Record<string, string | number | boolean | null>;
  onToggleFullscreen?: () => void;
}

const BarRenderer: React.FC<BarProps> = ({ array, comparingIndices, sortedIndices, variables, onToggleFullscreen }) => {
  const maxVal = Math.max(...array, 1);

  // Build recurrence label
  const recurrenceLabel = buildRecurrenceLabel(variables);

  return (
    <div className="sorting-canvas-container animate-fade-in">
      <div className="sorting-canvas-header">
        <div className="canvas-header-left">
          <span className="bst-title">DP TABLE</span>
          <span className="bst-subtitle">{array.length} cells</span>
        </div>
        {onToggleFullscreen && (
          <button className="fullscreen-toggle-btn" onClick={onToggleFullscreen} title="Full Screen">
            <Maximize2 size={14} />
            <span>Fullscreen</span>
          </button>
        )}
      </div>

      {recurrenceLabel && (
        <div className="dp-recurrence-bar">{recurrenceLabel}</div>
      )}

      <div className="dp-bar-row">
        {array.map((value, index) => {
          const isActive = comparingIndices.includes(index);
          const isComputed = sortedIndices.includes(index);
          const heightPercent = Math.max((value / maxVal) * 100, 8);

          let cellClass = 'dp-bar-cell dp-cell-pending';
          if (isActive) cellClass = 'dp-bar-cell dp-cell-active';
          else if (isComputed) cellClass = 'dp-bar-cell dp-cell-computed';

          return (
            <div key={index} className={cellClass} style={{ height: `${heightPercent}%` }}>
              <span className="dp-bar-value">{value}</span>
              <span className="dp-bar-index">[{index}]</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── 2D Grid Renderer ────────────────────────────────────────────────── */
interface GridProps {
  array: number[];
  comparingIndices: number[];
  sortedIndices: number[];
  rows: number;
  cols: number;
  variables: Record<string, string | number | boolean | null>;
  onToggleFullscreen?: () => void;
}

const GridRenderer: React.FC<GridProps> = ({ array, comparingIndices, sortedIndices, rows, cols, variables, onToggleFullscreen }) => {
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!gridRef.current) return;
    const cells = Array.from(gridRef.current.querySelectorAll<HTMLElement>('.dp-grid-cell'));
    const activeCells = comparingIndices.map(index => cells[index]).filter(Boolean);
    if (activeCells.length) MotionPresets.gridFillWave(activeCells, { stagger: 0.04 });
    sortedIndices.forEach(index => { if (cells[index]) MotionPresets.flashState(cells[index], '37,99,235'); });
  }, [comparingIndices, sortedIndices]);
  const maxVal = Math.max(...array, 1);
  const s1 = typeof variables.s1 === 'string' ? variables.s1 : '';
  const s2 = typeof variables.s2 === 'string' ? variables.s2 : '';

  // Build row labels (for knapsack: item index; for lcs/editDist: char)
  const rowLabels: string[] = [];
  for (let r = 0; r < rows; r++) {
    if (r === 0) rowLabels.push('');
    else if (s1.length >= r) rowLabels.push(s1[r - 1]);
    else rowLabels.push(`${r}`);
  }

  const colLabels: string[] = [];
  for (let c = 0; c < cols; c++) {
    if (c === 0) colLabels.push('');
    else if (s2.length >= c) colLabels.push(s2[c - 1]);
    else colLabels.push(`${c}`);
  }

  return (
    <div className="sorting-canvas-container animate-fade-in">
      <div className="sorting-canvas-header">
        <div className="canvas-header-left">
          <span className="bst-title">DP GRID</span>
          <span className="bst-subtitle">{rows} x {cols}</span>
        </div>
        {onToggleFullscreen && (
          <button className="fullscreen-toggle-btn" onClick={onToggleFullscreen} title="Full Screen">
            <Maximize2 size={14} />
            <span>Fullscreen</span>
          </button>
        )}
      </div>

      <div ref={gridRef} className="dp-grid-wrapper">
        {/* Column labels */}
        <div className="dp-grid-col-labels" style={{ gridTemplateColumns: `40px repeat(${cols}, 1fr)` }}>
          <div className="dp-corner-label" />
          {colLabels.map((label, c) => (
            <div key={c} className="dp-col-label">{label}</div>
          ))}
        </div>

        {/* Grid rows */}
        <div className="dp-grid-body" style={{ gridTemplateColumns: `40px repeat(${cols}, 1fr)` }}>
          {Array.from({ length: rows }, (_, r) => (
            <React.Fragment key={r}>
              <div className="dp-row-label">{rowLabels[r]}</div>
              {Array.from({ length: cols }, (_, c) => {
                const idx = r * cols + c;
                const val = array[idx] ?? 0;
                const isActive = comparingIndices.includes(idx);
                const isComputed = sortedIndices.includes(idx);
                const intensity = maxVal > 0 ? val / maxVal : 0;

                let cellClass = 'dp-grid-cell dp-cell-pending';
                let style: React.CSSProperties = {};
                if (isActive) {
                  cellClass = 'dp-grid-cell dp-cell-active';
                } else if (isComputed) {
                  cellClass = 'dp-grid-cell dp-cell-computed';
                  style = { opacity: 0.4 + intensity * 0.6 };
                }

                return (
                  <div key={c} className={cellClass} style={style}>
                    <span className="dp-grid-value">{val}</span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Helpers ──────────────────────────────────────────────────────────── */
function buildRecurrenceLabel(variables: Record<string, string | number | boolean | null>): string | null {
  const i = variables.i;
  if (typeof i !== 'number') return null;
  const dpI = variables['dp[i]'];
  const dpI1 = variables['dp[i-1]'];
  const dpI2 = variables['dp[i-2]'];
  if (typeof dpI1 === 'number' && typeof dpI2 === 'number') {
    return `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dpI1} + ${dpI2}` + (typeof dpI === 'number' ? ` = ${dpI}` : '');
  }
  return null;
}
