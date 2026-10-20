import React from 'react';
import { Bar } from '../../components/primitives/Bar';
import { TreeRenderer } from './TreeRenderer';
import { Maximize2 } from 'lucide-react';
import type { ArrayStep, ElementState } from '../../engine/types/Step';
import './Sorting.css';
import { useBarMotion } from './useBarMotion';

interface SortingRendererProps {
  currentStep: ArrayStep | null;
  algorithmKey?: string;
  viewMode?: 'bars' | 'tree';
  maxValue?: number;
  currentStepIndex?: number;
  totalSteps?: number;
  onElementClick?: (index: number, currentValue: number) => void;
  onToggleFullscreen?: () => void;
}

export const SortingRenderer: React.FC<SortingRendererProps> = ({
  currentStep,
  algorithmKey = 'bubble',
  viewMode = 'bars',
  maxValue = 100,
  currentStepIndex = 0,
  totalSteps = 0,
  onElementClick,
  onToggleFullscreen,
}) => {
  const { canvasRef, barIds } = useBarMotion(currentStep?.array ?? []);
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
  const action = currentStep.operation
    ?? (swappingIndices.length ? 'write / swap' : comparingIndices.length ? 'compare' : pivotIndex !== undefined ? 'select pivot' : 'inspect');
  const activeIndices = [...new Set([...comparingIndices, ...swappingIndices, ...(pivotIndex === undefined ? [] : [pivotIndex])])];
  const visibleVariables = Object.entries(variables).filter(([, value]) => value !== null).slice(0, 5);
  const auxiliaryLanes = currentStep.auxiliaryLanes;

  const getElementState = (index: number): ElementState => {
    if (swappingIndices.includes(index)) return 'swapping';
    if (comparingIndices.includes(index)) return 'comparing';
    if (currentStep.writeIndex === index) return 'selected';
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

      <section className="sorting-step-inspector" aria-live="polite" aria-label="Current sorting operation">
        <div className="sorting-step-inspector-top">
          <span className="sorting-operation-badge">{action}</span>
          <span className="sorting-step-counter">Step {currentStepIndex + 1}{totalSteps > 0 ? ` / ${totalSteps}` : ''}</span>
        </div>
        <p>{currentStep.description}</p>
        <div className="sorting-step-details">
          {currentStep.activeRange && (
            <span className="sorting-variable-chip">active range [{currentStep.activeRange.start}, {currentStep.activeRange.end}]</span>
          )}
          {activeIndices.map((index) => (
            <span className="sorting-step-value" key={index}>arr[{index}] = {array[index]}</span>
          ))}
          {currentStep.heldValue !== undefined && currentStep.heldValue !== null && (
            <span className="sorting-held-value">Held key = {currentStep.heldValue}</span>
          )}
          {currentStep.writeIndex !== undefined && (
            <span className="sorting-variable-chip">write arr[{currentStep.writeIndex}]{currentStep.writeValue === undefined ? '' : ` = ${currentStep.writeValue}`}</span>
          )}
          {visibleVariables.map(([name, value]) => (
            <span className="sorting-variable-chip" key={name}>{name} = {String(value)}</span>
          ))}
        </div>
      </section>

      {auxiliaryLanes && (
        <section className="sorting-auxiliary-workspace" aria-label="Merge sort temporary buffers">
          <div className="sorting-auxiliary-heading">TEMPORARY MERGE BUFFERS <span>copied from the active range before merging</span></div>
          <div className="sorting-auxiliary-lanes">
            {auxiliaryLanes.map((lane) => (
              <div className="sorting-auxiliary-lane" key={lane.label}>
                <span className="sorting-auxiliary-label">{lane.label}</span>
                <div className="sorting-auxiliary-cells">
                  {lane.values.map((value, index) => (
                    <div className={`sorting-auxiliary-cell${lane.activeIndex === index ? ' is-active' : ''}`} key={`${lane.sourceStart + index}-${index}`}>
                      <strong>{value}</strong>
                      <small>arr[{lane.sourceStart + index}]</small>
                    </div>
                  ))}
                  {lane.values.length === 0 && <span className="sorting-auxiliary-empty">empty</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div ref={canvasRef} className="bars-canvas">
        {array.map((value, index) => {
          const heightPercent = (value / max) * 100;
          const state = getElementState(index);
          const pointer = getPointerLabel(index);

          return (
            <div
              key={barIds[index]}
              className={[
                'interactive-bar-wrapper',
                currentStep.activeRange && index >= currentStep.activeRange.start && index <= currentStep.activeRange.end ? 'sorting-active-range-cell' : '',
                currentStep.writeIndex === index ? 'sorting-write-target' : '',
              ].filter(Boolean).join(' ')}
              data-bar-id={barIds[index]}
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
