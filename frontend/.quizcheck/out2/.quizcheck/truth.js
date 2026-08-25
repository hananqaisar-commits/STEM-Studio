"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bubbleSort_1 = require("../src/features/sorting/algorithms/bubbleSort");
const selectionSort_1 = require("../src/features/sorting/algorithms/selectionSort");
const insertionSort_1 = require("../src/features/sorting/algorithms/insertionSort");
const mergeSort_1 = require("../src/features/sorting/algorithms/mergeSort");
const quickSort_1 = require("../src/features/sorting/algorithms/quickSort");
const heapSort_1 = require("../src/features/sorting/algorithms/heapSort");
const shellSort_1 = require("../src/features/sorting/algorithms/shellSort");
const quizAdapter_1 = require("../src/features/sorting/quizAdapter");
const GEN = {
    bubble: bubbleSort_1.generateBubbleSortSteps, selection: selectionSort_1.generateSelectionSortSteps,
    insertion: insertionSort_1.generateInsertionSortSteps, merge: mergeSort_1.generateMergeSortSteps,
    quick: quickSort_1.generateQuickSortSteps, heap: heapSort_1.generateHeapSortSteps, shell: shellSort_1.generateShellSortSteps,
};
const KEYS = Object.keys(GEN);
function rng(seed) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
const inputs = [[5, 2, 9, 1, 7, 3], [1, 2, 3, 4, 5, 6, 7, 8], [8, 7, 6, 5, 4, 3, 2, 1], [4, 4, 4, 4, 4], [3, 1], [2, 1, 2, 1, 2, 1]];
const r = rng(31);
for (let n = 3; n <= 26; n++)
    for (let t = 0; t < 8; t++)
        inputs.push(Array.from({ length: n }, () => Math.floor(r() * 90) + 1));
let checked = 0;
const fails = [];
const perKind = {};
for (const key of KEYS) {
    for (const input of inputs) {
        const steps = GEN[key]([...input]).steps;
        const final = steps[steps.length - 1].array;
        for (const cp of (0, quizAdapter_1.buildSortingCheckpoints)(steps, key)) {
            const kind = cp.question.id.split('-')[2];
            if (kind === 'anchor')
                continue;
            const cur = steps[cp.stepIndex];
            const next = steps[cp.stepIndex + 1];
            const said = cp.question.options[cp.question.correctIndex];
            const tag = `${key}/${kind} step ${cp.stepIndex} [${input}]`;
            checked++;
            perKind[`${key}:${kind}`] = (perKind[`${key}:${kind}`] ?? 0) + 1;
            if (kind === 'compare') {
                // truth: bubble swaps iff arr[a] > arr[b]
                const [a, b] = cur.comparingIndices;
                const truth = cur.array[a] > cur.array[b] ? 'Swap them' : 'Leave them and move on';
                if (said !== truth)
                    fails.push(`${tag}: said "${said}" truth "${truth}" (${cur.array[a]} vs ${cur.array[b]})`);
            }
            else if (kind === 'partition') {
                // truth: moves iff arr[j] < pivot value
                const j = cur.variables.j;
                const pivotVal = cur.array[cur.pivotIndex];
                const truth = cur.array[j] < pivotVal
                    ? 'Move it into the region of smaller values' : 'Leave it where it is and advance';
                if (said !== truth)
                    fails.push(`${tag}: said "${said}" truth "${truth}" (arr[j]=${cur.array[j]} pivot=${pivotVal})`);
            }
            else if (kind === 'min') {
                // truth: minIdx moves iff arr[candidate] < arr[minIdx]
                const m = cur.variables.minIdx;
                const c = cur.comparingIndices.find((i) => i !== m);
                const truth = cur.array[c] < cur.array[m]
                    ? `Yes — minIdx moves to index ${c}` : `No — minIdx stays at index ${m}`;
                if (said !== truth)
                    fails.push(`${tag}: said "${said}" truth "${truth}" (arr[${c}]=${cur.array[c]} arr[${m}]=${cur.array[m]})`);
            }
            else if (kind === 'lock') {
                const idx = Number(said.replace('Index ', ''));
                // truth A: that slot really does hold its final value from now on
                if (next.array[idx] !== final[idx])
                    fails.push(`${tag}: index ${idx} holds ${next.array[idx]}, final is ${final[idx]}`);
                for (let k = cp.stepIndex + 1; k < steps.length; k++) {
                    if (steps[k].array[idx] !== final[idx]) {
                        fails.push(`${tag}: index ${idx} changed again at step ${k}`);
                        break;
                    }
                }
                // truth B: the per-algorithm semantic claim
                const unsorted = cur.array.map((_, i) => i).filter((i) => !(cur.sortedIndices ?? []).includes(i));
                if (key === 'bubble' || key === 'heap') {
                    const want = Math.max(...unsorted);
                    if (idx !== want)
                        fails.push(`${tag}: expected rightmost unsorted ${want}, got ${idx}`);
                }
                else if (key === 'selection') {
                    const want = Math.min(...unsorted);
                    if (idx !== want)
                        fails.push(`${tag}: expected leftmost unsorted ${want}, got ${idx}`);
                }
                else if (key === 'quick') {
                    const want = next.variables.pivotPlacedAt;
                    if (idx !== want)
                        fails.push(`${tag}: expected pivot slot ${want}, got ${idx}`);
                }
            }
            else if (kind === 'landing') {
                const idx = Number(said.replace('Index ', ''));
                const i = cur.pivotIndex;
                const keyVal = cur.variables.key;
                // truth: lands after the last prefix value that is not larger than the key
                const truth = cur.array.slice(0, i).filter((v) => v <= keyVal).length;
                if (idx !== truth)
                    fails.push(`${tag}: said ${idx} truth ${truth} (key=${keyVal} prefix=${cur.array.slice(0, i)})`);
                if (next.array[idx] === keyVal && idx !== truth)
                    fails.push(`${tag}: inconsistent`);
            }
            else if (kind === 'shift') {
                // truth: independent of comparingIndices — read the placement step
                const i = cur.pivotIndex;
                let placed = -1;
                for (let k = cp.stepIndex + 1; k < steps.length; k++) {
                    const s = steps[k];
                    if ((s.sortedIndices?.length ?? 0) === 1 && !s.comparingIndices && !s.swappingIndices) {
                        placed = s.sortedIndices[0];
                        break;
                    }
                }
                if (placed < 0) {
                    fails.push(`${tag}: no placement step found`);
                    continue;
                }
                const truth = placed !== i
                    ? 'Yes — it shifts left along the gap'
                    : 'No — it is already in order within its gapped subsequence';
                if (said !== truth)
                    fails.push(`${tag}: said "${said}" truth "${truth}" (i=${i} placed=${placed})`);
            }
            else if (kind === 'midpoint') {
                const idx = Number(said.replace('Index ', ''));
                // truth: parse the engine's own description
                const m = /at midpoint (\d+)/.exec(cur.description);
                if (!m) {
                    fails.push(`${tag}: description not a divide step: ${cur.description}`);
                    continue;
                }
                if (idx !== Number(m[1]))
                    fails.push(`${tag}: said ${idx}, engine says ${m[1]} (${cur.description})`);
            }
            else {
                fails.push(`${tag}: unrecognised kind`);
            }
        }
    }
}
console.log(`\nchecked ${checked} derived answers across ${inputs.length} inputs x ${KEYS.length} algorithms`);
console.log('per kind:', JSON.stringify(perKind, null, 0).replace(/","/g, '", "'));
console.log(`\nMISMATCHES: ${fails.length}`);
for (const f of fails.slice(0, 25))
    console.log('  ! ' + f);
