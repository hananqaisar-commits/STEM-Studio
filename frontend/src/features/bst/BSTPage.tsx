import React, { useState, useEffect } from 'react';
import { Plus, Search, HelpCircle, ListOrdered, GitCommit, CornerDownRight, Sparkles, Layers, Trash2 } from 'lucide-react';
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

import './BST.css';

// Initial Default BST Tree (50 -> 30, 70 -> 20, 40, 60, 80)
const DEFAULT_TREE: BSTTreeStructure = {
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
  const [tree, setTree] = useState<BSTTreeStructure | undefined>(DEFAULT_TREE);
  const [inputValue, setInputValue] = useState<string>('45');
  const [isPredictMode, setIsPredictMode] = useState<boolean>(true);
  const [activeOperationSteps, setActiveOperationSteps] = useState<BSTStep[]>([]);
  const [breakpoints, setBreakpoints] = useState<number[]>([]);

  // Initialize steps
  useEffect(() => {
    const { steps } = generateBSTInsertSteps(DEFAULT_TREE, 45);
    setActiveOperationSteps(steps);
  }, []);

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

  // Active prediction point check
  const activePrediction = isPredictMode && bstStep?.predictionPoint ? bstStep.predictionPoint : null;

  // Pause playback automatically when entering a step with a prediction point
  useEffect(() => {
    if (activePrediction && isPlaying) {
      pause();
    }
  }, [activePrediction, isPlaying, pause]);

  // Operations
  const handleInsert = () => {
    const num = Number(inputValue);
    if (isNaN(num)) return;
    const { steps, newTree } = generateBSTInsertSteps(tree, num);
    setTree(newTree);
    setActiveOperationSteps(steps);
    reset();
    if (!isPredictMode) play();
  };

  const handleSearch = () => {
    const num = Number(inputValue);
    if (isNaN(num)) return;
    const steps = generateBSTSearchSteps(tree, num);
    setActiveOperationSteps(steps);
    reset();
    if (!isPredictMode) play();
  };

  const handleInorder = () => {
    const steps = generateBSTInorderSteps(tree);
    setActiveOperationSteps(steps);
    reset();
    play();
  };

  const handlePreorder = () => {
    const steps = generateBSTPreorderSteps(tree);
    setActiveOperationSteps(steps);
    reset();
    play();
  };

  const handlePostorder = () => {
    const steps = generateBSTPostorderSteps(tree);
    setActiveOperationSteps(steps);
    reset();
    play();
  };

  const handleStartEmptyTree = () => {
    setTree(undefined);
    setActiveOperationSteps([]);
    reset();
  };

  const handleLoadSamplePreset = () => {
    setTree(DEFAULT_TREE);
    const { steps } = generateBSTInsertSteps(DEFAULT_TREE, 45);
    setActiveOperationSteps(steps);
    reset();
  };

  const handleGenerateRandomTree = () => {
    const randomTree = generateRandomBST(6);
    setTree(randomTree);
    const { steps } = generateBSTInsertSteps(randomTree, 50);
    setActiveOperationSteps(steps);
    reset();
  };

  const handleToggleBreakpoint = (lineNumber: number) => {
    setBreakpoints((prev) =>
      prev.includes(lineNumber) ? prev.filter((line) => line !== lineNumber) : [...prev, lineNumber]
    );
  };

  return (
    <div className="bst-page-container">
      {/* Operations Toolbar */}
      <div className="bst-toolbar animate-fade-in">
        <div className="bst-toolbar-left">
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

          <button className="bst-btn btn-insert" onClick={handleInsert}>
            <Plus size={16} />
            <span>Insert</span>
          </button>

          <button className="bst-btn btn-search" onClick={handleSearch}>
            <Search size={16} />
            <span>Search</span>
          </button>

          {/* All 3 Traversal Buttons */}
          <div className="traversal-btn-group">
            <button className="bst-btn btn-traversal" onClick={handleInorder} title="Inorder Traversal (Left -> Node -> Right)">
              <ListOrdered size={14} />
              <span>Inorder</span>
            </button>

            <button className="bst-btn btn-traversal" onClick={handlePreorder} title="Preorder Traversal (Node -> Left -> Right)">
              <GitCommit size={14} />
              <span>Preorder</span>
            </button>

            <button className="bst-btn btn-traversal" onClick={handlePostorder} title="Postorder Traversal (Left -> Right -> Node)">
              <CornerDownRight size={14} />
              <span>Postorder</span>
            </button>
          </div>

          {/* Dataset Initialization Selector Group */}
          <div className="dataset-mode-selector">
            <button className="bst-btn btn-mode" onClick={handleStartEmptyTree} title="Start from scratch with an empty canvas">
              <Trash2 size={14} className="text-rose-400" />
              <span>Empty Tree</span>
            </button>

            <button className="bst-btn btn-mode" onClick={handleLoadSamplePreset} title="Load pre-built 7-node sample tree">
              <Layers size={14} className="text-amber-400" />
              <span>Sample Tree</span>
            </button>

            <button className="bst-btn btn-mode" onClick={handleGenerateRandomTree} title="Generate a random 6-node tree">
              <Sparkles size={14} className="text-emerald-400" />
              <span>Random Tree</span>
            </button>
          </div>
        </div>

        <div className="bst-toolbar-right">
          {/* Predict & Learn Mode Toggle */}
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
      </div>

      {/* Main BST Workspace */}
      <div className="sorting-workspace">
        {/* Left Column: BST Canvas & Controls */}
        <div className="renderer-section">
          {/* Interactive Prediction Learning Quiz Prompt */}
          {activePrediction && (
            <PredictionQuiz
              predictionPoint={activePrediction}
              onCorrectAnswer={() => {
                stepForward();
              }}
            />
          )}

          <BSTRenderer
            currentStep={bstStep}
            onNodeClick={(val) => {
              setInputValue(String(val));
              handleSearch();
            }}
          />

          {/* Traversal Log Banner if active */}
          {bstStep?.traversalLog && bstStep.traversalLog.length > 0 && (
            <div className="traversal-log-banner animate-fade-in">
              <span className="log-title">TRAVERSAL LOG:</span>
              <div className="log-nodes font-mono">
                {bstStep.traversalLog.map((val, i) => (
                  <span key={i} className="log-pill">
                    {val}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Player Controls Bar */}
          <div className="player-bar">
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
        </div>

        {/* Right Column: Code & Explanation */}
        <div className="explanation-section">
          <MultiLanguageCodePanel
            algorithmKey="bubble"
            activeLine={bstStep?.codeLine}
            breakpoints={breakpoints}
            onToggleBreakpoint={handleToggleBreakpoint}
            variables={bstStep?.variables}
          />

          <ExplanationPanel
            description={bstStep?.description || 'Enter a value and click Insert/Search or pick a Traversal to visualize Binary Search Tree operations.'}
            timeComplexity={{ best: 'O(log N)', average: 'O(log N)', worst: 'O(N)' }}
            spaceComplexity="O(H)"
          />
        </div>
      </div>
    </div>
  );
};
