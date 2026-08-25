"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateShellSortSteps = generateShellSortSteps;
function generateShellSortSteps(initialArray) {
    const steps = [];
    const arr = [...initialArray];
    const n = arr.length;
    steps.push({
        array: [...arr],
        description: 'Initial state before Shell Sort starts.',
        codeLine: 1,
    });
    // Start with a big gap, then reduce the gap
    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
        steps.push({
            array: [...arr],
            description: `Current gap interval set to ${gap}.`,
            codeLine: 2,
        });
        // Perform gapped insertion sort for this gap size
        for (let i = gap; i < n; i++) {
            const temp = arr[i];
            let j = i;
            steps.push({
                array: [...arr],
                pivotIndex: i,
                description: `Inserts arr[${i}] (${temp}) into gap-sorted sub-array.`,
                codeLine: 4,
            });
            while (j >= gap && arr[j - gap] > temp) {
                steps.push({
                    array: [...arr],
                    comparingIndices: [j - gap, j],
                    description: `Comparing arr[${j - gap}] (${arr[j - gap]}) with temp (${temp}). Shifting element right.`,
                    codeLine: 5,
                });
                arr[j] = arr[j - gap];
                j -= gap;
                steps.push({
                    array: [...arr],
                    swappingIndices: [j + gap, j],
                    description: `Shifted element to index ${j + gap}.`,
                    codeLine: 6,
                });
            }
            arr[j] = temp;
            steps.push({
                array: [...arr],
                sortedIndices: [j],
                description: `Placed temp (${temp}) at index ${j}.`,
                codeLine: 8,
            });
        }
    }
    const allIndices = Array.from({ length: n }, (_, i) => i);
    steps.push({
        array: [...arr],
        sortedIndices: allIndices,
        description: 'Shell Sort complete! Array is fully sorted.',
        codeLine: 9,
    });
    return {
        steps,
        title: 'Shell Sort',
        category: 'Comparison Sort',
        timeComplexity: {
            best: 'O(n log n)',
            average: 'O(n^1.3)',
            worst: 'O(n²)',
        },
        spaceComplexity: 'O(1)',
        pseudocode: [
            'for gap = n / 2 down to 1 step gap / 2 do',
            '  for i = gap to n - 1 do',
            '    temp = arr[i]',
            '    j = i',
            '    while j >= gap and arr[j - gap] > temp do',
            '      arr[j] = arr[j - gap]',
            '      j -= gap',
            '    end while',
            '    arr[j] = temp',
            '  end for',
            'end for',
        ],
    };
}
