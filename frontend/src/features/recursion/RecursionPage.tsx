import React, {useState, useMemo, useEffect} from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GitBranch, Calculator, Binary, Sigma, Layers, Maximize2, Sparkles, Trash2,
} from 'lucide-react';
import { RecursionTreeRenderer } from './RecursionTreeRenderer';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { FloatingController } from '../../components/controls/FloatingController';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { VisualizerActions } from '../../components/layout/VisualizerActions';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildRecursionCheckpoints, buildRevisionData } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';

import { runFactorial } from './algorithms/factorial';
import { runFibonacci } from './algorithms/fibonacci';
import { runPower } from './algorithms/power';
import { runArraySum } from './algorithms/arraySum';
import { runTowerOfHanoi } from './algorithms/towerOfHanoi';

import '../sorting/Sorting.css';
import './Recursion.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';

type RecursionAlgorithmKey = 'factorial' | 'fibonacci' | 'power' | 'arraySum' | 'towerOfHanoi';

interface AlgMeta {
  key: RecursionAlgorithmKey;
  name: string;
  complexity: string;
  icon: React.ReactNode;
}

const ALGORITHMS: AlgMeta[] = [
  { key: 'factorial',     name: 'Factorial',        complexity: 'O(n)',   icon: <Calculator size={14} /> },
  { key: 'fibonacci',     name: 'Fibonacci',         complexity: 'O(2^n)', icon: <GitBranch size={14} /> },
  { key: 'power',         name: 'Power',             complexity: 'O(n)',   icon: <Binary size={14} /> },
  { key: 'arraySum',      name: 'Array Sum',         complexity: 'O(n)',   icon: <Sigma size={14} /> },
  { key: 'towerOfHanoi',  name: 'Tower of Hanoi',    complexity: 'O(2^n)', icon: <Layers size={14} /> },
];

