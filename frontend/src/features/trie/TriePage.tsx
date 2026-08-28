import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Binary, Search, GitBranch, BookOpen, MessageSquare, Maximize2, HelpCircle, Sparkles, Trash2, Layers
} from 'lucide-react';
import { TrieRenderer } from './TrieRenderer';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { FloatingController } from '../../components/controls/FloatingController';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildTrieCheckpoints, buildRevisionData } from './quizAdapter';
import type { TrieAlgorithmKey } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';

import { runTrieInsert } from './algorithms/trieInsert';
import { runTrieSearch } from './algorithms/trieSearch';
import { runTriePrefix } from './algorithms/triePrefix';
import { runWordDictionary } from './algorithms/wordDictionary';
import { runAutocomplete } from './algorithms/autocomplete';
import type { TrieStep } from './algorithms/trieTypes';

import '../sorting/Sorting.css';
import '../bst/BST.css';
import './Trie.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';

interface AlgMeta {
  key: TrieAlgorithmKey;
  name: string;
  complexity: string;
  icon: React.ReactNode;
}

const ALGORITHMS: AlgMeta[] = [
  { key: 'trieInsert',     name: 'Trie Insert',       complexity: 'O(m)',  icon: <Binary size={14} /> },
  { key: 'trieSearch',     name: 'Trie Search',       complexity: 'O(m)',  icon: <Search size={14} /> },
  { key: 'triePrefix',     name: 'Prefix Search',     complexity: 'O(p+k)', icon: <GitBranch size={14} /> },
  { key: 'wordDictionary', name: 'Word Dictionary',   complexity: 'O(m·b)', icon: <BookOpen size={14} /> },
  { key: 'autocomplete',   name: 'Autocomplete',      complexity: 'O(p+k)', icon: <MessageSquare size={14} /> },
];

const DEFAULT_PARAMS: Record<TrieAlgorithmKey, { words: string; query: string }> = {
  trieInsert:     { words: 'cat car card dog door',             query: '' },
  trieSearch:     { words: 'cat car dog',                       query: 'car' },
  triePrefix:     { words: 'apple apply application bat batch', query: 'app' },
  wordDictionary: { words: 'hello hall ham',                    query: 'h.l.' },
  autocomplete:   { words: 'cat car card care careful',         query: 'car' },
};

const RANDOM_WORD_POOL = [
  'apple','app','apply','bat','batch','boat','book','code','coder','data',
  'dog','door','dot','eat','eat','ear','hello','hall','ham','hat','heap',
  'heat','help','hero','hill','hint','hop','hot','map','mat','max','node',
  'not','now','top','toy','tree','trie','try','two','zip','zone',
];

