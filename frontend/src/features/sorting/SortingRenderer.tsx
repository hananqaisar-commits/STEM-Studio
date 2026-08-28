import React from 'react';
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
              {array.length <= 30 && (
                <span className="bar-index-label">[{index}]</span>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
