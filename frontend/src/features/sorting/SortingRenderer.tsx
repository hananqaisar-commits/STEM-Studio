import React, { useState } from 'react';
import { Bar } from '../../components/primitives/Bar';
import { TreeRenderer } from './TreeRenderer';
import type { ArrayStep, ElementState } from '../../engine/types/Step';
import './Sorting.css';

interface SortingRendererProps {
  currentStep: ArrayStep | null;
  algorithmKey?: string;
  viewMode?: 'bars' | 'tree';
  maxValue?: number;
  onElementClick?: (index: number, currentValue: number) => void;
}

export const SortingRenderer: React.FC<SortingRendererProps> = ({
  currentStep,
  algorithmKey = 'bubble',
  viewMode = 'bars',
  maxValue = 100,
  onElementClick,
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
        <span>No array data available</span>
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

  return (
    <div className="sorting-canvas-container animate-fade-in">
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