export const RecursionPage: React.FC = () => {
  const [selectedAlg, setSelectedAlg] = useState<RecursionAlgorithmKey>('fibonacci');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ALGORITHMS.some((a) => a.key === topic)) {
      setSelectedAlg(topic as RecursionAlgorithmKey);
    }
  }, [searchParams]);


  // Algorithm-specific inputs
  const [factorialN, setFactorialN] = useState<number>(5);
  const [fibonacciN, setFibonacciN] = useState<number>(5);
  const [powerBase, setPowerBase]   = useState<number>(2);
  const [powerExp, setPowerExp]     = useState<number>(4);
  const [arraySumArr, setArraySumArr] = useState<number[]>([3, 7, 2, 5, 1]);
  const [hanoiN, setHanoiN]         = useState<number>(3);

  // Quiz state
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [showDebugger, setShowDebugger] = useState<boolean>(true);
  const [cadence, setCadence] = useState<QuizCadence>('normal');
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);

  /* ── Generate steps ──────────────────────────────────────────────── */
  const executionData = useMemo(() => {
    switch (selectedAlg) {
      case 'factorial':    return runFactorial(factorialN);
      case 'fibonacci':    return runFibonacci(fibonacciN);
      case 'power':        return runPower(powerBase, powerExp);
      case 'arraySum':     return runArraySum(arraySumArr);
      case 'towerOfHanoi': return runTowerOfHanoi(hanoiN);
      default:             return runFibonacci(fibonacciN);
    }
  }, [selectedAlg, factorialN, fibonacciN, powerBase, powerExp, arraySumArr, hanoiN]);

  const {
    currentStepIndex, currentStep, totalSteps, isPlaying,
    play, pause, stepForward, stepBack, reset,
  seekTo,
    } = useStepPlayer({ steps: executionData.steps });

  usePlaybackShortcuts({
    handlers: {
      onTogglePlay: isPlaying ? pause : play,
      onReset: reset,
    onStepForward: stepForward,
      onStepBack: stepBack,
      onStop: () => { pause(); reset(); },
      onResume: play,
    },
  });

  /* ── Quiz ────────────────────────────────────────────────────────── */
  const quizCheckpoints = useMemo(
    () => buildRecursionCheckpoints(executionData.steps, selectedAlg),
    [executionData.steps, selectedAlg],
  );

  const quizSession = useQuizSession({
    enabled: quizEnabled,
    checkpoints: quizCheckpoints,
    cadence,
    currentStepIndex,
    isPlaying,
    pause,
    stepForward,
    module: 'recursion' as any,
    algorithmId: selectedAlg,
    revisionData: buildRevisionData(selectedAlg),
  });

  /* ── Controls ────────────────────────────────────────────────────── */
  const handleAlgChange = (alg: RecursionAlgorithmKey) => {
    setSelectedAlg(alg);
    reset();
    quizSession.resetSession();
  };

  const handleRandomize = () => {
    reset();
    quizSession.resetSession();
    if (selectedAlg === 'factorial')    setFactorialN(Math.floor(Math.random() * 5) + 3);
    if (selectedAlg === 'fibonacci')    setFibonacciN(Math.floor(Math.random() * 4) + 3);
    if (selectedAlg === 'power')        { setPowerBase(Math.floor(Math.random() * 5) + 2); setPowerExp(Math.floor(Math.random() * 4) + 2); }
    if (selectedAlg === 'arraySum')     setArraySumArr(Array.from({ length: 5 }, () => Math.floor(Math.random() * 9) + 1));
    if (selectedAlg === 'towerOfHanoi') setHanoiN(Math.floor(Math.random() * 2) + 2);
  };

  /* ── Transfer challenge ("Prove You Understand") ─────────────────
     Fresh parameters (N, base, array…), predicted cold. startChallenge()
     must fire in the same handler as the input change so the armed
     challenge survives the checkpoint reset the new execution triggers. */
  const handleProveIt = () => {
    quizSession.startChallenge();
    handleRandomize();
  };

  const handleResetDefaults = () => {
    reset();
    quizSession.resetSession();
    setFactorialN(5);
    setFibonacciN(5);
    setPowerBase(2);
    setPowerExp(4);
    setArraySumArr([3, 7, 2, 5, 1]);
    setHanoiN(3);
  };

  const handleEmpty = () => {
    reset();
    quizSession.resetSession();
    setFactorialN(1);
    setFibonacciN(1);
    setPowerBase(1);
    setPowerExp(1);
    setArraySumArr([1]);
    setHanoiN(1);
  };

  const renderFullscreenPlayerControls = () => (
    <div className="player-bar" style={{ margin: 0 }}>
      <div className="player-left">
        <span className="step-counter font-mono text-xs">
          Step {totalSteps > 0 ? currentStepIndex + 1 : 0} / {totalSteps}
        </span>
      </div>
      <div className="player-center">
        <div className="step-progress-bar">
          <div
            className="step-progress-fill"
            style={{ width: `${(currentStepIndex / Math.max(1, totalSteps - 1)) * 100}%` }}
          />
          {totalSteps > 0 && (
            <input
              type="range"
              min={0}
              max={Math.max(0, totalSteps - 1)}
              value={currentStepIndex}
              onChange={(e) => seekTo(parseInt(e.target.value))}
              className="timeline-scrubber"
              title="Scrub timeline"
            />
          )}
        </div>
      </div>
      <div className="player-right" />
    </div>
  );

  /* ── Algorithm-specific toolbar inputs ──────────────────────────── */
  const renderAlgInputs = () => {
    switch (selectedAlg) {
      case 'factorial':
        return (
          <div className="rec-input-group">
            <span>n =</span>
            <input type="range" min={1} max={8} value={factorialN}
              onChange={e => { setFactorialN(+e.target.value); reset(); }}
              className="toolbar-range cursor-pointer accent-amber-400 w-20" />
            <span className="rec-val">{factorialN}</span>
          </div>
        );
      case 'fibonacci':
        return (
          <div className="rec-input-group">
            <span>n =</span>
            <input type="range" min={1} max={6} value={fibonacciN}
              onChange={e => { setFibonacciN(+e.target.value); reset(); }}
              className="toolbar-range cursor-pointer accent-amber-400 w-20" />
            <span className="rec-val">{fibonacciN}</span>
          </div>
        );
      case 'power':
        return (
          <>
            <div className="rec-input-group">
              <span>base =</span>
              <input type="number" min={1} max={10} value={powerBase}
                onChange={e => { setPowerBase(+e.target.value || 2); reset(); }}
                className="rec-num-input" />
            </div>
            <div className="rec-input-group">
              <span>exp =</span>
              <input type="range" min={1} max={6} value={powerExp}
                onChange={e => { setPowerExp(+e.target.value); reset(); }}
                className="toolbar-range cursor-pointer accent-amber-400 w-20" />
              <span className="rec-val">{powerExp}</span>
            </div>
          </>
        );
      case 'arraySum':
        return (
          <div className="rec-input-group">
            <span>arr =</span>
            <input type="text"
              value={arraySumArr.join(', ')}
              onChange={e => {
                const parsed = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
                if (parsed.length > 0 && parsed.length <= 8) { setArraySumArr(parsed); reset(); }
              }}
              className="rec-text-input" />
          </div>
        );
      case 'towerOfHanoi':
        return (
          <div className="rec-input-group">
            <span>disks =</span>
            <input type="range" min={1} max={4} value={hanoiN}
              onChange={e => { setHanoiN(+e.target.value); reset(); }}
              className="toolbar-range cursor-pointer accent-amber-400 w-20" />
            <span className="rec-val">{hanoiN}</span>
          </div>
        );
      default: return null;
    }
  };

  /* ── Shared toolbar controls ─────────────────────────────────────────
     Single source of truth for every input/button: rendered in the page
     toolbar AND passed to the fullscreen modal, so the two states can
     never drift out of sync. */
  const renderToolbarControls = () => (
    <>
      {renderAlgInputs()}
      <div className="dataset-mode-selector">
        <button className="bst-btn btn-mode" onClick={handleEmpty} title="Empty Array">
          <Trash2 size={14} className="text-rose-400" /><span>Empty</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleResetDefaults} title="Sample Array">
          <Layers size={14} className="text-amber-400" /><span>Sample</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleRandomize} title="Random Array">
          <Sparkles size={14} className="text-emerald-400" /><span>Random</span>
        </button>
      </div>
    </>
  );

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="bst-page-container">
      <VisualizerHeader
        icon={<GitBranch size={22} />}
        title="Recursion Studio"
        subtitle="Interactive Call Tree Visualization & Recursive Algorithm Analysis"
        items={ALGORITHMS.map(a => ({
          id: a.key,
          name: a.name,
          description: `Visualize the recursion call tree for ${a.name}`,
        }))}
        activeId={selectedAlg}
        onSelect={id => handleAlgChange(id as RecursionAlgorithmKey)}
        placeholder="Search recursive algorithm..."
        actions={
          <VisualizerActions
            quizEnabled={quizEnabled}
            onToggleQuiz={() => setQuizEnabled((v) => !v)}
            debuggerVisible={showDebugger}
            onToggleDebugger={() => setShowDebugger((v) => !v)}
          >
            <button
              type="button"
              className="viz-action-btn"
              onClick={() => setIsFullScreenOpen(true)}
              title="Full Screen"
            >
              <Maximize2 size={14} />
              <span>Fullscreen</span>
            </button>
          </VisualizerActions>
        }
      />

      {/* Category Tabs */}


      {/* Operations Toolbar */}
      <div className="bst-toolbar animate-fade-in">
        <div className="bst-toolbar-left">
          {renderToolbarControls()}
        </div>
      </div>

      {/* Main Workspace */}
      <div className="sorting-workspace scene-workspace">
        <div className="renderer-section">
          <RecursionTreeRenderer
            currentStep={currentStep}
            onToggleFullscreen={() => setIsFullScreenOpen(true)}
          />
          <FloatingController
            isPlaying={isPlaying}
            canStepBack={currentStepIndex > 0}
            canStepForward={currentStepIndex < totalSteps - 1}
            onPlay={play}
            onPause={pause}
            onReset={reset}
            onStepBack={stepBack}
            onStepForward={stepForward}
            onStop={() => { pause(); reset(); }}
            onResume={play}
            quizMode={quizEnabled}
          />
        </div>
        <div className="quiz-rail">
          <QuizDock
            session={quizSession}
            cadence={cadence}
            onCadenceChange={setCadence}
            onEnableQuiz={() => setQuizEnabled(true)}
            onProveIt={handleProveIt}
          />

        </div>

        <div className={`bottom-row ${showDebugger ? '' : 'bottom-row--single'}`}>
          {showDebugger && (
            <MultiLanguageCodePanel
              algorithmKey={selectedAlg}
              title="Recursion"
              activeLine={currentStep?.codeLine}
              variables={currentStep?.variables}
              callStack={currentStep?.callStack}
              currentArray={[]}
            />
          )}

          <ExplanationPanel
            description={maskNarration(
              currentStep?.description || 'Click Play to explore the recursion call tree step by step.',
              quizSession.phase,
            )}
            stepNumber={currentStepIndex + 1}
            totalSteps={totalSteps}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
            steps={executionData.steps}
            currentStepIndex={currentStepIndex}
          />
        </div>
      </div>

      {/* Fullscreen Modal */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Recursion | ${selectedAlg.toUpperCase()}`}
        subtitle="Call Tree Inspector"
        toolbarControls={
          <div className="fs-floating-controls">
            {renderToolbarControls()}
            <VisualizerActions
              quizEnabled={quizEnabled}
              onToggleQuiz={() => setQuizEnabled((v) => !v)}
              debuggerVisible={showDebugger}
              onToggleDebugger={() => setShowDebugger((v) => !v)}
            />
          </div>
        }
        playbackControls={renderFullscreenPlayerControls()}

        floatingControls={
          <FloatingController
            isPlaying={isPlaying}
            canStepBack={currentStepIndex > 0}
            canStepForward={currentStepIndex < totalSteps - 1}
            onPlay={play}
            onPause={pause}
            onReset={reset}
            onStepBack={stepBack}
            onStepForward={stepForward}
            onStop={() => { pause(); reset(); }}
            onResume={play}
            quizMode={quizEnabled}
          />
        }
      >
        <RecursionTreeRenderer currentStep={currentStep} />
      </FullScreenCanvasModal>
      <TheoryPanel categoryId="recursion" activeTopic={selectedAlg} />

    </div>
  );
};
