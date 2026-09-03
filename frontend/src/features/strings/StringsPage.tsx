import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Type, Repeat, ArrowLeftRight, BarChart3, Maximize2, Sparkles, Trash2, Layers
} from 'lucide-react';
import { StringRenderer } from './StringRenderer';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { FloatingController } from '../../components/controls/FloatingController';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { ResizablePanelRow } from '../../components/layout/ResizablePanelRow';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { VisualizerActions } from '../../components/layout/VisualizerActions';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildStringsCheckpoints, buildRevisionData, type StringAlgorithmKey } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';

import { generatePalindromeSteps } from './algorithms/palindrome';
import { generateAnagramSteps } from './algorithms/anagram';
import { generateStringReverseSteps } from './algorithms/stringReverse';
import { generateFrequencyCountSteps } from './algorithms/frequencyCount';

import '../sorting/Sorting.css';
import './Strings.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';
import { useTutorContext } from '../../contexts/TutorContext';


interface AlgMeta {
  key: StringAlgorithmKey;
  name: string;
  complexity: string;
  icon: React.ReactNode;
}

const ALGORITHMS: AlgMeta[] = [
  { key: 'palindrome', name: 'Palindrome Check', complexity: 'O(n)', icon: <Repeat size={14} /> },
  { key: 'anagram', name: 'Anagram Check', complexity: 'O(n)', icon: <ArrowLeftRight size={14} /> },
  { key: 'reverse', name: 'String Reversal', complexity: 'O(n)', icon: <Type size={14} /> },
  { key: 'frequency', name: 'Frequency Count', complexity: 'O(n)', icon: <BarChart3 size={14} /> },
];

const SAMPLE_STRINGS: Record<StringAlgorithmKey, { primary: string; secondary: string }> = {
  palindrome: { primary: 'racecar', secondary: '' },
  anagram: { primary: 'listen', secondary: 'silent' },
  reverse: { primary: 'hello', secondary: '' },
  frequency: { primary: 'mississippi', secondary: '' },
};

