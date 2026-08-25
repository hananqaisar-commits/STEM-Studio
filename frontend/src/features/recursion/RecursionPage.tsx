import React, { useState, useMemo } from 'react';
import {
  GitBranch, Calculator, Binary, Sigma, Layers, HelpCircle, Maximize2, Sparkles,
} from 'lucide-react';
import { RecursionTreeRenderer } from './RecursionTreeRenderer';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { PlayPauseButton } from '../../components/controls/PlayPauseButton';
import { StepControls } from '../../components/controls/StepControls';
import { SpeedSlider } from '../../components/controls/SpeedSlider';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildRecursionCheckpoints } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';

import { runFactorial } from './algorithms/factorial';
import { runFibonacci } from './algorithms/fibonacci';
import { runPower } from './algorithms/power';
import { runArraySum } from './algorithms/arraySum';
import { runTowerOfHanoi } from './algorithms/towerOfHanoi';

import '../sorting/Sorting.css';
import './Recursion.css';

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

  // Algorithm-specific inputs
  const [factorialN, setFactorialN] = useState<number>(5);
  const [fibonacciN, setFibonacciN] = useState<number>(5);
  const [powerBase, setPowerBase]   = useState<number>(2);
  const [powerExp, setPowerExp]     = useState<number>(4);
  const [arraySumArr, setArraySumArr] = useState<number[]>([3, 7, 2, 5, 1]);
  const [hanoiN, setHanoiN]         = useState<number>(3);

  // Quiz state
  const [quizEnabled, setQuizEnabled] = useState<boolean>(true);
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
    currentStepIndex, currentStep, totalSteps, isPlaying, speed,
    play, pause, stepForward, stepBack, reset, setSpeed,
  } = useStepPlayer({ steps: executionData.steps });

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

  const renderPlayerControls = () => (
    <div className="player-bar" style={{ margin: 0 }}>
      <div className="player-left">
        <PlayPauseButton isPlaying={isPlaying} onToggle={isPlaying ? pause : play} />
        <StepControls
          onStepBack={stepBack}
          onStepForward={stepForward}
          onReset={reset}
          canStepBack={currentStepIndex > 0}
          canStepForward={currentStepIndex < totalSteps - 1}
        />
      </div>
      <div className="player-center">
        <div className="step-progress-bar">
          <div className="step-progress-fill"
            style={{ width: `${(currentStepIndex / Math.max(1, totalSteps - 1)) * 100}%` }} />
        </div>
        <span className="step-counter">Step {currentStepIndex + 1} / {totalSteps}</span>
      </div>
      <div className="player-right">
        <SpeedSlider speed={speed} onSpeedChange={setSpeed} />
      </div>
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

  const renderFloatingControls = () => (
    <div className="fs-floating-controls">
      {renderAlgInputs()}
      <button className="bst-btn btn-mode" onClick={handleRandomize} title="Randomize">
        <Sparkles size={14} /><span>Random</span>
      </button>
      <label className="predict-toggle-label ml-2">
        <HelpCircle size={16} /><span>Predict Mode</span>
        <input type="checkbox" checked={quizEnabled} onChange={e => setQuizEnabled(e.target.checked)} />
      </label>
    </div>
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
          group: a.complexity,
        }))}
        activeId={selectedAlg}
        onSelect={id => handleAlgChange(id as RecursionAlgorithmKey)}
        placeholder="Search recursive algorithm..."
      />

      {/* Category Tabs */}
      <div className="tree-category-toolbar animate-fade-in">
        <div className="tree-category-tabs flex-wrap">
          {ALGORITHMS.map(a => (
            <button key={a.key}
              className={`category-tab ${selectedAlg === a.key ? 'active' : ''}`}
              onClick={() => handleAlgChange(a.key)}>
              {a.icon}
              <span>{a.name}</span>
              <span className="text-[10px] opacity-75 font-mono bg-black/30 px-1.5 py-0.5 rounded ml-1">
                {a.complexity}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Operations Toolbar */}
      <div className="bst-toolbar animate-fade-in">
        <div className="bst-toolbar-left">
          {renderAlgInputs()}
          <div className="dataset-mode-selector">
            <button className="bst-btn btn-mode" onClick={handleRandomize} title="Randomize Input">
              <Sparkles size={14} className="text-emerald-400" /><span>Random</span>
            </button>
          </div>
        </div>
        <div className="bst-toolbar-right">
          <label className="predict-toggle-label">
            <HelpCircle size={16} /><span>Predict Mode</span>
            <input type="checkbox" checked={quizEnabled} onChange={e => setQuizEnabled(e.target.checked)} />
          </label>
          <button className="bst-btn btn-fullscreen"
            onClick={() => setIsFullScreenOpen(true)} title="Full Screen">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="sorting-workspace">
        <div className="renderer-section">
          <RecursionTreeRenderer
            currentStep={currentStep}
            onToggleFullscreen={() => setIsFullScreenOpen(true)}
          />
          {renderPlayerControls()}
        </div>
        <div className="explanation-section">
          <QuizDock session={quizSession} cadence={cadence} onCadenceChange={setCadence} />
          <ExplanationPanel
            description={maskNarration(
              currentStep?.description || 'Click Play to explore the recursion call tree step by step.',
              quizSession.phase,
            )}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
          />
        </div>
      </div>

      {/* Fullscreen Modal */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Recursion | ${selectedAlg.toUpperCase()}`}
        subtitle="Call Tree Inspector"
        toolbarControls={renderFloatingControls()}
        playbackControls={renderPlayerControls()}
      >
        <RecursionTreeRenderer currentStep={currentStep} />
      </FullScreenCanvasModal>
    </div>
  );
};
