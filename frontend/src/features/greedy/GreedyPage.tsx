import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Clock, Package, Calendar, FileText, Maximize2, Sparkles, Layers, Trash2
} from 'lucide-react';
import { ArrayRenderer } from '../arrays/ArrayRenderer';
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
import { buildGreedyCheckpoints, buildRevisionData } from './quizAdapter';
import type { GreedyAlgorithmKey } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';

import { runActivitySelection } from './algorithms/activitySelection';
import { runFractionalKnapsack } from './algorithms/fractionalKnapsack';
import { runJobScheduling } from './algorithms/jobScheduling';
import { runHuffmanCoding } from './algorithms/huffmanCoding';

import '../sorting/Sorting.css';
import './Greedy.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';

interface AlgMeta {
  key: GreedyAlgorithmKey;
  name: string;
  complexity: string;
  icon: React.ReactNode;
}

const ALGORITHMS: AlgMeta[] = [
  { key: 'activitySelection', name: 'Activity Selection', complexity: 'O(n log n)', icon: <Clock size={14} /> },
  { key: 'fractionalKnapsack', name: 'Fractional Knapsack', complexity: 'O(n log n)', icon: <Package size={14} /> },
  { key: 'jobScheduling', name: 'Job Scheduling', complexity: 'O(n·d)', icon: <Calendar size={14} /> },
  { key: 'huffmanCoding', name: 'Huffman Coding', complexity: 'O(n log n)', icon: <FileText size={14} /> },
];

/* ── Default inputs ─────────────────────────────────────────────────────── */
const DEFAULT_ACTIVITIES = '(1,4) (3,5) (0,6) (5,7) (3,9) (5,9) (6,10) (8,11)';
const DEFAULT_ITEMS = '(10,60) (20,100) (30,120)';
const DEFAULT_CAPACITY = 50;
const DEFAULT_JOBS = '(2,100) (1,19) (2,27) (1,25) (3,15)';
const DEFAULT_TEXT = 'aabbbcccc';

/* ── Parsing helpers ─────────────────────────────────────────────────────── */

interface Activity { start: number; end: number }
interface Item { weight: number; value: number }
interface Job { deadline: number; profit: number }

function parseActivities(raw: string): Activity[] {
  const matches = raw.match(/\((\d+)\s*,\s*(\d+)\)/g);
  if (!matches) return [];
  return matches.map((m) => {
    const nums = m.match(/\d+/g)!;
    return { start: parseInt(nums[0], 10), end: parseInt(nums[1], 10) };
  });
}

function parseItems(raw: string): Item[] {
  const matches = raw.match(/\((\d+)\s*,\s*(\d+)\)/g);
  if (!matches) return [];
  return matches.map((m) => {
    const nums = m.match(/\d+/g)!;
    return { weight: parseInt(nums[0], 10), value: parseInt(nums[1], 10) };
  });
}

function parseJobs(raw: string): Job[] {
  const matches = raw.match(/\((\d+)\s*,\s*(\d+)\)/g);
  if (!matches) return [];
  return matches.map((m) => {
    const nums = m.match(/\d+/g)!;
    return { deadline: parseInt(nums[0], 10), profit: parseInt(nums[1], 10) };
  });
}

