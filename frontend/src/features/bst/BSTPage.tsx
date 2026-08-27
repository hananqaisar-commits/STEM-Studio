import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, HelpCircle, ListOrdered, GitCommit, CornerDownRight, Sparkles, Layers, Trash2, ArrowUp, ArrowDown, Network, Scale, Binary } from 'lucide-react';
import { BSTRenderer } from './BSTRenderer';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { PlayPauseButton } from '../../components/controls/PlayPauseButton';
import { StepControls } from '../../components/controls/StepControls';
import { SpeedSlider } from '../../components/controls/SpeedSlider';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildBSTCheckpoints, buildRevisionData } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';

import {
  generateBSTInsertSteps,
  generateBSTSearchSteps,
  generateBSTInorderSteps,
  generateBSTPreorderSteps,
  generateBSTPostorderSteps,
  generateRandomBST,
} from './bstEngine';
import type { BSTTreeStructure, BSTStep } from './bstEngine';

import { generateAVLInsertSteps } from './avlEngine';
import type { AVLNodeStructure } from './avlEngine';
import { generateHeapInsertSteps, generateHeapExtractSteps } from './heapEngine';
import type { HeapType } from './heapEngine';
import { generateTrieInsertSteps, generateTrieSearchSteps, createTrieRoot } from './trieEngine';
import type { TrieNodeStructure } from './trieEngine';

import './BST.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';

type TreeCategory = 'bst' | 'avl' | 'heap' | 'trie';

const DEFAULT_BST_TREE: BSTTreeStructure = {
  value: 50,
  id: 'node_50',
  left: {
    value: 30,
    id: 'node_30',
    left: { value: 20, id: 'node_20' },
    right: { value: 40, id: 'node_40' },
  },
  right: {
    value: 70,
    id: 'node_70',
    left: { value: 60, id: 'node_60' },
    right: { value: 80, id: 'node_80' },
  },
};

const SAMPLE_TRIE_WORDS = ['cat', 'car', 'card', 'dog', 'dot'];
const RANDOM_WORD_POOL = ['apple', 'app', 'code', 'coder', 'tree', 'trie', 'data', 'algo', 'node', 'heap'];