function pickRandomWords(count: number): string[] {
  const shuffled = [...RANDOM_WORD_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export const TriePage: React.FC = () => {
  const [selectedAlg, setSelectedAlg] = useState<TrieAlgorithmKey>('trieInsert');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ALGORITHMS.some((a) => a.key === topic)) {
      setSelectedAlg(topic as TrieAlgorithmKey);
    }
  }, [searchParams]);

  const [wordsInput, setWordsInput] = useState<string>(DEFAULT_PARAMS.trieInsert.words);
  const [queryInput, setQueryInput] = useState<string>(DEFAULT_PARAMS.trieSearch.query);
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [quizEnabled, setQuizEnabled] = useState(false);
  const [cadence, setCadence] = useState<QuizCadence>('normal');

  const executionData = useMemo(() => {
    const words = wordsInput.split(/[\s,]+/).filter(w => w.length > 0);
    switch (selectedAlg) {
      case 'trieInsert':
        return { steps: runTrieInsert(words), timeComplexity: { best: 'O(m)', average: 'O(m)', worst: 'O(m)' }, spaceComplexity: 'O(n·m)' };
      case 'trieSearch':
        return { steps: runTrieSearch(words, queryInput), timeComplexity: { best: 'O(m)', average: 'O(m)', worst: 'O(m)' }, spaceComplexity: 'O(1)' };
      case 'triePrefix':
        return { steps: runTriePrefix(words, queryInput), timeComplexity: { best: 'O(p)', average: 'O(p+k)', worst: 'O(p+k)' }, spaceComplexity: 'O(k)' };
      case 'wordDictionary':
        return { steps: runWordDictionary(words, queryInput), timeComplexity: { best: 'O(m)', average: 'O(m·b)', worst: 'O(m·26^m)' }, spaceComplexity: 'O(m)' };
      case 'autocomplete':
        return { steps: runAutocomplete(words, queryInput), timeComplexity: { best: 'O(p)', average: 'O(p+k)', worst: 'O(p+k)' }, spaceComplexity: 'O(k)' };
      default:
        return { steps: runTrieInsert(words), timeComplexity: { best: 'O(m)', average: 'O(m)', worst: 'O(m)' }, spaceComplexity: 'O(n·m)' };
    }
  }, [selectedAlg, wordsInput, queryInput]);

  const {
    currentStepIndex, currentStep, totalSteps, isPlaying,
    play, pause, stepForward, stepBack, reset,
  } = useStepPlayer({ steps: executionData.steps });

  const trieStep = currentStep as TrieStep | null;

  const quizCheckpoints = useMemo(
    () => buildTrieCheckpoints(executionData.steps, selectedAlg),
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
    module: 'trie' as any,
    algorithmId: selectedAlg,
    revisionData: buildRevisionData(selectedAlg),
  });

  useEffect(() => {
    quizSession.resetSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAlg, wordsInput, queryInput]);

  const handleRandomize = () => {
    reset();
    quizSession.resetSession();
    const rnd = pickRandomWords(5);
    setWordsInput(rnd.join(' '));
    if (selectedAlg === 'trieSearch' || selectedAlg === 'triePrefix' || selectedAlg === 'autocomplete') {
      setQueryInput(rnd[0].substring(0, 3));
    } else if (selectedAlg === 'wordDictionary') {
      const w = rnd[0];
      setQueryInput(w[0] + '.' + w.substring(2));
    }
  };

  const handleEmpty = () => {
    reset();
    quizSession.resetSession();
    setWordsInput('');
    setQueryInput('');
  };

  const handleSample = () => {
    reset();
    quizSession.resetSession();
    const d = DEFAULT_PARAMS[selectedAlg];
    setWordsInput(d.words);
    setQueryInput(d.query);
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
      <div className="trie-input-group">
        <span>Words:</span>
        <input
          type="text"
          value={wordsInput}
          onChange={(e) => { setWordsInput(e.target.value); reset(); }}
          placeholder="space-separated words"
          className="wide"
        />
      </div>
      {selectedAlg !== 'trieInsert' && (
        <div className="trie-input-group">
          <span>{selectedAlg === 'wordDictionary' ? 'Pattern:' : 'Query:'}</span>
          <input
            type="text"
            value={queryInput}
            onChange={(e) => { setQueryInput(e.target.value); reset(); }}
            placeholder={selectedAlg === 'wordDictionary' ? 'e.g. h.l.' : 'e.g. car'}
          />
        </div>
      )}
      <div className="dataset-mode-selector ml-1">
        <button className="bst-btn btn-mode" onClick={handleEmpty} title="Clear"><Trash2 size={13} className="text-rose-400" /><span>Empty</span></button>
        <button className="bst-btn btn-mode" onClick={handleSample} title="Sample"><Layers size={13} className="text-amber-400" /><span>Sample</span></button>
        <button className="bst-btn btn-mode" onClick={handleRandomize} title="Random"><Sparkles size={13} className="text-emerald-400" /><span>Random</span></button>
      </div>
      <label className="predict-toggle-label ml-2">
        <HelpCircle size={14} /><span>Quiz Mode</span>
        <input type="checkbox" checked={quizEnabled} onChange={(e) => setQuizEnabled(e.target.checked)} />
      </label>
    </div>
  );

  return (
    <div className="bst-page-container">
      <VisualizerHeader
        icon={<Binary size={22} />}
        title="Trie (Prefix Tree) Studio"
        subtitle="Interactive Insert, Search, Prefix Match, Wildcard Dictionary & Autocomplete"
        items={ALGORITHMS.map(a => ({
          id: a.key,
          name: a.name,
          description: `Step-by-step ${a.name} visualization on a Trie`,
        }))}
        activeId={selectedAlg}
        onSelect={(id) => {
          setSelectedAlg(id as TrieAlgorithmKey);
          const d = DEFAULT_PARAMS[id as TrieAlgorithmKey];
          setWordsInput(d.words);
          setQueryInput(d.query);
          reset();
          quizSession.resetSession();
        }}
        placeholder="Search trie algorithm..."
      />

      <div className="tree-category-toolbar animate-fade-in">
        <div className="tree-category-tabs flex-wrap">
          {ALGORITHMS.map(alg => (
            <button
              key={alg.key}
              className={`category-tab ${selectedAlg === alg.key ? 'active' : ''}`}
              onClick={() => {
                setSelectedAlg(alg.key);
                const d = DEFAULT_PARAMS[alg.key];
                setWordsInput(d.words);
                setQueryInput(d.query);
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

      <div className="bst-toolbar animate-fade-in">
        <div className="bst-toolbar-left">
          <div className="trie-input-group">
            <span>Words:</span>
            <input
              type="text"
              value={wordsInput}
              onChange={(e) => { setWordsInput(e.target.value); reset(); }}
              placeholder="space-separated words"
              className="wide"
            />
          </div>

          {selectedAlg !== 'trieInsert' && (
            <div className="trie-input-group">
              <span>{selectedAlg === 'wordDictionary' ? 'Pattern:' : selectedAlg === 'triePrefix' ? 'Prefix:' : 'Query:'}</span>
              <input
                type="text"
                value={queryInput}
                onChange={(e) => { setQueryInput(e.target.value); reset(); }}
                placeholder={selectedAlg === 'wordDictionary' ? 'e.g. h.l.' : selectedAlg === 'triePrefix' ? 'e.g. app' : 'e.g. car'}
              />
            </div>
          )}

          <div className="dataset-mode-selector">
            <button className="bst-btn btn-mode" onClick={handleEmpty} title="Clear All">
              <Trash2 size={14} className="text-rose-400" /><span>Empty</span>
            </button>
            <button className="bst-btn btn-mode" onClick={handleSample} title="Load Sample">
              <Layers size={14} className="text-amber-400" /><span>Sample</span>
            </button>
            <button className="bst-btn btn-mode" onClick={handleRandomize} title="Random Words">
              <Sparkles size={14} className="text-emerald-400" /><span>Random</span>
            </button>
          </div>
        </div>

        <div className="bst-toolbar-right">
          <div className="predict-mode-group flex items-center gap-2">
            <label className="predict-toggle-label">
              <HelpCircle size={16} /><span>Quiz Mode</span>
              <input type="checkbox" checked={quizEnabled} onChange={(e) => setQuizEnabled(e.target.checked)} />
            </label>
            <button className="bst-btn btn-fullscreen" onClick={() => setIsFullScreenOpen(true)} title="Full Screen">
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="sorting-workspace scene-workspace">
        <div className="renderer-section">
          <TrieRenderer
            currentStep={trieStep}
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
            title="Trie"
            activeLine={trieStep?.codeLine}
            variables={trieStep?.variables}
            onCustomCodeRun={(arraySteps) => {
              const trieSteps: TrieStep[] = arraySteps.map(s => ({
                trieNodes: [],
                trieEdges: [],
                description: s.description,
                codeLine: s.codeLine,
                variables: s.variables || {},
                array: [],
              }));
              // eslint-disable-next-line no-console
              console.log('Custom code run:', trieSteps.length, 'steps');
            }}
            currentArray={[]}
          />

          <ExplanationPanel
            description={maskNarration(trieStep?.description || 'Select an algorithm and enter words to visualize the Trie.', quizSession.phase)}
            steps={executionData.steps}
            currentStepIndex={currentStepIndex}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
          />
        </div>
      </div>

      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Trie Studio | ${selectedAlg.toUpperCase()}`}
        subtitle="Prefix Tree Inspector"
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
        <TrieRenderer currentStep={trieStep} />
      </FullScreenCanvasModal>
      <TheoryPanel categoryId="trie" activeTopic={selectedAlg} />

    </div>
  );
};
