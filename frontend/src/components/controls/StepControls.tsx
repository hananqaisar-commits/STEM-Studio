import React from 'react';
import { SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import './Controls.css';

interface StepControlsProps {
  onStepBack: () => void;
  onStepForward: () => void;
  onReset: () => void;
  canStepBack: boolean;
  canStepForward: boolean;
  disabled?: boolean;
}

export const StepControls: React.FC<StepControlsProps> = ({
  onStepBack,
  onStepForward,
  onReset,
  canStepBack,
  canStepForward,
  disabled = false,
}) => {
  return (
    <div className="step-controls-group">
      <button
        className="control-btn"
        onClick={onReset}
        disabled={disabled}
        title="Reset algorithm (R)"
        aria-label="Reset algorithm (R)"
      >
        <RotateCcw size={18} />
      </button>

      <button
        className="control-btn"
        onClick={onStepBack}
        disabled={disabled || !canStepBack}
        title="Step Backward (←)"
        aria-label="Step Backward (←)"
      >
        <SkipBack size={18} />
      </button>

      <button
        className="control-btn"
        onClick={onStepForward}
        disabled={disabled || !canStepForward}
        title="Step Forward (→)"
        aria-label="Step Forward (→)"
      >
        <SkipForward size={18} />
      </button>
    </div>
  );
};
