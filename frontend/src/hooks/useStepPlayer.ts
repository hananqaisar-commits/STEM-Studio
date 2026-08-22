import { useState, useEffect, useRef, useCallback } from 'react';

interface UseStepPlayerProps<T> {
  steps: T[];
  initialSpeed?: number; // steps per second or delay multiplier
  onFinish?: () => void;
}

export function useStepPlayer<T>({ steps, initialSpeed = 1, onFinish }: UseStepPlayerProps<T>) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed); // 0.25 to 4

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalSteps = steps.length;
  const currentStep = steps[currentStepIndex] || null;

  const play = useCallback(() => {
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
    setCurrentStepIndex((prev) => {
      if (prev < totalSteps - 1) {
        return prev + 1;
      }
      setIsPlaying(false);
      return prev;
    });
  }, [totalSteps]);

  const stepBack = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const reset = useCallback(() => {
    pause();
    setCurrentStepIndex(0);
  }, [pause]);

  const seekTo = useCallback((index: number) => {
    const validIndex = Math.max(0, Math.min(totalSteps - 1, index));
    setCurrentStepIndex(validIndex);
  }, [totalSteps]);

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
