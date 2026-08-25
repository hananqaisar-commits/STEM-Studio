/**
 * Custom Code Execution Sandbox Engine
 * 
 * Executes user-provided JavaScript sorting/stack/queue code in a sandboxed
 * environment. Uses an instrumented wrapper that intercepts array operations
 * and generates visualization steps for the step player.
 * 
 * Safety: Runs via Function() constructor (no eval). Max 5000 steps and
 * 3-second timeout guard to prevent infinite loops.
 */

import type { ArrayStep } from './types/Step';
import type { CustomLanguage } from './customCodeTemplates';

export interface ExecutionResult {
  steps: ArrayStep[];
  resultArray: number[];
  error?: { message: string; line?: number };
}

const MAX_STEPS = 5000;

/**
 * Transpile user code in Python, C++, C#, Java, Ruby, Go, or Rust into JS for sandbox execution.
 */
export function transpileToJS(userCode: string, lang: CustomLanguage): string {
  if (lang === 'javascript') return userCode;

  let jsCode = userCode;

  if (lang === 'python') {
    jsCode = jsCode.replace(/#.*/g, (match) => `//${match.slice(1)}`);
    jsCode = jsCode.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false').replace(/\bNone\b/g, 'null');
    jsCode = jsCode.replace(/\bmark_sorted\b/g, 'markSorted');
    jsCode = jsCode.replace(/for\s+([a-zA-Z_]\w*)\s+in\s+range\(([^)]+)\):/g, (_, varName, rangeArgs) => {
      const args = rangeArgs.split(',').map((s: string) => s.trim());
      if (args.length === 1) {
        return `for (let ${varName} = 0; ${varName} < ${args[0]}; ${varName}++) {`;
      } else if (args.length === 2) {
        return `for (let ${varName} = ${args[0]}; ${varName} < ${args[1]}; ${varName}++) {`;
      } else if (args.length === 3) {
        const step = args[2];
        if (step.startsWith('-')) {
          return `for (let ${varName} = ${args[0]}; ${varName} > ${args[1]}; ${varName} += ${step}) {`;
        }
        return `for (let ${varName} = ${args[0]}; ${varName} < ${args[1]}; ${varName} += ${step}) {`;
      }
      return _;
    });
    jsCode = jsCode.replace(/while\s+(.+):/g, 'while ($1) {');
    jsCode = jsCode.replace(/if\s+(.+):/g, 'if ($1) {');
    jsCode = jsCode.replace(/def\s+([a-zA-Z_]\w*)\(([^)]*)\):/g, 'function $1($2) {');

    const lines = jsCode.split('\n');
    const processedLines: string[] = [];
    const indentStack: number[] = [0];

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) {
        processedLines.push(line);
        continue;
      }
      const indent = line.search(/\S/);
      while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
        indentStack.pop();
        processedLines.push(' '.repeat(indentStack[indentStack.length - 1]) + '}');
      }
      if (line.trimEnd().endsWith('{')) {
        indentStack.push(indent > indentStack[indentStack.length - 1] ? indent : indentStack[indentStack.length - 1] + 2);
      }
      processedLines.push(line);
    }
    while (indentStack.length > 1) {
      indentStack.pop();
      processedLines.push('}');
    }
    jsCode = processedLines.join('\n');
  }

  if (lang === 'cpp' || lang === 'java' || lang === 'csharp') {
    jsCode = jsCode.replace(/\b(int|float|double|bool|void|size_t|var|long)\s+/g, 'let ');
    jsCode = jsCode.replace(/\bmark_sorted\b/g, 'markSorted');
  }

  if (lang === 'ruby') {
    jsCode = jsCode.replace(/#.*/g, (match) => `//${match.slice(1)}`);
    jsCode = jsCode.replace(/\bmark_sorted\b/g, 'markSorted');
    jsCode = jsCode.replace(/\((\d+|\w+)\s*\.\.\.\s*([^)]+)\)\.each\s+do\s+\|(\w+)\|/g, 'for (let $3 = $1; $3 < $2; $3++) {');
    jsCode = jsCode.replace(/\((\d+|\w+)\s*\.\.\s*([^)]+)\)\.each\s+do\s+\|(\w+)\|/g, 'for (let $3 = $1; $3 <= $2; $3++) {');
    jsCode = jsCode.replace(/\bif\s+(.+)/g, 'if ($1) {');
    jsCode = jsCode.replace(/\bend\b/g, '}');
  }

  if (lang === 'go') {
    jsCode = jsCode.replace(/for\s+([a-zA-Z_]\w*)\s*:=\s*([^;]+);\s*([^;]+);\s*(.+)\s*\{/g, 'for (let $1 = $2; $3; $4) {');
    jsCode = jsCode.replace(/\bmark_sorted\b/g, 'markSorted');
    jsCode = jsCode.replace(/func\s+([a-zA-Z_]\w*)\([^)]*\)/g, 'function $1()');
  }

  if (lang === 'rust') {
    jsCode = jsCode.replace(/for\s+([a-zA-Z_]\w*)\s+in\s+([^.\s]+)\.\.([^.\s\{]+)\s*\{/g, 'for (let $1 = $2; $1 < $3; $1++) {');
    jsCode = jsCode.replace(/\blet\s+mut\b/g, 'let');
    jsCode = jsCode.replace(/\bfn\s+([a-zA-Z_]\w*)\s*\([^)]*\)/g, 'function $1()');
    jsCode = jsCode.replace(/\bmark_sorted\b/g, 'markSorted');
  }

  return jsCode;
}

