import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateBucketSortSteps(initialArray: number[]): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];
  const arr = [...initialArray];
  const n = arr.length;
  const allIndices = Array.from({ length: n }, (_, i) => i);

  const pseudocode = [
    'if n <= 1: return arr',
    'minVal = min(arr), maxVal = max(arr)',
    'bucketCount = floor(sqrt(n)) or at least 1',
    'bucketRange = (maxVal - minVal) / bucketCount',
    'create bucketCount empty buckets',
    'for i = 0 to n - 1:',
    '    bucketIdx = floor((arr[i] - minVal) / bucketRange)',
    '    if bucketIdx == bucketCount: bucketIdx--',
    '    buckets[bucketIdx].push(arr[i])',
    'for each bucket b:',
    '    insertionSort(buckets[b])',
    'idx = 0',
    'for each bucket b:',
    '    for val in buckets[b]: arr[idx++] = val',
  ];

  if (n === 0) {
    steps.push({
      array: [],
      description: 'Empty array — nothing to sort.',
      codeLine: 1,
      variables: { n: 0 },
      callStack: ['main() -> bucketSort(arr)'],
    });
    return {
      steps,
      title: 'Bucket Sort',
      category: 'Non-Comparison Sort',
      timeComplexity: { best: 'O(n+k)', average: 'O(n+n²/k+k)', worst: 'O(n²)' },
      spaceComplexity: 'O(n+k)',
      pseudocode,
    };
  }

  if (n === 1) {
    steps.push({
      array: [...arr],
      sortedIndices: [0],
      description: 'Single-element array is already sorted.',
      codeLine: 1,
      variables: { n: 1 },
      callStack: ['main() -> bucketSort(arr)'],
    });
    return {
      steps,
      title: 'Bucket Sort',
      category: 'Non-Comparison Sort',
      timeComplexity: { best: 'O(n+k)', average: 'O(n+n²/k+k)', worst: 'O(n²)' },
      spaceComplexity: 'O(n+k)',
      pseudocode,
    };
  }

  // ─── Initial state ──────────────────────────────────────────────────────────
  steps.push({
    array: [...arr],
    description:
      'Initial array before Bucket Sort begins. This algorithm distributes elements into several "buckets" based on value ranges, sorts each bucket independently (using insertion sort), then concatenates them.',
    codeLine: 1,
    variables: { n, phase: 'initialization' },
    callStack: ['main() -> bucketSort(arr)'],
  });

  // ─── Phase 0: Find min and max ───────────────────────────────────────────────
  let minVal = arr[0];
  let maxVal = arr[0];

  for (let i = 1; i < n; i++) {
    steps.push({
      array: [...arr],
      comparingIndices: [i],
      description: `Scanning arr[${i}] = ${arr[i]}: current min = ${minVal}, current max = ${maxVal}.`,
      codeLine: 2,
      variables: { i, minVal, maxVal, 'arr[i]': arr[i], phase: 'find_range' },
      callStack: ['main() -> bucketSort(arr)'],
    });
    if (arr[i] < minVal) minVal = arr[i];
    if (arr[i] > maxVal) maxVal = arr[i];
  }

  steps.push({
    array: [...arr],
    description: `Range determined: minVal = ${minVal}, maxVal = ${maxVal}. Range span = ${maxVal - minVal}.`,
    codeLine: 2,
    variables: { minVal, maxVal, range: maxVal - minVal, phase: 'find_range' },
    callStack: ['main() -> bucketSort(arr)'],
  });

  // ─── Determine bucket configuration ──────────────────────────────────────────
  const bucketCount = Math.max(1, Math.floor(Math.sqrt(n)));
  const bucketRange = maxVal === minVal ? 1 : (maxVal - minVal) / bucketCount;

  steps.push({
    array: [...arr],
    description: `Creating ${bucketCount} bucket(s). Each bucket covers a value range of ${bucketRange.toFixed(2)}. Bucket k holds values in [${minVal} + k·${bucketRange.toFixed(2)}, ${minVal} + (k+1)·${bucketRange.toFixed(2)}).`,
    codeLine: 4,
    variables: { bucketCount, bucketRange: Number(bucketRange.toFixed(2)), minVal, maxVal, phase: 'setup_buckets' },
    callStack: ['main() -> bucketSort(arr)'],
  });

  // ─── Phase 1: Distribution ───────────────────────────────────────────────────
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);

  steps.push({
    array: [...arr],
    description: `${bucketCount} empty bucket(s) created. Now distributing each element into its appropriate bucket based on value.`,
    codeLine: 5,
    variables: { bucketCount, phase: 'distribution' },
    callStack: ['main() -> bucketSort(arr)'],
  });

  for (let i = 0; i < n; i++) {
    let bucketIdx = Math.floor((arr[i] - minVal) / bucketRange);
    if (bucketIdx >= bucketCount) bucketIdx = bucketCount - 1;

    buckets[bucketIdx].push(arr[i]);

    const bucketSummary = buckets
      .map((b, k) => `B${k}:[${b.join(',')}]`)
      .join('  ');

    steps.push({
      array: [...arr],
      comparingIndices: [i],
      description: `Distributing arr[${i}] = ${arr[i]} into bucket ${bucketIdx} (value range for this bucket: [${(minVal + bucketIdx * bucketRange).toFixed(1)}, ${(minVal + (bucketIdx + 1) * bucketRange).toFixed(1)})).`,
      codeLine: 7,
      variables: {
        i,
        'arr[i]': arr[i],
        bucketIdx,
        bucketRange: Number(bucketRange.toFixed(2)),
        buckets: bucketSummary,
        phase: 'distribution',
      },
      callStack: ['main() -> bucketSort(arr)'],
    });
  }

  const finalDistribution = buckets
    .map((b, k) => `B${k}:[${b.join(',')}]`)
    .join('  ');

  steps.push({
    array: [...arr],
    description: `Distribution complete. ${finalDistribution}. Each bucket will now be sorted independently using insertion sort.`,
    codeLine: 9,
    variables: { buckets: finalDistribution, phase: 'distribution_done' },
    callStack: ['main() -> bucketSort(arr)'],
  });

  // ─── Phase 2: Sort each bucket with insertion sort ───────────────────────────
  for (let b = 0; b < bucketCount; b++) {
    if (buckets[b].length === 0) {
      steps.push({
        array: [...arr],
        description: `Bucket ${b} is empty — nothing to sort.`,
        codeLine: 10,
        variables: { bucketIdx: b, phase: 'sorting_buckets' },
        callStack: ['main() -> bucketSort(arr)', `  -> sortBucket(${b})`],
      });
      continue;
    }

    if (buckets[b].length === 1) {
      steps.push({
        array: [...arr],
        description: `Bucket ${b} has only one element (${buckets[b][0]}) — already sorted.`,
        codeLine: 10,
        variables: { bucketIdx: b, bucketContent: `[${buckets[b].join(', ')}]`, phase: 'sorting_buckets' },
        callStack: ['main() -> bucketSort(arr)', `  -> sortBucket(${b})`],
      });
      continue;
    }

    steps.push({
      array: [...arr],
      description: `Sorting bucket ${b} (contains ${buckets[b].length} elements: [${buckets[b].join(', ')}]) using insertion sort.`,
      codeLine: 10,
      variables: { bucketIdx: b, bucketSize: buckets[b].length, phase: 'sorting_buckets' },
      callStack: ['main() -> bucketSort(arr)', `  -> sortBucket(${b})`],
    });

    // Insertion sort within this bucket
    for (let i = 1; i < buckets[b].length; i++) {
      const key = buckets[b][i];
      let j = i - 1;
      while (j >= 0 && buckets[b][j] > key) {
        buckets[b][j + 1] = buckets[b][j];
        j--;
      }
      buckets[b][j + 1] = key;

      steps.push({
        array: [...arr],
        description: `Bucket ${b} insertion sort: placed ${key} at position ${j + 1}. Bucket ${b} is now [${buckets[b].join(', ')}].`,
        codeLine: 11,
        variables: {
          bucketIdx: b,
          key,
          insertPos: j + 1,
          bucketContent: `[${buckets[b].join(', ')}]`,
          phase: 'sorting_buckets',
        },
        callStack: ['main() -> bucketSort(arr)', `  -> sortBucket(${b})`, `    -> insertionSort()`],
      });
    }

    steps.push({
      array: [...arr],
      description: `Bucket ${b} fully sorted: [${buckets[b].join(', ')}].`,
      codeLine: 11,
      variables: { bucketIdx: b, bucketContent: `[${buckets[b].join(', ')}]`, phase: 'sorting_buckets' },
      callStack: ['main() -> bucketSort(arr)', `  -> sortBucket(${b}) [DONE]`],
    });
  }

  const sortedBucketSummary = buckets
    .map((b, k) => `B${k}:[${b.join(',')}]`)
    .join('  ');

  steps.push({
    array: [...arr],
    description: `All buckets sorted individually. ${sortedBucketSummary}. Now concatenating buckets to form the final sorted array.`,
    codeLine: 12,
    variables: { buckets: sortedBucketSummary, phase: 'concatenation' },
    callStack: ['main() -> bucketSort(arr)'],
  });

  // ─── Phase 3: Concatenation ──────────────────────────────────────────────────
  let idx = 0;
  const concatSortedIndices: number[] = [];

  for (let b = 0; b < bucketCount; b++) {
    for (const val of buckets[b]) {
      arr[idx] = val;
      concatSortedIndices.push(idx);

      steps.push({
        array: [...arr],
        swappingIndices: [idx],
        sortedIndices: [...concatSortedIndices],
        description: `Concatenating: placing bucket ${b} value ${val} at arr[${idx}].`,
        codeLine: 14,
        variables: {
          idx,
          bucketIdx: b,
          val,
          'arr[idx]': val,
          phase: 'concatenation',
        },
        callStack: ['main() -> bucketSort(arr)', `  -> concatenate()`],
      });

      idx++;
    }
  }

  // ─── Final ───────────────────────────────────────────────────────────────────
  steps.push({
    array: [...arr],
    sortedIndices: allIndices,
    description:
      'Bucket Sort complete! Elements were distributed into buckets by value range, each bucket was sorted with insertion sort, and the buckets were concatenated to produce the fully sorted array.',
    codeLine: 14,
    variables: { status: 'SORTED', totalElements: n, bucketCount, minVal, maxVal },
    callStack: ['main() -> bucketSort(arr) [TERMINATED]'],
  });

  return {
    steps,
    title: 'Bucket Sort',
    category: 'Non-Comparison Sort',
    timeComplexity: { best: 'O(n+k)', average: 'O(n+n²/k+k)', worst: 'O(n²)' },
    spaceComplexity: 'O(n+k)',
    pseudocode,
  };
}
