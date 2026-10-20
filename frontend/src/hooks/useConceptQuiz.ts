import { useState, useCallback, useMemo } from 'react';
import { CONCEPT_QUESTIONS, type ConceptQuestion } from '../data/conceptQuestionBank';

/* ── useConceptQuiz ────────────────────────────────────────────────────
   Drives Concept Mode (random pool) and Revision Mode (weak-area pool).

   Weak-area tracking:
   - Stored in localStorage under WEAK_AREAS_KEY as a JSON record:
       { [topic: string]: { wrong: number; total: number } }
   - Updated after each question is answered.
   - Revision Mode preferentially samples from topics where
     accuracy < REVISION_THRESHOLD and at least MIN_ATTEMPTS answered.
   - If there is insufficient history, falls back to general pool.
   ─────────────────────────────────────────────────────────────────── */

const WEAK_AREAS_KEY = 'stem_quiz_weak_areas';
const REVISION_THRESHOLD = 0.6; // accuracy below this = "weak"
const MIN_ATTEMPTS = 2;         // min answers in a topic to qualify as weak
const CONCEPT_POOL_SIZE = 12;   // questions per Concept Mode session
const REVISION_POOL_SIZE = 12;  // questions per Revision Mode session

type TopicStats = Record<string, { wrong: number; total: number }>;

function loadWeakAreas(): TopicStats {
  try {
    const raw = localStorage.getItem(WEAK_AREAS_KEY);
    return raw ? (JSON.parse(raw) as TopicStats) : {};
  } catch {
    return {};
  }
}

function saveWeakAreas(stats: TopicStats): void {
  try {
    localStorage.setItem(WEAK_AREAS_KEY, JSON.stringify(stats));
  } catch {
    /* quota exceeded — non-fatal */
  }
}

function getWeakTopics(stats: TopicStats): string[] {
  return Object.entries(stats)
    .filter(([, s]) => s.total >= MIN_ATTEMPTS && s.wrong / s.total > (1 - REVISION_THRESHOLD))
    .sort(([, a], [, b]) => b.wrong / b.total - a.wrong / a.total)
    .map(([topic]) => topic);
}

/** Seeded shuffle — deterministic for a given seed but varied across sessions. */
function shuffleWithSeed<T>(arr: T[]): T[] {
  const copy = [...arr];
  const seed = Date.now() % 1000003;
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor((seed * (i + 1) * 2654435769) % (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPool(mode: 'concept' | 'revision', size: number): ConceptQuestion[] {
  const stats = loadWeakAreas();

  if (mode === 'revision') {
    const weakTopics = getWeakTopics(stats);
    if (weakTopics.length >= 2) {
      // Sample preferentially from weak topics (60%), pad with others
      const weakQs = CONCEPT_QUESTIONS.filter((q) => weakTopics.includes(q.topic));
      const otherQs = CONCEPT_QUESTIONS.filter((q) => !weakTopics.includes(q.topic));
      const weakCount = Math.min(weakQs.length, Math.ceil(size * 0.6));
      const otherCount = Math.min(otherQs.length, size - weakCount);
      return [
        ...shuffleWithSeed(weakQs).slice(0, weakCount),
        ...shuffleWithSeed(otherQs).slice(0, otherCount),
      ];
    }
    // Not enough history — fall back to general pool and flag it
  }

  return shuffleWithSeed(CONCEPT_QUESTIONS).slice(0, size);
}

function hasEnoughHistory(): boolean {
  const stats = loadWeakAreas();
  const weakTopics = getWeakTopics(stats);
  return weakTopics.length >= 2;
}

export type ConceptPhase = 'asking' | 'retrying' | 'revealed' | 'done';

export interface ConceptQuizState {
  /** Current quiz phase. */
  phase: ConceptPhase;
  /** The question being shown. */
  question: ConceptQuestion | null;
  /** 1-based index. */
  questionNumber: number;
  totalQuestions: number;
  selectedIndex: number | null;
  wasCorrect: boolean;
  correctCount: number;
  /** True when Revision Mode used general fallback (no history yet). */
  usedFallback: boolean;
  /** Concept results for reporting. */
  results: { topic: string; concept: string; wasCorrect: boolean }[];
  answer: (index: number) => void;
  continueNext: () => void;
}

export function useConceptQuiz(mode: 'concept' | 'revision'): ConceptQuizState {
  const poolSize = mode === 'concept' ? CONCEPT_POOL_SIZE : REVISION_POOL_SIZE;
  const usedFallback = mode === 'revision' && !hasEnoughHistory();

  const [pool] = useState<ConceptQuestion[]>(() => buildPool(mode, poolSize));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<ConceptPhase>('asking');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [wasCorrect, setWasCorrect] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [results, setResults] = useState<{ topic: string; concept: string; wasCorrect: boolean }[]>([]);

  const question = pool[questionIndex] ?? null;

  const answer = useCallback((index: number) => {
    if (!question || phase === 'revealed' || phase === 'done') return;

    const correct = index === question.correctIndex;
    setSelectedIndex(index);

    if (phase === 'asking') {
      // Record and update weak areas
      const stats = loadWeakAreas();
      const topicStat = stats[question.topic] ?? { wrong: 0, total: 0 };
      topicStat.total += 1;
      if (!correct) topicStat.wrong += 1;
      stats[question.topic] = topicStat;
      saveWeakAreas(stats);

      setResults((prev) => [...prev, { topic: question.topic, concept: question.concept, wasCorrect: correct }]);

      if (correct) {
        setCorrectCount((n) => n + 1);
        setWasCorrect(true);
        setPhase('revealed');
      } else {
        setWasCorrect(false);
        setPhase('retrying'); // show hint
      }
    } else if (phase === 'retrying') {
      // Second attempt — always reveal
      if (correct) setCorrectCount((n) => n + 1);
      setWasCorrect(correct);
      setPhase('revealed');
    }
  }, [question, phase]);

  const continueNext = useCallback(() => {
    const nextIndex = questionIndex + 1;
    if (nextIndex >= pool.length) {
      setPhase('done');
    } else {
      setQuestionIndex(nextIndex);
      setPhase('asking');
      setSelectedIndex(null);
      setWasCorrect(false);
    }
  }, [questionIndex, pool.length]);

  return useMemo(() => ({
    phase,
    question,
    questionNumber: questionIndex + 1,
    totalQuestions: pool.length,
    selectedIndex,
    wasCorrect,
    correctCount,
    usedFallback,
    results,
    answer,
    continueNext,
  }), [phase, question, questionIndex, pool.length, selectedIndex, wasCorrect, correctCount, usedFallback, results, answer, continueNext]);
}
