import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export interface TutorAlgorithmContext {
  algorithmName: string;
  algorithmId: string;
  category: string;
  currentStepDescription: string;
  currentStepIndex: number;
  totalSteps: number;
  currentStep: any;
  steps: any[];
  // Control callbacks for function calling & guided walkthroughs
  onSetInput?: (values: number[]) => void;
  play?: () => void;
  pause?: () => void;
  stepForward?: () => void;
  reset?: () => void;
  setShowDebugger?: (visible: boolean) => void;
  onLaunchQuiz?: (questions?: any[]) => void;
  // NEW: Speed control
  setSpeed?: (speed: number) => void;
  // NEW: Fullscreen control
  toggleFullscreen?: (enter: boolean) => void;
}

interface TutorContextType {
  contextState: TutorAlgorithmContext;
  setTutorContext: (update: Partial<TutorAlgorithmContext>) => void;
  // Panel visibility toggle
  isTutorOpen: boolean;
  setIsTutorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleTutor: () => void;
}

const DEFAULT_CONTEXT: TutorAlgorithmContext = {
  algorithmName: 'DSA Concept',
  algorithmId: '',
  category: 'dsa',
  currentStepDescription: '',
  currentStepIndex: 0,
  totalSteps: 0,
  currentStep: null,
  steps: [],
};

const TutorContext = createContext<TutorContextType | undefined>(undefined);

export const TutorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contextState, setContextState] = useState<TutorAlgorithmContext>(DEFAULT_CONTEXT);
  const [isTutorOpen, setIsTutorOpen] = useState<boolean>(false);

  const setTutorContext = useCallback((update: Partial<TutorAlgorithmContext>) => {
    setContextState((prev) => ({
      ...prev,
      ...update,
    }));
  }, []);

  const toggleTutor = useCallback(() => {
    setIsTutorOpen((prev) => !prev);
  }, []);

  return (
    <TutorContext.Provider
      value={{
        contextState,
        setTutorContext,
        isTutorOpen,
        setIsTutorOpen,
        toggleTutor,
      }}
    >
      {children}
    </TutorContext.Provider>
  );
};

export const useTutorContext = (): TutorContextType => {
  const ctx = useContext(TutorContext);
  if (!ctx) {
    throw new Error('useTutorContext must be used within a TutorProvider');
  }
  return ctx;
};
