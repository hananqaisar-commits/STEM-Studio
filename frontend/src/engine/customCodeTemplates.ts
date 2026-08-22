/**
 * Custom Code Starter Templates
 * 
 * Pre-filled JavaScript templates for each algorithm category.
 * These give users a working example to modify and experiment with.
 */

export const SORTING_TEMPLATES: Record<string, string> = {
  bubble: `// Bubble Sort — modify this code and click Run
// Helpers: compare(i, j) returns true if arr[i] > arr[j]
//          swap(i, j) swaps arr[i] and arr[j]
//          markSorted(i) marks index i as sorted

for (let i = 0; i < n - 1; i++) {
  for (let j = 0; j < n - i - 1; j++) {
    if (compare(j, j + 1)) {
      swap(j, j + 1);
    }
  }
  markSorted(n - i - 1);
}`,

  selection: `// Selection Sort — modify this code and click Run
for (let i = 0; i < n - 1; i++) {
  let minIdx = i;
  for (let j = i + 1; j < n; j++) {
    if (compare(minIdx, j)) {
      minIdx = j;
    }
  }
  if (minIdx !== i) {
    swap(i, minIdx);
  }
  markSorted(i);
}`,

  insertion: `// Insertion Sort — modify this code and click Run
for (let i = 1; i < n; i++) {
  let j = i;
  while (j > 0 && compare(j - 1, j)) {
    swap(j - 1, j);
    j--;
  }
  markSorted(i);
}`,

  merge: `// Merge Sort (iterative bottom-up) — modify and click Run
// Note: this uses compare() and swap() for visualization

for (let size = 1; size < n; size *= 2) {
  for (let start = 0; start < n - size; start += 2 * size) {
    let mid = start + size - 1;
    let end = Math.min(start + 2 * size - 1, n - 1);
    // Simple in-place merge using swaps
    let left = start;
    let right = mid + 1;
    while (left <= mid && right <= end) {
      if (!compare(left, right)) {
        left++;
      } else {
        // shift element at right into position
        let idx = right;
        while (idx > left) {
          swap(idx - 1, idx);
          idx--;
        }
        left++; mid++; right++;
      }
    }
  }
}`,

  quick: `// Quick Sort (Lomuto partition) — modify and click Run
function partition(lo, hi) {
  let pivotIdx = hi;
  let i = lo - 1;
  for (let j = lo; j < hi; j++) {
    if (!compare(j, pivotIdx)) {
      i++;
      if (i !== j) swap(i, j);
    }
  }
  swap(i + 1, hi);
  markSorted(i + 1);
  return i + 1;
}

function quickSort(lo, hi) {
  if (lo < hi) {
    let pi = partition(lo, hi);
    quickSort(lo, pi - 1);
    quickSort(pi + 1, hi);
  }
}

quickSort(0, n - 1);`,

  heap: `// Heap Sort — modify and click Run
function heapify(size, i) {
  let largest = i;
  let left = 2 * i + 1;
  let right = 2 * i + 2;
  if (left < size && compare(largest, left)) largest = left;
  if (right < size && compare(largest, right)) largest = right;
  if (largest !== i) {
    swap(i, largest);
    heapify(size, largest);
  }
}

// Build max heap
for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
  heapify(n, i);
}

// Extract elements
for (let i = n - 1; i > 0; i--) {
  swap(0, i);
  markSorted(i);
  heapify(i, 0);
}
markSorted(0);`,

  shell: `// Shell Sort — modify and click Run
let gap = Math.floor(n / 2);
while (gap > 0) {
  for (let i = gap; i < n; i++) {
    let j = i;
    while (j >= gap && compare(j - gap, j)) {
      swap(j - gap, j);
      j -= gap;
    }
  }
  gap = Math.floor(gap / 2);
}`,
};

export function getStarterTemplate(algorithmKey: string): string {
  return SORTING_TEMPLATES[algorithmKey] || SORTING_TEMPLATES.bubble;
}