export const BSTPage: React.FC = () => {
  const [treeCategory, setTreeCategory] = useState<TreeCategory>('bst');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ['bst', 'avl', 'heap', 'trie'].includes(topic)) {
      setTreeCategory(topic as TreeCategory);
    }
  }, [searchParams]);

  const [inputValue, setInputValue] = useState<string>('45');
  const [wordValue, setWordValue] = useState<string>('cat');
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [cadence, setCadence] = useState<QuizCadence>('normal');
  const [isFullScreenOpen, setIsFullScreenOpen] = useState<boolean>(false);
  const [activeOperationSteps, setActiveOperationSteps] = useState<BSTStep[]>([]);

  // Category State Stores
  const [bstTree, setBstTree] = useState<BSTTreeStructure | undefined>(DEFAULT_BST_TREE);
  const [avlTree, setAvlTree] = useState<AVLNodeStructure | undefined>(undefined);
  const [heapArray, setHeapArray] = useState<number[]>([90, 75, 60, 40, 55, 20]);
  const [heapType, setHeapType] = useState<HeapType>('max');
  const [trieRoot, setTrieRoot] = useState<TrieNodeStructure>(createTrieRoot());

  // Initialize steps when switching category
  useEffect(() => {
    if (treeCategory === 'bst') {
      const { steps } = generateBSTInsertSteps(DEFAULT_BST_TREE, 45);
      setActiveOperationSteps(steps);
    } else if (treeCategory === 'avl') {
      const { steps, newTree } = generateAVLInsertSteps(undefined, 30);
      setAvlTree(newTree);
      setActiveOperationSteps(steps);
    } else if (treeCategory === 'heap') {
      const { steps } = generateHeapInsertSteps([90, 75, 60, 40, 55, 20], 85, 'max');
      setActiveOperationSteps(steps);
    } else if (treeCategory === 'trie') {
      let root = createTrieRoot();
      SAMPLE_TRIE_WORDS.forEach((w) => {
        const res = generateTrieInsertSteps(root, w);
        root = res.newRoot;
      });
      setTrieRoot(root);
      const { steps } = generateTrieInsertSteps(root, 'cat');
      setActiveOperationSteps(steps);
    }
  }, [treeCategory]);

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
  } = useStepPlayer({ steps: activeOperationSteps });

  const bstStep = currentStep as BSTStep | null;

  // Build quiz checkpoints from the current operation steps
  const quizCheckpoints = React.useMemo(
    () => buildBSTCheckpoints(activeOperationSteps),
    [activeOperationSteps]
  );

  const quizSession = useQuizSession({
    enabled: quizEnabled,
    checkpoints: quizCheckpoints,
    cadence,
    currentStepIndex,
    isPlaying,
    pause,
    stepForward,
    module: 'bst',
    algorithmId: treeCategory,
    revisionData: buildRevisionData('insert'),
  });

  // Operations for BST
  const handleBSTInsert = () => {
    const num = Number(inputValue);
    if (isNaN(num)) return;
    const { steps, newTree } = generateBSTInsertSteps(bstTree, num);
    setBstTree(newTree);
    setActiveOperationSteps(steps);
    reset();
    quizSession.resetSession();
    if (!quizEnabled) play();
  };

  const handleBSTSearch = () => {
    const num = Number(inputValue);
    if (isNaN(num)) return;
    const steps = generateBSTSearchSteps(bstTree, num);
    setActiveOperationSteps(steps);
    reset();
    quizSession.resetSession();
    if (!quizEnabled) play();
  };

  // Operations for AVL
  const handleAVLInsert = () => {
    const num = Number(inputValue);
    if (isNaN(num)) return;
    const { steps, newTree } = generateAVLInsertSteps(avlTree, num);
    setAvlTree(newTree);
    setActiveOperationSteps(steps);
    reset();
    quizSession.resetSession();
    play();
  };

  // Operations for Heap
  const handleHeapInsert = () => {
    const num = Number(inputValue);
    if (isNaN(num)) return;
    const { steps, newHeap } = generateHeapInsertSteps(heapArray, num, heapType);
    setHeapArray(newHeap);
    setActiveOperationSteps(steps);
    reset();
    quizSession.resetSession();
    play();
  };

  const handleHeapExtract = () => {
    const { steps, newHeap } = generateHeapExtractSteps(heapArray, heapType);
    setHeapArray(newHeap);
    setActiveOperationSteps(steps);
    reset();
    quizSession.resetSession();
    play();
  };

  // Operations for Trie
  const handleTrieInsert = () => {
    if (!wordValue.trim()) return;
    const { steps, newRoot } = generateTrieInsertSteps(trieRoot, wordValue.trim());
    setTrieRoot(newRoot);
    setActiveOperationSteps(steps);
    reset();
    quizSession.resetSession();
    play();
  };

  const handleTrieSearch = () => {
    if (!wordValue.trim()) return;
    const steps = generateTrieSearchSteps(trieRoot, wordValue.trim());
    setActiveOperationSteps(steps);
    reset();
    quizSession.resetSession();
    play();
  };

  // Preset Handlers Across All Categories
  const handleEmptyTree = () => {
    if (treeCategory === 'bst') setBstTree(undefined);
    if (treeCategory === 'avl') setAvlTree(undefined);
    if (treeCategory === 'heap') setHeapArray([]);
    if (treeCategory === 'trie') setTrieRoot(createTrieRoot());
    setActiveOperationSteps([]);
    reset();
    quizSession.resetSession();
  };

  const handleSampleTree = () => {
    if (treeCategory === 'bst') {
      setBstTree(DEFAULT_BST_TREE);
      setActiveOperationSteps(generateBSTInsertSteps(DEFAULT_BST_TREE, 45).steps);
    } else if (treeCategory === 'avl') {
      let tree: AVLNodeStructure | undefined = undefined;
      let lastSteps: BSTStep[] = [];
      [30, 20, 40, 10, 25, 35, 50].forEach((v) => {
        const res = generateAVLInsertSteps(tree, v);
        tree = res.newTree;
        lastSteps = res.steps;
      });
      setAvlTree(tree);
      setActiveOperationSteps(lastSteps);
    } else if (treeCategory === 'heap') {
      const sample = [90, 75, 60, 40, 55, 20];
      setHeapArray(sample);
      setActiveOperationSteps(generateHeapInsertSteps(sample, 85, heapType).steps);
    } else if (treeCategory === 'trie') {
      let root = createTrieRoot();
      SAMPLE_TRIE_WORDS.forEach((w) => {
        const res = generateTrieInsertSteps(root, w);
        root = res.newRoot;
      });
      setTrieRoot(root);
      setActiveOperationSteps(generateTrieInsertSteps(root, 'cat').steps);
    }
    reset();
    quizSession.resetSession();
  };

  const handleRandomTree = () => {
    if (treeCategory === 'bst') {
      const rnd = generateRandomBST(6);
      setBstTree(rnd);
      setActiveOperationSteps(generateBSTInsertSteps(rnd, Math.floor(Math.random() * 80) + 10).steps);
    } else if (treeCategory === 'avl') {
      let tree: AVLNodeStructure | undefined = undefined;
      let lastSteps: BSTStep[] = [];
      for (let i = 0; i < 6; i++) {
        const v = Math.floor(Math.random() * 80) + 10;
        const res = generateAVLInsertSteps(tree, v);
        tree = res.newTree;
        lastSteps = res.steps;
      }
      setAvlTree(tree);
      setActiveOperationSteps(lastSteps);
    } else if (treeCategory === 'heap') {
      const rndArr = Array.from({ length: 6 }, () => Math.floor(Math.random() * 85) + 10);
      setHeapArray(rndArr);
      setActiveOperationSteps(generateHeapInsertSteps(rndArr, Math.floor(Math.random() * 85) + 10, heapType).steps);
    } else if (treeCategory === 'trie') {
      let root = createTrieRoot();
      const count = 4;
      const shuffled = [...RANDOM_WORD_POOL].sort(() => 0.5 - Math.random()).slice(0, count);
      shuffled.forEach((w) => {
        const res = generateTrieInsertSteps(root, w);
        root = res.newRoot;
      });
      setTrieRoot(root);
      setActiveOperationSteps(generateTrieInsertSteps(root, shuffled[0]).steps);
    }
    reset();
  };


  // Shared Floating Header Controls for FullScreen Modal
  const renderFloatingControls = () => (
    <div className="fs-floating-controls">
      {treeCategory !== 'trie' ? (
        <input
          type="number"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="bst-input"
          style={{ width: '75px' }}
          placeholder="Val"
        />
      ) : (
        <input
          type="text"
          value={wordValue}
          onChange={(e) => setWordValue(e.target.value)}
          className="bst-input"
          style={{ width: '85px' }}
          placeholder="Word"
        />
      )}

      {treeCategory === 'bst' && (
        <div className="flex items-center gap-2">
          <button className="bst-btn btn-insert" onClick={handleBSTInsert}>
            <Plus size={14} />
            <span>Insert</span>
          </button>
          <button className="bst-btn btn-search" onClick={handleBSTSearch}>
            <Search size={14} />
            <span>Search</span>
          </button>
        </div>
      )}

      {treeCategory === 'avl' && (
        <div className="flex items-center gap-2">
          <button className="bst-btn btn-insert" onClick={handleAVLInsert}>
            <Plus size={14} />
            <span>Insert AVL</span>
          </button>
        </div>
      )}

      {treeCategory === 'heap' && (
        <div className="flex items-center gap-2">
          <button className="bst-btn btn-insert" onClick={handleHeapInsert}>
            <Plus size={14} />
            <span>Push Heap</span>
          </button>
          <button className="bst-btn btn-search" onClick={handleHeapExtract}>
            <ArrowDown size={14} />
            <span>Extract Root</span>
          </button>
        </div>
      )}

      {treeCategory === 'trie' && (
        <div className="flex items-center gap-2">
          <button className="bst-btn btn-insert" onClick={handleTrieInsert}>
            <Plus size={14} />
            <span>Insert Word</span>
          </button>
          <button className="bst-btn btn-search" onClick={handleTrieSearch}>
            <Search size={14} />
            <span>Search Prefix</span>
          </button>
        </div>
      )}

      {/* Preset Action Buttons Shared Across ALL Categories */}
      <div className="dataset-mode-selector ml-1">
        <button className="bst-btn btn-mode" onClick={handleEmptyTree} title="Clear Tree Structure">
          <Trash2 size={13} className="text-rose-400" />
          <span>Empty</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleSampleTree} title="Load Standard Sample Tree">
          <Layers size={13} className="text-amber-400" />
          <span>Sample</span>
        </button>
        <button className="bst-btn btn-mode" onClick={handleRandomTree} title="Generate Random Tree">
          <Sparkles size={13} className="text-emerald-400" />
          <span>Random</span>
        </button>
      </div>

      <label className="predict-toggle-label ml-2">
        <HelpCircle size={14} />
        <span>Quiz Mode</span>
        <input
          type="checkbox"
          checked={quizEnabled}
          onChange={(e) => setQuizEnabled(e.target.checked)}
        />
      </label>
    </div>
  );

  // Shared Player Controls
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
          <div className="step-progress-fill" style={{ width: `${(currentStepIndex / Math.max(1, totalSteps - 1)) * 100}%` }} />
        </div>
        <span className="step-counter">Step {currentStepIndex + 1} / {totalSteps}</span>
      </div>
      <div className="player-right">
        <SpeedSlider speed={speed} onSpeedChange={setSpeed} />
      </div>
    </div>
  );

  return (
    <div className="bst-page-container">
      <VisualizerHeader
        icon={<Network size={22} />}
        title="Tree Structures Studio"
        subtitle="Interactive Binary Search Trees, Self-Balancing AVL, Heaps, & Tries"
        items={[
          { id: 'bst', name: 'Binary Search Tree (BST)', description: 'Ordered insert, search, and depth-first traversals', group: 'Trees' },
          { id: 'avl', name: 'AVL Tree (Self-Balancing)', description: 'Height-balanced tree with LL/RR/LR/RL rotations', group: 'Balanced' },
          { id: 'heap', name: 'Binary Heap (Priority Queue)', description: 'Array-backed complete tree with sift-up and sift-down', group: 'Heaps' },
          { id: 'trie', name: 'Trie (Prefix Tree)', description: 'Character-indexed prefix tree for word lookup', group: 'Strings' },
        ]}
        activeId={treeCategory}
        onSelect={(id) => setTreeCategory(id as TreeCategory)}
        placeholder="Search tree structure or operation..."
      />

      {/* Category Tabs with Pure Vector Icons */}
      <div className="tree-category-toolbar animate-fade-in">
        <div className="tree-category-tabs">
          <button
            className={`category-tab ${treeCategory === 'bst' ? 'active' : ''}`}
            onClick={() => setTreeCategory('bst')}
          >
            <Network size={16} />
            <span>Binary Search Tree (BST)</span>
          </button>

          <button
            className={`category-tab ${treeCategory === 'avl' ? 'active' : ''}`}
            onClick={() => setTreeCategory('avl')}
          >
            <Scale size={16} />
            <span>AVL Tree (Self-Balancing)</span>
          </button>

          <button
            className={`category-tab ${treeCategory === 'heap' ? 'active' : ''}`}
            onClick={() => setTreeCategory('heap')}
          >
            <Layers size={16} />
            <span>Binary Heap (Priority Queue)</span>
          </button>

          <button
            className={`category-tab ${treeCategory === 'trie' ? 'active' : ''}`}
            onClick={() => setTreeCategory('trie')}
          >
            <Binary size={16} />
            <span>Trie (Prefix Tree)</span>
          </button>
        </div>
      </div>

      {/* Operations Toolbar */}
      <div className="bst-toolbar animate-fade-in">
        <div className="bst-toolbar-left">
          {treeCategory !== 'trie' ? (
            <div className="bst-input-group">
              <span>Value:</span>
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="bst-input"
                placeholder="e.g. 45"
              />
            </div>
          ) : (
            <div className="bst-input-group">
              <span>Word:</span>
              <input
                type="text"
                value={wordValue}
                onChange={(e) => setWordValue(e.target.value)}
                className="bst-input"
                placeholder="e.g. cat"
                style={{ width: '110px' }}
              />
            </div>
          )}

          {treeCategory === 'bst' && (
            <>
              <button className="bst-btn btn-insert" onClick={handleBSTInsert}>
                <Plus size={16} />
                <span>Insert</span>
              </button>
              <button className="bst-btn btn-search" onClick={handleBSTSearch}>
                <Search size={16} />
                <span>Search</span>
              </button>
              <div className="traversal-btn-group">
                <button className="bst-btn btn-traversal" onClick={() => { setActiveOperationSteps(generateBSTInorderSteps(bstTree)); reset(); quizSession.resetSession(); play(); }}>
                  <ListOrdered size={14} />
                  <span>Inorder</span>
                </button>
                <button className="bst-btn btn-traversal" onClick={() => { setActiveOperationSteps(generateBSTPreorderSteps(bstTree)); reset(); quizSession.resetSession(); play(); }}>
                  <GitCommit size={14} />
                  <span>Preorder</span>
                </button>
                <button className="bst-btn btn-traversal" onClick={() => { setActiveOperationSteps(generateBSTPostorderSteps(bstTree)); reset(); quizSession.resetSession(); play(); }}>
                  <CornerDownRight size={14} />
                  <span>Postorder</span>
                </button>
              </div>
            </>
          )}

          {treeCategory === 'avl' && (
            <button className="bst-btn btn-insert" onClick={handleAVLInsert}>
              <Plus size={16} />
              <span>Insert & Balance</span>
            </button>
          )}

          {treeCategory === 'heap' && (
            <>
              <button className="bst-btn btn-insert" onClick={handleHeapInsert}>
                <Plus size={16} />
                <span>Push Heap</span>
              </button>
              <button className="bst-btn btn-search" onClick={handleHeapExtract}>
                <ArrowDown size={16} />
                <span>Extract Root</span>
              </button>
              <div className="traversal-btn-group">
                <button className={`bst-btn btn-traversal ${heapType === 'max' ? 'active' : ''}`} onClick={() => setHeapType('max')}>
                  <ArrowUp size={12} />
                  <span>Max Heap</span>
                </button>
                <button className={`bst-btn btn-traversal ${heapType === 'min' ? 'active' : ''}`} onClick={() => setHeapType('min')}>
                  <ArrowDown size={12} />
                  <span>Min Heap</span>
                </button>
              </div>
            </>
          )}

          {treeCategory === 'trie' && (
            <>
              <button className="bst-btn btn-insert" onClick={handleTrieInsert}>
                <Plus size={16} />
                <span>Insert Word</span>
              </button>
              <button className="bst-btn btn-search" onClick={handleTrieSearch}>
                <Search size={16} />
                <span>Search Prefix</span>
              </button>
            </>
          )}

          {/* Dataset Initialization Selector Group for ALL Categories */}
          <div className="dataset-mode-selector">
            <button className="bst-btn btn-mode" onClick={handleEmptyTree}>
              <Trash2 size={14} className="text-rose-400" />
              <span>Empty Tree</span>
            </button>
            <button className="bst-btn btn-mode" onClick={handleSampleTree}>
              <Layers size={14} className="text-amber-400" />
              <span>Sample Tree</span>
            </button>
            <button className="bst-btn btn-mode" onClick={handleRandomTree}>
              <Sparkles size={14} className="text-emerald-400" />
              <span>Random Tree</span>
            </button>
          </div>
        </div>

        <div className="bst-toolbar-right">
          <div className="predict-mode-group">
            <label className="predict-toggle-label">
              <HelpCircle size={16} />
              <span>Quiz Mode</span>
              <input
                type="checkbox"
                checked={quizEnabled}
                onChange={(e) => setQuizEnabled(e.target.checked)}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Main Learning Workspace */}
      <div className="sorting-workspace">
        <div className="renderer-section">
          <BSTRenderer
            currentStep={bstStep}
            onToggleFullscreen={() => setIsFullScreenOpen(true)}
          />

          {/* Traversal Log Banner */}
          {bstStep?.traversalLog && bstStep.traversalLog.length > 0 && (
            <div className="traversal-log-banner animate-fade-in">
              <span className="log-title">TRAVERSAL LOG:</span>
              <div className="log-nodes font-mono">
                {bstStep.traversalLog.map((val, i) => (
                  <span key={i} className="log-pill">{val}</span>
                ))}
              </div>
            </div>
          )}

          {renderPlayerControls()}
        </div>

        {/* Right Column: Multi-Language Debugger & Explanation */}
        <div className="explanation-section">
          <QuizDock session={quizSession} cadence={cadence} onCadenceChange={setCadence} />

          <MultiLanguageCodePanel
            algorithmKey={treeCategory}
            title="Tree Operations"
            activeLine={bstStep?.codeLine}
            variables={bstStep?.variables}
            onCustomCodeRun={(arraySteps) => {
              const bstSteps: BSTStep[] = arraySteps.map((step) => ({
                nodes: [],
                edges: [],
                description: step.description,
                codeLine: step.codeLine,
                variables: step.variables || {},
              }));
              setActiveOperationSteps(bstSteps);
              reset();
            }}
            currentArray={[10, 20, 30, 40, 50]}
          />

          <ExplanationPanel
            description={maskNarration(bstStep?.description || 'Select a Tree structure and enter values to inspect algorithms.', quizSession.phase)}
            stepNumber={currentStepIndex + 1}
            totalSteps={totalSteps}
            timeComplexity={{ best: 'O(log N)', average: 'O(log N)', worst: 'O(N)' }}
            spaceComplexity="O(H)"
          />
        </div>
      </div>

      <TheoryPanel categoryId="bst" activeTopic={treeCategory} />

      {/* Reusable Native FullScreen Canvas Modal */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Tree Studio | ${treeCategory.toUpperCase()}`}
        subtitle="Interactive Dynamic Tree Inspector"
        toolbarControls={renderFloatingControls()}
        playbackControls={renderPlayerControls()}
      >
        <BSTRenderer currentStep={bstStep} />
      </FullScreenCanvasModal>
    </div>
  );
};
