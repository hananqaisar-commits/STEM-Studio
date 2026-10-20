import React, { useEffect, useRef } from 'react';
import { Maximize2, Crown } from 'lucide-react';
import { MotionPresets } from '../../engine/motionEngine';
import './Renderers.css';

export interface Grid2DProps {
  mode?: '1D' | '2D';
  array?: number[];
  grid?: number[][];
  rows?: number;
  cols?: number;
  rowLabels?: string[];
  colLabels?: string[];
  activeIndices?: number[];               // linear 1D index or r*cols+c
  computedIndices?: number[];             // linear 1D index or r*cols+c
  backtrackPath?: number[];               // linear 1D index array in path order
  cellDependencies?: number[];            // linear indices of cells contributing to current step
  queenPositions?: [number, number][];    // [r, c] for N-Queens chessboard mode
  isChessboard?: boolean;
  title?: string;
  subtitle?: string;
  onToggleFullscreen?: () => void;
}

export const Grid2D: React.FC<Grid2DProps> = ({
  mode = '1D',
  array = [],
  grid = [],
  rows = 1,
  cols = array.length || 1,
  rowLabels = [],
  colLabels = [],
  activeIndices = [],
  computedIndices = [],
  backtrackPath = [],
  cellDependencies = [],
  queenPositions = [],
  isChessboard = false,
  title = '2D GRID CANVAS',
  subtitle,
  onToggleFullscreen,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger gridFillWave on active/newly filled cells
  useEffect(() => {
    if (!containerRef.current) return;
    const cells = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('.grid2d-matrix-cell, .grid2d-1d-cell')
    );
    const activeCellEls = activeIndices.map(idx => cells[idx]).filter(Boolean);
    if (activeCellEls.length > 0) {
      MotionPresets.gridFillWave(activeCellEls, { stagger: 0.04, color: '59,130,246' });
    }

    // Trigger flashState on backtrack path cells sequentially
    if (backtrackPath.length > 0) {
      backtrackPath.forEach((idx, i) => {
        if (cells[idx]) {
          setTimeout(() => {
            MotionPresets.flashState(cells[idx], '34,197,94');
          }, i * 120);
        }
      });
    }
  }, [activeIndices, backtrackPath]);

  // Handle 1D Mode
  if (mode === '1D' && array.length > 0) {
    const maxVal = Math.max(...array, 1);
    const displaySubtitle = subtitle || `${array.length} cells`;

    return (
      <div className="shared-canvas-container animate-fade-in" ref={containerRef}>
        <div className="shared-canvas-header">
          <div className="canvas-header-left">
            <span className="shared-canvas-title">{title}</span>
            <span className="shared-canvas-subtitle">{displaySubtitle}</span>
          </div>
          {onToggleFullscreen && (
            <button className="fullscreen-toggle-btn" onClick={onToggleFullscreen} title="Full Screen">
              <Maximize2 size={14} />
              <span>Fullscreen</span>
            </button>
          )}
        </div>

        <div className="grid2d-workspace">
          <div className="grid2d-1d-row">
            {array.map((val, idx) => {
              const isActive = activeIndices.includes(idx);
              const isComputed = computedIndices.includes(idx);
              const isBacktrack = backtrackPath.includes(idx);
              const isDep = cellDependencies.includes(idx);

              let cellClass = 'grid2d-1d-cell';
              if (isBacktrack) cellClass += ' is-backtrack';
              else if (isActive) cellClass += ' is-active';
              else if (isDep) cellClass += ' cell-dependency';
              else if (isComputed) cellClass += ' is-computed';

              return (
                <div key={idx} className={cellClass}>
                  <span className="grid2d-cell-val">{val}</span>
                  <span className="grid2d-cell-idx">[{idx}]</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Handle 2D Mode
  const effectiveRows = grid.length > 0 ? grid.length : rows;
  const effectiveCols = grid.length > 0 && grid[0] ? grid[0].length : cols;
  const displaySubtitle = subtitle || `${effectiveRows} \u00d7 ${effectiveCols}`;

  // Flatten grid values if array not provided directly
  const flatValues: number[] = [];
  if (grid.length > 0) {
    grid.forEach(row => flatValues.push(...row));
  } else if (array.length > 0) {
    flatValues.push(...array);
  } else {
    for (let r = 0; r < effectiveRows; r++) {
      for (let c = 0; c < effectiveCols; c++) {
        flatValues.push(0);
      }
    }
  }

  const maxVal = Math.max(...flatValues, 1);

  return (
    <div className="shared-canvas-container animate-fade-in" ref={containerRef}>
      <div className="shared-canvas-header">
        <div className="canvas-header-left">
          <span className="shared-canvas-title">{title}</span>
          <span className="shared-canvas-subtitle">{displaySubtitle}</span>
        </div>
        {onToggleFullscreen && (
          <button className="fullscreen-toggle-btn" onClick={onToggleFullscreen} title="Full Screen">
            <Maximize2 size={14} />
            <span>Fullscreen</span>
          </button>
        )}
      </div>

      <div className="grid2d-workspace">
        <div className={`grid2d-2d-matrix ${isChessboard ? 'grid2d-chessboard' : ''}`}>
          {/* Column Header Row */}
          <div
            className="grid2d-row-header-wrap"
            style={{ gridTemplateColumns: `44px repeat(${effectiveCols}, 48px)` }}
          >
            <div className="grid2d-corner-cell" />
            {Array.from({ length: effectiveCols }, (_, c) => (
              <div key={c} className="grid2d-col-header">
                {colLabels[c] !== undefined ? colLabels[c] : c}
              </div>
            ))}
          </div>

          {/* Grid Rows */}
          {Array.from({ length: effectiveRows }, (_, r) => (
            <div
              key={r}
              className="grid2d-row-header-wrap"
              style={{ gridTemplateColumns: `44px repeat(${effectiveCols}, 48px)`, marginTop: '4px' }}
            >
              <div className="grid2d-row-header">
                {rowLabels[r] !== undefined ? rowLabels[r] : r}
              </div>
              {Array.from({ length: effectiveCols }, (_, c) => {
                const linearIdx = r * effectiveCols + c;
                const val = flatValues[linearIdx] ?? 0;
                const isActive = activeIndices.includes(linearIdx);
                const isComputed = computedIndices.includes(linearIdx);
                const isBacktrack = backtrackPath.includes(linearIdx);
                const isDep = cellDependencies.includes(linearIdx);
                const hasQueen = queenPositions.some(([qr, qc]) => qr === r && qc === c);
                const isDarkSq = (r + c) % 2 === 1;

                let cellClass = 'grid2d-matrix-cell';
                if (isDarkSq) cellClass += ' dark-sq';
                if (isBacktrack) cellClass += ' cell-backtrack';
                else if (isActive) cellClass += ' cell-active';
                else if (isDep) cellClass += ' cell-dependency';
                else if (isComputed) cellClass += ' cell-computed';

                return (
                  <div key={c} className={cellClass}>
                    {hasQueen ? (
                      <Crown className="grid2d-queen-icon" size={24} />
                    ) : (
                      <span>{val}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