export const GreedyPage: React.FC = () => {
  const [selectedAlg, setSelectedAlg] = useState<GreedyAlgorithmKey>('activitySelection');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ALGORITHMS.some((a) => a.key === topic)) {
      setSelectedAlg(topic as GreedyAlgorithmKey);
    }
  }, [searchParams]);


  // Debugger & Modal & Quiz state
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [showDebugger, setShowDebugger] = useState<boolean>(true);
  const [cadence, setCadence] = useState<QuizCadence>('normal');

  // Algorithm-specific parameters
  const [activitiesRaw, setActivitiesRaw] = useState<string>(DEFAULT_ACTIVITIES);
  const [itemsRaw, setItemsRaw] = useState<string>(DEFAULT_ITEMS);
  const [capacity, setCapacity] = useState<number>(DEFAULT_CAPACITY);
  const [jobsRaw, setJobsRaw] = useState<string>(DEFAULT_JOBS);
  const [huffmanText, setHuffmanText] = useState<string>(DEFAULT_TEXT);

  // Generate algorithm steps
  const executionData = useMemo(() => {
    switch (selectedAlg) {
      case 'activitySelection': {
        const activities = parseActivities(activitiesRaw);
        return runActivitySelection(activities.length > 0 ? activities : parseActivities(DEFAULT_ACTIVITIES));
      }
      case 'fractionalKnapsack': {
        const items = parseItems(itemsRaw);
        return runFractionalKnapsack(items.length > 0 ? items : parseItems(DEFAULT_ITEMS), capacity);
      }
      case 'jobScheduling': {
        const jobs = parseJobs(jobsRaw);
        return runJobScheduling(jobs.length > 0 ? jobs : parseJobs(DEFAULT_JOBS));
      }
      case 'huffmanCoding': {
        const text = huffmanText.trim() || DEFAULT_TEXT;
        return runHuffmanCoding(text);
      }
      default:
        return runActivitySelection(parseActivities(DEFAULT_ACTIVITIES));
    }
  }, [selectedAlg, activitiesRaw, itemsRaw, capacity, jobsRaw, huffmanText]);

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
  seekTo,
    } = useStepPlayer({ steps: executionData.steps });

  // Build quiz checkpoints from the current execution steps
  const quizCheckpoints = useMemo(
    () => buildGreedyCheckpoints(executionData.steps, selectedAlg),
    [executionData.steps, selectedAlg]
  );

  const quizSession = useQuizSession({
    enabled: quizEnabled,
    checkpoints: quizCheckpoints,
    cadence,
    currentStepIndex,
    isPlaying,
    pause,
    stepForward,
    module: 'greedy' as any,
    algorithmId: selectedAlg,
    revisionData: buildRevisionData(selectedAlg),
  });

  // Clear quiz when algorithm or inputs change
  useEffect(() => {
    quizSession.resetSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlg, activitiesRaw, itemsRaw, capacity, jobsRaw, huffmanText]);

  /* ── Transfer challenge ("Prove You Understand") ─────────────────
     Fresh activities / items / jobs, predicted cold. startChallenge()
     must fire in the same handler as the input change so the armed
     challenge survives the checkpoint reset the new execution triggers. */
  const handleProveIt = () => {
    quizSession.startChallenge();
    handleRandomize();
  };

  const handleRandomize = () => {
    reset();
    quizSession.resetSession();
    switch (selectedAlg) {
      case 'activitySelection': {
        const acts: string[] = [];
        for (let i = 0; i < 8; i++) {
          const s = Math.floor(Math.random() * 10);
          const e = s + Math.floor(Math.random() * 5) + 1;
          acts.push(`(${s},${e})`);
        }
        setActivitiesRaw(acts.join(' '));
        break;
      }
      case 'fractionalKnapsack': {
        const items: string[] = [];
        for (let i = 0; i < 5; i++) {
          const w = Math.floor(Math.random() * 25) + 5;
          const v = Math.floor(Math.random() * 120) + 20;
          items.push(`(${w},${v})`);
        }
        setItemsRaw(items.join(' '));
        setCapacity(Math.floor(Math.random() * 40) + 30);
        break;
      }
      case 'jobScheduling': {
        const jobs: string[] = [];
        for (let i = 0; i < 6; i++) {
          const d = Math.floor(Math.random() * 4) + 1;
          const p = Math.floor(Math.random() * 90) + 10;
          jobs.push(`(${d},${p})`);
        }
        setJobsRaw(jobs.join(' '));
        break;
      }
      case 'huffmanCoding': {
        const chars = 'abcdefgh';
        let t = '';
        for (let i = 0; i < 20; i++) t += chars[Math.floor(Math.random() * chars.length)];
        setHuffmanText(t);
        break;
      }
    }
  };

  const handleResetDefaults = () => {
    reset();
    quizSession.resetSession();
    setActivitiesRaw(DEFAULT_ACTIVITIES);
    setItemsRaw(DEFAULT_ITEMS);
    setCapacity(DEFAULT_CAPACITY);
    setJobsRaw(DEFAULT_JOBS);
    setHuffmanText(DEFAULT_TEXT);
  };

  const handleClearInputs = () => {
    reset();
    quizSession.resetSession();
    setActivitiesRaw('(0,1)');
    setItemsRaw('(1,10)');
    setCapacity(10);
    setJobsRaw('(1,10)');
    setHuffmanText('a');
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

  /* ── Shared toolbar controls ─────────────────────────────────────────
     Single source of truth for every input/button: rendered in the page
     toolbar AND passed to the fullscreen modal, so the two states can
     never drift out of sync. */
  const renderToolbarControls = () => (
    <>
      {/* Algorithm-specific inputs */}
      {renderAlgorithmInputs()}

      {/* Dataset Mode Selector */}
      <div className="dataset-mode-selector">
        <button className="bst-btn btn-mode" onClick={handleClearInputs} title="Clear Inputs">
          <Trash2 size={14} className="text-rose-400" /><span>Empty</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleResetDefaults} title="Sample Input">
          <Layers size={14} className="text-amber-400" /><span>Sample</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleRandomize} title="Random Input">
          <Sparkles size={14} className="text-emerald-400" /><span>Random</span>
        </button>
      </div>
    </>
  );

  /* ── Algorithm-specific toolbar inputs ─────────────────────────────── */
  const renderAlgorithmInputs = () => {
    switch (selectedAlg) {
      case 'activitySelection':
        return (
          <div className="greedy-input-group">
            <Clock size={14} />
            <span>Activities (start,end):</span>
            <input
              type="text"
              value={activitiesRaw}
              onChange={(e) => {
                setActivitiesRaw(e.target.value);
                reset();
              }}
              placeholder="(1,4) (3,5) ..."
              style={{ width: '220px' }}
            />
          </div>
        );

      case 'fractionalKnapsack':
        return (
          <>
            <div className="greedy-input-group">
              <Package size={14} />
              <span>Items (w,v):</span>
              <input
                type="text"
                value={itemsRaw}
                onChange={(e) => {
                  setItemsRaw(e.target.value);
                  reset();
                }}
                placeholder="(10,60) (20,100) ..."
                style={{ width: '200px' }}
              />
            </div>
            <div className="greedy-input-group">
              <span>Capacity:</span>
              <input
                type="number"
                value={capacity}
                min={1}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val > 0) {
                    setCapacity(val);
                    reset();
                  }
                }}
              />
            </div>
          </>
        );

      case 'jobScheduling':
        return (
          <div className="greedy-input-group">
            <Calendar size={14} />
            <span>Jobs (deadline,profit):</span>
            <input
              type="text"
              value={jobsRaw}
              onChange={(e) => {
                setJobsRaw(e.target.value);
                reset();
              }}
              placeholder="(2,100) (1,19) ..."
              style={{ width: '220px' }}
            />
          </div>
        );

      case 'huffmanCoding':
        return (
          <div className="greedy-input-group">
            <FileText size={14} />
            <span>Text:</span>
            <input
              type="text"
              value={huffmanText}
              onChange={(e) => {
                setHuffmanText(e.target.value);
                reset();
              }}
              placeholder="Enter text..."
              style={{ width: '180px' }}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bst-page-container">
      <VisualizerHeader
        icon={<Package size={22} />}
        title="Greedy Algorithms Studio"
        subtitle="Interactive Activity Selection, Knapsack, Job Scheduling & Huffman Coding"
        items={ALGORITHMS.map((alg) => ({
          id: alg.key,
          name: alg.name,
          description: `Step-by-step ${alg.name} with greedy choice visualization`,
        }))}
        activeId={selectedAlg}
        onSelect={(id) => {
          setSelectedAlg(id as GreedyAlgorithmKey);
          reset();
          quizSession.resetSession();
        }}
        placeholder="Search greedy algorithm or technique..."
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
              title="Full Screen Canvas View"
            >
              <Maximize2 size={14} />
              <span>Fullscreen</span>
            </button>
          </VisualizerActions>
        }
      />

      {/* Category Tabs Bar */}


      {/* Operations Toolbar */}
      <div className="bst-toolbar animate-fade-in">
        <div className="bst-toolbar-left">
          {renderToolbarControls()}
        </div>
      </div>

      {/* Main Learning Workspace */}
      <div className="sorting-workspace scene-workspace">
        {/* Left Column: Visual Canvas & Interactive Controls */}
        <div className="renderer-section">
          <ArrayRenderer
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

        {/* Right Column: Quiz & Explanation */}
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
              title="Greedy Algorithm"
              activeLine={currentStep?.codeLine}
              variables={currentStep?.variables}
              callStack={currentStep?.callStack}
              currentArray={[]}
            />
          )}

          <ExplanationPanel
            description={maskNarration(currentStep?.description || 'Click Play to observe step-by-step greedy execution.', quizSession.phase)}
            steps={executionData.steps}
            currentStepIndex={currentStepIndex}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
          />
        </div>
      </div>

      <TheoryPanel categoryId="greedy" activeTopic={selectedAlg} />

      {/* Reusable Native FullScreen Canvas Modal */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Greedy Algorithms | ${selectedAlg.toUpperCase()}`}
        subtitle="Greedy Choice Visualizer"
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
        <ArrayRenderer currentStep={currentStep} />
      </FullScreenCanvasModal>
    </div>
  );
};
