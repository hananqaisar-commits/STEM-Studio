import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { submitQuizAttempt } from '../api/quizApi';
import {
  filterByCadence,
  type QuizCadence,
  type QuizCheckpoint,
  type QuizModule,
  type QuizRevisionData,
  type QuestionResult,
} from '../engine/types/Quiz';

/* ── Quiz session ──────────────────────────────────────────────────────
   Owns the whole learning loop for one visualizer run.

   Flow:

     idle ──startRevision──▶ revision ──beginQuiz──▶ idle
     idle ──reach checkpoint──▶ asking
                                  │
              correct ────────────┼──────────────▶ revealed ──continue──▶ idle
                                  │                   ▲                  (or report)
              1st wrong ──▶ retrying                 │
                                  └── 2nd wrong ──────┘  (answer shown)

     After last checkpoint revealed ──▶ report

   Three modes with differentiated features:
   - Concept (light): weight-1 only, insight boxes, no timer
   - Guided (normal): weight 1-2, hints, progress bar
   - Challenge (intensive): weight 1-3, 15s timer, streak multipliers
   ─────────────────────────────────────────────────────────────────── */

export type QuizPhase = 'idle' | 'revision' | 'asking' | 'retrying' | 'revealed' | 'report';

interface UseQuizSessionArgs {
  /** Master on/off for the mode. */
  enabled: boolean;
  /** Every checkpoint this run could offer, cadence-unfiltered. */
  checkpoints: QuizCheckpoint[];
  cadence: QuizCadence;
  /** Where playback currently is. */
  currentStepIndex: number;
  isPlaying: boolean;
  /** From useStepPlayer — reused rather than reimplemented. */
  pause: () => void;
  stepForward: () => void;
  /** For attribution in the backend record. */
  module: QuizModule;
  algorithmId: string;
  /** Revision data for the current algorithm, provided by the adapter. */
  revisionData?: QuizRevisionData | null;
}

export interface QuizSessionState {
  phase: QuizPhase;
  /** The open question. Non-null exactly when phase !== 'idle'. */
  checkpoint: QuizCheckpoint | null;
  /** Index the student committed, or null before they answer. */
  selectedIndex: number | null;
  wasCorrect: boolean;
  /** 1-based position of this checkpoint among those in play. */
  checkpointNumber: number;
  totalCheckpoints: number;
  /** Session-local tallies. Always available, signed in or not. */
  correctCount: number;
  answeredCount: number;
  streak: number;
  /** Backend-reported lifetime figures; null for guests or on failure. */
  lifetimeAccuracy: number | null;
  lifetimeStreak: number | null;
  /** Revision data for the pre-quiz review card. */
  revisionData: QuizRevisionData | null;
  /** Per-question results collected for the post-quiz report. */
  questionResults: QuestionResult[];
  /** Seconds remaining on the timer (Challenge mode only); null otherwise. */
  timeRemaining: number | null;
  /** Streak multiplier: x1 base, x2 after 3 correct, x3 after 5 correct. */
  streakMultiplier: number;
  /** Whether the quiz has completed all checkpoints (for report trigger). */
  quizCompleted: boolean;
  answer: (index: number) => void;
  continueExecution: () => void;
  /** Clear tallies and re-arm every checkpoint. */
  resetSession: () => void;
  /** Show the revision card. */
  startRevision: () => void;
  /** Dismiss the revision card and arm checkpoints. */
  dismissRevision: () => void;
  /** Show the post-quiz report. */
  showReport: () => void;
  /** Dismiss the report and return to idle. */
  dismissReport: () => void;
}

