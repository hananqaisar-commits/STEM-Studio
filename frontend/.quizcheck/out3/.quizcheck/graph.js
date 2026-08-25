"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* Ad-hoc verification harness for the graph quiz adapter. Not shipped. */
const graphEngine_1 = require("../src/features/graph/graphEngine");
const quizAdapter_1 = require("../src/features/graph/quizAdapter");
const Quiz_1 = require("../src/engine/types/Quiz");
/* ── seeded PRNG so runs are reproducible ─────────────────────────── */
let seed = 20260825;
function rnd() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
}
function pick(n) {
    return Math.floor(rnd() * n);
}
const LETTERS = 'ABCDEFGHI';
function makeNodes(count) {
    return Array.from({ length: count }, (_, i) => ({
        id: LETTERS[i],
        label: LETTERS[i],
        x: 60 + i * 60,
        y: 80 + (i % 2) * 120,
        state: 'default',
    }));
}
/** Connected undirected weighted graph: spanning tree + random extras. */
function randomUndirected(count) {
    const nodes = makeNodes(count);
    const edges = [];
    let id = 0;
    for (let i = 1; i < count; i++) {
        const parent = pick(i);
        edges.push({
            id: `e${++id}`,
            from: LETTERS[parent],
            to: LETTERS[i],
            weight: 1 + pick(9),
            directed: false,
            state: 'default',
        });
    }
    const extras = pick(count);
    for (let k = 0; k < extras; k++) {
        const a = pick(count);
        const b = pick(count);
        if (a === b)
            continue;
        if (edges.some((e) => (e.from === LETTERS[a] && e.to === LETTERS[b]) || (e.from === LETTERS[b] && e.to === LETTERS[a])))
            continue;
        edges.push({
            id: `e${++id}`,
            from: LETTERS[a],
            to: LETTERS[b],
            weight: 1 + pick(9),
            directed: false,
            state: 'default',
        });
    }
    return { nodes, edges };
}
/** DAG: every edge points from a lower index to a higher one. */
function randomDag(count) {
    const nodes = makeNodes(count);
    const edges = [];
    let id = 0;
    for (let j = 1; j < count; j++) {
        const links = 1 + pick(2);
        for (let k = 0; k < links; k++) {
            const i = pick(j);
            if (edges.some((e) => e.from === LETTERS[i] && e.to === LETTERS[j]))
                continue;
            edges.push({ id: `e${++id}`, from: LETTERS[i], to: LETTERS[j], directed: true, state: 'default' });
        }
    }
    return { nodes, edges };
}
function readPhase(step) {
    const p = step.phase;
    let m;
    if ((m = p.match(/^De-queue Node (\w+)$/)))
        return { vertex: m[1], edge: null, kindOfNext: 'dequeue' };
    if ((m = p.match(/^Enqueue Neighbor (\w+)$/)))
        return { vertex: m[1], edge: null, kindOfNext: 'enqueue' };
    if ((m = p.match(/^Recurse to (\w+)$/)))
        return { vertex: m[1], edge: null, kindOfNext: 'recurse' };
    if ((m = p.match(/^Backtrack to (\w+)$/)))
        return { vertex: m[1], edge: null, kindOfNext: 'backtrack' };
    if ((m = p.match(/^Visit Node (\w+)$/)))
        return { vertex: m[1], edge: null, kindOfNext: 'visit' };
    if ((m = p.match(/^Extract Min: Node (\w+) \(dist=(-?\d+)\)$/)))
        return { vertex: m[1], edge: null, kindOfNext: 'extract' };
    if ((m = p.match(/^Relax Edge \((\w+) -> (\w+)\)$/)))
        return { vertex: null, edge: `${m[1]} – ${m[2]}`, kindOfNext: 'relax' };
    if ((m = p.match(/^Add Edge \((\w+)-(\w+), w=(\d+)\)$/)))
        return { vertex: null, edge: `${m[1]} – ${m[2]}`, kindOfNext: 'addEdge' };
    if ((m = p.match(/^Emit Node (\w+) to Topo Order$/)))
        return { vertex: m[1], edge: null, kindOfNext: 'emit' };
    if ((m = p.match(/^In-Degree of (\w+) Reached 0$/)))
        return { vertex: m[1], edge: null, kindOfNext: 'ready' };
    if (/Complete|Found!|Initialize|Compute In-Degrees/.test(p))
        return { vertex: null, edge: null, kindOfNext: /Initialize|Compute/.test(p) ? 'other' : 'terminal' };
    return { vertex: null, edge: null, kindOfNext: 'other' };
}
/* ── run ──────────────────────────────────────────────────────────── */
const problems = [];
const kindOutcomes = new Map();
const cadenceCounts = new Map();
let answersChecked = 0;
function note(kind, answer) {
    if (!kindOutcomes.has(kind))
        kindOutcomes.set(kind, new Map());
    const inner = kindOutcomes.get(kind);
    inner.set(answer, (inner.get(answer) ?? 0) + 1);
}
function check(label, category, steps) {
    const checkpoints = (0, quizAdapter_1.buildGraphCheckpoints)(steps, category);
    const fail = (msg) => problems.push(`${label}: ${msg}`);
    const seenIds = new Set();
    const seenSteps = new Set();
    for (const cadence of ['light', 'normal', 'intensive']) {
        const key = `${category}:${cadence}`;
        if (!cadenceCounts.has(key))
            cadenceCounts.set(key, []);
        cadenceCounts.get(key).push((0, Quiz_1.filterByCadence)(checkpoints, cadence).length);
    }
    for (const cp of checkpoints) {
        const q = cp.question;
        /* ── structural ── */
        if (cp.stepIndex < 0 || cp.stepIndex >= steps.length - 1)
            fail(`stepIndex ${cp.stepIndex} out of range (len ${steps.length})`);
        if (seenSteps.has(cp.stepIndex))
            fail(`two checkpoints on step ${cp.stepIndex}`);
        seenSteps.add(cp.stepIndex);
        if (seenIds.has(q.id))
            fail(`duplicate id ${q.id}`);
        seenIds.add(q.id);
        if (q.correctIndex < 0 || q.correctIndex >= q.options.length)
            fail(`${q.id}: correctIndex ${q.correctIndex} of ${q.options.length}`);
        if (q.options.length < 2)
            fail(`${q.id}: only ${q.options.length} option(s)`);
        if (new Set(q.options).size !== q.options.length)
            fail(`${q.id}: duplicate options ${JSON.stringify(q.options)}`);
        if (q.options.some((o) => !o || !o.trim()))
            fail(`${q.id}: empty option`);
        for (const field of ['prompt', 'explanation', 'hint', 'concept']) {
            if (!q[field] || !q[field].trim())
                fail(`${q.id}: empty ${field}`);
        }
        if (q.options.some((o) => /[<>≤≥]/.test(o)))
            fail(`${q.id}: comparison leaked into option ${JSON.stringify(q.options)}`);
        if (![1, 2, 3].includes(q.weight))
            fail(`${q.id}: bad weight ${q.weight}`);
        /* ── truth, from the engine's phase prose (never from step shape) ── */
        const answer = q.options[q.correctIndex];
        const next = readPhase(steps[cp.stepIndex + 1]);
        const kind = q.id.replace(/-\d+$/, '');
        note(kind, /^(Yes|No)/.test(answer) ? answer.slice(0, 3).trim() : answer);
        if (kind === 'graph-authored')
            continue;
        answersChecked++;
        switch (kind) {
            case 'graph-bfs-dequeue':
                if (next.kindOfNext !== 'dequeue')
                    fail(`${q.id}: next is ${next.kindOfNext}, not a de-queue`);
                else if (answer !== next.vertex)
                    fail(`${q.id}: said ${answer}, engine de-queued ${next.vertex}`);
                break;
            case 'graph-bfs-discover': {
                const yes = next.kindOfNext === 'enqueue';
                if (answer.startsWith('Yes') !== yes)
                    fail(`${q.id}: said "${answer}", next phase is ${steps[cp.stepIndex + 1].phase}`);
                break;
            }
            case 'graph-dfs-direction': {
                const deeper = next.kindOfNext === 'recurse';
                const back = next.kindOfNext === 'backtrack';
                if (!deeper && !back)
                    fail(`${q.id}: next is ${next.kindOfNext}`);
                else if (answer.startsWith('Descend') !== deeper)
                    fail(`${q.id}: said "${answer}", next phase is ${steps[cp.stepIndex + 1].phase}`);
                break;
            }
            case 'graph-dijkstra-extract':
                if (next.kindOfNext !== 'extract')
                    fail(`${q.id}: next is ${next.kindOfNext}, not an extract`);
                else if (answer !== next.vertex)
                    fail(`${q.id}: said ${answer}, engine extracted ${next.vertex}`);
                break;
            case 'graph-dijkstra-relax': {
                const yes = next.kindOfNext === 'relax';
                if (answer.startsWith('Yes') !== yes)
                    fail(`${q.id}: said "${answer}", next phase is ${steps[cp.stepIndex + 1].phase}`);
                break;
            }
            case 'graph-prim-edge':
                if (next.kindOfNext !== 'addEdge')
                    fail(`${q.id}: next is ${next.kindOfNext}, not an add-edge`);
                else if (answer !== next.edge && answer !== next.edge.split(' – ').reverse().join(' – ')) {
                    fail(`${q.id}: said ${answer}, engine added ${next.edge}`);
                }
                break;
            case 'graph-topo-emit':
                if (next.kindOfNext !== 'emit')
                    fail(`${q.id}: next is ${next.kindOfNext}, not an emit`);
                else if (answer !== next.vertex)
                    fail(`${q.id}: said ${answer}, engine emitted ${next.vertex}`);
                break;
            case 'graph-topo-unblock': {
                const yes = next.kindOfNext === 'ready';
                if (answer.startsWith('Yes') !== yes)
                    fail(`${q.id}: said "${answer}", next phase is ${steps[cp.stepIndex + 1].phase}`);
                break;
            }
            default:
                fail(`${q.id}: unrecognised kind ${kind}`);
        }
        /* the explanation must name the answer it is explaining. Only checked
           for atomic answers (a vertex id or an edge label); prose options are
           paraphrased in the explanation by design. */
        if (/^[A-Z]( [–→] [A-Z])?$/.test(answer) && !q.explanation.includes(answer)) {
            fail(`${q.id}: explanation does not mention the answer (${answer})`);
        }
    }
}
const undirectedCases = [
    { label: 'preset-standard', ...(0, graphEngine_1.getPresetGraph)('standard') },
];
for (let i = 0; i < 40; i++) {
    const count = 4 + pick(6);
    undirectedCases.push({ label: `rand-undirected-${i}(n=${count})`, ...randomUndirected(count) });
}
const dagCases = [
    { label: 'preset-dag', ...(0, graphEngine_1.getPresetGraph)('dag') },
];
for (let i = 0; i < 40; i++) {
    const count = 4 + pick(6);
    dagCases.push({ label: `rand-dag-${i}(n=${count})`, ...randomDag(count) });
}
let runs = 0;
for (const g of undirectedCases) {
    for (const start of g.nodes.map((n) => n.id)) {
        check(`${g.label} bfs@${start}`, 'bfs', (0, graphEngine_1.generateBFSSteps)(g.nodes, g.edges, start));
        check(`${g.label} dfs@${start}`, 'dfs', (0, graphEngine_1.generateDFSSteps)(g.nodes, g.edges, start));
        check(`${g.label} dijkstra@${start}`, 'dijkstra', (0, graphEngine_1.generateDijkstraSteps)(g.nodes, g.edges, start, g.nodes[g.nodes.length - 1].id));
        check(`${g.label} prim@${start}`, 'prim', (0, graphEngine_1.generatePrimsSteps)(g.nodes, g.edges, start));
        runs += 4;
    }
}
for (const g of dagCases) {
    check(`${g.label} topo`, 'topoSort', (0, graphEngine_1.generateTopoSortSteps)(g.nodes, g.edges));
    runs++;
    for (const start of g.nodes.map((n) => n.id)) {
        check(`${g.label} bfs@${start}`, 'bfs', (0, graphEngine_1.generateBFSSteps)(g.nodes, g.edges, start));
        check(`${g.label} dfs@${start}`, 'dfs', (0, graphEngine_1.generateDFSSteps)(g.nodes, g.edges, start));
        runs += 2;
    }
}
/* kruskal is in GraphCategory but has no generator, so it must derive
   nothing. (Authored `quizData` would still pass through, which is the
   behaviour we want if a generator is ever added.) */
