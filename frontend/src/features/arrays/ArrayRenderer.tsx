import React, { useEffect, useRef } from 'react';
import { Bar } from '../../components/primitives/Bar';
import { Maximize2 } from 'lucide-react';
import type { ArrayStep, ElementState } from '../../engine/types/Step';
import '../sorting/Sorting.css';
import { MotionPresets } from '../../engine/motionEngine';

interface ArrayRendererProps {
  currentStep: ArrayStep | null;
  onElementClick?: (index: number, currentValue: number) => void;
  onToggleFullscreen?: () => void;
}

export const ArrayRenderer: React.FC<ArrayRendererProps> = ({
  currentStep,
  onElementClick,
  onToggleFullscreen,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!currentStep || !canvasRef.current) return;
    const bars = Array.from(canvasRef.current.querySelectorAll<HTMLElement>('.interactive-bar-wrapper'));
    const [first, second] = currentStep.comparingIndices ?? [];
    if (first !== undefined && bars[first]) MotionPresets.pulseCompare(bars[first], second === undefined ? undefined : bars[second]);
    const [swapA, swapB] = currentStep.swappingIndices ?? [];
    if (swapA !== undefined && bars[swapA]) MotionPresets.liftShiftDrop(bars[swapA], 28);
    if (swapB !== undefined && bars[swapB]) MotionPresets.liftShiftDrop(bars[swapB], -28);
  }, [currentStep]);
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

  const { array, comparingIndices = [], swappingIndices = [], sortedIndices = [], pivotIndex } = currentStep;
  const max = Math.max(...array, 1);

  const getElementState = (index: number): ElementState => {
    if (swappingIndices.includes(index)) return 'swapping';
    if (comparingIndices.includes(index)) return 'comparing';
    if (pivotIndex === index) return 'pivot';
    if (sortedIndices.includes(index)) return 'sorted';
    return 'default';
  };

  return (
    <div className="sorting-canvas-container animate-fade-in">
      <div className="sorting-canvas-header">
        <div className="canvas-header-left">
          <span className="bst-title">ARRAY CANVAS</span>
          <span className="bst-subtitle">{array.length} elements</span>
        </div>
        {onToggleFullscreen && (
          <button className="fullscreen-toggle-btn" onClick={onToggleFullscreen} title="Full Screen">
            <Maximize2 size={14} />
            <span>Fullscreen</span>
          </button>
        )}
      </div>
      <div ref={canvasRef} className="bars-canvas">
        {array.map((value, index) => {
          const heightPercent = (value / max) * 100;
          const state = getElementState(index);
          return (
            <div
              key={index}
              className="interactive-bar-wrapper"
              onClick={() => onElementClick?.(index, value)}
            >
              <Bar value={value} heightPercent={heightPercent} state={state} showValue={array.length <= 25} />
              {array.length <= 30 && <span className="bar-index-label">[{index}]</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};
