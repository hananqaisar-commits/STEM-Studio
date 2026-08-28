import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Layers, Grid3X3, Target, Shuffle, Maximize2, HelpCircle, Sparkles, Trash2, Edit3,
} from 'lucide-react';
import { BacktrackingRenderer } from './BacktrackingRenderer';
import { CustomArrayEditor } from '../../components/debugger/CustomArrayEditor';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { FloatingController } from '../../components/controls/FloatingController';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildBacktrackingCheckpoints, buildRevisionData } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';

import { runSubsets } from './algorithms/subsets';
import { runPermutations } from './algorithms/permutations';
import { runNQueens } from './algorithms/nQueens';
import { runCombinationSum } from './algorithms/combinationSum';

import '../sorting/Sorting.css';
import './Backtracking.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';

type AlgorithmKey = 'subsets' | 'permutations' | 'nQueens' | 'combinationSum';

interface AlgMeta {
  key: AlgorithmKey;
  name: string;
  complexity: string;
  icon: React.ReactNode;
}

const ALGORITHMS: AlgMeta[] = [
  { key: 'subsets', name: 'Subsets', complexity: 'O(2^n)', icon: <Layers size={14} /> },
  { key: 'permutations', name: 'Permutations', complexity: 'O(n!·n)', icon: <Shuffle size={14} /> },
  { key: 'nQueens', name: 'N-Queens', complexity: 'O(n!)', icon: <Grid3X3 size={14} /> },
  { key: 'combinationSum', name: 'Combination Sum', complexity: 'O(2^t)', icon: <Target size={14} /> },
];

