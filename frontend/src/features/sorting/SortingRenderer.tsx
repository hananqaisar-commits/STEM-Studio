import React, { useState } from 'react';
import { Bar } from '../../components/primitives/Bar';
import { TreeRenderer } from './TreeRenderer';
import { Maximize2 } from 'lucide-react';
import type { ArrayStep, ElementState } from '../../engine/types/Step';
import './Sorting.css';

interface SortingRendererProps {
  currentStep: ArrayStep | null;
  algorithmKey?: string;
  viewMode?: 'bars' | 'tree';
  maxValue?: number;
  onElementClick?: (index: number, currentValue: number) => void;
  onToggleFullscreen?: () => void;
}

export const SortingRenderer: React.FC<SortingRendererProps> = ({
  currentStep,
  algorithmKey = 'bubble',
  viewMode = 'bars',
  maxValue = 100,
  onElementClick,
  onToggleFullscreen,
}) => {
  const [hoveredInfo, setHoveredInfo] = useState<{
    index: number;
    value: number;
    state: ElementState;
    pointer?: string;
    x: number;
    y: number;
  } | null>(null);

  if (!currentStep) {
    return (
      <div className="sorting-canvas-empty">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.35, marginBottom: '0.5rem' }}>
            <rect x="4" y="24" width="7" height="16" rx="2" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <rect x="14" y="14" width="7" height="26" rx="2" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <rect x="24" y="8" width="7" height="32" rx="2" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <rect x="34" y="18" width="7" height="22" rx="2" stroke="#64748b" strokeWidth="1.5" fill="none" />
          </svg>
          <span style={{ fontWeight: 600, opacity: 0.7 }}>No array data available</span>
          <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>Generate an array to begin visualization</span>
        </div>
      </div>
    );
  }

  // Render Tree View if viewMode is 'tree'
  if (viewMode === 'tree') {
    return (
      <TreeRenderer
        currentStep={currentStep}
        algorithmKey={algorithmKey}
        onElementClick={onElementClick}
      />
    );
  }

  const { array, comparingIndices = [], swappingIndices = [], sortedIndices = [], pivotIndex, variables = {} } = currentStep;
  const max = Math.max(maxValue, ...array, 1);

  const getElementState = (index: number): ElementState => {
    if (swappingIndices.includes(index)) return 'swapping';
    if (comparingIndices.includes(index)) return 'comparing';
    if (pivotIndex === index) return 'pivot';
    if (sortedIndices.includes(index)) return 'sorted';
    return 'default';
  };

  const getPointerLabel = (index: number): string | undefined => {
    const labels: string[] = [];
    if (pivotIndex === index) labels.push('pivot');
    if (variables.i === index) labels.push('i');
    if (variables.j === index) labels.push('j');
    if (variables.minIdx === index) labels.push('minIdx');
    return labels.length > 0 ? labels.join(', ') : undefined;
  };

  const handleBarMouseMove = (e: React.MouseEvent, index: number, value: number, state: ElementState) => {
    const pointer = getPointerLabel(index);
    setHoveredInfo({
      index,
      value,
      state,
      pointer,
      x: e.clientX,
      y: e.clientY - 40,
    });
  };

  const sortedCount = sortedIndices.length;

  return (
    <div className="sorting-canvas-container animate-fade-in">
      <div className="sorting-canvas-header">
        <div className="canvas-header-left">
          <span className="bst-title">MEMORY ARRAY CANVAS</span>
          <span className="bst-subtitle">{array.length} elements · {sortedCount} sorted</span>
        </div>

        {onToggleFullscreen && (
          <button
            className="fullscreen-toggle-btn"
            onClick={onToggleFullscreen}
            title="Enter Full Screen Interactive Mode"
          >
            <Maximize2 size={14} />
            <span>Fullscreen</span>
          </button>
        )}
      </div>

      <div className="bars-canvas">
        {array.map((value, index) => {
          const heightPercent = (value / max) * 100;
          const state = getElementState(index);
          const pointer = getPointerLabel(index);

          return (
            <div
              key={index}
              className="interactive-bar-wrapper"
              onMouseMove={(e) => handleBarMouseMove(e, index, value, state)}
              onMouseLeave={() => setHoveredInfo(null)}
              onClick={() => onElementClick && onElementClick(index, value)}
              title="Click to edit value"
            >
              {pointer && <span className="canvas-pointer-badge">{pointer}</span>}
              <Bar
                value={value}
                heightPercent={heightPercent}
                state={state}
                showValue={array.length <= 25}
              />
            </div>
          );
        })}
      </div>

      {/* Memory Hover Tooltip Card */}
      {hoveredInfo && (
        <div
          className="canvas-memory-inspect-card animate-fade-in"
          style={{ left: `${hoveredInfo.x}px`, top: `${hoveredInfo.y}px` }}
        >
          <div className="inspect-header">
            <span>INDEX [{hoveredInfo.index}]</span>
            <span className={`inspect-state state-${hoveredInfo.state}`}>{hoveredInfo.state.toUpperCase()}</span>
          </div>
          <div className="inspect-body">
            <span>VALUE: <strong>{hoveredInfo.value}</strong></span>
            {hoveredInfo.pointer && (
              <span>POINTER: <strong className="pointer-highlight">{hoveredInfo.pointer}</strong></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
