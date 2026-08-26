import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Edit3, Maximize2, HelpCircle, Sparkles, Trash2, Layers,
  Hash, Target, Grid3X3, Type, ArrowRight, BarChart3, Route, Coins,
} from 'lucide-react';
import { DPRenderer } from './DPRenderer';
import { CustomArrayEditor } from '../../components/debugger/CustomArrayEditor';
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
import { buildDPCheckpoints, buildRevisionData } from './quizAdapter';
import type { QuizCadence } from '../../engine/types/Quiz';

import { runFibonacciDP } from './algorithms/fibonacciDP';
import { runCoinChange } from './algorithms/coinChange';
import { runHouseRobber } from './algorithms/houseRobber';
import { runKnapsack01 } from './algorithms/knapsack01';
import { runLCS } from './algorithms/lcs';
import { runLIS } from './algorithms/lis';
import { runEditDistance } from './algorithms/editDistance';
import { runUniquePaths } from './algorithms/uniquePaths';

import '../sorting/Sorting.css';
import './DP.css';
import { TheoryPanel } from '../../components/layout/TheoryPanel';

type DPAlgorithmKey = 'fibonacciDP' | 'coinChange' | 'houseRobber' | 'knapsack01' | 'lcs' | 'lis' | 'editDistance' | 'uniquePaths';

interface AlgMeta {
  key: DPAlgorithmKey;
  name: string;
  complexity: string;
  icon: React.ReactNode;
}

const ALGORITHMS: AlgMeta[] = [
  { key: 'fibonacciDP', name: 'Fibonacci DP', complexity: 'O(n)', icon: <Hash size={14} /> },
  { key: 'coinChange', name: 'Coin Change', complexity: 'O(n·c)', icon: <Coins size={14} /> },
  { key: 'houseRobber', name: 'House Robber', complexity: 'O(n)', icon: <BarChart3 size={14} /> },
  { key: 'knapsack01', name: '0/1 Knapsack', complexity: 'O(n·W)', icon: <Target size={14} /> },
  { key: 'lcs', name: 'Longest Common Subseq', complexity: 'O(m·n)', icon: <Type size={14} /> },
  { key: 'lis', name: 'Longest Increasing Subseq', complexity: 'O(n²)', icon: <ArrowRight size={14} /> },
  { key: 'editDistance', name: 'Edit Distance', complexity: 'O(m·n)', icon: <Grid3X3 size={14} /> },
  { key: 'uniquePaths', name: 'Unique Paths', complexity: 'O(m·n)', icon: <Route size={14} /> },
];

