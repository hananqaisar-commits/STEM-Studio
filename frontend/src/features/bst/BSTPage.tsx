import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, Maximize2, ListOrdered, GitCommit, CornerDownRight, Sparkles, Layers, Trash2, ArrowUp, ArrowDown, Network, Scale, Binary } from 'lucide-react';
import { BSTRenderer } from './BSTRenderer';
import { FullScreenCanvasModal } from '../../components/layout/FullScreenCanvasModal';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { VisualizerActions } from '../../components/layout/VisualizerActions';
import { FloatingController } from '../../components/controls/FloatingController';
import { usePlaybackShortcuts } from '../../hooks/usePlaybackShortcuts';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { useStepPlayer } from '../../hooks/useStepPlayer';
import { QuizDock } from '../../components/quiz/QuizDock';
import { useQuizSession } from '../../hooks/useQuizSession';
import { maskNarration } from '../../components/quiz/quizMask';
import { buildBSTCheckpoints, buildRevisionData, type BSTAlgorithmKey } from './quizAdapter';
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
import { parseNumberList, parseStringList } from '../../utils/batchInputParser';

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
  // Tracks the last-run operation so the quiz revision card matches what is visualized.
  const [revisionKey, setRevisionKey] = useState<BSTAlgorithmKey>('insert');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ['bst', 'avl', 'heap', 'trie'].includes(topic)) {
      setTreeCategory(topic as TreeCategory);
    }
  }, [searchParams]);

  const [inputValue, setInputValue] = useState<string>('20, 10, 30, 5, 15');
  const [wordValue, setWordValue] = useState<string>('cat, car, dog');
  const [inputError, setInputError] = useState<string | null>(null);
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [showDebugger, setShowDebugger] = useState<boolean>(true);
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
    play,
    pause,
    stepForward,
    stepBack,
    reset,
  seekTo,
    } = useStepPlayer({ steps: activeOperationSteps });

  const bstStep = currentStep as BSTStep | null;

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
    revisionData: buildRevisionData(revisionKey),
  });

  // ─── BATCH OPERATIONS FOR BST ─────────────────────────────────────────────
  const handleBSTInsert = () => {
    const parseRes = parseNumberList(inputValue);
    const nums = parseRes.isValid ? parseRes.values : [Number(inputValue)].filter((n) => !isNaN(n));
    if (nums.length === 0) {
      setInputError('Please enter valid numeric values');
      return;
    }
    setInputError(null);
    setRevisionKey('insert');

    let currentTree = bstTree;
    const allSteps: BSTStep[] = [];

    for (const num of nums) {
      const { steps, newTree } = generateBSTInsertSteps(currentTree, num);
      allSteps.push(...steps);
      currentTree = newTree;
    }

    setBstTree(currentTree);
    setActiveOperationSteps(allSteps);
    reset();
    quizSession.resetSession();
    if (!quizEnabled) play();
  };

  const handleBSTSearch = () => {
    const parseRes = parseNumberList(inputValue);
    const num = parseRes.isValid && parseRes.values.length > 0 ? parseRes.values[0] : Number(inputValue);
    if (isNaN(num)) return;
    setRevisionKey('search');
    const steps = generateBSTSearchSteps(bstTree, num);
    setActiveOperationSteps(steps);
    reset();
    quizSession.resetSession();
    if (!quizEnabled) play();
  };

  // ─── BATCH OPERATIONS FOR AVL ─────────────────────────────────────────────
  const handleAVLInsert = () => {
    const parseRes = parseNumberList(inputValue);
    const nums = parseRes.isValid ? parseRes.values : [Number(inputValue)].filter((n) => !isNaN(n));
    if (nums.length === 0) {
      setInputError('Please enter valid numeric values');
      return;
    }
    setInputError(null);
    setRevisionKey('avlInsert');

    let currentTree = avlTree;
    const allSteps: BSTStep[] = [];

    for (const num of nums) {
      const { steps, newTree } = generateAVLInsertSteps(currentTree, num);
      allSteps.push(...steps);
      currentTree = newTree;
    }

    setAvlTree(currentTree);
    setActiveOperationSteps(allSteps);
    reset();
    quizSession.resetSession();
    if (!quizEnabled) play();
  };

  // ─── BATCH OPERATIONS FOR HEAP ────────────────────────────────────────────
  const handleHeapInsert = () => {
    const parseRes = parseNumberList(inputValue);
    const nums = parseRes.isValid ? parseRes.values : [Number(inputValue)].filter((n) => !isNaN(n));
    if (nums.length === 0) {
      setInputError('Please enter valid numeric values');
      return;
    }
    setInputError(null);
    setRevisionKey('heapInsert');

    let currentHeap = [...heapArray];
    const allSteps: BSTStep[] = [];

    for (const num of nums) {
      const { steps, newHeap } = generateHeapInsertSteps(currentHeap, num, heapType);
      allSteps.push(...steps);
      currentHeap = newHeap;
    }

    setHeapArray(currentHeap);
    setActiveOperationSteps(allSteps);
    reset();
    quizSession.resetSession();
    if (!quizEnabled) play();
  };

  const handleHeapExtract = () => {
    setRevisionKey('heapExtract');
    const { steps, newHeap } = generateHeapExtractSteps(heapArray, heapType);
    setHeapArray(newHeap);
    setActiveOperationSteps(steps);
    reset();
    quizSession.resetSession();
    if (!quizEnabled) play();
  };

  // ─── BATCH OPERATIONS FOR TRIE ────────────────────────────────────────────
  const handleTrieInsert = () => {
    const parseRes = parseStringList(wordValue, { lowercase: true });
    const words = parseRes.isValid ? parseRes.values : wordValue.split(/[\s,;]+/).filter(Boolean);
    if (words.length === 0) {
      setInputError('Please enter valid word(s)');
      return;
    }
    setInputError(null);
    setRevisionKey('trieInsert');

    let currentRoot = trieRoot;
    const allSteps: BSTStep[] = [];

    for (const w of words) {
      const { steps, newRoot } = generateTrieInsertSteps(currentRoot, w);
      allSteps.push(...steps);
      currentRoot = newRoot;
    }

    setTrieRoot(currentRoot);
    setActiveOperationSteps(allSteps);
    reset();
    quizSession.resetSession();
    if (!quizEnabled) play();
  };

  const handleTrieSearch = () => {
    const parseRes = parseStringList(wordValue, { lowercase: true });
    const query = parseRes.isValid && parseRes.values.length > 0 ? parseRes.values[0] : wordValue.trim();
    if (!query) return;
    setRevisionKey('trieSearch');
    const steps = generateTrieSearchSteps(trieRoot, query);
    setActiveOperationSteps(steps);
    reset();
    quizSession.resetSession();
    if (!quizEnabled) play();
  };

  // ─── BATCH BUILD COMPLETE DATASET FROM SCRATCH ────────────────────────────
  const handleBuildTreeFromScratch = () => {
    setInputError(null);
    if (treeCategory === 'bst') {
      const parseRes = parseNumberList(inputValue);
      const nums = parseRes.isValid ? parseRes.values : [20, 10, 30, 5, 15];
      let currentTree: BSTTreeStructure | undefined = undefined;
      const allSteps: BSTStep[] = [];
      for (const num of nums) {
        const { steps, newTree } = generateBSTInsertSteps(currentTree, num);
        allSteps.push(...steps);
        currentTree = newTree;
      }
      setBstTree(currentTree);
      setActiveOperationSteps(allSteps);
    } else if (treeCategory === 'avl') {
      const parseRes = parseNumberList(inputValue);
      const nums = parseRes.isValid ? parseRes.values : [30, 20, 40, 10, 25, 35, 50];
      let currentTree: AVLNodeStructure | undefined = undefined;
      const allSteps: BSTStep[] = [];
      for (const num of nums) {
        const { steps, newTree } = generateAVLInsertSteps(currentTree, num);
        allSteps.push(...steps);
        currentTree = newTree;
      }
      setAvlTree(currentTree);
      setActiveOperationSteps(allSteps);
    } else if (treeCategory === 'heap') {
      const parseRes = parseNumberList(inputValue);
      const nums = parseRes.isValid ? parseRes.values : [40, 20, 30, 10, 50];
      let currentHeap: number[] = [];
      const allSteps: BSTStep[] = [];
      for (const num of nums) {
        const { steps, newHeap } = generateHeapInsertSteps(currentHeap, num, heapType);
        allSteps.push(...steps);
        currentHeap = newHeap;
      }
      setHeapArray(currentHeap);
      setActiveOperationSteps(allSteps);
    } else if (treeCategory === 'trie') {
      const parseRes = parseStringList(wordValue, { lowercase: true });
      const words = parseRes.isValid ? parseRes.values : ['cat', 'car', 'dog'];
      let currentRoot = createTrieRoot();
      const allSteps: BSTStep[] = [];
      for (const w of words) {
        const { steps, newRoot } = generateTrieInsertSteps(currentRoot, w);
        allSteps.push(...steps);
        currentRoot = newRoot;
      }
      setTrieRoot(currentRoot);
      setActiveOperationSteps(allSteps);
    }
    reset();
    quizSession.resetSession();
    if (!quizEnabled) play();
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

  /* ── Transfer challenge ("Prove You Understand") ─────────────────
     A freshly generated tree + operation, predicted cold.
     startChallenge() must fire in the same handler as the input change
     so the armed challenge survives the checkpoint reset the new
     execution triggers. */
  const handleProveIt = () => {
    quizSession.startChallenge();
    handleRandomTree();
  };


  /* ── Shared toolbar controls ─────────────────────────────────────────
     Single source of truth for every input/button: rendered in the page
     toolbar AND passed to the fullscreen modal, so the two states can
     never drift out of sync. */
  const renderToolbarControls = () => (
    <>
      {treeCategory !== 'trie' ? (
        <div className="bst-input-group" title="Enter comma-separated values (e.g. 20, 10, 30, 5, 15)">
          <span style={{ fontWeight: 600 }}>Values:</span>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (inputError) setInputError(null);
            }}
            className="bst-input"
            placeholder="e.g. 20, 10, 30, 5, 15"
            style={{ minWidth: '150px' }}
          />
        </div>
      ) : (
        <div className="bst-input-group" title="Enter comma-separated words (e.g. cat, car, dog)">
          <span style={{ fontWeight: 600 }}>Words:</span>
          <input
            type="text"
            value={wordValue}
            onChange={(e) => {
              setWordValue(e.target.value);
              if (inputError) setInputError(null);
            }}
            className="bst-input"
            placeholder="e.g. cat, car, dog"
            style={{ minWidth: '150px' }}
          />
        </div>
      )}

      <button className="bst-btn btn-mode" onClick={handleBuildTreeFromScratch} title="Build dataset sequentially from scratch">
        <Sparkles size={14} className="text-amber-400" />
        <span>Build Dataset</span>
      </button>

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
            <button className="bst-btn btn-traversal" onClick={() => { setRevisionKey('inorder'); setActiveOperationSteps(generateBSTInorderSteps(bstTree)); reset(); quizSession.resetSession(); play(); }}>
              <ListOrdered size={14} />
              <span>Inorder</span>
            </button>
            <button className="bst-btn btn-traversal" onClick={() => { setRevisionKey('preorder'); setActiveOperationSteps(generateBSTPreorderSteps(bstTree)); reset(); quizSession.resetSession(); play(); }}>
              <GitCommit size={14} />
              <span>Preorder</span>
            </button>
            <button className="bst-btn btn-traversal" onClick={() => { setRevisionKey('postorder'); setActiveOperationSteps(generateBSTPostorderSteps(bstTree)); reset(); quizSession.resetSession(); play(); }}>
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
    </>
  );

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



      {/* Operations Toolbar */}
      <div className="bst-toolbar animate-fade-in">
        <div className="bst-toolbar-left">
          {renderToolbarControls()}
        </div>
      </div>

      {/* Main Learning Workspace */}
      <div className="sorting-workspace scene-workspace">
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

        {/* Right Column: Multi-Language Debugger & Explanation */}
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
          )}

          <ExplanationPanel
            description={maskNarration(bstStep?.description || 'Select a Tree structure and enter values to inspect algorithms.', quizSession.phase)}
            steps={activeOperationSteps}
            currentStepIndex={currentStepIndex}
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
        <BSTRenderer currentStep={bstStep} />
      </FullScreenCanvasModal>
    </div>
  );
};
