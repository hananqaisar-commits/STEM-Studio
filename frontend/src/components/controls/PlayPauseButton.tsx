import React from 'react';
import { Play, Pause } from 'lucide-react';
import './Controls.css';
import { useVisualizerControlsEnabled } from '../../hooks/visualizerControls';

interface PlayPauseButtonProps {
  isPlaying: boolean;
  onToggle?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  disabled?: boolean;
}

export const PlayPauseButton: React.FC<PlayPauseButtonProps> = ({
  isPlaying,
  onToggle,
  onPlay,
  onPause,
  disabled = false,
}) => {
  const controlsEnabled = useVisualizerControlsEnabled();
  const isDisabled = disabled || !controlsEnabled;
  const handleClick = () => {
    if (isDisabled) return;
    if (onToggle) {
      onToggle();
    } else if (isPlaying && onPause) {
      onPause();
    } else if (!isPlaying && onPlay) {
      onPlay();
    }
  };

  return (
    <button
      className={`control-btn play-pause-btn ${isPlaying ? 'is-playing' : ''}`}
      onClick={handleClick}
      disabled={isDisabled}
      title={isDisabled ? 'Run or build an algorithm trace to enable playback controls.' : isPlaying ? 'Pause execution (Space)' : 'Play execution (Space)'}
      aria-label={isPlaying ? 'Pause execution (Space)' : 'Play execution (Space)'}
    >
      {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
    </button>
  );
};