export const DPPage: React.FC = () => {
  const [selectedAlg, setSelectedAlg] = useState<DPAlgorithmKey>('fibonacciDP');
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const topic = searchParams.get('topic');
    if (topic && ALGORITHMS.some((a) => a.key === topic)) {
      setSelectedAlg(topic as DPAlgorithmKey);
    }
  }, [searchParams]);

  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false);
  const [quizEnabled, setQuizEnabled] = useState<boolean>(false);
  const [cadence, setCadence] = useState<QuizCadence>('normal');
  const [showCustomEditor, setShowCustomEditor] = useState(false);

  // Algorithm-specific inputs
  const [fibN, setFibN] = useState<number>(8);
  const [coins, setCoins] = useState<number[]>([1, 5, 10, 25]);
  const [amount, setAmount] = useState<number>(30);
  const [houses, setHouses] = useState<number[]>([2, 7, 9, 3, 1]);
  const [weights, setWeights] = useState<number[]>([2, 3, 4, 5]);
  const [values, setValues] = useState<number[]>([3, 4, 5, 6]);
  const [capacity, setCapacity] = useState<number>(8);
  const [lcsS1, setLcsS1] = useState<string>('AGGTAB');
  const [lcsS2, setLcsS2] = useState<string>('GXTXAYB');
  const [lisArr, setLisArr] = useState<number[]>([10, 9, 2, 5, 3, 7, 101, 18]);
  const [edS1, setEdS1] = useState<string>('horse');
  const [edS2, setEdS2] = useState<string>('ros');
  const [upM, setUpM] = useState<number>(3);
  const [upN, setUpN] = useState<number>(4);

  // Generate execution steps
  const executionData = useMemo(() => {
    switch (selectedAlg) {
      case 'fibonacciDP': return runFibonacciDP(fibN);
      case 'coinChange': return runCoinChange(coins, amount);
      case 'houseRobber': return runHouseRobber(houses);
      case 'knapsack01': return runKnapsack01(weights, values, capacity);
      case 'lcs': return runLCS(lcsS1, lcsS2);
      case 'lis': return runLIS(lisArr);
      case 'editDistance': return runEditDistance(edS1, edS2);
      case 'uniquePaths': return runUniquePaths(upM, upN);
      default: return runFibonacciDP(fibN);
    }
  }, [selectedAlg, fibN, coins, amount, houses, weights, values, capacity, lcsS1, lcsS2, lisArr, edS1, edS2, upM, upN]);

  const {
    currentStepIndex, currentStep, totalSteps, isPlaying, speed,
    play, pause, stepForward, stepBack, reset, setSpeed,
  } = useStepPlayer({ steps: executionData.steps });

  const quizCheckpoints = useMemo(
    () => buildDPCheckpoints(executionData.steps, selectedAlg),
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
    module: 'dp' as any,
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
      case 'fibonacciDP':
        setFibN(Math.floor(Math.random() * 10) + 3);
        break;
      case 'coinChange': {
        const c = [1, 3, 5, 10, 25].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 2));
        c.sort((a, b) => a - b);
        setCoins(c);
        setAmount(Math.floor(Math.random() * 25) + 10);
        break;
      }
      case 'houseRobber': {
        const h = Array.from({ length: Math.floor(Math.random() * 4) + 3 }, () => Math.floor(Math.random() * 9) + 1);
        setHouses(h);
        break;
      }
      case 'knapsack01': {
        const n = Math.floor(Math.random() * 3) + 3;
        const w = Array.from({ length: n }, () => Math.floor(Math.random() * 6) + 1);
        const v = Array.from({ length: n }, () => Math.floor(Math.random() * 8) + 1);
        setWeights(w);
        setValues(v);
        setCapacity(Math.floor(Math.random() * 8) + 5);
        break;
      }
      case 'lcs': {
        const chars = 'ABCDEFGH';
        const len1 = Math.floor(Math.random() * 4) + 4;
        const len2 = Math.floor(Math.random() * 4) + 4;
        setLcsS1(Array.from({ length: len1 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''));
        setLcsS2(Array.from({ length: len2 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''));
        break;
      }
      case 'lis': {
        const arr = Array.from({ length: Math.floor(Math.random() * 5) + 5 }, () => Math.floor(Math.random() * 100) + 1);
        setLisArr(arr);
        break;
      }
      case 'editDistance': {
        const words = [['cat', 'dog'], ['kitten', 'mitten'], ['sunday', 'saturday'], ['food', 'good']];
        const pair = words[Math.floor(Math.random() * words.length)];
        setEdS1(pair[0]);
        setEdS2(pair[1]);
        break;
      }
      case 'uniquePaths': {
        setUpM(Math.floor(Math.random() * 3) + 2);
        setUpN(Math.floor(Math.random() * 3) + 3);
        break;
      }
    }
  };

  const handleResetDefaults = () => {
    reset();
    quizSession.resetSession();
    setFibN(8);
    setCoins([1, 5, 10, 25]);
    setAmount(30);
    setHouses([2, 7, 9, 3, 1]);
    setWeights([2, 3, 4, 5]);
    setValues([3, 4, 5, 6]);
    setCapacity(8);
    setLcsS1('AGGTAB');
    setLcsS2('GXTXAYB');
    setLisArr([10, 9, 2, 5, 3, 7, 101, 18]);
    setEdS1('horse');
    setEdS2('ros');
    setUpM(3);
    setUpN(4);
  };

  const handleClearInputs = () => {
    reset();
    quizSession.resetSession();
    setFibN(1);
    setCoins([1]);
    setAmount(1);
    setHouses([1]);
    setWeights([1]);
    setValues([1]);
    setCapacity(1);
    setLcsS1('A');
    setLcsS2('A');
    setLisArr([1]);
    setEdS1('a');
    setEdS2('a');
    setUpM(2);
    setUpN(2);
  };

  /* ── Custom editor handler ────────────────────────────────────────── */
  const currentCustomArray = (): number[] => {
    switch (selectedAlg) {
      case 'houseRobber': return houses;
      case 'lis': return lisArr;
      case 'coinChange': return coins;
      default: return houses;
    }
  };

  const handleApplyCustomArray = (newArr: number[]) => {
    reset();
    quizSession.resetSession();
    switch (selectedAlg) {
      case 'houseRobber': setHouses(newArr.slice(0, 10)); break;
      case 'lis': setLisArr(newArr.slice(0, 12)); break;
      case 'coinChange': setCoins(newArr.sort((a, b) => a - b).slice(0, 5)); break;
    }
    setShowCustomEditor(false);
  };

  const renderPlayerControls = () => (
    <div className="player-bar" style={{ margin: 0 }}>
      <div className="player-left">
        <PlayPauseButton isPlaying={isPlaying} onToggle={isPlaying ? pause : play} />
        <StepControls
          onStepBack={stepBack} onStepForward={stepForward} onReset={reset}
          canStepBack={currentStepIndex > 0} canStepForward={currentStepIndex < totalSteps - 1}
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
        <HelpCircle size={16} /><span>Quiz Mode</span>
        <input type="checkbox" checked={quizEnabled} onChange={(e) => setQuizEnabled(e.target.checked)} />
      </label>
    </div>
  );

  /* ── Algorithm-specific toolbar inputs ─────────────────────────── */
  const renderAlgorithmInputs = () => {
    switch (selectedAlg) {
      case 'fibonacciDP':
        return (
          <div className="dp-input-group">
            <span>n:</span>
            <input type="range" min={1} max={15} value={fibN}
              onChange={(e) => { setFibN(parseInt(e.target.value)); reset(); }}
              className="toolbar-range cursor-pointer accent-amber-400 w-20" />
            <span className="text-xs font-mono font-bold text-amber-400">{fibN}</span>
          </div>
        );
      case 'coinChange':
        return (
          <>
            <div className="dp-input-group">
              <span>Coins:</span>
              <input type="text" value={coins.join(',')}
                onChange={(e) => {
                  const v = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
                  if (v.length > 0 && v.length <= 5) { setCoins(v.sort((a, b) => a - b)); reset(); }
                }} />
            </div>
            <div className="dp-input-group">
              <span>Amount:</span>
              <input type="number" value={amount}
                onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0 && v <= 50) { setAmount(v); reset(); } }}
                style={{ width: '50px' }} />
            </div>
          </>
        );
      case 'houseRobber':
        return (
          <div className="dp-input-group">
            <span>Houses:</span>
            <input type="text" value={houses.join(',')}
              onChange={(e) => {
                const v = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 0);
                if (v.length > 0 && v.length <= 10) { setHouses(v); reset(); }
              }} />
          </div>
        );
      case 'knapsack01':
        return (
          <>
            <div className="dp-input-group">
              <span>W:</span>
              <input type="text" value={weights.join(',')}
                onChange={(e) => {
                  const v = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
                  if (v.length > 0 && v.length <= 6) { setWeights(v); reset(); }
                }} />
            </div>
            <div className="dp-input-group">
              <span>V:</span>
              <input type="text" value={values.join(',')}
                onChange={(e) => {
                  const v = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n > 0);
                  if (v.length > 0 && v.length <= 6) { setValues(v); reset(); }
                }} />
            </div>
            <div className="dp-input-group">
              <span>Cap:</span>
              <input type="number" value={capacity}
                onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v) && v > 0 && v <= 20) { setCapacity(v); reset(); } }}
                style={{ width: '50px' }} />
            </div>
          </>
        );
      case 'lcs':
        return (
          <>
            <div className="dp-input-group">
              <span>s1:</span>
              <input type="text" value={lcsS1}
                onChange={(e) => { if (e.target.value.length <= 10) { setLcsS1(e.target.value.toUpperCase()); reset(); } }} />
            </div>
            <div className="dp-input-group">
              <span>s2:</span>
              <input type="text" value={lcsS2}
                onChange={(e) => { if (e.target.value.length <= 10) { setLcsS2(e.target.value.toUpperCase()); reset(); } }} />
            </div>
          </>
        );
      case 'lis':
        return (
          <div className="dp-input-group">
            <span>Array:</span>
            <input type="text" value={lisArr.join(',')}
              onChange={(e) => {
                const v = e.target.value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
                if (v.length > 0 && v.length <= 12) { setLisArr(v); reset(); }
              }} />
          </div>
        );
      case 'editDistance':
        return (
          <>
            <div className="dp-input-group">
              <span>s1:</span>
              <input type="text" value={edS1}
                onChange={(e) => { if (e.target.value.length <= 8) { setEdS1(e.target.value.toLowerCase()); reset(); } }} />
            </div>
            <div className="dp-input-group">
              <span>s2:</span>
              <input type="text" value={edS2}
                onChange={(e) => { if (e.target.value.length <= 8) { setEdS2(e.target.value.toLowerCase()); reset(); } }} />
            </div>
          </>
        );
      case 'uniquePaths':
        return (
          <>
            <div className="dp-input-group">
              <span>m:</span>
              <input type="range" min={2} max={6} value={upM}
                onChange={(e) => { setUpM(parseInt(e.target.value)); reset(); }}
                className="toolbar-range cursor-pointer accent-amber-400 w-16" />
              <span className="text-xs font-mono font-bold text-amber-400">{upM}</span>
            </div>
            <div className="dp-input-group">
              <span>n:</span>
              <input type="range" min={2} max={8} value={upN}
                onChange={(e) => { setUpN(parseInt(e.target.value)); reset(); }}
                className="toolbar-range cursor-pointer accent-amber-400 w-16" />
              <span className="text-xs font-mono font-bold text-amber-400">{upN}</span>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const showCustomBtn = ['houseRobber', 'lis', 'coinChange'].includes(selectedAlg);

  return (
    <div className="bst-page-container">
      <VisualizerHeader
        icon={<Grid3X3 size={22} />}
        title="Dynamic Programming Studio"
        subtitle="Interactive 1D & 2D DP Table Visualization"
        items={ALGORITHMS.map((alg) => ({
          id: alg.key,
          name: alg.name,
          description: `Step-by-step ${alg.name} DP execution with table fill`,
          group: alg.complexity,
        }))}
        activeId={selectedAlg}
        onSelect={(id) => { setSelectedAlg(id as DPAlgorithmKey); reset(); quizSession.resetSession(); }}
        placeholder="Search DP algorithm..."
      />

      {/* Category Tabs Bar */}
      <div className="tree-category-toolbar animate-fade-in">
        <div className="tree-category-tabs flex-wrap">
          {ALGORITHMS.map((alg) => (
            <button
              key={alg.key}
              className={`category-tab ${selectedAlg === alg.key ? 'active' : ''}`}
              onClick={() => { setSelectedAlg(alg.key); reset(); quizSession.resetSession(); }}
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
          {renderAlgorithmInputs()}

          {showCustomBtn && (
            <button className="bst-btn btn-insert" onClick={() => setShowCustomEditor(true)}>
              <Edit3 size={14} /><span>Custom Values</span>
            </button>
          )}

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
              <HelpCircle size={16} /><span>Quiz Mode</span>
              <input type="checkbox" checked={quizEnabled}
                onChange={(e) => setQuizEnabled(e.target.checked)} />
            </label>
            <button className="bst-btn btn-fullscreen" onClick={() => setIsFullScreenOpen(true)} title="Full Screen Canvas View">
              <Maximize2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Learning Workspace */}
      <div className="sorting-workspace">
        <div className="renderer-section">
          <DPRenderer currentStep={currentStep} onToggleFullscreen={() => setIsFullScreenOpen(true)} />
          {renderPlayerControls()}
        </div>

        <div className="explanation-section">
          <QuizDock session={quizSession} cadence={cadence} onCadenceChange={setCadence} />

          <MultiLanguageCodePanel
            algorithmKey={selectedAlg}
            title="Dynamic Programming"
            activeLine={currentStep?.codeLine}
            variables={currentStep?.variables}
            callStack={currentStep?.callStack}
            currentArray={[]}
          />

          <ExplanationPanel
            description={maskNarration(currentStep?.description || 'Click Play to observe step-by-step execution details.', quizSession.phase)}
            timeComplexity={executionData.timeComplexity}
            spaceComplexity={executionData.spaceComplexity}
          />
        </div>
      </div>

      {/* FullScreen Modal */}
      <FullScreenCanvasModal
        isOpen={isFullScreenOpen}
        onClose={() => setIsFullScreenOpen(false)}
        title={`Dynamic Programming | ${selectedAlg.toUpperCase()}`}
        subtitle="DP Table Inspector"
        toolbarControls={renderFloatingControls()}
        playbackControls={renderPlayerControls()}
      >
        <DPRenderer currentStep={currentStep} />
      </FullScreenCanvasModal>

      {showCustomEditor && (
        <CustomArrayEditor
          currentArray={currentCustomArray()}
          onApplyCustomArray={handleApplyCustomArray}
          onClose={() => setShowCustomEditor(false)}
        />
      )}
      <TheoryPanel categoryId="dp" activeTopic={selectedAlg} />

    </div>
  );
};