export function useQuizSession({
  enabled,
  checkpoints,
  cadence,
  currentStepIndex,
  isPlaying,
  pause,
  stepForward,
  module,
  algorithmId,
  revisionData: externalRevisionData = null,
}: UseQuizSessionArgs): QuizSessionState {
  const { isAuthenticated } = useAuth();

  const [phase, setPhase] = useState<QuizPhase>(() =>
    enabled && externalRevisionData ? 'revision' : 'idle'
  );
  const [openCheckpoint, setOpenCheckpoint] = useState<QuizCheckpoint | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState(false);

  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lifetimeAccuracy, setLifetimeAccuracy] = useState<number | null>(null);
  const [lifetimeStreak, setLifetimeStreak] = useState<number | null>(null);

  /** Per-question results for the post-quiz report. */
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([]);

  /** Timer state for Challenge mode. */
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** Step indices already asked, so a checkpoint never re-fires when the
   *  student steps back and forth across it. */
  const consumedRef = useRef<Set<number>>(new Set());

  /** Whether the revision card has already been auto-shown for the
   *  current revision content. */
  const revisionAutoShown = useRef(false);

  const active = useMemo(
    () => (enabled ? filterByCadence(checkpoints, cadence) : []),
    [enabled, checkpoints, cadence]
  );

  /* Reset keys off the checkpoint positions, not the array identity: a
     caller that rebuilds its checkpoint array each render would
     otherwise trip the reset effect on every render and tear down the
     question the student is looking at. */
  const activeSignature = useMemo(
    () => active.map((c) => `${c.stepIndex}:${c.question.id}`).join('|'),
    [active]
  );

  const dismiss = useCallback(() => {
    setPhase('idle');
    setOpenCheckpoint(null);
    setSelectedIndex(null);
    setWasCorrect(false);
    setTimeRemaining(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /* A new execution, algorithm, or cadence — start over. */
  useEffect(() => {
    consumedRef.current = new Set();
    setQuestionResults([]);
    dismiss();
  }, [activeSignature, dismiss]);

  /* Reset the auto-shown flag whenever the revision content changes. */
  useEffect(() => {
    revisionAutoShown.current = false;
  }, [externalRevisionData]);

  /* When quiz mode is on and revision notes exist, show them once before
     the first checkpoint fires. */
  useEffect(() => {
    if (
      enabled &&
      externalRevisionData &&
      phase === 'idle' &&
      !revisionAutoShown.current
    ) {
      revisionAutoShown.current = true;
      setPhase('revision');
    }
  }, [enabled, externalRevisionData, phase]);

  /* Fire a checkpoint when playback reaches one. Pausing here replaces
     the near-identical useEffect every page carried separately. */
  useEffect(() => {
    if (!enabled || phase !== 'idle') return;
    if (consumedRef.current.has(currentStepIndex)) return;

    const hit = active.find((c) => c.stepIndex === currentStepIndex);
    if (!hit) return;

    consumedRef.current.add(currentStepIndex);
    setOpenCheckpoint(hit);
    setSelectedIndex(null);
    setWasCorrect(false);
    setPhase('asking');

    /* Start timer in Challenge mode. */
    if (cadence === 'intensive') {
      setTimeRemaining(15);
    }
  }, [enabled, phase, active, currentStepIndex, cadence]);

  /* Challenge mode timer countdown. */
  useEffect(() => {
    if (phase !== 'asking' || cadence !== 'intensive' || timeRemaining === null) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          /* Time's up — auto-reveal as wrong. */
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = null;
          /* Schedule the auto-answer outside the setState. */
          setTimeout(() => {
            setPhase((currentPhase) => {
              if (currentPhase === 'asking') {
                setWasCorrect(false);
                setAnsweredCount((n) => n + 1);
                setStreak(0);
                return 'revealed';
              }
              return currentPhase;
            });
            setTimeRemaining(null);
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase, cadence, timeRemaining]);

  /* Dismiss if the student navigates off the question's step using the
     player bar (step back, seek, reset). Without this the panel would
     unmount while `phase` stayed non-idle, and the pause effect below
     would keep cancelling playback — the play button would look broken. */
  useEffect(() => {
    if (openCheckpoint && openCheckpoint.stepIndex !== currentStepIndex) dismiss();
  }, [openCheckpoint, currentStepIndex, dismiss]);

  /* Stop the clock while a question is open, so the canvas keeps showing
     the state the question is about. */
  useEffect(() => {
    if (phase !== 'idle' && phase !== 'revision' && phase !== 'report' && isPlaying) pause();
  }, [phase, isPlaying, pause]);

  /* Mode turned off mid-question. */
  useEffect(() => {
    if (!enabled && phase !== 'idle') dismiss();
  }, [enabled, phase, dismiss]);

  const checkpointNumber = useMemo(() => {
    if (!openCheckpoint) return 0;
    return active.findIndex((c) => c.stepIndex === openCheckpoint.stepIndex) + 1;
  }, [active, openCheckpoint]);

  /** Whether all active checkpoints have been consumed. */
  const quizCompleted = useMemo(() => {
    if (active.length === 0) return false;
    return consumedRef.current.size >= active.length && phase === 'idle';
  }, [active, phase]);

  /** Streak multiplier: x1 base, x2 at 3+, x3 at 5+. */
  const streakMultiplier = streak >= 5 ? 3 : streak >= 3 ? 2 : 1;

  const answer = useCallback(
    (index: number) => {
      if (!openCheckpoint || (phase !== 'asking' && phase !== 'retrying')) return;

      const question = openCheckpoint.question;
      const correct = index === question.correctIndex;
      const isFirstAttempt = phase === 'asking';

      /* Stop the timer if running. */
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimeRemaining(null);

      if (index >= 0) {
        setSelectedIndex(index);
      }

      /* Grade and report the first attempt only. */
      if (isFirstAttempt) {
        setAnsweredCount((n) => n + 1);
        setQuestionResults((prev) => [
          ...prev,
          {
            questionId: question.id,
            concept: question.concept,
            wasCorrect: correct,
            wasFirstAttempt: true,
          },
        ]);

        if (correct) {
          setCorrectCount((n) => n + 1);
          setStreak((n) => n + 1);
        } else {
          setStreak(0);
        }

        if (isAuthenticated) {
          submitQuizAttempt({
            module_name: module,
            algorithm_id: algorithmId,
            question_prompt: question.prompt,
            selected_option: index >= 0 ? (question.options[index] ?? '') : '(timed out)',
            is_correct: correct,
          })
            .then((result) => {
              setLifetimeAccuracy(result.accuracy_percentage);
              setLifetimeStreak(result.current_streak);
            })
            .catch(() => {
              /* Stats are a nice-to-have. A failed write must never
                 interrupt the lesson, so fall back to session tallies. */
            });
        }
      }

      if (correct) {
        setWasCorrect(true);
        setPhase('revealed');
        return;
      }

      /* Wrong. One retry with a hint, then reveal. */
      if (isFirstAttempt) {
        setPhase('retrying');
      } else {
        setWasCorrect(false);
        setPhase('revealed');
      }
    },
    [openCheckpoint, phase, isAuthenticated, module, algorithmId]
  );

  const continueExecution = useCallback(() => {
    /* Check if this was the last checkpoint. */
    const isLast = active.length > 0 && consumedRef.current.size >= active.length;
    dismiss();
    if (isLast) {
      setPhase('report');
    } else {
      stepForward();
    }
  }, [dismiss, stepForward, active.length]);

  const resetSession = useCallback(() => {
    consumedRef.current = new Set();
    setQuestionResults([]);
    dismiss();
    setCorrectCount(0);
    setAnsweredCount(0);
    setStreak(0);
    revisionAutoShown.current = false;
  }, [dismiss]);

  const startRevision = useCallback(() => {
    setPhase('revision');
  }, []);

  const dismissRevision = useCallback(() => {
    setPhase('idle');
  }, []);

  const showReport = useCallback(() => {
    setPhase('report');
  }, []);

  const dismissReport = useCallback(() => {
    setPhase('idle');
  }, []);

  return {
    phase,
    checkpoint: openCheckpoint,
    selectedIndex,
    wasCorrect,
    checkpointNumber,
    totalCheckpoints: active.length,
    correctCount,
    answeredCount,
    streak,
    lifetimeAccuracy,
    lifetimeStreak,
    revisionData: externalRevisionData,
    questionResults,
    timeRemaining,
    streakMultiplier,
    quizCompleted,
    answer,
    continueExecution,
    resetSession,
    startRevision,
    dismissRevision,
    showReport,
    dismissReport,
  };
}
