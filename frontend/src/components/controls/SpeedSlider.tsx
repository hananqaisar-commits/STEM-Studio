import React from 'react';
import { Gauge } from 'lucide-react';
import './Controls.css';
import { useVisualizerControlsEnabled } from '../../hooks/visualizerControls';

interface SpeedSliderProps {
  speed: number;
  onSpeedChange: (newSpeed: number) => void;
  disabled?: boolean;
}

export const SpeedSlider: React.FC<SpeedSliderProps> = ({
  speed,
  onSpeedChange,
  disabled = false,
}) => {
  const controlsEnabled = useVisualizerControlsEnabled();
  const isDisabled = disabled || !controlsEnabled;
  return (
    <div className={`speed-slider-wrapper ${isDisabled ? 'is-disabled' : ''}`}>
      <Gauge size={16} className="speed-icon" />
      <span className="speed-label">{speed}x</span>
      <input
        type="range"
        min="0.25"
        max="4"
        step="0.25"
        value={speed}
        onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
        disabled={isDisabled}
        aria-label="Playback speed"
        className="speed-range-input"
      />
    </div>
  );
};