export const StringsPage: React.FC = () => {
  const { setTutorContext } = useTutorContext();
  const [selectedAlg, setSelectedAlg] = useState<StringAlgorithmKey>('palindrome');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ALGORITHMS.some((a) => a.key === topic)) {
      setSelectedAlg(topic as StringAlgorithmKey);
    }
  }, [searchParams]);

  const [inputStr, setInputStr] = useState<string>('racecar');
  const [secondStr, setSecondStr] = useState<string>('silent');

  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [showDebugger, setShowDebugger] = useState<boolean>(true);
  const [customizeModeEnabled, setCustomizeModeEnabled] = useState<boolean>(false);
  const [cadence, setCadence] = useState<QuizCadence>('normal');

  const executionData = useMemo(() => {
    const str = inputStr || 'a';
    switch (selectedAlg) {
      case 'palindrome':
        return generatePalindromeSteps(str);
      case 'anagram':
        return generateAnagramSteps(str, secondStr || str);
      case 'reverse':
        return generateStringReverseSteps(str);
      case 'frequency':
        return generateFrequencyCountSteps(str);
      default:
        return generatePalindromeSteps(str);
    }
  }, [selectedAlg, inputStr, secondStr]);

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

  // Publish active context to Octa AI Tutor
  useEffect(() => {
    const algObj = ALGORITHMS.find((a) => a.key === selectedAlg);

    setTutorContext({
      algorithmName: algObj?.name || selectedAlg,
      algorithmId: selectedAlg,
      category: 'strings',
      currentStepDescription: currentStep?.description || '',
      currentStepIndex,
      totalSteps,
      currentStep,
      steps: executionData.steps,
      play,
      pause,
      stepForward,
      reset,
      setShowDebugger,
      onLaunchQuiz: () => setQuizEnabled(true),
    });
  }, [selectedAlg, currentStepIndex, totalSteps, currentStep, executionData.steps, setTutorContext, play, pause, stepForward, reset]);

  const quizCheckpoints = useMemo(
    () => buildStringsCheckpoints(executionData.steps, selectedAlg),
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
    module: 'strings',
    algorithmId: selectedAlg,
    revisionData: buildRevisionData(selectedAlg),
  });

  useEffect(() => {
    reset();
    quizSession.resetSession();
  }, [selectedAlg, inputStr, secondStr]);

  const handleAlgorithmChange = (key: StringAlgorithmKey) => {
    setSelectedAlg(key);
    const sample = SAMPLE_STRINGS[key];
    setInputStr(sample.primary);
    setSecondStr(sample.secondary);
    reset();
    quizSession.resetSession();
  };

  const handleRandomize = () => {
    reset();
    quizSession.resetSession();
    const samples: Record<StringAlgorithmKey, string[]> = {
      palindrome: ['racecar', 'madam', 'level', 'deified', 'rotator', 'civic', 'hello'],
      anagram: ['listen', 'triangle', 'astronomer', 'dormitory', 'schoolmaster'],
      reverse: ['hello', 'algorithm', 'programming', 'string', 'studio'],
      frequency: ['mississippi', 'supercalifragilistic', 'abracadabra', 'hello'],
    };
    const pool = samples[selectedAlg];
    const picked = pool[Math.floor(Math.random() * pool.length)];
    setInputStr(picked);
    if (selectedAlg === 'anagram') {
      const shuffled = picked.split('').sort(() => Math.random() - 0.5).join('');
      setSecondStr(shuffled);
    }
  };

  const handleEmpty = () => {
    reset();
    quizSession.resetSession();
    setInputStr('');
    setSecondStr('');
  };

  const handleSample = () => {
    reset();
    quizSession.resetSession();
    const sample = SAMPLE_STRINGS[selectedAlg];
    setInputStr(sample.primary);
    setSecondStr(sample.secondary);
  };

  /* ── Transfer challenge ("Prove You Understand") ─────────────────
     A fresh string from the pool, predicted cold. startChallenge() must
     fire in the same handler as the input change so the armed challenge
     survives the checkpoint reset the new execution triggers. */
  const handleProveIt = () => {
    quizSession.startChallenge();
    handleRandomize();
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
      <div className="string-input-group">
        <span>String:</span>
        <input
          type="text"
          value={inputStr}
          onChange={(e) => setInputStr(e.target.value)}
          placeholder="Enter string..."
        />
      </div>

      {selectedAlg === 'anagram' && (
        <div className="string-input-group">
          <span>Second:</span>
          <input
            type="text"
            value={secondStr}
            onChange={(e) => setSecondStr(e.target.value)}
            placeholder="Second string..."
          />
        </div>
      )}

      <div className="dataset-mode-selector">
        <button className="bst-btn btn-mode" onClick={handleEmpty} title="Clear Input">
          <Trash2 size={14} className="text-rose-400" /><span>Empty</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleSample} title="Sample Input">
          <Layers size={14} className="text-amber-400" /><span>Sample</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleRandomize} title="Random String">
          <Sparkles size={14} className="text-emerald-400" />
          <span>Random</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="bst-page-container">
      <VisualizerHeader
        icon={<Type size={22} />}
        title="String Algorithms Studio"
        subtitle="Interactive Palindrome, Anagram, Reversal & Frequency Analysis"
        items={ALGORITHMS.map((alg) => ({
          id: alg.key,
          name: alg.name,
          description: `Step-by-step ${alg.name} execution over character arrays`,
        }))}
        activeId={selectedAlg}
        onSelect={(id) => handleAlgorithmChange(id as StringAlgorithmKey)}
        placeholder="Search string algorithm..."
        actions={
          <VisualizerActions
            quizEnabled={quizEnabled}
            onToggleQuiz={() => setQuizEnabled((v) => !v)}
            debuggerVisible={showDebugger}
            onToggleDebugger={() => setShowDebugger((v) => !v)}
          customizeModeEnabled={customizeModeEnabled}
          onToggleCustomizeMode={() => setCustomizeModeEnabled((v) => !v)}
          onResetLayout={() => setCustomizeModeEnabled(false)}
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
        {/* Left Column: String Canvas & Interactive Controls */}
        <div className="renderer-section">
          <StringRenderer
            currentStep={currentStep}
            originalString={inputStr}
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

        {/* Right Column: Quiz Dock & Explanation */}
        <div className="quiz-rail">
          <QuizDock
            session={quizSession}
            cadence={cadence}
            onCadenceChange={setCadence}
            onEnableQuiz={() => setQuizEnabled(true)}
            onProveIt={handleProveIt}
          />
        </div>
        <ResizablePanelRow
          storageKey="strings"
          customizeModeEnabled={customizeModeEnabled}
          debuggerPanel={showDebugger ? (
            <MultiLanguageCodePanel
              algorithmKey={selectedAlg}
              title="String Algorithm"
              categoryId="strings"
              topicId={selectedAlg}
            />
          ) : null}

          explanationPanel={<ExplanationPanel
            description={maskNarration(currentStep?.description || 'Click Play to observe step-by-step execution details.', quizSession.phase)}
            steps={executionData.steps}
            currentStepIndex={currentStepIndex}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
          />
          }
        />
      </div>

      {/* FullScreen Canvas Modal */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`String Algorithms | ${selectedAlg.toUpperCase()}`}
        subtitle="String Character Inspector"
        explanationPanel={<ExplanationPanel description={maskNarration(currentStep?.description || 'Click Play to observe step-by-step execution details.', quizSession.phase)} steps={executionData.steps} currentStepIndex={currentStepIndex} timeComplexity={executionData.timeComplexity} spaceComplexity={executionData.spaceComplexity} />}
        toolbarControls={
          <div className="fs-floating-controls">
            {renderToolbarControls()}
            <VisualizerActions
              quizEnabled={quizEnabled}
              onToggleQuiz={() => setQuizEnabled((v) => !v)}
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
        <StringRenderer
          currentStep={currentStep}
          originalString={inputStr}
        />
      </FullScreenCanvasModal>
      <TheoryPanel categoryId="strings" activeTopic={selectedAlg} />

    </div>
  );
};