const kruskalProbe = (0, quizAdapter_1.buildGraphCheckpoints)((0, graphEngine_1.generateBFSSteps)((0, graphEngine_1.getPresetGraph)('standard').nodes, (0, graphEngine_1.getPresetGraph)('standard').edges, 'A'), 'kruskal');
if (kruskalProbe.some((cp) => cp.question.weight !== 1)) {
    problems.push('kruskal derived a checkpoint despite having no generator');
}
console.log(`runs: ${runs}, derived answers checked: ${answersChecked}`);
console.log(`\n── outcome spread per kind ──`);
for (const [kind, outcomes] of [...kindOutcomes].sort()) {
    const entries = [...outcomes].sort((a, b) => b[1] - a[1]);
    const shown = entries.slice(0, 6).map(([k, v]) => `${k}×${v}`).join(', ');
    console.log(`  ${kind.padEnd(24)} ${entries.length} distinct: ${shown}${entries.length > 6 ? ', …' : ''}`);
}
console.log(`\n── checkpoints per run ──`);
for (const [key, counts] of [...cadenceCounts].sort()) {
    const sorted = [...counts].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    console.log(`  ${key.padEnd(22)} min ${sorted[0]}, median ${median}, max ${sorted[sorted.length - 1]}`);
}
console.log(`\n── problems: ${problems.length} ──`);
const grouped = new Map();
for (const p of problems) {
    const signature = p.replace(/^[^:]+: /, '').replace(/graph-[a-z-]+-\d+/, 'ID').replace(/\([^)]*\)/g, '(…)');
    if (!grouped.has(signature))
        grouped.set(signature, []);
    grouped.get(signature).push(p);
}
for (const [signature, hits] of [...grouped].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ×${String(hits.length).padStart(5)}  ${signature}`);
    console.log(`          e.g. ${hits[0]}`);
}
