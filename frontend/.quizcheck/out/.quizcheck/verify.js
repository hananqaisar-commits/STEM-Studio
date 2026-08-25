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
const Quiz_1 = require("../src/engine/types/Quiz");
const GEN = {
    bubble: bubbleSort_1.generateBubbleSortSteps,
    selection: selectionSort_1.generateSelectionSortSteps,
    insertion: insertionSort_1.generateInsertionSortSteps,
    merge: mergeSort_1.generateMergeSortSteps,
    quick: quickSort_1.generateQuickSortSteps,
    heap: heapSort_1.generateHeapSortSteps,
    shell: shellSort_1.generateShellSortSteps,
};
const KEYS = Object.keys(GEN);
const CADENCES = ['light', 'normal', 'intensive'];
function rng(seed) {
    let s = seed;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
const inputs = [];
inputs.push([5, 2, 9, 1, 7, 3]);
inputs.push([1, 2, 3, 4, 5, 6, 7, 8]); // already sorted
inputs.push([8, 7, 6, 5, 4, 3, 2, 1]); // reversed
inputs.push([4, 4, 4, 4, 4]); // all equal
inputs.push([3, 1]);
inputs.push([42]);
inputs.push([]);
inputs.push([2, 1, 2, 1, 2, 1]); // duplicates
const r = rng(7);
for (let n = 3; n <= 26; n++) {
    for (let t = 0; t < 6; t++) {
        inputs.push(Array.from({ length: n }, () => Math.floor(r() * 90) + 1));
    }
}
inputs.push(Array.from({ length: 40 }, () => Math.floor(r() * 90) + 1)); // past label limit
// ── checks ──
let problems = [];
const kindTally = {};
const outcomeTally = {};
const cadenceTally = {};
for (const key of KEYS) {
    kindTally[key] = {};
    cadenceTally[key] = { light: [], normal: [], intensive: [] };
    for (const input of inputs) {
        const steps = GEN[key]([...input]).steps;
        const cps = (0, quizAdapter_1.buildSortingCheckpoints)(steps, key);
        for (const c of cps) {
            // 1. stepIndex in range, and not the last step (nothing follows to reveal)
            if (c.stepIndex < 0 || c.stepIndex >= steps.length - 1) {
                problems.push(`${key}: stepIndex ${c.stepIndex} out of usable range (len ${steps.length}) [${input}]`);
            }
            // 2. correctIndex valid
            if (c.question.correctIndex < 0 || c.question.correctIndex >= c.question.options.length) {
                problems.push(`${key}: correctIndex ${c.question.correctIndex} out of bounds [${input}]`);
            }
            // 3. at least 2 options, all distinct, none empty
            const opts = c.question.options;
            if (opts.length < 2)
                problems.push(`${key}: only ${opts.length} option(s) — ${c.question.id}`);
            if (new Set(opts).size !== opts.length)
                problems.push(`${key}: duplicate options — ${c.question.id} :: ${JSON.stringify(opts)}`);
            if (opts.some((o) => !o.trim()))
                problems.push(`${key}: empty option — ${c.question.id}`);
            // 4. required prose present
            for (const field of ['prompt', 'explanation', 'hint', 'concept']) {
                if (!c.question[field].trim())
                    problems.push(`${key}: empty ${field} — ${c.question.id}`);
            }
            // 5. no option label may contain a comparison operator (the old leak)
            for (const o of opts) {
                if (/[<>≤≥]/.test(o))
                    problems.push(`${key}: option leaks a comparison — ${c.question.id} :: ${o}`);
            }
            // 6. no two checkpoints on the same step; ids unique
            // (checked below in aggregate)
            const kind = c.question.id.split('-')[2];
            kindTally[key][kind] = (kindTally[key][kind] ?? 0) + 1;
            const bucket = `${key}:${kind}`;
            outcomeTally[bucket] ??= new Set();
            outcomeTally[bucket].add(opts[c.question.correctIndex]);
        }
        const idSet = new Set(cps.map((c) => c.question.id));
        if (idSet.size !== cps.length)
            problems.push(`${key}: duplicate question ids [${input}]`);
        const stepSet = new Set(cps.map((c) => c.stepIndex));
        if (stepSet.size !== cps.length)
            problems.push(`${key}: two checkpoints on one step [${input}]`);
        // 7. spacing: never two checkpoints on consecutive steps
        const sortedSteps = [...stepSet].sort((a, b) => a - b);
        for (let i = 1; i < sortedSteps.length; i++) {
            if (sortedSteps[i] - sortedSteps[i - 1] < 2) {
                problems.push(`${key}: checkpoints one step apart (${sortedSteps[i - 1]}, ${sortedSteps[i]}) [${input}]`);
            }
        }
        for (const cad of CADENCES) {
            cadenceTally[key][cad].push((0, Quiz_1.filterByCadence)(cps, cad).length);
        }
    }
}
console.log('\n=== checkpoint counts by kind (all inputs) ===');
for (const key of KEYS)
    console.log(`  ${key.padEnd(10)} ${JSON.stringify(kindTally[key])}`);
console.log('\n=== distinct correct answers seen per kind (degeneracy check) ===');
for (const bucket of Object.keys(outcomeTally).sort()) {
    const vals = [...outcomeTally[bucket]];
    const numeric = vals.every((v) => /^Index \d+$/.test(v));
    console.log(`  ${bucket.padEnd(22)} ${numeric ? `${vals.length} distinct indices` : JSON.stringify(vals)}`);
}
console.log('\n=== cadence counts: min / median / max across inputs ===');
for (const key of KEYS) {
    const row = CADENCES.map((cad) => {
        const v = [...cadenceTally[key][cad]].sort((a, b) => a - b);
        return `${cad}=${v[0]}/${v[Math.floor(v.length / 2)]}/${v[v.length - 1]}`;
    });
    console.log(`  ${key.padEnd(10)} ${row.join('   ')}`);
}
console.log(`\n=== problems: ${problems.length} ===`);
for (const p of [...new Set(problems)].slice(0, 40))
    console.log('  ! ' + p);
