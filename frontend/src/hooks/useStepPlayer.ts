import { useState, useEffect, useRef, useCallback } from 'react';
import {
  enableVisualizerControls,
  getVisualizerControlsEnabled,
  hasRecentVisualizerIntent,
} from './visualizerControls';

interface UseStepPlayerProps<T> {
  steps: T[];
  initialSpeed?: number; // steps per second or delay multiplier
  onFinish?: () => void;
}

export function useStepPlayer<T>({ steps, initialSpeed = 1, onFinish }: UseStepPlayerProps<T>) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(initialSpeed); // 0.25 to 4

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousStepsRef = useRef<T[] | null>(null);

  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex] || null;

  useEffect(() => {
    const previousSteps = previousStepsRef.current;
    previousStepsRef.current = steps;
    if (steps.length > 0 && previousSteps && previousSteps !== steps && (hasRecentVisualizerIntent() || window.location.search.includes('resumeSession='))) {
      enableVisualizerControls();
    }
  }, [steps]);

  const play = useCallback(() => {
    if (!getVisualizerControlsEnabled()) {
      if (!hasRecentVisualizerIntent()) return;
      enableVisualizerControls();
    }
    if (currentStepIndex >= totalSteps - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying(true);
  }, [currentStepIndex, totalSteps]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stepForward = useCallback(() => {
    if (!getVisualizerControlsEnabled()) return;
    setCurrentStepIndex((prev) => {
      if (prev < totalSteps - 1) {
        return prev + 1;
      }
      setIsPlaying(false);
      return prev;
    });
  }, [totalSteps]);

  const stepBack = useCallback(() => {
    if (!getVisualizerControlsEnabled()) return;
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const reset = useCallback(() => {
    if (!getVisualizerControlsEnabled()) return;
    pause();
    setCurrentStepIndex(0);
  }, [pause]);

  const seekTo = useCallback((index: number) => {
    if (!getVisualizerControlsEnabled()) return;
    const validIndex = Math.max(0, Math.min(totalSteps - 1, index));
    setCurrentStepIndex(validIndex);
  }, [totalSteps]);

  const setSpeed = useCallback((nextSpeed: number) => {
    if (!getVisualizerControlsEnabled()) return;
    setSpeedState(nextSpeed);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      if (currentStepIndex >= totalSteps - 1) {
        setIsPlaying(false);
        if (onFinish) onFinish();
        return;
      }

      // Calculate interval in ms based on speed (base 500ms / speed)
      const interval = Math.max(50, 500 / speed);

      timerRef.current = setTimeout(() => {
        setCurrentStepIndex((prev) => prev + 1);
      }, interval);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, currentStepIndex, totalSteps, speed, onFinish]);

  return {
    currentStepIndex,
    currentStep,
    totalSteps,
    isPlaying,
    speed,
    play,
    pause,
    stepForward,
    stepBack,
    reset,
    seekTo,
    setSpeed,
  };
}
