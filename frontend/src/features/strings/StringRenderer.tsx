import React, { useEffect, useRef } from 'react';
import { Maximize2 } from 'lucide-react';
import type { ArrayStep, ElementState } from '../../engine/types/Step';
import '../sorting/Sorting.css';
import './Strings.css';
import { MotionPresets } from '../../engine/motionEngine';

interface StringRendererProps {
  currentStep: ArrayStep | null;
  originalString?: string;
  onToggleFullscreen?: () => void;
}

export const StringRenderer: React.FC<StringRendererProps> = ({ currentStep, originalString: _originalString, onToggleFullscreen }) => {
  const cellsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!currentStep || !cellsRef.current) return;
    const cells = Array.from(cellsRef.current.querySelectorAll<HTMLElement>('.string-cell'));
    const [first, second] = currentStep.comparingIndices ?? [];
    if (first !== undefined && cells[first]) MotionPresets.pointerConverge(cells[first], second === undefined ? cells[first] : cells[second], { xA: first === second ? 0 : 4, xB: second === undefined || first === second ? 0 : -4 });
    currentStep.sortedIndices?.forEach(index => { if (cells[index]) MotionPresets.flashState(cells[index], '16,185,129'); });
    const [swapA, swapB] = currentStep.swappingIndices ?? [];
    if (swapA !== undefined && cells[swapA]) MotionPresets.liftShiftDrop(cells[swapA], 34);
    if (swapB !== undefined && cells[swapB]) MotionPresets.liftShiftDrop(cells[swapB], -34);
  }, [currentStep]);
  if (!currentStep) return <div className="sorting-canvas-empty"><span>No string data</span></div>;

  const { array, comparingIndices = [], swappingIndices = [], sortedIndices = [] } = currentStep;
  const chars = array.map(code => String.fromCharCode(code));

  const getState = (i: number): ElementState => {
    if (swappingIndices.includes(i)) return 'swapping';
    if (comparingIndices.includes(i)) return 'comparing';
    if (sortedIndices.includes(i)) return 'sorted';
    return 'default';
  };

  return (
    <div className="sorting-canvas-container animate-fade-in">
      <div className="sorting-canvas-header">
        <div className="canvas-header-left">
          <span className="bst-title">STRING CANVAS</span>
          <span className="bst-subtitle">{chars.length} characters</span>
        </div>
        {onToggleFullscreen && (
          <button className="fullscreen-toggle-btn" onClick={onToggleFullscreen}>
            <Maximize2 size={14} />
            <span>Fullscreen</span>
          </button>
        )}
      </div>
      <div ref={cellsRef} className="string-cells-canvas">
        {chars.map((char, i) => (
          <div key={i} className={`string-cell state-${getState(i)}`}>
            <span className="cell-char">{char}</span>
            <span className="cell-index">{i}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
