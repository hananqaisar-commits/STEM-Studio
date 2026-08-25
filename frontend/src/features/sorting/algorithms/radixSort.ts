import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateRadixSortSteps(initialArray: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;
  const allIndices = Array.from({ length: n }, (_, i) => i);

  const pseudocode = [
    'maxVal = maximum value in arr',
    'numDigits = number of digits in maxVal',
    'for pass = 0 to numDigits - 1:',
    '    exp = 10^pass  (digit position)',
    '    count = array of 10 zeros (one per digit 0-9)',
    '    for i = 0 to n - 1:',
    '        digit = floor(arr[i] / exp) % 10',
    '        count[digit]++',
    '    compute prefix sums on count',
    '    for i = n - 1 downto 0:',
    '        place arr[i] in output using count',
    '    copy output back to arr',
  ];

  if (n === 0) {
    steps.push({
      array: [],
      description: 'Empty array — nothing to sort.',
      codeLine: 1,
      variables: { n: 0 },
      callStack: ['main() -> radixSort(arr)'],
    });
    return {
      steps,
      title: 'Radix Sort (LSD)',
      category: 'Non-Comparison Sort',
      timeComplexity: { best: 'O(d·(n+k))', average: 'O(d·(n+k))', worst: 'O(d·(n+k))' },
      spaceComplexity: 'O(n+k)',
      pseudocode,
    };
  }

  // ─── Initial state ──────────────────────────────────────────────────────────
  steps.push({
    array: [...arr],
    description:
      'Initial array before Radix Sort begins. LSD (Least Significant Digit) Radix Sort processes one digit position at a time, from rightmost to leftmost, using a stable counting sort at each pass.',
    codeLine: 1,
    variables: { n, phase: 'initialization' },
    callStack: ['main() -> radixSort(arr)'],
  });

  // ─── Find max to determine number of digits ──────────────────────────────────
  let maxVal = arr[0];
  for (let i = 1; i < n; i++) {
    steps.push({
      array: [...arr],
      comparingIndices: [i],
      description: `Scanning for maximum value: arr[${i}] = ${arr[i]} vs current max = ${maxVal}.`,
      codeLine: 1,
      variables: { i, maxVal, 'arr[i]': arr[i], phase: 'find_max' },
      callStack: ['main() -> radixSort(arr)'],
    });
    if (arr[i] > maxVal) maxVal = arr[i];
  }

  const numDigits = String(maxVal).length;

  steps.push({
    array: [...arr],
    description: `Maximum value is ${maxVal}, which has ${numDigits} digit(s). Radix Sort will perform ${numDigits} counting-sort pass(es) — one per digit position.`,
    codeLine: 2,
    variables: { maxVal, numDigits, phase: 'find_max' },
    callStack: ['main() -> radixSort(arr)'],
  });

  // ─── Digit passes ────────────────────────────────────────────────────────────
  const digitNames = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands'];
  let exp = 1;

  for (let pass = 0; pass < numDigits; pass++) {
    const digitName = digitNames[pass] ?? `10^${pass}`;

    // ── Pass header ──────────────────────────────────────────────────────────
    steps.push({
      array: [...arr],
      description: `=== Pass ${pass + 1} of ${numDigits}: Sorting by the ${digitName} digit (exp = ${exp}). A stable counting sort on this single digit will be performed. ===`,
      codeLine: 3,
      variables: { pass: pass + 1, numDigits, exp, digit: digitName, phase: 'pass_start' },
      callStack: ['main() -> radixSort(arr)', `  -> digitPass(exp=${exp})`],
    });

    const count = new Array(10).fill(0);

    // ── Step A: Count occurrences of each digit ──────────────────────────────
    steps.push({
      array: [...arr],
      description: `Count array of size 10 created (one slot per digit 0–9). Scanning arr to count how many elements have each ${digitName}-digit value.`,
      codeLine: 5,
      variables: { pass: pass + 1, exp, count: `[${count.join(', ')}]`, phase: 'counting' },
      callStack: ['main() -> radixSort(arr)', `  -> digitPass(exp=${exp})`],
    });

    for (let i = 0; i < n; i++) {
      const digit = Math.floor(arr[i] / exp) % 10;
      count[digit]++;
      steps.push({
        array: [...arr],
        comparingIndices: [i],
        description: `arr[${i}] = ${arr[i]}: ${digitName} digit = floor(${arr[i]} / ${exp}) % 10 = ${digit}. Incrementing count[${digit}] to ${count[digit]}.`,
        codeLine: 7,
        variables: {
          i,
          'arr[i]': arr[i],
          digit,
          exp,
          [`count[${digit}]`]: count[digit],
          phase: 'counting',
        },
        callStack: ['main() -> radixSort(arr)', `  -> digitPass(exp=${exp})`],
      });
    }

    steps.push({
      array: [...arr],
      description: `Digit counting complete for ${digitName} place. Count: [${count.join(', ')}].`,
      codeLine: 7,
      variables: { count: `[${count.join(', ')}]`, phase: 'counting_done' },
      callStack: ['main() -> radixSort(arr)', `  -> digitPass(exp=${exp})`],
    });

    // ── Step B: Prefix sums ──────────────────────────────────────────────────
    for (let d = 1; d < 10; d++) {
      count[d] += count[d - 1];
    }

    steps.push({
      array: [...arr],
      description: `Prefix sums computed on count array: [${count.join(', ')}]. count[d] now gives the 1-indexed ending position for elements whose ${digitName} digit is d.`,
      codeLine: 8,
      variables: { count: `[${count.join(', ')}]`, phase: 'prefix_sum' },
      callStack: ['main() -> radixSort(arr)', `  -> digitPass(exp=${exp})`],
    });

    // ── Step C: Build output (right-to-left for stability) ───────────────────
    const output = new Array(n).fill(0);
    const passSortedIndices: number[] = [];

    for (let i = n - 1; i >= 0; i--) {
      const digit = Math.floor(arr[i] / exp) % 10;
      const outputIdx = count[digit] - 1;
      output[outputIdx] = arr[i];
      count[digit]--;
      passSortedIndices.push(outputIdx);

      steps.push({
        array: [...arr],
        comparingIndices: [i],
        swappingIndices: [outputIdx],
        sortedIndices: [...passSortedIndices],
        description: `Placing arr[${i}] = ${arr[i]} (${digitName} digit = ${digit}) at output[${outputIdx}]. count[${digit}] decremented to ${count[digit]}.`,
        codeLine: 10,
        variables: {
          i,
          'arr[i]': arr[i],
          digit,
          outputIdx,
          [`count[${digit}]`]: count[digit],
          phase: 'placement',
        },
        callStack: ['main() -> radixSort(arr)', `  -> digitPass(exp=${exp})`],
      });
    }

    // ── Step D: Copy output back ─────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
      arr[i] = output[i];
    }

    steps.push({
      array: [...arr],
      sortedIndices: [...allIndices],
      description: `Pass ${pass + 1} (${digitName} digit) complete. Array is now sorted by the ${digitName} digit: [${arr.join(', ')}].${pass < numDigits - 1 ? ' Moving to next digit position.' : ''}`,
      codeLine: 11,
      variables: { pass: pass + 1, exp, phase: 'pass_complete' },
      callStack: ['main() -> radixSort(arr)', `  -> digitPass(exp=${exp}) [DONE]`],
    });

    exp *= 10;
  }

  // ─── Final ───────────────────────────────────────────────────────────────────
  steps.push({
    array: [...arr],
    sortedIndices: allIndices,
    description:
      'Radix Sort complete! All digit passes finished — the array is fully sorted without any direct element-to-element comparisons.',
    codeLine: 12,
    variables: { status: 'SORTED', totalElements: n, maxVal, numDigits },
    callStack: ['main() -> radixSort(arr) [TERMINATED]'],
  });

  return {
    steps,
    title: 'Radix Sort (LSD)',
    category: 'Non-Comparison Sort',
    timeComplexity: { best: 'O(d·(n+k))', average: 'O(d·(n+k))', worst: 'O(d·(n+k))' },
    spaceComplexity: 'O(n+k)',
    pseudocode,
  };
}
