import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

export function runHuffmanCoding(text: string): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];

  // Count frequencies
  const freqMap = new Map<string, number>();
  for (const ch of text) {
    freqMap.set(ch, (freqMap.get(ch) || 0) + 1);
  }

  // Sort characters alphabetically for stable indexing
  const chars = Array.from(freqMap.keys()).sort();
  const initialFreqs = chars.map((ch) => freqMap.get(ch)!);

  const n = chars.length;

  steps.push({
    array: [...initialFreqs],
    description: `Huffman Coding: Character frequencies from "${text}". ${n} unique characters. Greedily merge the two lowest-frequency nodes.`,
    codeLine: 1,
    variables: { 'Unique chars': n, 'Total length': text.length, merges: 0 },
    callStack: ['main() -> huffmanCoding(text)'],
  });

  // Build priority queue (we'll use a simple sorted array approach)
  interface PQNode {
    freq: number;
    label: string;
    arrayIndex: number;
  }

  let pq: PQNode[] = chars.map((ch, i) => ({
    freq: freqMap.get(ch)!,
    label: `'${ch}'`,
    arrayIndex: i,
  }));

  // Track the evolving array
  let currentArray = [...initialFreqs];
  // Track which indices are "done" (merged into tree)
  let doneIndices: number[] = [];

  let mergeCount = 0;

  while (pq.length > 1) {
    // Sort PQ by frequency to find two smallest
    pq.sort((a, b) => a.freq - b.freq);

    const node1 = pq[0];
    const node2 = pq[1];

    // Step: considering these two for merge
    steps.push({
      array: [...currentArray],
      comparingIndices: [node1.arrayIndex, node2.arrayIndex],
      sortedIndices: [...doneIndices],
      description: `Merging ${node1.label} (freq ${node1.freq}) and ${node2.label} (freq ${node2.freq}) — the two smallest frequencies.`,
      codeLine: 2,
      variables: {
        node1: node1.label,
        'freq1': node1.freq,
        node2: node2.label,
        'freq2': node2.freq,
        merges: mergeCount,
      },
      callStack: ['main() -> huffmanCoding(text) -> merge()'],
    });

    // Merge them
    const mergedFreq = node1.freq + node2.freq;
    const mergedIndex = currentArray.length;
    mergeCount++;

    // Add new merged node to the array
    currentArray = [...currentArray, mergedFreq];
    doneIndices = [...doneIndices, node1.arrayIndex, node2.arrayIndex];

    steps.push({
      array: [...currentArray],
      sortedIndices: [...doneIndices],
      description: `Merged into new node (freq ${mergedFreq}). ${pq.length - 1} node(s) remaining. Total merges: ${mergeCount}.`,
      codeLine: 3,
      variables: {
        mergedFreq,
        remaining: pq.length - 1,
        merges: mergeCount,
      },
      callStack: ['main() -> huffmanCoding(text) -> merge()'],
    });

    // Remove the two smallest, add merged node
    pq = pq.slice(2);
    pq.push({
      freq: mergedFreq,
      label: `[${node1.label}+${node2.label}]`,
      arrayIndex: mergedIndex,
    });
  }

  // Final step — only one node left (root of Huffman tree)
  const root = pq[0];
  steps.push({
    array: [...currentArray],
    sortedIndices: Array.from({ length: currentArray.length }, (_, i) => i),
    description: `Huffman tree built! Root frequency = ${root.freq}. All ${text.length} characters encoded. ${mergeCount} merges performed.`,
    codeLine: 4,
    variables: { 'Root freq': root.freq, merges: mergeCount, 'Characters encoded': text.length },
    callStack: ['main() -> huffmanCoding(text) [DONE]'],
  });

  return {
    steps,
    title: 'Huffman Coding',
    category: 'Greedy Algorithms',
    timeComplexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
    },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'count character frequencies',
      'while priority queue has > 1 node do',
      '  pop two smallest nodes',
      '  merge into new node with sum frequency',
      '  push merged node back',
      'end while',
      'remaining node is the Huffman tree root',
    ],
  };
}
