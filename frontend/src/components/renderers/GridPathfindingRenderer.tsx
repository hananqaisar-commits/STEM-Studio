import React from 'react';
import type { AStarCell, AStarStep } from '../../features/graph/graphEngine';

interface GridPathfindingRendererProps {
  step: AStarStep | null;
  onToggleFullscreen?: () => void;
}

/** Cell size in px */
const CELL_SIZE = 48;

const CELL_STYLES: Record<AStarCell['type'] | AStarCell['state'], React.CSSProperties> = {
  // Type-based (base)
  wall:      { background: '#1e293b', border: '1px solid #334155' },
  start:     { background: '#0f4a80', border: '2px solid #38bdf8' },
  goal:      { background: '#14532d', border: '2px solid #4ade80' },
  empty:     { background: 'var(--color-surface)', border: '1px solid var(--color-border)' },
  // State-based (overlay)
  unvisited: {},
  open:      { background: '#1c3a5e', border: '2px solid #60a5fa' },
  closed:    { background: '#2d1b69', border: '1px solid #7c3aed' },
  path:      { background: '#064e3b', border: '2px solid #10b981' },
  current:   { background: '#7c1b1b', border: '2px solid #f87171' },
};

function cellStyle(cell: AStarCell): React.CSSProperties {
  const base = CELL_STYLES[cell.type] ?? {};
  if (cell.type === 'wall') return base;
  if (cell.type === 'start') return base;
  if (cell.type === 'goal') return base;
  const stateOverride = CELL_STYLES[cell.state] ?? {};
  return { ...base, ...stateOverride };
}

export const GridPathfindingRenderer: React.FC<GridPathfindingRendererProps> = ({
  step,
  onToggleFullscreen,
}) => {
  if (!step) {
    return (
      <div className="bst-canvas-container animate-fade-in">
        <div className="bst-canvas-header">
          <div className="canvas-header-left">
            <span className="bst-title">A* PATHFINDING CANVAS</span>
            <span className="bst-subtitle">Click Run to start A* Search</span>
          </div>
        </div>
        <div className="bst-canvas-empty" style={{ minHeight: 300 }}>
          <div className="empty-canvas-content">
            <span style={{ fontWeight: 600, opacity: 0.7 }}>Press Run to start A* Search</span>
          </div>
        </div>
      </div>
    );
  }

  const { grid, openSet, closedSet, currentCell, path, phase, found, unreachable } = step;

  const gridWidth = (grid[0]?.length ?? 0) * CELL_SIZE;

  return (
    <div className="bst-canvas-container animate-fade-in">
      <div className="bst-canvas-header">
        <div className="canvas-header-left">
          <span className="bst-title">A* PATHFINDING CANVAS</span>
          <span className="bst-subtitle">
            {found && (
              <span style={{ color: '#4ade80', fontWeight: 700 }}>
                PATH FOUND · Length {path.length}
              </span>
            )}
            {unreachable && (
              <span style={{ color: '#f87171', fontWeight: 700 }}>
                UNREACHABLE
              </span>
            )}
            {!found && !unreachable && (
              <span>
                Open: {openSet.length} · Closed: {closedSet.length}
              </span>
            )}
          </span>
        </div>
        {onToggleFullscreen && (
          <button
            className="fullscreen-toggle-btn"
            onClick={onToggleFullscreen}
            title="Fullscreen"
          >
            <span>⛶ Fullscreen</span>
          </button>
        )}
      </div>

      <div
        className="bst-canvas-workspace"
        style={{ overflowX: 'auto', padding: '12px 16px' }}
      >
        {/* Phase banner */}
        {currentCell && (
          <div
            style={{
              marginBottom: '8px',
              padding: '6px 12px',
              borderRadius: '6px',
              background: '#1e293b',
              border: '1px solid #334155',
              fontSize: '0.75rem',
              color: 'var(--color-text-secondary)',
              fontFamily: 'monospace',
            }}
          >
            <span style={{ color: '#f87171', fontWeight: 700 }}>CURRENT: {currentCell}</span>
            {step.grid.flat().find((c) => c.id === currentCell)?.g !== undefined && (
              <span style={{ marginLeft: '12px' }}>
                g={step.grid.flat().find((c) => c.id === currentCell)?.g}
                {' '}h={step.grid.flat().find((c) => c.id === currentCell)?.h}
                {' '}f={step.grid.flat().find((c) => c.id === currentCell)?.f}
              </span>
            )}
          </div>
        )}

        {/* Grid */}
        <div
          style={{
            display: 'inline-flex',
            flexDirection: 'column',
            gap: '2px',
            minWidth: `${gridWidth}px`,
          }}
        >
          {grid.map((row, ri) => (
            <div key={ri} style={{ display: 'flex', gap: '2px' }}>
              {row.map((cell) => {
                const isCurrent = cell.id === currentCell;
                const isPath = path.includes(cell.id);
                const cs = cellStyle({
                  ...cell,
                  state: isPath && cell.type !== 'start' && cell.type !== 'goal' ? 'path' : cell.state,
                });

                return (
                  <div
                    key={cell.id}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: '5px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      transition: 'background 0.2s, border-color 0.2s',
                      flexShrink: 0,
                      ...cs,
                    }}
                    title={`Cell ${cell.id}${cell.g !== undefined ? ` g=${cell.g} h=${cell.h} f=${cell.f}` : ''}`}
                  >
                    {/* Cell type icons */}
                    {cell.type === 'start' && (
                      <span style={{ fontSize: '1rem', lineHeight: 1 }}>🟦</span>
                    )}
                    {cell.type === 'goal' && (
                      <span style={{ fontSize: '1rem', lineHeight: 1 }}>🎯</span>
                    )}
                    {cell.type === 'wall' && (
                      <span style={{ fontSize: '0.9rem', lineHeight: 1, opacity: 0.5 }}>▪</span>
                    )}

                    {/* g/h/f values for open/closed/current cells */}
                    {cell.type === 'empty' && cell.f !== undefined && (
                      <>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: isCurrent ? '#f87171' : '#60a5fa',
                            lineHeight: 1,
                          }}
                        >
                          f={cell.f}
                        </span>
                        <div
                          style={{
                            display: 'flex',
                            gap: '2px',
                            fontSize: '0.52rem',
                            fontFamily: 'monospace',
                            color: 'var(--color-text-muted)',
                            lineHeight: 1,
                          }}
                        >
                          <span>g{cell.g}</span>
                          <span>h{cell.h}</span>
                        </div>
                      </>
                    )}

                    {/* Path cell indicator */}
                    {isPath && cell.type === 'empty' && (
                      <span style={{ fontSize: '0.8rem' }}>●</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          {[
            { label: 'Start', color: '#38bdf8', bg: '#0f4a80' },
            { label: 'Goal', color: '#4ade80', bg: '#14532d' },
            { label: 'Current', color: '#f87171', bg: '#7c1b1b' },
            { label: 'Open Set', color: '#60a5fa', bg: '#1c3a5e' },
            { label: 'Closed Set', color: '#7c3aed', bg: '#2d1b69' },
            { label: 'Path', color: '#10b981', bg: '#064e3b' },
            { label: 'Wall', color: '#334155', bg: '#1e293b' },
          ].map(({ label, color, bg }) => (
            <div
              key={label}
              style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.7rem' }}
            >
              <div
                style={{
                  width: 12, height: 12, borderRadius: 3,
                  background: bg, border: `1.5px solid ${color}`,
                }}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
            </div>
          ))}
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: 'auto' }}>
            f = g + h · g=cost from start · h=Manhattan to goal
          </div>
        </div>
      </div>
    </div>
  );
};
