import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Type, Repeat, ArrowLeftRight, BarChart3, Maximize2, HelpCircle, Sparkles, Trash2, Layers
} from 'lucide-react';
import { StringRenderer } from './StringRenderer';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { PlayPauseButton } from '../../components/controls/PlayPauseButton';
import { StepControls } from '../../components/controls/StepControls';
import { SpeedSlider } from '../../components/controls/SpeedSlider';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
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
  const [quizEnabled, setQuizEnabled] = useState<boolean>(true);
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
    speed,
    play,
    pause,
    stepForward,
    stepBack,
    reset,
    setSpeed,
  } = useStepPlayer({ steps: executionData.steps });

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

  const renderPlayerControls = () => (
    <div className="player-bar" style={{ margin: 0 }}>
      <div className="player-left">
        <PlayPauseButton
          isPlaying={isPlaying}
          onToggle={isPlaying ? pause : play}
        />
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
          <div
            className="step-progress-fill"
            style={{ width: `${(currentStepIndex / Math.max(1, totalSteps - 1)) * 100}%` }}
          />
        </div>
        <span className="step-counter">
          Step {currentStepIndex + 1} / {totalSteps}
        </span>
      </div>

      <div className="player-right">
        <SpeedSlider speed={speed} onSpeedChange={setSpeed} />
      </div>
    </div>
  );

  const renderFloatingControls = () => (
    <div className="fs-floating-controls">
      <div className="string-input-group">
        <span>Input:</span>
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

      <div className="dataset-mode-selector ml-1">
        <button className="bst-btn btn-mode" onClick={handleEmpty} title="Clear Input">
          <Trash2 size={14} /><span>Empty</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleSample} title="Sample Input">
          <Layers size={14} /><span>Sample</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleRandomize} title="Random String">
          <Sparkles size={14} />
          <span>Random</span>
        </button>
      </div>

      <label className="predict-toggle-label ml-2">
        <HelpCircle size={16} />
        <span>Quiz Mode</span>
        <input type="checkbox" checked={quizEnabled} onChange={(e) => setQuizEnabled(e.target.checked)} />
      </label>
    </div>
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
          group: alg.complexity,
        }))}
        activeId={selectedAlg}
        onSelect={(id) => handleAlgorithmChange(id as StringAlgorithmKey)}
        placeholder="Search string algorithm or complexity..."
      />

      {/* Category Tabs Bar */}
      <div className="tree-category-toolbar animate-fade-in">
        <div className="tree-category-tabs flex-wrap">
          {ALGORITHMS.map((alg) => (
            <button
              key={alg.key}
              className={`category-tab ${selectedAlg === alg.key ? 'active' : ''}`}
              onClick={() => handleAlgorithmChange(alg.key)}
            >
              {alg.icon}
              <span>{alg.name}</span>
              <span className="text-[10px] opacity-75 font-mono bg-black/30 px-1.5 py-0.5 rounded ml-1">{alg.complexity}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Operations Toolbar */}
      <div className="bst-toolbar animate-fade-in">
        <div className="bst-toolbar-left">
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
      <div className="sorting-workspace">
        {/* Left Column: String Canvas & Interactive Controls */}
        <div className="renderer-section">
          <StringRenderer
            currentStep={currentStep}
            originalString={inputStr}
            onToggleFullscreen={() => setIsFullScreenOpen(true)}
          />

          {renderPlayerControls()}
        </div>

        {/* Right Column: Quiz Dock & Explanation */}
        <div className="explanation-section">
          <QuizDock session={quizSession} cadence={cadence} onCadenceChange={setCadence} />

          <MultiLanguageCodePanel
            algorithmKey={selectedAlg}
            title="String Algorithm"
          />

          <ExplanationPanel
            description={maskNarration(currentStep?.description || 'Click Play to observe step-by-step execution details.', quizSession.phase)}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
          />
        </div>
      </div>

      {/* FullScreen Canvas Modal */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`String Algorithms | ${selectedAlg.toUpperCase()}`}
        subtitle="String Character Inspector"
        toolbarControls={renderFloatingControls()}
        playbackControls={renderPlayerControls()}
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
