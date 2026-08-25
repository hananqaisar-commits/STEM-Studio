import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { submitQuizAttempt } from '../api/quizApi';
import {
  filterByCadence,
  type QuizCadence,
  type QuizCheckpoint,
  type QuizModule,
} from '../engine/types/Quiz';

/* ── Quiz session ──────────────────────────────────────────────────────
   Owns the whole learning loop for one visualizer run, so the six pages
   don't each reimplement it.

   Flow:

     idle ──reach checkpoint──▶ asking
                                 │
              correct ───────────┼──────────────▶ revealed ──continue──▶ idle
                                 │                   ▲
              1st wrong ──▶ retrying                 │
                                 └── 2nd wrong ──────┘  (answer shown)

   Two behaviours the old implementation got wrong and this fixes:

   1. A wrong answer used to have no consequence — every quiz called
      `onCorrectAnswer` from its continue handler regardless of whether
      the student was right. Here a wrong answer earns a hint and a
      second attempt before the answer is revealed.
   2. Only the FIRST attempt is reported to the backend. Grading a retry
      would let a student farm accuracy by deliberately missing once.
   ─────────────────────────────────────────────────────────────────── */

export type QuizPhase = 'idle' | 'asking' | 'retrying' | 'revealed';

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
  answer: (index: number) => void;
  continueExecution: () => void;
  /**
   * Clear tallies and re-arm every checkpoint. Pages must call this
   * wherever they reset playback, otherwise a replay of the same
   * execution asks nothing — the checkpoints are already consumed.
   */
  resetSession: () => void;
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
}: UseQuizSessionArgs): QuizSessionState {
  const { isAuthenticated } = useAuth();

  const [phase, setPhase] = useState<QuizPhase>('idle');
  const [openCheckpoint, setOpenCheckpoint] = useState<QuizCheckpoint | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState(false);

  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lifetimeAccuracy, setLifetimeAccuracy] = useState<number | null>(null);
  const [lifetimeStreak, setLifetimeStreak] = useState<number | null>(null);

  /** Step indices already asked, so a checkpoint never re-fires when the
   *  student steps back and forth across it. */
  const consumedRef = useRef<Set<number>>(new Set());

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
  }, []);

  /* A new execution, algorithm, or cadence — start over. */
  useEffect(() => {
    consumedRef.current = new Set();
    dismiss();
  }, [activeSignature, dismiss]);

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
  }, [enabled, phase, active, currentStepIndex]);

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
    if (phase !== 'idle' && isPlaying) pause();
  }, [phase, isPlaying, pause]);

  /* Mode turned off mid-question. */
  useEffect(() => {
    if (!enabled && phase !== 'idle') dismiss();
  }, [enabled, phase, dismiss]);

  const checkpointNumber = useMemo(() => {
    if (!openCheckpoint) return 0;
    return active.findIndex((c) => c.stepIndex === openCheckpoint.stepIndex) + 1;
  }, [active, openCheckpoint]);

  const answer = useCallback(
    (index: number) => {
      if (!openCheckpoint || (phase !== 'asking' && phase !== 'retrying')) return;

      const question = openCheckpoint.question;
      const correct = index === question.correctIndex;
      const isFirstAttempt = phase === 'asking';
      setSelectedIndex(index);

      /* Grade and report the first attempt only. */
      if (isFirstAttempt) {
        setAnsweredCount((n) => n + 1);
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
            selected_option: question.options[index] ?? '',
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
    dismiss();
    stepForward();
  }, [dismiss, stepForward]);

  const resetSession = useCallback(() => {
    consumedRef.current = new Set();
    dismiss();
    setCorrectCount(0);
    setAnsweredCount(0);
    setStreak(0);
  }, [dismiss]);

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
    answer,
    continueExecution,
    resetSession,
  };
}
