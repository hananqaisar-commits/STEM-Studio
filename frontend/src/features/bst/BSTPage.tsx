import React, { useState, useEffect } from 'react';
import { Plus, Search, HelpCircle, ListOrdered, GitCommit, CornerDownRight, Sparkles, Layers, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { BSTRenderer } from './BSTRenderer';
import { PredictionQuiz } from './PredictionQuiz';
import { PlayPauseButton } from '../../components/controls/PlayPauseButton';
import { StepControls } from '../../components/controls/StepControls';
import { SpeedSlider } from '../../components/controls/SpeedSlider';
import { MultiLanguageCodePanel } from '../../components/debugger/MultiLanguageCodePanel';
import { ExplanationPanel } from '../../components/layout/ExplanationPanel';
import { useStepPlayer } from '../../hooks/useStepPlayer';

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

export const BSTPage: React.FC = () => {
  const [treeCategory, setTreeCategory] = useState<TreeCategory>('bst');
  const [inputValue, setInputValue] = useState<string>('45');
  const [wordValue, setWordValue] = useState<string>('cat');
  const [isPredictMode, setIsPredictMode] = useState<boolean>(true);
  const [activeOperationSteps, setActiveOperationSteps] = useState<BSTStep[]>([]);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);

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
      const root = createTrieRoot();
      generateTrieInsertSteps(root, 'cat');
      const { steps, newRoot } = generateTrieInsertSteps(root, 'car');
      setTrieRoot(newRoot);
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
  const activePrediction = treeCategory === 'bst' && isPredictMode && bstStep?.predictionPoint ? bstStep.predictionPoint : null;

  useEffect(() => {
    if (activePrediction && isPlaying) pause();
  }, [activePrediction, isPlaying, pause]);

  // Operations for BST
  const handleBSTInsert = () => {
    const num = Number(inputValue);
    if (isNaN(num)) return;
    const { steps, newTree } = generateBSTInsertSteps(bstTree, num);
    setBstTree(newTree);
    setActiveOperationSteps(steps);
    reset();
    if (!isPredictMode) play();
  };

  // Operations for AVL
  const handleAVLInsert = () => {
    const num = Number(inputValue);
    if (isNaN(num)) return;
    const { steps, newTree } = generateAVLInsertSteps(avlTree, num);
    setAvlTree(newTree);
    setActiveOperationSteps(steps);
    reset();
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
    play();
  };

  const handleHeapExtract = () => {
    const { steps, newHeap } = generateHeapExtractSteps(heapArray, heapType);
    setHeapArray(newHeap);
    setActiveOperationSteps(steps);
    reset();
    play();
  };

  // Operations for Trie
  const handleTrieInsert = () => {
    if (!wordValue.trim()) return;
    const { steps, newRoot } = generateTrieInsertSteps(trieRoot, wordValue);
    setTrieRoot(newRoot);
    setActiveOperationSteps(steps);
    reset();
    play();
  };

  const handleTrieSearch = () => {
    if (!wordValue.trim()) return;
    const steps = generateTrieSearchSteps(trieRoot, wordValue);
    setActiveOperationSteps(steps);
    reset();
    play();
  };

  const handleToggleBreakpoint = (lineNumber: number) => {
    setBreakpoints((prev) =>
      prev.includes(lineNumber) ? prev.filter((line) => line !== lineNumber) : [...prev, lineNumber]
    );
  };

  return (
    <div className="bst-page-container">
      {/* Category Tabs: BST | AVL | Heap | Trie */}
      <div className="tree-category-toolbar animate-fade-in">
        <div className="tree-category-tabs">
          <button
            className={`category-tab ${treeCategory === 'bst' ? 'active' : ''}`}
            onClick={() => setTreeCategory('bst')}
          >
            🌳 Binary Search Tree (BST)
          </button>

          <button
            className={`category-tab ${treeCategory === 'avl' ? 'active' : ''}`}
            onClick={() => setTreeCategory('avl')}
          >
            ⚖️ AVL Tree (Self-Balancing)
          </button>

          <button
            className={`category-tab ${treeCategory === 'heap' ? 'active' : ''}`}
            onClick={() => setTreeCategory('heap')}
          >
            🏔️ Binary Heap (Priority Queue)
          </button>

          <button
            className={`category-tab ${treeCategory === 'trie' ? 'active' : ''}`}
            onClick={() => setTreeCategory('trie')}
          >
            🔤 Trie (Prefix Tree)
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
              <button className="bst-btn btn-search" onClick={() => {
                const steps = generateBSTSearchSteps(bstTree, Number(inputValue));
                setActiveOperationSteps(steps);
                reset();
                if (!isPredictMode) play();
              }}>
                <Search size={16} />
                <span>Search</span>
              </button>
              <div className="traversal-btn-group">
                <button className="bst-btn btn-traversal" onClick={() => { setActiveOperationSteps(generateBSTInorderSteps(bstTree)); reset(); play(); }}>
                  <ListOrdered size={14} />
                  <span>Inorder</span>
                </button>
                <button className="bst-btn btn-traversal" onClick={() => { setActiveOperationSteps(generateBSTPreorderSteps(bstTree)); reset(); play(); }}>
                  <GitCommit size={14} />
                  <span>Preorder</span>
                </button>
                <button className="bst-btn btn-traversal" onClick={() => { setActiveOperationSteps(generateBSTPostorderSteps(bstTree)); reset(); play(); }}>
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

          {/* Dataset Initialization Selector Group for BST */}
          {treeCategory === 'bst' && (
            <div className="dataset-mode-selector">
              <button className="bst-btn btn-mode" onClick={() => { setBstTree(undefined); setActiveOperationSteps([]); reset(); }}>
                <Trash2 size={14} className="text-rose-400" />
                <span>Empty Tree</span>
              </button>
              <button className="bst-btn btn-mode" onClick={() => { setBstTree(DEFAULT_BST_TREE); setActiveOperationSteps(generateBSTInsertSteps(DEFAULT_BST_TREE, 45).steps); reset(); }}>
                <Layers size={14} className="text-amber-400" />
                <span>Sample Tree</span>
              </button>
              <button className="bst-btn btn-mode" onClick={() => { const rnd = generateRandomBST(6); setBstTree(rnd); setActiveOperationSteps(generateBSTInsertSteps(rnd, 50).steps); reset(); }}>
                <Sparkles size={14} className="text-emerald-400" />
                <span>Random Tree</span>
              </button>
            </div>
          )}
        </div>

        {treeCategory === 'bst' && (
          <div className="bst-toolbar-right">
            <div className="predict-mode-group">
              <label className="predict-toggle-label">
                <HelpCircle size={16} />
                <span>Predict & Learn Mode</span>
                <input
                  type="checkbox"
                  checked={isPredictMode}
                  onChange={(e) => setIsPredictMode(e.target.checked)}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Main Learning Workspace */}
      <div className="sorting-workspace">
        <div className="renderer-section">
          {activePrediction && (
            <PredictionQuiz
              predictionPoint={activePrediction}
              onCorrectAnswer={() => stepForward()}
            />
          )}

          <BSTRenderer currentStep={bstStep} />

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

          {/* Player Bar */}
          <div className="player-bar">
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
        </div>

        {/* Right Column: Multi-Language Debugger & Explanation */}
        <div className="explanation-section">
          <MultiLanguageCodePanel
            algorithmKey="bubble"
            activeLine={bstStep?.codeLine}
            breakpoints={breakpoints}
            onToggleBreakpoint={handleToggleBreakpoint}
            variables={bstStep?.variables}
          />

          <ExplanationPanel
            description={bstStep?.description || 'Select a Tree structure and enter values to inspect algorithms.'}
            timeComplexity={{ best: 'O(log N)', average: 'O(log N)', worst: 'O(N)' }}
            spaceComplexity="O(H)"
          />
        </div>
      </div>
    </div>
  );
};
