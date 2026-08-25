import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function generateAnagramSteps(str1: string, str2: string): AlgorithmExecution<ArrayStep> {
  const arr1 = str1.split('').map(c => c.charCodeAt(0));
  const arr2 = str2.split('').map(c => c.charCodeAt(0));
  const steps: ArrayStep[] = [];
  const freq: Record<string, number> = {};
  const combined = [...arr1, ...arr2];

  steps.push({
    array: combined,
    description: `Checking if "${str1}" and "${str2}" are anagrams. Building frequency map.`,
    variables: { phase: 'count', str1, str2 },
  });

  for (let i = 0; i < arr1.length; i++) {
    const char = str1[i];
    freq[char] = (freq[char] || 0) + 1;
    steps.push({
      array: combined,
      comparingIndices: [i],
      sortedIndices: Array.from({ length: i + 1 }, (_, k) => k),
      description: `Counting '${char}' from first string. freq['${char}'] = ${freq[char]}.`,
      variables: { phase: 'count', char, 'freq[char]': freq[char], i },
    });
  }

  steps.push({
    array: combined,
    sortedIndices: Array.from({ length: arr1.length }, (_, k) => k),
    description: `Frequency map built. Now decrementing with characters from second string.`,
    variables: { phase: 'verify' },
  });

  let allZero = true;
  for (let i = 0; i < arr2.length; i++) {
    const char = str2[i];
    const idx = arr1.length + i;
    if (!(char in freq)) {
      steps.push({
        array: combined,
        swappingIndices: [idx],
        description: `Character '${char}' not found in frequency map. Not an anagram!`,
        variables: { phase: 'verify', char, allZero: false },
      });
      allZero = false;
      break;
    }
    freq[char]--;
    steps.push({
      array: combined,
      comparingIndices: [idx],
      description: `Decrementing freq['${char}'] to ${freq[char]}.`,
      variables: { phase: 'verify', char, 'freq[char]': freq[char], i: idx },
    });
    if (freq[char] < 0) {
      steps.push({
        array: combined,
        swappingIndices: [idx],
        description: `Negative frequency for '${char}'. Not an anagram!`,
        variables: { phase: 'verify', char, allZero: false },
      });
      allZero = false;
      break;
    }
  }

  if (allZero) {
    const allNonZero = Object.values(freq).some(v => v !== 0);
    if (allNonZero) {
      steps.push({
        array: combined,
        description: `Frequencies not all zero. Not an anagram.`,
        variables: { phase: 'verify', allZero: false },
      });
      allZero = false;
    } else {
      steps.push({
        array: combined,
        sortedIndices: Array.from({ length: combined.length }, (_, k) => k),
        description: `"${str1}" and "${str2}" ARE anagrams!`,
        variables: { phase: 'verify', allZero: true },
      });
    }
  }

  return {
    steps,
    title: 'Anagram Check',
    category: 'String Algorithms',
    timeComplexity: { best: 'O(n)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(k)',
    pseudocode: [
      'if len(s1) ≠ len(s2) return false',
      'freq = empty map',
      'for char in s1 do freq[char]++',
      'for char in s2 do',
      '  if freq[char] undefined or 0 return false',
      '  freq[char]--',
      'return all freq values are 0',
    ],
  };
}
