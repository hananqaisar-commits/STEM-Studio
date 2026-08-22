import React from 'react';
import { Play, Pause } from 'lucide-react';
import './Controls.css';

interface PlayPauseButtonProps {
  isPlaying: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const PlayPauseButton: React.FC<PlayPauseButtonProps> = ({
  isPlaying,
  onToggle,
  disabled = false,
}) => {
  return (
    <button
      className={`control-btn play-pause-btn ${isPlaying ? 'is-playing' : ''}`}
      onClick={onToggle}
      disabled={disabled}
      aria-label={isPlaying ? 'Pause execution' : 'Play execution'}
    >
      {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
    </button>
  );
};
