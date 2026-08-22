import React from 'react';
import { Bar } from '../../components/primitives/Bar';
import type { ArrayStep, ElementState } from '../../engine/types/Step';
import './Sorting.css';

interface SortingRendererProps {
  currentStep: ArrayStep | null;
  maxValue?: number;
}

export const SortingRenderer: React.FC<SortingRendererProps> = ({
  currentStep,
  maxValue = 100,
}) => {
  if (!currentStep) {
    return (
      <div className="sorting-canvas-empty">
        <span>No array data available</span>
      </div>
    );
  }

  const { array, comparingIndices = [], swappingIndices = [], sortedIndices = [], pivotIndex } = currentStep;
  const max = Math.max(maxValue, ...array, 1);

  const getElementState = (index: number): ElementState => {
    if (swappingIndices.includes(index)) return 'swapping';
    if (comparingIndices.includes(index)) return 'comparing';
    if (pivotIndex === index) return 'pivot';
    if (sortedIndices.includes(index)) return 'sorted';
    return 'default';
  };

  return (
    <div className="sorting-canvas-container animate-fade-in">
      <div className="bars-canvas">
        {array.map((value, index) => {
          const heightPercent = (value / max) * 100;
          const state = getElementState(index);

          return (
            <Bar
              key={index}
              value={value}
              heightPercent={heightPercent}
              state={state}
              showValue={array.length <= 25}
            />
          );
        })}
      </div>
    </div>
  );
};
