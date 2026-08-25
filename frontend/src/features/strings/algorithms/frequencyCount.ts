import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateFrequencyCountSteps(inputStr: string): AlgorithmExecution<ArrayStep> {
  const arr = inputStr.split('').map(c => c.charCodeAt(0));
  const steps: ArrayStep[] = [];
  const freq: Record<string, number> = {};
  let maxFreq = 0;

  steps.push({
    array: [...arr],
    description: `Counting character frequencies in "${inputStr}".`,
    variables: { i: 0, maxFreq: 0 },
  });

  for (let i = 0; i < arr.length; i++) {
    const char = inputStr[i];
    freq[char] = (freq[char] || 0) + 1;
    if (freq[char] > maxFreq) maxFreq = freq[char];

    steps.push({
      array: [...arr],
      comparingIndices: [i],
      sortedIndices: Array.from({ length: i + 1 }, (_, k) => k),
      description: `Processing '${char}' at index ${i}. freq['${char}'] = ${freq[char]}.`,
      variables: { i, char, 'freq[char]': freq[char], maxFreq },
      codeLine: 2,
    });
  }

  steps.push({
    array: [...arr],
    sortedIndices: Array.from({ length: arr.length }, (_, k) => k),
    description: `All characters processed. Building frequency table.`,
    variables: { maxFreq },
    codeLine: 4,
  });

  const sortedEntries = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  for (const [char, count] of sortedEntries) {
    steps.push({
      array: [...arr],
      sortedIndices: Array.from({ length: arr.length }, (_, k) => k),
      description: `'${char}' appears ${count} time${count !== 1 ? 's' : ''} (${((count / arr.length) * 100).toFixed(1)}%).`,
      variables: { char, count, maxFreq, percentage: `${((count / arr.length) * 100).toFixed(1)}%` },
      codeLine: 5,
    });
  }

  const mostCommon = sortedEntries[0];
  steps.push({
    array: [...arr],
    sortedIndices: Array.from({ length: arr.length }, (_, k) => k),
    description: `Frequency count complete. Most common: '${mostCommon[0]}' (${mostCommon[1]} times).`,
    variables: { maxFreq, mostCommonChar: mostCommon[0], mostCommonCount: mostCommon[1] },
    codeLine: 6,
  });

  return {
    steps,
    title: 'Frequency Count',
    category: 'String Algorithms',
    timeComplexity: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(k)',
    pseudocode: [
      'freq = empty map',
      'for i = 0 to n-1 do',
      '  freq[s[i]]++',
      'end for',
      'sort freq by count descending',
      'for each (char, count) in freq do print char, count',
    ],
  };
}
