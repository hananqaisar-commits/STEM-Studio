import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import type { MascotApi, MascotExpression, MascotState } from './MascotState';
import { DEFAULT_MASCOT_STATE, EXPRESSION_PRIORITY } from './MascotState';

export const MascotContext = createContext<MascotApi | null>(null);

interface MascotProviderProps {
  children: React.ReactNode;
  initial?: Partial<MascotState>;
}

export const MascotProvider: React.FC<MascotProviderProps> = ({
  children,
  initial = {},
}) => {
  const [state, setState] = useState<MascotState>({
    ...DEFAULT_MASCOT_STATE,
    ...initial,
  });

  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const restorePrevious = useCallback(() => {
    setState((prev) => {
      if (!prev.previousExpression) return prev;
      return {
        ...prev,
        expression: prev.previousExpression,
        previousExpression: undefined,
        message: undefined,
      };
    });
  }, []);

  const setExpression = useCallback(
    (
      expression: MascotExpression,
      options: { temporary?: boolean; durationMs?: number; message?: string } = {}
    ) => {
      const { temporary = false, durationMs = 1000, message } = options;

      setState((prev) => {
        // Prevent low-priority micro-events from interrupting high-priority states.
        const currentPriority = EXPRESSION_PRIORITY[prev.expression] ?? 0;
        const incomingPriority = EXPRESSION_PRIORITY[expression] ?? 0;
        if (
          prev.expression !== 'neutral' &&
          incomingPriority < currentPriority &&
          !temporary
        ) {
          return prev;
        }

        return {
          ...prev,
          expression,
          previousExpression:
            expression === prev.expression ? prev.previousExpression : prev.expression,
          message,
        };
      });

      if (restoreTimerRef.current) {
        clearTimeout(restoreTimerRef.current);
      }

      if (temporary) {
        restoreTimerRef.current = setTimeout(() => {
          restorePrevious();
        }, durationMs);
      }
    },
    [restorePrevious]
  );

  const setContext = useCallback((context: MascotState['context']) => {
    setState((prev) => ({ ...prev, context }));
  }, []);

  useEffect(() => {
    return () => {
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
    };
  }, []);

  return (
    <MascotContext.Provider value={{ state, setExpression, setContext, restorePrevious }}>
      {children}
    </MascotContext.Provider>
  );
};
