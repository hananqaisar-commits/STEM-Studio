"use strict";
/* ── Canonical quiz model ──────────────────────────────────────────────
   One shape for all six visualizer modules. Before this existed, each
   feature carried its own quiz payload: Graph, Binary Search and Linked
   List agreed on `{ prompt, options, correctIndex, explanation }`, BST
   used a bespoke `PredictionPoint`, and Sorting had no data at all (its
   question was derived inline in the page). Feature adapters now map
   whatever the engine produces onto `QuizQuestion`, so the UI, the flow
   state machine and the scoring path are written exactly once.
   ─────────────────────────────────────────────────────────────────── */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CADENCE_HINTS = exports.CADENCE_LABELS = void 0;
exports.cadenceCeiling = cadenceCeiling;
exports.filterByCadence = filterByCadence;
exports.buildOptions = buildOptions;
/** Highest `QuizWeight` still asked at a given cadence. */
function cadenceCeiling(cadence) {
    switch (cadence) {
        case 'light':
            return 1;
        case 'normal':
            return 2;
        case 'intensive':
            return 3;
    }
}
/**
 * Narrow a full checkpoint list down to the student's chosen cadence.
 * Adapters stay cadence-agnostic — they describe every checkpoint they
 * can justify and tag each with a weight; this decides what is asked.
 */
function filterByCadence(checkpoints, cadence) {
    const ceiling = cadenceCeiling(cadence);
    return checkpoints.filter((c) => c.question.weight <= ceiling);
}
exports.CADENCE_LABELS = {
    light: 'Light',
    normal: 'Normal',
    intensive: 'Intensive',
};
exports.CADENCE_HINTS = {
    light: 'Only the defining decision of the algorithm',
    normal: 'Key decisions, reinforced a few times',
    intensive: 'Every decision point, including fine detail',
};
/* ── Option assembly ───────────────────────────────────────────────────
   Every question the old implementation authored put the right answer
   first (`correctIndex: 0` in graphEngine.ts, binarySearchEngine.ts and
   linkedListEngine.ts alike), which is guessable after two questions.
   Adapters build options through `buildOptions` instead, which spreads
   the answer across positions.

   Placement is hashed from the question id rather than randomised, so
   the order is stable across re-renders — a shuffle on every render
   would move options under the student's cursor mid-question.
   ─────────────────────────────────────────────────────────────────── */
function hashString(input) {
    let hash = 2166136261;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash);
}
/**
 * Assemble an answer list from one correct option and some distractors.
 * Distractors that duplicate the answer or each other are dropped, and
 * at most three are kept, so every question offers 2-4 choices.
 */
function buildOptions(questionId, correct, distractors) {
    const seen = new Set([correct]);
    const kept = [];
    for (const option of distractors) {
        if (kept.length === 3)
            break;
        if (seen.has(option))
            continue;
        seen.add(option);
        kept.push(option);
    }
    const correctIndex = hashString(questionId) % (kept.length + 1);
    const options = [...kept];
    options.splice(correctIndex, 0, correct);
    return { options, correctIndex };
}
