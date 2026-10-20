/**
 * Maps Custom Code sandbox responses into visualizer steps.
 *
 * The sandbox streams `__VSTEP__` trace lines (when the user calls
 * visualize_step) and a final `__VRESULT__` payload. For array algorithms we
 * render those as ArrayStep frames the existing step player understands. For
 * stateful structures the page replays reference-quality frames locally and
 * uses the sandbox purely for correctness verification.
 */

import type { ArrayStep } from './types/Step';
import type { CustomCodeExecutionResponse } from '../api/customCode';

/** Deep-compare two JSON-safe values (used for output-only verification). */
export function resultsMatch(expected: unknown, actual: unknown): boolean {
  return JSON.stringify(normalize(expected)) === JSON.stringify(normalize(actual));
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => [k, normalize(v)] as const)
      .sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries);
  }
  if (typeof value === 'number') return Math.round(value * 1e6) / 1e6;
  return value;
}

/**
 * Build ArrayStep frames from a sandbox run of an array-transform algorithm
 * (e.g. sorting). Trace events become descriptive frames; the final frame
 * shows the returned array and marks it sorted when it matches the expected
 * reference output.
 */
export function mapArrayExecutionToSteps(
  initialArray: number[],
  response: CustomCodeExecutionResponse,
  expected: number[]
): ArrayStep[] {
  const steps: ArrayStep[] = [];
  const actual = Array.isArray(response.result?.result)
    ? (response.result!.result as unknown[]).map(Number)
    : null;
  const correct = actual !== null && resultsMatch(expected, actual);
  const snapshot = actual ?? [...initialArray];

  steps.push({
    array: [...initialArray],
    description: `Custom code submitted to the sandbox. Initial array: [${initialArray.join(', ')}].`,
    variables: { language: response.status, status: response.status },
    callStack: ['custom_code(sandbox)'],
  });

  for (const trace of response.trace_steps) {
    const value =
      trace.value === undefined ? '' : ` ${Array.isArray(trace.value) ? `[${trace.value.join(', ')}]` : String(trace.value)}`;
    steps.push({
      array: [...snapshot],
      description: `Trace: ${trace.op ?? 'step'}${value}`,
      callStack: ['custom_code(sandbox)', `visualize_step("${trace.op ?? ''}")`],
    });
  }

  steps.push({
    array: [...snapshot],
    sortedIndices: correct ? snapshot.map((_, i) => i) : undefined,
    description: correct
      ? `Sandbox returned the expected result: [${snapshot.join(', ')}]. Output matches the reference.`
      : actual
        ? `Sandbox returned [${snapshot.join(', ')}], which does NOT match the expected [${expected.join(', ')}].`
        : 'Sandbox finished, but no parseable array result was returned.',
    variables: { correct, totalTraceSteps: response.trace_steps.length },
    callStack: ['custom_code(sandbox) [TERMINATED]'],
  });

  return steps;
}

/**
 * Short human-readable summary of a stateful replay result, for inline status.
 */
export function describeStatefulResult(response: CustomCodeExecutionResponse): string {
  const lastMethod = response.result?.lastMethod ?? 'operation';
  const returned = response.result?.returned;
  if (returned === undefined || returned === null) {
    return `Replayed history; last operation ${lastMethod} completed.`;
  }
  return `Replayed history; ${lastMethod} returned ${JSON.stringify(returned)}.`;
}
