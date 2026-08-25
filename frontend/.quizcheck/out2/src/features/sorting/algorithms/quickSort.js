"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQuickSortSteps = generateQuickSortSteps;
function generateQuickSortSteps(initialArray) {
    const steps = [];
    const arr = [...initialArray];
    const sortedIndices = [];
    steps.push({
        array: [...arr],
        description: 'Initial state before Quick Sort starts.',
        codeLine: 1,
        variables: { low: 0, high: arr.length - 1 },
        callStack: ['main() -> quickSort(0, ' + (arr.length - 1) + ')'],
    });
    function quickSort(low, high, stackDepth = 1) {
        const stackFrame = `quickSort(low=${low}, high=${high})`;
        if (low < high) {
            const pivotIndex = partition(low, high, stackFrame);
            sortedIndices.push(pivotIndex);
            quickSort(low, pivotIndex - 1, stackDepth + 1);
            quickSort(pivotIndex + 1, high, stackDepth + 1);
        }
        else if (low === high) {
            sortedIndices.push(low);
        }
    }
    function partition(low, high, stackFrame) {
        const pivot = arr[high];
        steps.push({
            array: [...arr],
            pivotIndex: high,
            sortedIndices: [...sortedIndices],
            description: `Chosen pivot element ${pivot} at index ${high}.`,
            codeLine: 8,
            variables: { low, high, pivot, 'arr[high]': pivot },
            callStack: ['main()', stackFrame, 'partition()'],
        });
        let i = low - 1;
        for (let j = low; j < high; j++) {
            steps.push({
                array: [...arr],
                comparingIndices: [j, high],
                pivotIndex: high,
                sortedIndices: [...sortedIndices],
                description: `Comparing arr[${j}] (${arr[j]}) with pivot ${pivot}.`,
                codeLine: 9,
                variables: { low, high, pivot, i, j, 'arr[j]': arr[j], condition: `${arr[j]} < ${pivot}` },
                callStack: ['main()', stackFrame, 'partition()'],
            });
            if (arr[j] < pivot) {
                i++;
                const temp = arr[i];
                arr[i] = arr[j];
                arr[j] = temp;
                steps.push({
                    array: [...arr],
                    swappingIndices: [i, j],
                    pivotIndex: high,
                    sortedIndices: [...sortedIndices],
                    description: `Element arr[${j}] (${arr[i]}) < pivot (${pivot}). Swapped index ${i} with index ${j}.`,
                    codeLine: 9,
                    variables: { low, high, pivot, i, j, temp, 'arr[i]': arr[i], 'arr[j]': arr[j] },
                    callStack: ['main()', stackFrame, 'partition()'],
                });
            }
        }
        const temp = arr[i + 1];
        arr[i + 1] = arr[high];
        arr[high] = temp;
        steps.push({
            array: [...arr],
            swappingIndices: [i + 1, high],
            sortedIndices: [...sortedIndices, i + 1],
            description: `Placed pivot ${pivot} into its correct sorted index ${i + 1}.`,
            codeLine: 10,
            variables: { low, high, pivotPlacedAt: i + 1, pivot },
            callStack: ['main()', stackFrame, 'partition()'],
        });
        return i + 1;
    }
    quickSort(0, arr.length - 1);
    const allIndices = Array.from({ length: arr.length }, (_, i) => i);
    steps.push({
        array: [...arr],
        sortedIndices: allIndices,
        description: 'Quick Sort complete! Array is fully sorted.',
        codeLine: 5,
        variables: { status: 'SORTED', totalElements: arr.length },
        callStack: ['main() [TERMINATED]'],
    });
    return {
        steps,
        title: 'Quick Sort',
        category: 'Divide & Conquer',
        timeComplexity: {
            best: 'O(n log n)',
            average: 'O(n log n)',
            worst: 'O(n²)',
        },
        spaceComplexity: 'O(log n)',
        pseudocode: [
            'quickSort(arr, low, high):',
            '  if low < high then',
            '    pivotIndex = partition(arr, low, high)',
            '    quickSort(arr, low, pivotIndex - 1)',
            '    quickSort(arr, pivotIndex + 1, high)',
            '  end if',
            'partition(arr, low, high):',
            '  pivot = arr[high]',
            '  for j = low to high - 1 do if arr[j] < pivot then swap()',
            '  swap(arr[i + 1], arr[high]) and return i + 1',
        ],
    };
}
