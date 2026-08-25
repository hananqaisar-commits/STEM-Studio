"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMergeSortSteps = generateMergeSortSteps;
function generateMergeSortSteps(initialArray) {
    const steps = [];
    const arr = [...initialArray];
    steps.push({
        array: [...arr],
        description: 'Initial state before Merge Sort starts.',
        codeLine: 1,
    });
    function mergeSort(l, r) {
        if (l >= r)
            return;
        const m = l + Math.floor((r - l) / 2);
        steps.push({
            array: [...arr],
            comparingIndices: Array.from({ length: r - l + 1 }, (_, k) => l + k),
            description: `Dividing sub-array range [${l}..${r}] at midpoint ${m}.`,
            codeLine: 3,
        });
        mergeSort(l, m);
        mergeSort(m + 1, r);
        merge(l, m, r);
    }
    function merge(l, m, r) {
        const leftArr = arr.slice(l, m + 1);
        const rightArr = arr.slice(m + 1, r + 1);
        let i = 0;
        let j = 0;
        let k = l;
        while (i < leftArr.length && j < rightArr.length) {
            steps.push({
                array: [...arr],
                comparingIndices: [l + i, m + 1 + j],
                description: `Comparing left sub-array element ${leftArr[i]} with right sub-array element ${rightArr[j]}.`,
                codeLine: 6,
            });
            if (leftArr[i] <= rightArr[j]) {
                arr[k] = leftArr[i];
                i++;
            }
            else {
                arr[k] = rightArr[j];
                j++;
            }
            steps.push({
                array: [...arr],
                swappingIndices: [k],
                description: `Merged value ${arr[k]} into position ${k}.`,
                codeLine: 7,
            });
            k++;
        }
        while (i < leftArr.length) {
            arr[k] = leftArr[i];
            steps.push({
                array: [...arr],
                swappingIndices: [k],
                description: `Copying remaining left element ${leftArr[i]} to index ${k}.`,
                codeLine: 8,
            });
            i++;
            k++;
        }
        while (j < rightArr.length) {
            arr[k] = rightArr[j];
            steps.push({
                array: [...arr],
                swappingIndices: [k],
                description: `Copying remaining right element ${rightArr[j]} to index ${k}.`,
                codeLine: 9,
            });
            j++;
            k++;
        }
    }
    mergeSort(0, arr.length - 1);
    const allIndices = Array.from({ length: arr.length }, (_, i) => i);
    steps.push({
        array: [...arr],
        sortedIndices: allIndices,
        description: 'Merge Sort complete! Array is fully sorted.',
        codeLine: 10,
    });
    return {
        steps,
        title: 'Merge Sort',
        category: 'Divide & Conquer',
        timeComplexity: {
            best: 'O(n log n)',
            average: 'O(n log n)',
            worst: 'O(n log n)',
        },
        spaceComplexity: 'O(n)',
        pseudocode: [
            'mergeSort(arr, l, r):',
            '  if l < r then',
            '    m = l + (r - l) / 2',
            '    mergeSort(arr, l, m)',
            '    mergeSort(arr, m + 1, r)',
            '    merge(arr, l, m, r)',
            '  end if',
            'merge(arr, l, m, r):',
            '  Compare left & right sub-arrays and copy back sorted values',
        ],
    };
}