export const BacktrackingPage: React.FC = () => {
  const [selectedAlg, setSelectedAlg] = useState<AlgorithmKey>('subsets');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ALGORITHMS.some((a) => a.key === topic)) {
      setSelectedAlg(topic as AlgorithmKey);
    }
  }, [searchParams]);

  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [cadence, setCadence] = useState<QuizCadence>('normal');

  // Algorithm-specific inputs
  const [subsetArr, setSubsetArr] = useState<number[]>([1, 2, 3]);
  const [permArr, setPermArr] = useState<number[]>([1, 2, 3]);
  const [queensN, setQueensN] = useState<number>(4);
  const [comboCandidates, setComboCandidates] = useState<number[]>([2, 3, 6, 7]);
  const [comboTarget, setComboTarget] = useState<number>(7);
  const [showCustomEditor, setShowCustomEditor] = useState(false);

  // Generate execution steps
  const executionData = useMemo(() => {
    switch (selectedAlg) {
      case 'subsets':
        return runSubsets(subsetArr);
      case 'permutations':
        return runPermutations(permArr);
      case 'nQueens':
        return runNQueens(queensN);
      case 'combinationSum':
        return runCombinationSum(comboCandidates, comboTarget);
      default:
        return runSubsets(subsetArr);
    }
  }, [selectedAlg, subsetArr, permArr, queensN, comboCandidates, comboTarget]);

  const {
    currentStepIndex,
    currentStep,
    totalSteps,
    isPlaying,
    play,
    pause,
    stepForward,
    stepBack,
    reset,
  } = useStepPlayer({ steps: executionData.steps });

  const quizCheckpoints = useMemo(
    () => buildBacktrackingCheckpoints(executionData.steps, selectedAlg),
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
    module: 'backtracking' as any,
    algorithmId: selectedAlg,
    revisionData: buildRevisionData(selectedAlg),
  });

  useEffect(() => {
    quizSession.resetSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlg]);

  const handleRandomize = () => {
    reset();
    quizSession.resetSession();
    switch (selectedAlg) {
      case 'subsets': {
        const size = Math.floor(Math.random() * 2) + 3; // 3-4
        const arr = Array.from({ length: size }, (_, i) => i + 1);
        setSubsetArr(arr);
        break;
      }
      case 'permutations': {
        const size = Math.floor(Math.random() * 2) + 3;
        const arr = Array.from({ length: size }, (_, i) => i + 1);
        setPermArr(arr);
        break;
      }
      case 'nQueens':
        setQueensN(Math.floor(Math.random() * 2) + 3); // 3-4
        break;
      case 'combinationSum': {
        const cands = [2, 3, 5, 7].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 2));
        cands.sort((a, b) => a - b);
        setComboCandidates(cands);
        setComboTarget(cands.reduce((s, v) => s + v, 0));
        break;
      }
    }
  };

  const handleResetDefaults = () => {
    reset();
    quizSession.resetSession();
    setSubsetArr([1, 2, 3]);
    setPermArr([1, 2, 3]);
    setQueensN(4);
    setComboCandidates([2, 3, 6, 7]);
    setComboTarget(7);
  };

  const handleClearInputs = () => {
    reset();
    quizSession.resetSession();
    setSubsetArr([1]);
    setPermArr([1]);
    setQueensN(2);
    setComboCandidates([2]);
    setComboTarget(2);
  };

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
        </div>
      </div>
      <div className="player-right" />
    </div>
  );

  const renderFloatingControls = () => (
    <div className="fs-floating-controls">
      <div className="dataset-mode-selector ml-1">
        <button className="bst-btn btn-mode" onClick={handleClearInputs} title="Clear">
          <Trash2 size={14} className="text-rose-400" /><span>Empty</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleResetDefaults} title="Defaults">
          <Layers size={14} className="text-amber-400" /><span>Sample</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleRandomize} title="Random">
          <Sparkles size={14} className="text-emerald-400" /><span>Random</span>
        </button>
      </div>
      <label className="predict-toggle-label ml-2">
        <HelpCircle size={16} />
        <span>Quiz Mode</span>
        <input type="checkbox" checked={quizEnabled} onChange={(e) => setQuizEnabled(e.target.checked)} />
      </label>
    </div>
  );

  /* ── Algorithm-specific toolbar inputs ─────────────────────────── */
  const renderAlgorithmInputs = () => {
    switch (selectedAlg) {
      case 'subsets':
        return (
          <div className="bt-input-group">
            <span>Array:</span>
            <input
              type="text"
              value={subsetArr.join(',')}
              onChange={(e) => {
                const vals = e.target.value.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
                if (vals.length > 0 && vals.length <= 4) {
                  setSubsetArr(vals);
                  reset();
                }
              }}
              style={{ width: '80px' }}
            />
          </div>
        );
      case 'permutations':
        return (
          <div className="bt-input-group">
            <span>Array:</span>
            <input
              type="text"
              value={permArr.join(',')}
              onChange={(e) => {
                const vals = e.target.value.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
                if (vals.length > 0 && vals.length <= 4) {
                  setPermArr(vals);
                  reset();
                }
              }}
              style={{ width: '80px' }}
            />
          </div>
        );
      case 'nQueens':
        return (
          <div className="bt-input-group">
            <span>N:</span>
            <input
              type="range"
              min={2}
              max={6}
              value={queensN}
              onChange={(e) => {
                setQueensN(parseInt(e.target.value));
                reset();
              }}
              className="toolbar-range cursor-pointer accent-amber-400 w-20"
            />
            <span className="text-xs font-mono font-bold text-amber-400">{queensN}</span>
          </div>
        );
      case 'combinationSum':
        return (
          <>
            <div className="bt-input-group">
              <span>Candidates:</span>
              <input
                type="text"
                value={comboCandidates.join(',')}
                onChange={(e) => {
                  const vals = e.target.value.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
                  if (vals.length > 0 && vals.length <= 5) {
                    setComboCandidates(vals.sort((a, b) => a - b));
                    reset();
                  }
                }}
                style={{ width: '90px' }}
              />
            </div>
            <div className="bt-input-group">
              <span>Target:</span>
              <input
                type="number"
                value={comboTarget}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) {
                    setComboTarget(val);
                    reset();
                  }
                }}
                style={{ width: '50px' }}
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bst-page-container">
      <VisualizerHeader
        icon={<Layers size={22} />}
        title="Backtracking Algorithms Studio"
        subtitle="Interactive Subset, Permutation, N-Queens & Combination Techniques"
        items={ALGORITHMS.map((alg) => ({
          id: alg.key,
          name: alg.name,
          description: `Step-by-step ${alg.name} backtracking execution with decision tree`,
        }))}
        activeId={selectedAlg}
        onSelect={(id) => {
          setSelectedAlg(id as AlgorithmKey);
          reset();
          quizSession.resetSession();
        }}
        placeholder="Search backtracking algorithm..."
      />

      {/* Category Tabs Bar */}
      <div className="tree-category-toolbar animate-fade-in">
        <div className="tree-category-tabs flex-wrap">
          {ALGORITHMS.map((alg) => (
            <button
              key={alg.key}
              className={`category-tab ${selectedAlg === alg.key ? 'active' : ''}`}
              onClick={() => {
                setSelectedAlg(alg.key);
                reset();
                quizSession.resetSession();
              }}
            >
              {alg.icon}
              <span>{alg.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Operations Toolbar */}
      <div className="bst-toolbar animate-fade-in">
        <div className="bst-toolbar-left">
          {renderAlgorithmInputs()}

          <button className="bst-btn btn-insert" onClick={() => setShowCustomEditor(true)}>
            <Edit3 size={14} /><span>Custom Values</span>
          </button>
          <div className="dataset-mode-selector">
            <button className="bst-btn btn-mode" onClick={handleClearInputs} title="Clear Input">
              <Trash2 size={14} className="text-rose-400" /><span>Empty</span>
            </button>
            <button className="bst-btn btn-mode" onClick={handleResetDefaults} title="Default Values">
              <Layers size={14} className="text-amber-400" /><span>Sample</span>
            </button>
            <button className="bst-btn btn-mode" onClick={handleRandomize} title="Random Input">
              <Sparkles size={14} className="text-emerald-400" /><span>Random</span>
            </button>
          </div>
        </div>

        <div className="bst-toolbar-right">
          <div className="predict-mode-group flex items-center gap-2">
            <label className="predict-toggle-label">
              <HelpCircle size={16} />
              <span>Quiz Mode</span>
              <input
                type="checkbox"
                checked={quizEnabled}
                onChange={(e) => setQuizEnabled(e.target.checked)}
              />
            </label>

            <button
              className="bst-btn btn-fullscreen"
              onClick={() => setIsFullScreenOpen(true)}
              title="Full Screen Canvas View"
            >
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Learning Workspace */}
      <div className="sorting-workspace scene-workspace">
        <div className="renderer-section">
          <BacktrackingRenderer
            currentStep={currentStep}
            algorithmKey={selectedAlg}
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
          <QuizDock session={quizSession} cadence={cadence} onCadenceChange={setCadence} />


        </div>


        <div className="bottom-row">
          <MultiLanguageCodePanel
            algorithmKey={selectedAlg}
            title="Backtracking"
            activeLine={currentStep?.codeLine}
            variables={currentStep?.variables}
            callStack={currentStep?.callStack}
            currentArray={[]}
          />

          <ExplanationPanel
            description={maskNarration(currentStep?.description || 'Click Play to observe step-by-step execution details.', quizSession.phase)}
            steps={executionData.steps}
            currentStepIndex={currentStepIndex}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
          />
        </div>
      </div>

      {/* FullScreen Modal */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Backtracking | ${selectedAlg.toUpperCase()}`}
        subtitle="Decision Tree Inspector"
        toolbarControls={renderFloatingControls()}
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
        <BacktrackingRenderer
          currentStep={currentStep}
          algorithmKey={selectedAlg}
        />
      </FullScreenCanvasModal>

      {showCustomEditor && (
        <CustomArrayEditor
          currentArray={selectedAlg === 'subsets' ? subsetArr : selectedAlg === 'permutations' ? permArr : comboCandidates}
          onApplyCustomArray={(newArr) => {
            reset();
            quizSession.resetSession();
            if (selectedAlg === 'subsets') setSubsetArr(newArr.slice(0, 4));
            else if (selectedAlg === 'permutations') setPermArr(newArr.slice(0, 4));
            else { setComboCandidates(newArr.sort((a, b) => a - b).slice(0, 5)); }
            setShowCustomEditor(false);
          }}
          onClose={() => setShowCustomEditor(false)}
        />
      )}
      <TheoryPanel categoryId="backtracking" activeTopic={selectedAlg} />

    </div>
  );
};
