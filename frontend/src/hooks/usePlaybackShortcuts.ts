import { useEffect, useCallback } from 'react';

export interface PlaybackShortcutHandlers {
  /** Toggle play / pause. */
  onTogglePlay?: () => void;
  /** Reset to step 0 and pause. */
  onReset?: () => void;
  /** Move one step forward. */
  onStepForward?: () => void;
  /** Move one step backward. */
  onStepBack?: () => void;
  /** Stop: pause and reset to step 0. */
  onStop?: () => void;
  /** Resume from current step. */
  onResume?: () => void;
}

export interface UsePlaybackShortcutsOptions {
  handlers: PlaybackShortcutHandlers;
  /** Disable shortcuts, e.g. while a modal/input is focused. */
  disabled?: boolean;
}

/**
 * Global keyboard shortcuts for the visualizer playback.
 *
 * Space / K      → toggle play/pause
 * ArrowRight / L → step forward
 * ArrowLeft / J  → step back
 * R              → reset
 * S              → stop
 * Enter          → resume
 */
export function usePlaybackShortcuts({ handlers, disabled = false }: UsePlaybackShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (disabled) return;

      // Ignore shortcuts when the user is typing in an input, textarea, or contentEditable.
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tagName = target.tagName.toLowerCase();
      const isEditable =
        tagName === 'input' ||
        tagName === 'textarea' ||
        target.isContentEditable ||
        target.getAttribute('role') === 'textbox';
      if (isEditable) return;

      const key = event.key;
      let handled = true;

      switch (key) {
        case ' ':
        case 'k':
        case 'K':
          event.preventDefault();
          handlers.onTogglePlay?.();
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          event.preventDefault();
          handlers.onStepForward?.();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          event.preventDefault();
          handlers.onStepBack?.();
          break;
        case 'r':
        case 'R':
          handlers.onReset?.();
          break;
        case 's':
        case 'S':
          handlers.onStop?.();
          break;
        case 'Enter':
          handlers.onResume?.();
          break;
        default:
          handled = false;
      }

      if (handled) {
        event.stopPropagation();
      }
    },
    [handlers, disabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