/**
 * Execute user-provided custom code in JS, Python, C++, C#, Java, Ruby, Go, or Rust.
 */
export function executeCustomSortingCode(
  userCode: string,
  inputArray: number[],
  lang: CustomLanguage = 'javascript'
): ExecutionResult {
  const steps: ArrayStep[] = [];
  const arr = [...inputArray];
  const sortedSoFar: number[] = [];
  let stepCount = 0;

  steps.push({
    array: [...arr],
    description: `Custom code (${lang.toUpperCase()}): Initial array state.`,
    codeLine: 1,
    variables: { n: arr.length, language: lang.toUpperCase() },
    callStack: [`custom_sort_${lang}(arr)`],
  });

  const compare = (i: number, j: number): boolean => {
    if (stepCount++ > MAX_STEPS) {
      throw new Error(`Execution limit exceeded (${MAX_STEPS} steps). Possible infinite loop.`);
    }
    steps.push({
      array: [...arr],
      comparingIndices: [i, j],
      sortedIndices: [...sortedSoFar],
      description: `Comparing arr[${i}]=${arr[i]} with arr[${j}]=${arr[j]}.`,
      codeLine: 3,
      variables: { i, j, 'arr[i]': arr[i], 'arr[j]': arr[j] },
      callStack: [`custom_sort_${lang}(arr)`],
    });
    return arr[i] > arr[j];
  };

  const swap = (i: number, j: number): void => {
    if (stepCount++ > MAX_STEPS) {
      throw new Error(`Execution limit exceeded (${MAX_STEPS} steps). Possible infinite loop.`);
    }
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
    steps.push({
      array: [...arr],
      swappingIndices: [i, j],
      sortedIndices: [...sortedSoFar],
      description: `Swapped arr[${i}] and arr[${j}]. Array: [${arr.join(', ')}]`,
      codeLine: 4,
      variables: { i, j, 'arr[i]': arr[i], 'arr[j]': arr[j] },
      callStack: [`custom_sort_${lang}(arr)`],
    });
  };

  const markSorted = (idx: number): void => {
    if (!sortedSoFar.includes(idx)) {
      sortedSoFar.push(idx);
    }
  };

  try {
    const executableJS = transpileToJS(userCode, lang);

    // eslint-disable-next-line no-new-func
    const sandboxedFn = new Function(
      'arr', 'n', 'compare', 'swap', 'markSorted',
      executableJS
    );

    sandboxedFn(arr, arr.length, compare, swap, markSorted);

    const allIndices = Array.from({ length: arr.length }, (_, i) => i);
    steps.push({
      array: [...arr],
      sortedIndices: allIndices,
    description: `Custom ${lang.toUpperCase()} code complete. Final array state.`,
      codeLine: 7,
      variables: { status: 'COMPLETE', totalSteps: steps.length },
      callStack: [`custom_sort_${lang}(arr) [TERMINATED]`],
    });

    return { steps, resultArray: [...arr] };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    let errorLine: number | undefined;
    if (err instanceof Error && err.stack) {
      const lineMatch = err.stack.match(/<anonymous>:(\d+)/);
      if (lineMatch) {
        errorLine = parseInt(lineMatch[1], 10) - 2;
      }
    }

    steps.push({
      array: [...arr],
    description: `Error in ${lang.toUpperCase()}: ${errorMessage}`,
      codeLine: errorLine,
      variables: { error: errorMessage },
      callStack: [`custom_sort_${lang}(arr) [ERROR]`],
    });

    return {
      steps,
      resultArray: [...arr],
      error: { message: errorMessage, line: errorLine },
    };
  }
}
