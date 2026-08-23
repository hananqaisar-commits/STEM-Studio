export type BinarySearchCategory =
  | 'binarySearch'
  | 'lowerBound'
  | 'upperBound'
  | 'searchRotatedArray'
  | 'findPeakElement'
  | 'firstLastPosition';

export interface ArrayElementItem {
  index: number;
  value: number;
  state: 'default' | 'active' | 'mid' | 'left' | 'right' | 'found' | 'eliminated';
  pointerLabels: string[];
}

export interface ComparisonInfo {
  midVal: number;
  targetVal: number;
  condition: string;
  result: 'less' | 'greater' | 'equal';
}

export interface BinarySearchQuizData {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface BinarySearchStep {
  array: ArrayElementItem[];
  target: number;
  left: number | null;
  mid: number | null;
  right: number | null;
  foundIndex: number | null;
  phase: string;
  explanation: string;
  codeLine: number;
  comparison?: ComparisonInfo;
  isQuizPoint?: boolean;
  quizData?: BinarySearchQuizData;
}

function buildElementItems(
  arr: number[],
  left: number | null,
  mid: number | null,
  right: number | null,
  foundIndex: number | null = null
): ArrayElementItem[] {
  return arr.map((val, idx) => {
    let state: ArrayElementItem['state'] = 'default';
    const pointerLabels: string[] = [];

    if (foundIndex !== null && idx === foundIndex) {
      state = 'found';
      pointerLabels.push('TARGET');
    } else if (mid !== null && idx === mid) {
      state = 'mid';
      pointerLabels.push('MID');
    } else if (left !== null && idx === left) {
      state = 'left';
      pointerLabels.push('LEFT');
    } else if (right !== null && idx === right) {
      state = 'right';
      pointerLabels.push('RIGHT');
    } else if (left !== null && right !== null) {
      if (idx < left || idx > right) {
        state = 'eliminated';
      } else {
        state = 'active';
      }
    }

    // Merge duplicate labels if pointers overlap (e.g. left == mid)
    if (left !== null && idx === left && !pointerLabels.includes('LEFT')) {
      pointerLabels.push('LEFT');
    }
    if (right !== null && idx === right && !pointerLabels.includes('RIGHT')) {
      pointerLabels.push('RIGHT');
    }

    return {
      index: idx,
      value: val,
      state,
      pointerLabels,
    };
  });
}

// ─── 1. CLASSIC BINARY SEARCH ──────────────────────────────────────────────────

export function generateBinarySearchSteps(
  arr: number[],
  target: number
): BinarySearchStep[] {
  const steps: BinarySearchStep[] = [];
  let left = 0;
  let right = arr.length - 1;
  let iteration = 0;

  // Step 0: Initial Array State
  steps.push({
    array: buildElementItems(arr, left, null, right),
    target,
    left,
    mid: null,
    right,
    foundIndex: null,
    phase: 'Initialize Bounds',
    explanation: `Search space initialized: left = 0 (arr[0]=${arr[0]}), right = ${right} (arr[${right}]=${arr[right]}). Searching for target = ${target}.`,
    codeLine: 2,
  });

  while (left <= right) {
    iteration++;
    const mid = Math.floor(left + (right - left) / 2);
    const midVal = arr[mid];

    // Calculate Mid Step
    steps.push({
      array: buildElementItems(arr, left, mid, right),
      target,
      left,
      mid,
      right,
      foundIndex: null,
      phase: `Iteration ${iteration}: Calculate Mid`,
      explanation: `Calculated middle index: mid = floor(${left} + (${right} - ${left}) / 2) = ${mid} (arr[mid] = ${midVal}).`,
      codeLine: 4,
      comparison: {
        midVal,
        targetVal: target,
        condition: `arr[${mid}] (${midVal}) vs target (${target})`,
        result: midVal === target ? 'equal' : midVal < target ? 'less' : 'greater',
      },
      isQuizPoint: iteration === 1,
      quizData: {
        prompt: `With arr[mid] = ${midVal} and target = ${target}, what is the next step?`,
        options: [
          midVal === target ? 'Target found! Return mid' : midVal < target ? 'Target is greater: move left = mid + 1' : 'Target is smaller: move right = mid - 1',
          midVal < target ? 'Target is smaller: move right = mid - 1' : 'Target is greater: move left = mid + 1',
          'Restart binary search from beginning',
          'Divide search space into 3 parts'
        ],
        correctIndex: 0,
        explanation: midVal === target
          ? 'Values match! Target found at index mid.'
          : midVal < target
          ? `Because array is sorted and ${target} > ${midVal}, target must be in the right half (left = mid + 1).`
          : `Because array is sorted and ${target} < ${midVal}, target must be in the left half (right = mid - 1).`,
      },
    });

    if (midVal === target) {
      // Found Step
      steps.push({
        array: buildElementItems(arr, null, null, null, mid),
        target,
        left,
        mid,
        right,
        foundIndex: mid,
        phase: 'Target Found!',
        explanation: `Target ${target} located at index ${mid} in ${iteration} iterations! Time Complexity: O(log N).`,
        codeLine: 6,
      });
      return steps;
    } else if (midVal < target) {
      // Move Left
      const oldLeft = left;
      left = mid + 1;
      steps.push({
        array: buildElementItems(arr, left, null, right),
        target,
        left,
        mid,
        right,
        foundIndex: null,
        phase: 'Discard Left Half',
        explanation: `Since arr[mid] (${midVal}) < target (${target}), eliminated indices [${oldLeft} .. ${mid}]. Updated left = ${left}.`,
        codeLine: 8,
      });
    } else {
      // Move Right
      const oldRight = right;
      right = mid - 1;
      steps.push({
        array: buildElementItems(arr, left, null, right),
        target,
        left,
        mid,
        right,
        foundIndex: null,
        phase: 'Discard Right Half',
        explanation: `Since arr[mid] (${midVal}) > target (${target}), eliminated indices [${mid} .. ${oldRight}]. Updated right = ${right}.`,
        codeLine: 10,
      });
    }
  }

  // Not Found Step
  steps.push({
    array: buildElementItems(arr, null, null, null),
    target,
    left: null,
    mid: null,
    right: null,
    foundIndex: -1,
    phase: 'Target Not Found',
    explanation: `Pointers crossed (left > right). Target ${target} does not exist in array. Returning -1.`,
    codeLine: 12,
  });

  return steps;
}

// ─── 2. LOWER BOUND ────────────────────────────────────────────────────────────

export function generateLowerBoundSteps(
  arr: number[],
  target: number
): BinarySearchStep[] {
  const steps: BinarySearchStep[] = [];
  let left = 0;
  let right = arr.length;
  let iteration = 0;

  steps.push({
    array: buildElementItems(arr, left, null, arr.length - 1),
    target,
    left,
    mid: null,
    right: arr.length - 1,
    foundIndex: null,
    phase: 'Initialize Lower Bound',
    explanation: `Find first index where arr[i] >= target (${target}). Search range [0, ${arr.length}].`,
    codeLine: 2,
  });

  while (left < right) {
    iteration++;
    const mid = Math.floor(left + (right - left) / 2);
    const midVal = arr[mid];

    steps.push({
      array: buildElementItems(arr, left, mid, right - 1),
      target,
      left,
      mid,
      right: right - 1,
      foundIndex: null,
      phase: `Iteration ${iteration}: Evaluate arr[mid] >= target`,
      explanation: `arr[mid=${mid}] = ${midVal}. Comparing ${midVal} >= ${target}.`,
      codeLine: 4,
      comparison: {
        midVal,
        targetVal: target,
        condition: `${midVal} >= ${target}`,
        result: midVal >= target ? 'greater' : 'less',
      },
    });

    if (midVal >= target) {
      right = mid;
      steps.push({
        array: buildElementItems(arr, left, null, right - 1),
        target,
        left,
        mid,
        right: right - 1,
        foundIndex: null,
        phase: 'Shrink Right (Candidate Found)',
        explanation: `Condition met (${midVal} >= ${target}). arr[${mid}] is a candidate lower bound. Set right = ${mid}.`,
        codeLine: 5,
      });
    } else {
      left = mid + 1;
      steps.push({
        array: buildElementItems(arr, left, null, right - 1),
        target,
        left,
        mid,
        right: right - 1,
        foundIndex: null,
        phase: 'Advance Left',
        explanation: `Condition not met (${midVal} < ${target}). Set left = mid + 1 = ${left}.`,
        codeLine: 7,
      });
    }
  }

  steps.push({
    array: buildElementItems(arr, null, null, null, left < arr.length ? left : null),
    target,
    left,
    mid: null,
    right,
    foundIndex: left < arr.length ? left : null,
    phase: 'Lower Bound Found',
    explanation: left < arr.length
      ? `Lower bound for target ${target} is index ${left} (value: ${arr[left]}).`
      : `All elements are smaller than target ${target}. Lower bound is index ${left} (end of array).`,
    codeLine: 9,
  });

  return steps;
}

// ─── 3. UPPER BOUND ────────────────────────────────────────────────────────────

export function generateUpperBoundSteps(
  arr: number[],
  target: number
): BinarySearchStep[] {
  const steps: BinarySearchStep[] = [];
  let left = 0;
  let right = arr.length;
  let iteration = 0;

  steps.push({
    array: buildElementItems(arr, left, null, arr.length - 1),
    target,
    left,
    mid: null,
    right: arr.length - 1,
    foundIndex: null,
    phase: 'Initialize Upper Bound',
    explanation: `Find first index where arr[i] > target (${target}). Search range [0, ${arr.length}].`,
    codeLine: 2,
  });

  while (left < right) {
    iteration++;
    const mid = Math.floor(left + (right - left) / 2);
    const midVal = arr[mid];

    steps.push({
      array: buildElementItems(arr, left, mid, right - 1),
      target,
      left,
      mid,
      right: right - 1,
      foundIndex: null,
      phase: `Iteration ${iteration}: Evaluate arr[mid] > target`,
      explanation: `arr[mid=${mid}] = ${midVal}. Comparing ${midVal} > ${target}.`,
      codeLine: 4,
    });

    if (midVal > target) {
      right = mid;
      steps.push({
        array: buildElementItems(arr, left, null, right - 1),
        target,
        left,
        mid,
        right: right - 1,
        foundIndex: null,
        phase: 'Shrink Right (Candidate Found)',
        explanation: `Condition met (${midVal} > ${target}). Set right = ${mid}.`,
        codeLine: 5,
      });
    } else {
      left = mid + 1;
      steps.push({
        array: buildElementItems(arr, left, null, right - 1),
        target,
        left,
        mid,
        right: right - 1,
        foundIndex: null,
        phase: 'Advance Left',
        explanation: `Condition not met (${midVal} <= ${target}). Set left = mid + 1 = ${left}.`,
        codeLine: 7,
      });
    }
  }

  steps.push({
    array: buildElementItems(arr, null, null, null, left < arr.length ? left : null),
    target,
    left,
    mid: null,
    right,
    foundIndex: left < arr.length ? left : null,
    phase: 'Upper Bound Found',
    explanation: left < arr.length
      ? `Upper bound strictly greater than ${target} is index ${left} (value: ${arr[left]}).`
      : `No element is greater than target ${target}. Returning index ${left}.`,
    codeLine: 9,
  });

  return steps;
}

// ─── 4. SEARCH IN ROTATED SORTED ARRAY ─────────────────────────────────────────

export function generateRotatedSearchSteps(
  arr: number[],
  target: number
): BinarySearchStep[] {
  const steps: BinarySearchStep[] = [];
  let left = 0;
  let right = arr.length - 1;
  let iteration = 0;

  steps.push({
    array: buildElementItems(arr, left, null, right),
    target,
    left,
    mid: null,
    right,
    foundIndex: null,
    phase: 'Initialize Rotated Search',
    explanation: `Array is pivoted/rotated. Target = ${target}. Binary search identifies the sorted half on each step.`,
    codeLine: 2,
  });

  while (left <= right) {
    iteration++;
    const mid = Math.floor(left + (right - left) / 2);
    const midVal = arr[mid];

    steps.push({
      array: buildElementItems(arr, left, mid, right),
      target,
      left,
      mid,
      right,
      foundIndex: null,
      phase: `Iteration ${iteration}: Evaluate Sorted Half`,
      explanation: `Checking mid=${mid} (arr[mid]=${midVal}). Check if left half [${left}..${mid}] is sorted (arr[left]=${arr[left]} <= arr[mid]=${midVal}).`,
      codeLine: 4,
    });

    if (midVal === target) {
      steps.push({
        array: buildElementItems(arr, null, null, null, mid),
        target,
        left,
        mid,
        right,
        foundIndex: mid,
        phase: 'Target Found in Rotated Array!',
        explanation: `Target ${target} found at index ${mid}!`,
        codeLine: 6,
      });
      return steps;
    }

    if (arr[left] <= midVal) {
      // Left half is sorted
      if (arr[left] <= target && target < midVal) {
        right = mid - 1;
        steps.push({
          array: buildElementItems(arr, left, null, right),
          target,
          left,
          mid,
          right,
          foundIndex: null,
          phase: 'Target in Left Sorted Half',
          explanation: `Left half is sorted and target ${target} lies in [${arr[left]} .. ${midVal}). Set right = mid - 1.`,
          codeLine: 9,
        });
      } else {
        left = mid + 1;
        steps.push({
          array: buildElementItems(arr, left, null, right),
          target,
          left,
          mid,
          right,
          foundIndex: null,
          phase: 'Target in Right Half',
          explanation: `Left half is sorted but target ${target} not in range. Set left = mid + 1.`,
          codeLine: 11,
        });
      }
    } else {
      // Right half is sorted
      if (midVal < target && target <= arr[right]) {
        left = mid + 1;
        steps.push({
          array: buildElementItems(arr, left, null, right),
          target,
          left,
          mid,
          right,
          foundIndex: null,
          phase: 'Target in Right Sorted Half',
          explanation: `Right half is sorted and target ${target} lies in (${midVal} .. ${arr[right]}]. Set left = mid + 1.`,
          codeLine: 14,
        });
      } else {
        right = mid - 1;
        steps.push({
          array: buildElementItems(arr, left, null, right),
          target,
          left,
          mid,
          right,
          foundIndex: null,
          phase: 'Target in Left Half',
          explanation: `Right half is sorted but target not in range. Set right = mid - 1.`,
          codeLine: 16,
        });
      }
    }
  }

  steps.push({
    array: buildElementItems(arr, null, null, null),
    target,
    left: null,
    mid: null,
    right: null,
    foundIndex: -1,
    phase: 'Target Not Found',
    explanation: `Target ${target} is not in the rotated array. Return -1.`,
    codeLine: 19,
  });

  return steps;
}

// ─── 5. FIND PEAK ELEMENT ──────────────────────────────────────────────────────

export function generatePeakElementSteps(arr: number[]): BinarySearchStep[] {
  const steps: BinarySearchStep[] = [];
  let left = 0;
  let right = arr.length - 1;
  let iteration = 0;

  steps.push({
    array: buildElementItems(arr, left, null, right),
    target: 0,
    left,
    mid: null,
    right,
    foundIndex: null,
    phase: 'Initialize Peak Search',
    explanation: `Find a peak element $arr[i] > arr[i+1]$. Range: [0, ${right}].`,
    codeLine: 2,
  });

  while (left < right) {
    iteration++;
    const mid = Math.floor(left + (right - left) / 2);
    const midVal = arr[mid];
    const nextVal = arr[mid + 1];

    steps.push({
      array: buildElementItems(arr, left, mid, right),
      target: 0,
      left,
      mid,
      right,
      foundIndex: null,
      phase: `Iteration ${iteration}: Compare arr[mid] vs arr[mid+1]`,
      explanation: `arr[mid=${mid}]=${midVal} vs arr[mid+1=${mid + 1}]=${nextVal}.`,
      codeLine: 4,
    });

    if (midVal > nextVal) {
      right = mid;
      steps.push({
        array: buildElementItems(arr, left, null, right),
        target: 0,
        left,
        mid,
        right,
        foundIndex: null,
        phase: 'Slope Decreasing (Peak on Left or Mid)',
        explanation: `${midVal} > ${nextVal}: Descending slope. A peak exists at mid or to the left. Set right = ${mid}.`,
        codeLine: 6,
      });
    } else {
      left = mid + 1;
      steps.push({
        array: buildElementItems(arr, left, null, right),
        target: 0,
        left,
        mid,
        right,
        foundIndex: null,
        phase: 'Slope Increasing (Peak on Right)',
        explanation: `${midVal} <= ${nextVal}: Ascending slope. A peak is guaranteed to the right. Set left = ${left}.`,
        codeLine: 8,
      });
    }
  }

  steps.push({
    array: buildElementItems(arr, null, null, null, left),
    target: 0,
    left,
    mid: null,
    right,
    foundIndex: left,
    phase: 'Peak Element Identified!',
    explanation: `Peak element located at index ${left} with value ${arr[left]}.`,
    codeLine: 10,
  });

  return steps;
}
