import type { ArrayStep } from '../../../engine/types/Step';
import type { AlgorithmExecution } from '../../../engine/types/AlgorithmState';

interface Item {
  weight: number;
  value: number;
}

export function runFractionalKnapsack(
  items: Item[],
  capacity: number
): AlgorithmExecution<ArrayStep> {
  const steps: ArrayStep[] = [];

  // Sort by value/weight ratio descending
  const sorted = items
    .map((item, i) => ({
      ...item,
      ratio: item.value / item.weight,
      originalIndex: i,
    }))
    .sort((a, b) => b.ratio - a.ratio);

  const n = sorted.length;
  const baseArray = sorted.map((item) => item.value);

  steps.push({
    array: [...baseArray],
    description: `Fractional Knapsack: ${n} items sorted by value/weight ratio. Capacity = ${capacity}. Greedily take items with highest ratio first.`,
    codeLine: 1,
    variables: { capacity, remaining: capacity, totalValue: 0, items: n },
    callStack: ['main() -> fractionalKnapsack(items, capacity)'],
  });

  const selectedIndices: number[] = [];
  let remainingCapacity = capacity;
  let totalValue = 0;

  for (let i = 0; i < n; i++) {
    const item = sorted[i];

    steps.push({
      array: [...baseArray],
      comparingIndices: [i],
      sortedIndices: [...selectedIndices],
      description: `Considering item ${i + 1}: weight=${item.weight}, value=${item.value}, ratio=${item.ratio.toFixed(2)}. Remaining capacity: ${remainingCapacity}.`,
      codeLine: 2,
      variables: {
        i,
        'item.weight': item.weight,
        'item.value': item.value,
        'item.ratio': parseFloat(item.ratio.toFixed(2)),
        remaining: remainingCapacity,
        totalValue,
      },
      callStack: ['main() -> fractionalKnapsack(items, capacity)'],
    });

    if (item.weight <= remainingCapacity) {
      // Take the whole item
      remainingCapacity -= item.weight;
      totalValue += item.value;
      selectedIndices.push(i);

      steps.push({
        array: [...baseArray],
        sortedIndices: [...selectedIndices],
        description: `Took item ${i + 1} entirely (weight ${item.weight} <= remaining ${remainingCapacity + item.weight}). Value += ${item.value}. Total value: ${totalValue}.`,
        codeLine: 3,
        variables: {
          i,
          'item.weight': item.weight,
          'item.value': item.value,
          remaining: remainingCapacity,
          totalValue,
          fraction: 1,
        },
        callStack: ['main() -> fractionalKnapsack(items, capacity)'],
      });
    } else {
      // Take a fraction
      const fraction = remainingCapacity / item.weight;
      const fractionValue = parseFloat((item.value * fraction).toFixed(2));
      totalValue += fractionValue;

      steps.push({
        array: [...baseArray],
        comparingIndices: [i],
        sortedIndices: [...selectedIndices],
        description: `Cannot take item ${i + 1} entirely. Taking fraction ${fraction.toFixed(2)} (${remainingCapacity}/${item.weight}). Value += ${fractionValue}. Total value: ${totalValue.toFixed(2)}.`,
        codeLine: 4,
        variables: {
          i,
          'item.weight': item.weight,
          'item.value': item.value,
          fraction: parseFloat(fraction.toFixed(2)),
          'fractionValue': fractionValue,
          remaining: 0,
          totalValue: parseFloat(totalValue.toFixed(2)),
        },
        callStack: ['main() -> fractionalKnapsack(items, capacity)'],
      });

      remainingCapacity = 0;
      selectedIndices.push(i);

      // Knapsack is full
      steps.push({
        array: [...baseArray],
        sortedIndices: [...selectedIndices],
        description: `Knapsack is full! Remaining capacity = 0. Total value achieved: ${totalValue.toFixed(2)}.`,
        codeLine: 5,
        variables: { remaining: 0, totalValue: parseFloat(totalValue.toFixed(2)) },
        callStack: ['main() -> fractionalKnapsack(items, capacity) [FULL]'],
      });
      break;
    }
  }

  // Final step
  steps.push({
    array: [...baseArray],
    sortedIndices: [...selectedIndices],
    description: `Fractional Knapsack complete. Total value: ${totalValue.toFixed(2)} from capacity ${capacity}.`,
    codeLine: 6,
    variables: { totalValue: parseFloat(totalValue.toFixed(2)), capacity, remaining: remainingCapacity },
    callStack: ['main() -> fractionalKnapsack(items, capacity) [DONE]'],
  });

  return {
    steps,
    title: 'Fractional Knapsack',
    category: 'Greedy Algorithms',
    timeComplexity: {
      best: 'O(n log n)',
      average: 'O(n log n)',
      worst: 'O(n log n)',
    },
    spaceComplexity: 'O(n)',
    pseudocode: [
      'sort items by value/weight ratio (desc)',
      'for each item i do',
      '  if item[i].weight <= remaining then',
      '    take item[i] entirely',
      '  else',
      '    take fraction = remaining / item[i].weight',
      '    break',
      '  end if',
      'end for',
    ],
  };
}
