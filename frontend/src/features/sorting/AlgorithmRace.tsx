import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw, StepForward, X } from 'lucide-react';
import type { ArrayStep } from '../../engine/types/Step';
import { countTraceOperations } from './operationMetrics';
import { generateBubbleSortSteps } from './algorithms/bubbleSort';
import { generateSelectionSortSteps } from './algorithms/selectionSort';
import { generateInsertionSortSteps } from './algorithms/insertionSort';
import { generateMergeSortSteps } from './algorithms/mergeSort';
import { generateQuickSortSteps } from './algorithms/quickSort';
import { generateHeapSortSteps } from './algorithms/heapSort';
import { generateShellSortSteps } from './algorithms/shellSort';
import { generateCountingSortSteps } from './algorithms/countingSort';
import { generateRadixSortSteps } from './algorithms/radixSort';
import { generateBucketSortSteps } from './algorithms/bucketSort';
import './AlgorithmRace.css';

type RaceKey = 'bubble' | 'selection' | 'insertion' | 'merge' | 'quick' | 'heap' | 'shell' | 'counting' | 'radix' | 'bucket';
const options: { id: RaceKey; name: string; complexity: string; run: (array: number[]) => { steps: ArrayStep[] } }[] = [
  { id: 'bubble', name: 'Bubble Sort', complexity: 'O(n²)', run: generateBubbleSortSteps },
  { id: 'selection', name: 'Selection Sort', complexity: 'O(n²)', run: generateSelectionSortSteps },
  { id: 'insertion', name: 'Insertion Sort', complexity: 'O(n²)', run: generateInsertionSortSteps },
  { id: 'merge', name: 'Merge Sort', complexity: 'O(n log n)', run: generateMergeSortSteps },
  { id: 'quick', name: 'Quick Sort', complexity: 'O(n log n)', run: generateQuickSortSteps },
  { id: 'heap', name: 'Heap Sort', complexity: 'O(n log n)', run: generateHeapSortSteps },
  { id: 'shell', name: 'Shell Sort', complexity: 'O(n log n)', run: generateShellSortSteps },
  { id: 'counting', name: 'Counting Sort', complexity: 'O(n+k)', run: generateCountingSortSteps },
  { id: 'radix', name: 'Radix Sort', complexity: 'O(d·(n+k))', run: generateRadixSortSteps },
  { id: 'bucket', name: 'Bucket Sort', complexity: 'O(n+k)', run: generateBucketSortSteps },
];

function buildRaceSteps(key: RaceKey, array: number[]) { return options.find((item) => item.id === key)!.run(array).steps; }

function RaceLane({ title, steps, frame, complexity }: { title: string; steps: ArrayStep[]; frame: number; complexity: string }) {
  const step = steps[Math.min(frame, steps.length - 1)];
  const metrics = countTraceOperations(steps, Math.min(frame, steps.length - 1));
  const max = Math.max(1, ...step.array);
  return <article className="race-lane">
    <header><div><strong>{title}</strong><small>{complexity} · step {Math.min(frame + 1, steps.length)} / {steps.length}</small></div><div className="race-metrics"><span>{metrics.comparisons} comparisons</span><span>{metrics.swaps} swaps</span><span>{metrics.writes} writes</span></div></header>
    <div className="race-bars" role="img" aria-label={`${title}, array ${step.array.join(', ')}`}>
      {step.array.map((value, index) => <div key={`${index}-${value}`} className={`race-bar${step.comparingIndices?.includes(index) ? ' is-comparing' : ''}${step.swappingIndices?.includes(index) ? ' is-swapping' : ''}${step.sortedIndices?.includes(index) ? ' is-sorted' : ''}`} style={{ height: `${Math.max(8, value / max * 100)}%` }}><span>{value}</span></div>)}
    </div>
    <p className="race-description">{step.description}</p>
  </article>;
}

export function AlgorithmRace({ input, onClose }: { input: number[]; onClose: () => void }) {
  const [left, setLeft] = useState<RaceKey>('bubble');
  const [right, setRight] = useState<RaceKey>('quick');
  const [sharedFrame, setSharedFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const leftSteps = useMemo(() => buildRaceSteps(left, input), [left, input]);
  const rightSteps = useMemo(() => buildRaceSteps(right, input), [right, input]);
  const lastFrame = Math.max(leftSteps.length, rightSteps.length) - 1;
  const leftFrame = Math.round(sharedFrame / Math.max(1, lastFrame) * (leftSteps.length - 1));
  const rightFrame = Math.round(sharedFrame / Math.max(1, lastFrame) * (rightSteps.length - 1));
  const selected = options.map(({ id, name }) => ({ id, name }));

  useEffect(() => { setSharedFrame(0); setPlaying(false); }, [left, right, input]);
  useEffect(() => { if (playing && sharedFrame >= lastFrame) setPlaying(false); }, [lastFrame, playing, sharedFrame]);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setSharedFrame((frame) => Math.min(lastFrame, frame + 1)), 420);
    return () => window.clearInterval(timer);
  }, [lastFrame, playing]);

  const moveToStart = () => { setPlaying(false); setSharedFrame(0); };
  const next = () => { setPlaying(false); setSharedFrame((frame) => Math.min(lastFrame, frame + 1)); };
  const leftMeta = options.find((item) => item.id === left)!;
  const rightMeta = options.find((item) => item.id === right)!;

  return <section className="algorithm-race" aria-label="Sorting algorithm race">
    <div className="race-heading"><div><p>Same input · shared progress</p><h2>Compare algorithms side by side</h2><span>Both traces run on [{input.join(', ')}]. The slider advances both algorithms proportionally through their own steps.</span></div><button type="button" onClick={onClose} aria-label="Close comparison"><X size={17} /></button></div>
    <div className="race-selectors"><label>Algorithm A<select value={left} onChange={(event) => setLeft(event.target.value as RaceKey)}>{selected.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Algorithm B<select value={right} onChange={(event) => setRight(event.target.value as RaceKey)}>{selected.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
    <div className="race-lanes"><RaceLane title={leftMeta.name} steps={leftSteps} frame={leftFrame} complexity={leftMeta.complexity} /><RaceLane title={rightMeta.name} steps={rightSteps} frame={rightFrame} complexity={rightMeta.complexity} /></div>
    <div className="race-controller"><button type="button" onClick={moveToStart} aria-label="Reset comparison"><RotateCcw size={15} /></button><button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? <><Pause size={15} />Pause</> : <><Play size={15} />{sharedFrame >= lastFrame ? 'Play again' : 'Play both'}</>}</button><button type="button" onClick={next} disabled={sharedFrame >= lastFrame}><StepForward size={15} />Step both</button><label>Shared progress<input type="range" min={0} max={Math.max(1, lastFrame)} value={sharedFrame} onChange={(event) => { setPlaying(false); setSharedFrame(Number(event.target.value)); }} /></label><span>{lastFrame <= 0 ? 100 : Math.round(sharedFrame / lastFrame * 100)}%</span></div>
  </section>;
}
