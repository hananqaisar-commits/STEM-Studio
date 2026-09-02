export type StackQueueCategory =
  | 'stack'
  | 'queue'
  // Stack 10 Problems
  | 'validParentheses'
  | 'minStack'
  | 'postfixEval'
  | 'dailyTemperatures'
  | 'trappingRainWater'
  | 'largestRectangle'
  | 'simplifyPath'
  | 'decodeString'
  | 'basicCalculator'
  | 'removeAdjacentDuplicates'
  // Queue 10 Problems
  | 'queueViaStacks'
  | 'stackViaQueues'
  | 'circularQueue'
  | 'circularDeque'
  | 'slidingWindow'
  | 'firstNonRepeating'
  | 'taskScheduler'
  | 'movingAverage'
  | 'rottingOranges'
  | 'dota2Senate';

export type NodeState = 'default' | 'active' | 'comparing' | 'sorted' | 'highlight' | 'popped' | 'pushed' | 'error';

export interface StackElementData {
  id: string;
  value: number | string;
  state: NodeState;
  auxValue?: number | string; // e.g. Min value for MinStack
}

export interface StackQueueStep {
  stepIndex: number;
  description: string;
  codeLine?: number;

  // Primary data containers
  elements: StackElementData[]; // Main stack or queue elements
  auxElements?: StackElementData[]; // Min stack or Pop stack

  // Circular Queue specific fields
  capacity?: number;
  frontIndex?: number;
  rearIndex?: number;

  // Classical problem specific fields
  inputString?: string;
  currentInputIndex?: number;
  slidingWindowRange?: [number, number]; // [left, right]
  auxLabel?: string;
  secondaryAuxLabel?: string;
}

// ─── STACK ENGINE ───────────────────────────────────────────────────

export function generateStackPushSteps(currentStack: (number | string)[], newVal: number | string): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const initialElements: StackElementData[] = currentStack.map((val, idx) => ({
    id: `stack-${idx}`,
    value: val,
    state: 'default',
  }));

  // Step 1: Initial state
  steps.push({
    stepIndex: 0,
    description: `Ready to push element '${newVal}' onto the Stack.`,
    codeLine: 1,
    elements: JSON.parse(JSON.stringify(initialElements)),
  });

  // Step 2: Highlighting new element creation
  const newElement: StackElementData = {
    id: `stack-${initialElements.length}`,
    value: newVal,
    state: 'pushed',
  };
  const updatedElements = [...initialElements, newElement];

  steps.push({
    stepIndex: 1,
    description: `Pushing '${newVal}' onto top of stack (TOP index = ${updatedElements.length - 1}).`,
    codeLine: 2,
    elements: JSON.parse(JSON.stringify(updatedElements)),
  });

  // Step 3: Complete operation
  const finalElements = updatedElements.map((el) => ({ ...el, state: 'default' as NodeState }));
  steps.push({
    stepIndex: 2,
    description: `Successfully pushed '${newVal}'. Stack size is now ${finalElements.length}.`,
    codeLine: 3,
    elements: finalElements,
  });

  return steps;
}

export function generateStackPopSteps(currentStack: (number | string)[]): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  if (currentStack.length === 0) {
    steps.push({
      stepIndex: 0,
      description: `Underflow Warning: Cannot pop from an empty Stack!`,
      codeLine: 1,
      elements: [],
    });
    return steps;
  }

  const initialElements: StackElementData[] = currentStack.map((val, idx) => ({
    id: `stack-${idx}`,
    value: val,
    state: 'default',
  }));

  // Step 1: Highlight TOP element to pop
  initialElements[initialElements.length - 1].state = 'popped';
  const poppedVal = currentStack[currentStack.length - 1];

  steps.push({
    stepIndex: 0,
    description: `Popping top element '${poppedVal}' (TOP index = ${currentStack.length - 1}).`,
    codeLine: 1,
    elements: JSON.parse(JSON.stringify(initialElements)),
  });

  // Step 2: Remove element
  const remainingElements = initialElements.slice(0, -1).map((el) => ({ ...el, state: 'default' as NodeState }));

  steps.push({
    stepIndex: 1,
    description: `Element '${poppedVal}' popped. Stack size is now ${remainingElements.length}.`,
    codeLine: 2,
    elements: remainingElements,
  });

  return steps;
}

export function generateStackPeekSteps(currentStack: (number | string)[]): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  if (currentStack.length === 0) {
    steps.push({
      stepIndex: 0,
      description: `Peek operation: Stack is empty.`,
      codeLine: 1,
      elements: [],
    });
    return steps;
  }
  const elements: StackElementData[] = currentStack.map((val, idx) => ({
    id: `stack-${idx}`,
    value: val,
    state: idx === currentStack.length - 1 ? 'active' : 'default',
  }));
  const topVal = currentStack[currentStack.length - 1];
  steps.push({
    stepIndex: 0,
    description: `Peek() inspected top element '${topVal}' (index ${currentStack.length - 1}) without removing it.`,
    codeLine: 1,
    elements,
  });
  return steps;
}

// ─── QUEUE ENGINE ───────────────────────────────────────────────────

export function generateQueueEnqueueSteps(currentQueue: (number | string)[], newVal: number | string): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const initialElements: StackElementData[] = currentQueue.map((val, idx) => ({
    id: `queue-${idx}`,
    value: val,
    state: 'default',
  }));

  // Step 1: Ready to enqueue
  steps.push({
    stepIndex: 0,
    description: `Ready to enqueue element '${newVal}' at the REAR of the Queue.`,
    codeLine: 1,
    elements: JSON.parse(JSON.stringify(initialElements)),
  });

  // Step 2: Enqueue at REAR
  const newElement: StackElementData = {
    id: `queue-${initialElements.length}`,
    value: newVal,
    state: 'pushed',
  };
  const updatedElements = [...initialElements, newElement];

  steps.push({
    stepIndex: 1,
    description: `Enqueued '${newVal}' at REAR (Index = ${updatedElements.length - 1}).`,
    codeLine: 2,
    elements: JSON.parse(JSON.stringify(updatedElements)),
  });

  // Step 3: Complete operation
  const finalElements = updatedElements.map((el) => ({ ...el, state: 'default' as NodeState }));
  steps.push({
    stepIndex: 2,
    description: `Enqueue operation complete. Queue length is ${finalElements.length}.`,
    codeLine: 3,
    elements: finalElements,
  });

  return steps;
}

export function generateQueueDequeueSteps(currentQueue: (number | string)[]): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  if (currentQueue.length === 0) {
    steps.push({
      stepIndex: 0,
      description: `Underflow Warning: Cannot dequeue from an empty Queue!`,
      codeLine: 1,
      elements: [],
    });
    return steps;
  }

  const initialElements: StackElementData[] = currentQueue.map((val, idx) => ({
    id: `queue-${idx}`,
    value: val,
    state: 'default',
  }));

  // Step 1: Highlight FRONT element to dequeue
  initialElements[0].state = 'popped';
  const dequeuedVal = currentQueue[0];

  steps.push({
    stepIndex: 0,
    description: `Dequeuing FRONT element '${dequeuedVal}' (Index 0).`,
    codeLine: 1,
    elements: JSON.parse(JSON.stringify(initialElements)),
  });

  // Step 2: Remove FRONT element
  const remainingElements = initialElements.slice(1).map((el) => ({ ...el, state: 'default' as NodeState }));

  steps.push({
    stepIndex: 1,
    description: `Element '${dequeuedVal}' dequeued. Remaining elements shifted left.`,
    codeLine: 2,
    elements: remainingElements,
  });

  return steps;
}

// ─── CIRCULAR QUEUE ENGINE ─────────────────────────────────────────

export function generateCircularQueueEnqueueSteps(
  elements: (number | string | null)[],
  front: number,
  rear: number,
  capacity: number,
  newVal: number | string
): { steps: StackQueueStep[]; newFront: number; newRear: number; newElements: (number | string | null)[] } {
  const steps: StackQueueStep[] = [];
  let currentCount = 0;
  elements.forEach((el) => { if (el !== null) currentCount++; });

  if (currentCount === capacity) {
    steps.push({
      stepIndex: 0,
      description: `Overflow Warning: Circular Queue is Full! (Capacity = ${capacity})`,
      codeLine: 1,
      elements: elements.map((v, i) => ({ id: `cq-${i}`, value: v ?? '-', state: 'error' })),
      capacity,
      frontIndex: front,
      rearIndex: rear,
    });
    return { steps, newFront: front, newRear: rear, newElements: elements };
  }

  const nextRear = front === -1 ? 0 : (rear + 1) % capacity;
  const nextFront = front === -1 ? 0 : front;

  const updatedArr = [...elements];
  updatedArr[nextRear] = newVal;

  const initialNodeData: StackElementData[] = elements.map((val, idx) => ({
    id: `cq-${idx}`,
    value: val ?? '-',
    state: idx === nextRear ? 'pushed' : 'default',
  }));

  steps.push({
    stepIndex: 0,
    description: `Calculated REAR = (rear + 1) % ${capacity} = ${nextRear}. Inserting '${newVal}'.`,
    codeLine: 2,
    elements: initialNodeData,
    capacity,
    frontIndex: nextFront,
    rearIndex: nextRear,
  });

  const finalNodeData = initialNodeData.map((el) => ({ ...el, state: 'default' as NodeState }));
  steps.push({
    stepIndex: 1,
    description: `Enqueued '${newVal}' at index [${nextRear}]. FRONT = ${nextFront}, REAR = ${nextRear}.`,
    codeLine: 3,
    elements: finalNodeData,
    capacity,
    frontIndex: nextFront,
    rearIndex: nextRear,
  });

  return { steps, newFront: nextFront, newRear: nextRear, newElements: updatedArr };
}

export function generateCircularQueueDequeueSteps(
  elements: (number | string | null)[],
  front: number,
  rear: number,
  capacity: number
): { steps: StackQueueStep[]; newFront: number; newRear: number; newElements: (number | string | null)[] } {
  const steps: StackQueueStep[] = [];

  if (front === -1) {
    steps.push({
      stepIndex: 0,
      description: `Underflow Warning: Circular Queue is Empty! Nothing to dequeue.`,
      codeLine: 1,
      elements: elements.map((v, i) => ({ id: `cq-${i}`, value: v ?? '-', state: 'error' })),
      capacity,
      frontIndex: front,
      rearIndex: rear,
    });
    return { steps, newFront: front, newRear: rear, newElements: elements };
  }

  const removedVal = elements[front];

  steps.push({
    stepIndex: 0,
    description: `Removing '${removedVal}' from FRONT index [${front}] — dequeue always happens at FRONT.`,
    codeLine: 2,
    elements: elements.map((v, i) => ({ id: `cq-${i}`, value: v ?? '-', state: i === front ? 'error' : 'default' })),
    capacity,
    frontIndex: front,
    rearIndex: rear,
  });

  const updatedArr = [...elements];
  updatedArr[front] = null;

  let newFront: number;
  let newRear = rear;
  let settled: string;

  if (front === rear) {
    // Last element removed — queue resets to empty.
    newFront = -1;
    newRear = -1;
    settled = `Queue is now empty. FRONT and REAR reset to -1; every slot is reusable.`;
  } else {
    newFront = (front + 1) % capacity;
    settled = `Calculated FRONT = (front + 1) % ${capacity} = ${newFront}${newFront === 0 ? ' — wraparound! FRONT returned to index 0, so earlier slots become reusable.' : '.'}`;
  }

  steps.push({
    stepIndex: 1,
    description: `Dequeued '${removedVal}'. ${settled} FRONT = ${newFront === -1 ? 'None' : newFront}, REAR = ${newRear === -1 ? 'None' : newRear}.`,
    codeLine: 3,
    elements: updatedArr.map((v, i) => ({ id: `cq-${i}`, value: v ?? '-', state: 'default' as NodeState })),
    capacity,
    frontIndex: newFront,
    rearIndex: newRear,
  });

  return { steps, newFront, newRear, newElements: updatedArr };
}

// ─── VALID PARENTHESES PROBLEM ENGINE ────────────────────────────────

export function generateValidParenthesesSteps(expr: string): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const stack: string[] = [];
  const openBrackets = new Set(['(', '{', '[']);
  const matchingPairs: Record<string, string> = { ')': '(', '}': '{', ']': '[' };

  steps.push({
    stepIndex: 0,
    description: `Starting Valid Parentheses check for expression "${expr}".`,
    codeLine: 1,
    elements: [],
    inputString: expr,
    currentInputIndex: 0,
  });

  let isValid = true;

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    if (openBrackets.has(char)) {
      stack.push(char);
      steps.push({
        stepIndex: steps.length,
        description: `Character '${char}' is an opening bracket. Push to Stack.`,
        codeLine: 3,
        elements: stack.map((val, idx) => ({ id: `p-${idx}`, value: val, state: idx === stack.length - 1 ? 'pushed' : 'default' })),
        inputString: expr,
        currentInputIndex: i,
      });
    } else if (matchingPairs[char]) {
      const expected = matchingPairs[char];
      if (stack.length === 0 || stack[stack.length - 1] !== expected) {
        isValid = false;
        steps.push({
          stepIndex: steps.length,
          description: `Mismatch Error: Closing '${char}' does not match top element '${stack[stack.length - 1] ?? 'Empty'}'. Invalid expression!`,
          codeLine: 6,
          elements: stack.map((val, idx) => ({ id: `p-${idx}`, value: val, state: 'error' })),
          inputString: expr,
          currentInputIndex: i,
        });
        break;
      } else {
        const popped = stack.pop();
        steps.push({
          stepIndex: steps.length,
          description: `Closing '${char}' matches top '${popped}'. Popping from Stack.`,
          codeLine: 5,
          elements: stack.map((val, idx) => ({ id: `p-${idx}`, value: val, state: 'default' })),
          inputString: expr,
          currentInputIndex: i,
        });
      }
    }
  }

  if (isValid) {
    if (stack.length === 0) {
      steps.push({
        stepIndex: steps.length,
        description: `Expression "${expr}" is valid. Stack is empty after processing.`,
        codeLine: 8,
        elements: [],
        inputString: expr,
        currentInputIndex: expr.length,
      });
    } else {
      steps.push({
        stepIndex: steps.length,
        description: `Expression "${expr}" is invalid. Stack still contains unclosed brackets.`,
        codeLine: 9,
        elements: stack.map((val, idx) => ({ id: `p-${idx}`, value: val, state: 'error' })),
        inputString: expr,
        currentInputIndex: expr.length,
      });
    }
  }

  return steps;
}

// ─── MIN STACK PROBLEM ENGINE ──────────────────────────────────────

export function generateMinStackPushSteps(
  mainStack: number[],
  minStack: number[],
  newVal: number
): { steps: StackQueueStep[]; newMain: number[]; newMin: number[] } {
  const steps: StackQueueStep[] = [];
  const currentMin = minStack.length > 0 ? minStack[minStack.length - 1] : newVal;
  const newMin = Math.min(currentMin, newVal);

  const updatedMain = [...mainStack, newVal];
  const updatedMin = [...minStack, newMin];

  const mainElements: StackElementData[] = updatedMain.map((val, i) => ({
    id: `m-${i}`,
    value: val,
    state: i === updatedMain.length - 1 ? 'pushed' : 'default',
  }));

  const auxElements: StackElementData[] = updatedMin.map((val, i) => ({
    id: `min-${i}`,
    value: val,
    state: i === updatedMin.length - 1 ? 'pushed' : 'default',
  }));

  steps.push({
    stepIndex: 0,
    description: `Pushing ${newVal} to Main Stack. Min value so far is min(${currentMin}, ${newVal}) = ${newMin}.`,
    codeLine: 2,
    elements: mainElements,
    auxElements: auxElements,
    auxLabel: 'MIN STACK',
  });

  return { steps, newMain: updatedMain, newMin: updatedMin };
}

// ─── EVALUATE POSTFIX (RPN) PROBLEM ENGINE ───────────────────────────

export function generatePostfixEvalSteps(exprStr: string): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const tokens = exprStr.trim().split(/\s+/);
  const stack: number[] = [];

  steps.push({
    stepIndex: 0,
    description: `Starting Postfix Evaluation for tokens: [${tokens.join(', ')}]`,
    codeLine: 1,
    elements: [],
    inputString: exprStr,
    currentInputIndex: 0,
  });

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const num = Number(token);

    if (!isNaN(num)) {
      stack.push(num);
      steps.push({
        stepIndex: steps.length,
        description: `Token '${token}' is a number. Push to Stack.`,
        codeLine: 3,
        elements: stack.map((val, idx) => ({ id: `post-${idx}`, value: val, state: idx === stack.length - 1 ? 'pushed' : 'default' })),
        inputString: exprStr,
        currentInputIndex: i,
      });
    } else if (['+', '-', '*', '/'].includes(token)) {
      if (stack.length < 2) {
        steps.push({
          stepIndex: steps.length,
          description: `Error: Insufficient operands for operator '${token}'!`,
          codeLine: 6,
          elements: stack.map((val, idx) => ({ id: `post-${idx}`, value: val, state: 'error' })),
          inputString: exprStr,
          currentInputIndex: i,
        });
        return steps;
      }

      const b = stack.pop()!;
      const a = stack.pop()!;
      let result = 0;
      if (token === '+') result = a + b;
      if (token === '-') result = a - b;
      if (token === '*') result = a * b;
      if (token === '/') result = Math.floor(a / b);

      stack.push(result);

      steps.push({
        stepIndex: steps.length,
        description: `Operator '${token}': Pop ${b} and ${a}, calculate ${a} ${token} ${b} = ${result}. Push ${result} to Stack.`,
        codeLine: 5,
        elements: stack.map((val, idx) => ({ id: `post-${idx}`, value: val, state: idx === stack.length - 1 ? 'pushed' : 'default' })),
        inputString: exprStr,
        currentInputIndex: i,
      });
    }
  }

  const finalResult = stack[stack.length - 1];
  steps.push({
    stepIndex: steps.length,
    description: `Postfix evaluation complete. Final answer = ${finalResult}`,
    codeLine: 8,
    elements: stack.map((val, idx) => ({ id: `post-${idx}`, value: val, state: 'sorted' })),
    inputString: exprStr,
    currentInputIndex: tokens.length,
  });

  return steps;
}

// ─── QUEUE VIA TWO STACKS ENGINE ─────────────────────────────────────

export function generateQueueViaStacksSteps(
  inStack: (number | string)[],
  outStack: (number | string)[],
  opType: 'enqueue' | 'dequeue',
  val?: number | string
): { steps: StackQueueStep[]; newIn: (number | string)[]; newOut: (number | string)[] } {
  const steps: StackQueueStep[] = [];

  if (opType === 'enqueue' && val !== undefined) {
    const updatedIn = [...inStack, val];
    steps.push({
      stepIndex: 0,
      description: `Enqueue operation: Push '${val}' into In-Stack (Input Buffer).`,
      codeLine: 2,
      elements: updatedIn.map((v, i) => ({ id: `in-${i}`, value: v, state: i === updatedIn.length - 1 ? 'pushed' : 'default' })),
      auxElements: outStack.map((v, i) => ({ id: `out-${i}`, value: v, state: 'default' })),
      auxLabel: 'OUT-STACK (OUTPUT)',
    });
    return { steps, newIn: updatedIn, newOut: outStack };
  } else {
    // Dequeue
    let currentIn = [...inStack];
    let currentOut = [...outStack];

    if (currentOut.length === 0) {
      steps.push({
        stepIndex: 0,
        description: `Dequeue: Out-Stack is empty! Transferring elements from In-Stack to Out-Stack to reverse order.`,
        codeLine: 4,
        elements: currentIn.map((v, i) => ({ id: `in-${i}`, value: v, state: 'active' })),
        auxElements: currentOut.map((v, i) => ({ id: `out-${i}`, value: v, state: 'default' })),
        auxLabel: 'OUT-STACK (OUTPUT)',
      });

      while (currentIn.length > 0) {
        const item = currentIn.pop()!;
        currentOut.push(item);
      }

      steps.push({
        stepIndex: 1,
        description: `Transfer complete! In-Stack elements reversed into Out-Stack.`,
        codeLine: 5,
        elements: [],
        auxElements: currentOut.map((v, i) => ({ id: `out-${i}`, value: v, state: 'pushed' })),
        auxLabel: 'OUT-STACK (OUTPUT)',
      });
    }

    if (currentOut.length > 0) {
      const dequeuedVal = currentOut.pop()!;
      steps.push({
        stepIndex: steps.length,
        description: `Popping top of Out-Stack: Dequeued value '${dequeuedVal}'!`,
        codeLine: 7,
        elements: currentIn.map((v, i) => ({ id: `in-${i}`, value: v, state: 'default' })),
        auxElements: currentOut.map((v, i) => ({ id: `out-${i}`, value: v, state: 'default' })),
        auxLabel: 'OUT-STACK (OUTPUT)',
      });
    }

    return { steps, newIn: currentIn, newOut: currentOut };
  }
}

// ─── DAILY TEMPERATURES (NEXT GREATER ELEMENT) ENGINE ─────────────────

export function generateDailyTemperaturesSteps(temperatures: number[]): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const n = temperatures.length;
  const answer = new Array(n).fill(0);
  const stack: number[] = []; // stores indices

  steps.push({
    stepIndex: 0,
    description: `Starting Daily Temperatures check for temperatures: [${temperatures.join(', ')}]. Objective: Find days to wait for a warmer temperature using Monotonic Stack.`,
    codeLine: 1,
    elements: [],
    auxElements: answer.map((val, idx) => ({ id: `ans-${idx}`, value: val, state: 'default' })),
    auxLabel: 'WAITING DAYS RESULT ARRAY',
    currentInputIndex: 0,
  });

  for (let i = 0; i < n; i++) {
    const currentTemp = temperatures[i];

    steps.push({
      stepIndex: steps.length,
      description: `Day ${i}: Current temperature is ${currentTemp}°F.`,
      codeLine: 3,
      elements: stack.map((idx) => ({ id: `st-${idx}`, value: `${temperatures[idx]}° (i=${idx})`, state: 'default' })),
      auxElements: answer.map((val, idx) => ({ id: `ans-${idx}`, value: val, state: idx === i ? 'active' : 'default' })),
      auxLabel: 'WAITING DAYS RESULT ARRAY',
      currentInputIndex: i,
    });

    while (stack.length > 0 && temperatures[stack[stack.length - 1]] < currentTemp) {
      const prevIndex = stack.pop()!;
      answer[prevIndex] = i - prevIndex;

      steps.push({
        stepIndex: steps.length,
        description: `Warmer Day Found! Day ${i} (${currentTemp}°F) is warmer than Day ${prevIndex} (${temperatures[prevIndex]}°F). Waiting days for Day ${prevIndex} = ${i} - ${prevIndex} = ${i - prevIndex} days.`,
        codeLine: 6,
        elements: stack.map((idx) => ({ id: `st-${idx}`, value: `${temperatures[idx]}° (i=${idx})`, state: 'default' })),
        auxElements: answer.map((val, idx) => ({ id: `ans-${idx}`, value: val, state: idx === prevIndex ? 'sorted' : 'default' })),
        auxLabel: 'WAITING DAYS RESULT ARRAY',
        currentInputIndex: i,
      });
    }

    stack.push(i);
    steps.push({
      stepIndex: steps.length,
      description: `Push Day ${i} (${currentTemp}°F) index onto Monotonic Stack.`,
      codeLine: 8,
      elements: stack.map((idx) => ({ id: `st-${idx}`, value: `${temperatures[idx]}° (i=${idx})`, state: idx === i ? 'pushed' : 'default' })),
      auxElements: answer.map((val, idx) => ({ id: `ans-${idx}`, value: val, state: 'default' })),
      auxLabel: 'WAITING DAYS RESULT ARRAY',
      currentInputIndex: i,
    });
  }

  steps.push({
    stepIndex: steps.length,
    description: `Daily Temperatures complete. Final waiting-days array: [${answer.join(', ')}]`,
    codeLine: 10,
    elements: stack.map((idx) => ({ id: `st-${idx}`, value: `${temperatures[idx]}° (i=${idx})`, state: 'sorted' })),
    auxElements: answer.map((val, idx) => ({ id: `ans-${idx}`, value: val, state: 'sorted' })),
    auxLabel: 'WAITING DAYS RESULT ARRAY',
    currentInputIndex: n,
  });

  return steps;
}

// ─── SIMPLIFY PATH (LEETCODE #71) ENGINE ─────────────────────────────

export function generateSimplifyPathSteps(pathStr: string): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const parts = pathStr.split('/');
  const stack: string[] = [];

  steps.push({
    stepIndex: 0,
    description: `Starting Simplify Path for "${pathStr}". Splitting by '/' gives tokens: [${parts.map((p) => `"${p}"`).join(', ')}]`,
    codeLine: 1,
    elements: [],
    inputString: pathStr,
    currentInputIndex: 0,
  });

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part === '' || part === '.') continue;

    if (part === '..') {
      if (stack.length > 0) {
        const popped = stack.pop();
        steps.push({
          stepIndex: steps.length,
          description: `Token '..' encountered: Moving up one directory level. Popped "${popped}" from Stack.`,
          codeLine: 5,
          elements: stack.map((val, idx) => ({ id: `p-${idx}`, value: val, state: 'popped' })),
          inputString: pathStr,
          currentInputIndex: i,
        });
      } else {
        steps.push({
          stepIndex: steps.length,
          description: `Token '..' encountered at root directory: Stack is empty, stay at root.`,
          codeLine: 6,
          elements: [],
          inputString: pathStr,
          currentInputIndex: i,
        });
      }
    } else {
      stack.push(part);
      steps.push({
        stepIndex: steps.length,
        description: `Valid directory name "${part}": Push to Stack.`,
        codeLine: 4,
        elements: stack.map((val, idx) => ({ id: `p-${idx}`, value: val, state: idx === stack.length - 1 ? 'pushed' : 'default' })),
        inputString: pathStr,
        currentInputIndex: i,
      });
    }
  }

  const resultPath = '/' + stack.join('/');
  steps.push({
    stepIndex: steps.length,
    description: `Path simplified. Final canonical path = "${resultPath}"`,
    codeLine: 8,
    elements: stack.map((val, idx) => ({ id: `p-${idx}`, value: val, state: 'sorted' })),
    inputString: pathStr,
    currentInputIndex: parts.length,
  });

  return steps;
}

// ─── REMOVE ADJACENT DUPLICATES (LEETCODE #1047) ENGINE ───────────────

export function generateRemoveAdjacentDuplicatesSteps(s: string): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const stack: string[] = [];

  steps.push({
    stepIndex: 0,
    description: `Starting Remove Adjacent Duplicates for string "${s}".`,
    codeLine: 1,
    elements: [],
    inputString: s,
    currentInputIndex: 0,
  });

  for (let i = 0; i < s.length; i++) {
    const char = s[i];
    if (stack.length > 0 && stack[stack.length - 1] === char) {
      const popped = stack.pop();
      steps.push({
        stepIndex: steps.length,
        description: `Duplicate adjacent pair found! Char '${char}' matches top '${popped}'. Popping from Stack.`,
        codeLine: 4,
        elements: stack.map((val, idx) => ({ id: `d-${idx}`, value: val, state: 'popped' })),
        inputString: s,
        currentInputIndex: i,
      });
    } else {
      stack.push(char);
      steps.push({
        stepIndex: steps.length,
        description: `Char '${char}' does not match top element. Push to Stack.`,
        codeLine: 3,
        elements: stack.map((val, idx) => ({ id: `d-${idx}`, value: val, state: idx === stack.length - 1 ? 'pushed' : 'default' })),
        inputString: s,
        currentInputIndex: i,
      });
    }
  }

  const resultStr = stack.join('');
  steps.push({
    stepIndex: steps.length,
    description: `Adjacent duplicates removed. Final resulting string = "${resultStr}"`,
    codeLine: 6,
    elements: stack.map((val, idx) => ({ id: `d-${idx}`, value: val, state: 'sorted' })),
    inputString: s,
    currentInputIndex: s.length,
  });

  return steps;
}

// ─── SLIDING WINDOW MAXIMUM (LEETCODE #239) ENGINE ───────────────────

export function generateSlidingWindowSteps(nums: number[], k: number): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const deque: number[] = []; // stores indices
  const result: number[] = [];

  steps.push({
    stepIndex: 0,
    description: `Starting Sliding Window Maximum for array [${nums.join(', ')}] with window size k=${k}.`,
    codeLine: 1,
    elements: [],
    auxElements: [],
    auxLabel: 'SLIDING WINDOW MAX RESULT',
    currentInputIndex: 0,
  });

  for (let i = 0; i < nums.length; i++) {
    // Remove indices out of current window
    while (deque.length > 0 && deque[0] <= i - k) {
      deque.shift();
    }

    // Remove elements smaller than current element from rear
    while (deque.length > 0 && nums[deque[deque.length - 1]] < nums[i]) {
      deque.pop();
    }

    deque.push(i);

    if (i >= k - 1) {
      result.push(nums[deque[0]]);
      steps.push({
        stepIndex: steps.length,
        description: `Window [${i - k + 1}..${i}]: Max element is ${nums[deque[0]]} (Index ${deque[0]}). Added to result.`,
        codeLine: 6,
        elements: deque.map((idx) => ({ id: `deq-${idx}`, value: `${nums[idx]} (i=${idx})`, state: 'default' })),
        auxElements: result.map((val, rIdx) => ({ id: `res-${rIdx}`, value: val, state: rIdx === result.length - 1 ? 'sorted' : 'default' })),
        auxLabel: 'SLIDING WINDOW MAX RESULT',
        slidingWindowRange: [i - k + 1, i],
        currentInputIndex: i,
      });
    }
  }

  return steps;
}




// ─── BASIC CALCULATOR (LEETCODE #224) ENGINE ─────────────────────

export function generateBasicCalculatorSteps(expression: string): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const ctxStack: { res: number; sgn: number }[] = [];
  let result = 0;
  let sign = 1;
  let num = 0;

  const snap = (ci: number, desc: string, codeLine: number): void => {
    steps.push({
      stepIndex: steps.length,
      description: desc,
      codeLine,
      elements: ctxStack.map((c, i) => ({
        id: `ctx-${i}`,
        value: `res=${c.res}, sgn=${c.sgn >= 0 ? '+' : '-'}`,
        state: i === ctxStack.length - 1 ? 'active' as NodeState : 'default' as NodeState,
      })),
      auxElements: [{ id: 'run-0', value: `res=${result}`, state: 'highlight' as NodeState, auxValue: `sgn=${sign >= 0 ? '+' : '-'}` }],
      auxLabel: 'RUNNING STATE',
      inputString: expression,
      currentInputIndex: ci,
    });
  };

  snap(0, `Evaluate expression "${expression}" using a context stack for parentheses.`, 1);

  for (let i = 0; i < expression.length; i++) {
    const c = expression[i];
    const isDigit = c >= '0' && c <= '9';

    if (isDigit) {
      num = num * 10 + Number(c);
      snap(i, `Read digit '${c}', building number = ${num}.`, 3);
    } else if (c === ' ') {
      continue;
    } else if (c === '+' || c === '-') {
      result += sign * num;
      snap(i, `Operator '${c}': flush number ${num} → result = ${result - sign * num} + (${sign >= 0 ? '+' : '-'}${num}) = ${result}.`, 4);
      num = 0;
      sign = c === '+' ? 1 : -1;
    } else if (c === '(') {
      ctxStack.push({ res: result, sgn: sign });
      snap(i, `'(': Push (res=${result}, sign=${sign >= 0 ? '+' : '-'}) to context stack. Reset running result to 0.`, 5);
      result = 0;
      sign = 1;
      num = 0;
    } else if (c === ')') {
      result += sign * num;
      const inner = result;
      const ctx = ctxStack.pop()!;
      result = ctx.res + ctx.sgn * inner;
      snap(i, `')': Inner = ${inner}. Pop context → res = ${ctx.res} + (${ctx.sgn >= 0 ? '+' : '-'}${inner}) = ${result}.`, 7);
      num = 0;
    }
  }

  result += sign * num;
  steps.push({
    stepIndex: steps.length,
    description: `Evaluation complete. "${expression}" = ${result}`,
    codeLine: 9,
    elements: ctxStack.map((c, i) => ({ id: `ctx-${i}`, value: `res=${c.res}, sgn=${c.sgn >= 0 ? '+' : '-'}`, state: 'sorted' as NodeState })),
    auxElements: [{ id: 'run-0', value: `${result}`, state: 'sorted' as NodeState }],
    auxLabel: 'RUNNING STATE',
    inputString: expression,
    currentInputIndex: expression.length,
  });

  return steps;
}

// ─── DECODE STRING (LEETCODE #394) ENGINE ────────────────────────

export function generateDecodeStringSteps(s: string): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const strStack: string[] = [];
  const numStack: number[] = [];
  let curStr = '';
  let curNum = 0;

  steps.push({
    stepIndex: 0,
    description: `Decode encoded string "${s}". Push (string, count) on '[', pop and repeat on ']'.`,
    codeLine: 1,
    elements: [],
    auxElements: [],
    auxLabel: 'COUNT STACK',
    inputString: s,
    currentInputIndex: 0,
  });

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c >= '0' && c <= '9') {
      curNum = curNum * 10 + Number(c);
      steps.push({
        stepIndex: steps.length,
        description: `Read digit '${c}', building repeat count = ${curNum}.`,
        codeLine: 3,
        elements: strStack.map((v, j) => ({ id: `str-${j}`, value: v || '(empty)', state: 'default' as NodeState })),
        auxElements: numStack.map((v, j) => ({ id: `num-${j}`, value: v, state: 'default' as NodeState })),
        auxLabel: 'COUNT STACK',
        inputString: s,
        currentInputIndex: i,
      });
    } else if (c === '[') {
      strStack.push(curStr);
      numStack.push(curNum);
      steps.push({
        stepIndex: steps.length,
        description: `'[': Push current string "${curStr || '(empty)'}" and count ${curNum} to stacks. Reset for inner segment.`,
        codeLine: 4,
        elements: strStack.map((v, j) => ({ id: `str-${j}`, value: v || '(empty)', state: j === strStack.length - 1 ? 'pushed' as NodeState : 'default' as NodeState })),
        auxElements: numStack.map((v, j) => ({ id: `num-${j}`, value: v, state: j === numStack.length - 1 ? 'pushed' as NodeState : 'default' as NodeState })),
        auxLabel: 'COUNT STACK',
        inputString: s,
        currentInputIndex: i,
      });
      curStr = '';
      curNum = 0;
    } else if (c === ']') {
      const prevStr = strStack.pop()!;
      const repeatCount = numStack.pop()!;
      const repeated = curStr.repeat(repeatCount);
      curStr = prevStr + repeated;
      steps.push({
        stepIndex: steps.length,
        description: `']': Pop count=${repeatCount}, prev="${prevStr || '(empty)'}". Build "${curStr}" × ${repeatCount} = "${repeated}", prepend prev → "${curStr}".`,
        codeLine: 6,
        elements: strStack.map((v, j) => ({ id: `str-${j}`, value: v || '(empty)', state: 'default' as NodeState })),
        auxElements: numStack.map((v, j) => ({ id: `num-${j}`, value: v, state: 'default' as NodeState })),
        auxLabel: 'COUNT STACK',
        inputString: s,
        currentInputIndex: i,
      });
    } else {
      curStr += c;
      steps.push({
        stepIndex: steps.length,
        description: `Read letter '${c}', current segment = "${curStr}".`,
        codeLine: 5,
        elements: strStack.map((v, j) => ({ id: `str-${j}`, value: v || '(empty)', state: 'default' as NodeState })),
        auxElements: numStack.map((v, j) => ({ id: `num-${j}`, value: v, state: 'default' as NodeState })),
        auxLabel: 'COUNT STACK',
        inputString: s,
        currentInputIndex: i,
      });
    }
  }

  steps.push({
    stepIndex: steps.length,
    description: `Decoded string: "${curStr}"`,
    codeLine: 8,
    elements: [{ id: 'ans-0', value: curStr, state: 'sorted' as NodeState }],
    auxElements: [],
    auxLabel: 'COUNT STACK',
    inputString: s,
    currentInputIndex: s.length,
  });

  return steps;
}

// ─── TRAPPING RAIN WATER (LEETCODE #42) ENGINE ──────────────────

export function generateTrappingRainWaterSteps(heights: number[]): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const n = heights.length;
  const stack: number[] = [];
  const water = new Array(n).fill(0);
  let totalWater = 0;

  steps.push({
    stepIndex: 0,
    description: `Trapping Rain Water for [${heights.join(', ')}]. Monotonic decreasing stack of bar indices.`,
    codeLine: 1,
    elements: [],
    auxElements: water.map((v: number, i: number) => ({ id: `w-${i}`, value: `i=${i}`, state: 'default' as NodeState, auxValue: v })),
    auxLabel: 'WATER PER BAR',
    currentInputIndex: 0,
  });

  for (let i = 0; i < n; i++) {
    const h = heights[i];
    steps.push({
      stepIndex: steps.length,
      description: `Bar ${i}: height = ${h}. Compare with stack top.`,
      codeLine: 3,
      elements: stack.map((idx) => ({ id: `st-${idx}`, value: `h=${heights[idx]} (i=${idx})`, state: 'default' as NodeState })),
      auxElements: water.map((v: number, j: number) => ({ id: `w-${j}`, value: `i=${j}`, state: j === i ? 'active' as NodeState : 'default' as NodeState, auxValue: v })),
      auxLabel: 'WATER PER BAR',
      currentInputIndex: i,
    });

    while (stack.length > 0 && heights[stack[stack.length - 1]] < h) {
      const top = stack.pop()!;
      const topH = heights[top];
      if (stack.length === 0) {
        steps.push({
          stepIndex: steps.length,
          description: `Pop bar ${top} (h=${topH}). No left boundary → no water trapped.`,
          codeLine: 5,
          elements: stack.map((idx) => ({ id: `st-${idx}`, value: `h=${heights[idx]} (i=${idx})`, state: 'default' as NodeState })),
          auxElements: water.map((v: number, j: number) => ({ id: `w-${j}`, value: `i=${j}`, state: 'default' as NodeState, auxValue: v })),
          auxLabel: 'WATER PER BAR',
          currentInputIndex: i,
        });
        break;
      }
      const left = stack[stack.length - 1];
      const leftH = heights[left];
      const boundedH = Math.min(leftH, h) - topH;
      const width = i - left - 1;
      const trapped = boundedH * width;
      water[top] = trapped;
      totalWater += trapped;
      steps.push({
        stepIndex: steps.length,
        description: `Pop bar ${top} (h=${topH}). Left boundary = bar ${left} (h=${leftH}), right = bar ${i} (h=${h}). water += (min(${leftH},${h}) - ${topH}) × (${i}-${left}-1) = ${boundedH} × ${width} = ${trapped}. Total = ${totalWater}.`,
        codeLine: 6,
        elements: stack.map((idx) => ({ id: `st-${idx}`, value: `h=${heights[idx]} (i=${idx})`, state: 'comparing' as NodeState })),
        auxElements: water.map((v: number, j: number) => ({ id: `w-${j}`, value: `i=${j}`, state: j === top ? 'sorted' as NodeState : 'default' as NodeState, auxValue: v })),
        auxLabel: 'WATER PER BAR',
        currentInputIndex: i,
      });
    }

    stack.push(i);
    steps.push({
      stepIndex: steps.length,
      description: `Push bar ${i} (h=${h}) onto stack.`,
      codeLine: 8,
      elements: stack.map((idx) => ({ id: `st-${idx}`, value: `h=${heights[idx]} (i=${idx})`, state: idx === i ? 'pushed' as NodeState : 'default' as NodeState })),
      auxElements: water.map((v: number, j: number) => ({ id: `w-${j}`, value: `i=${j}`, state: 'default' as NodeState, auxValue: v })),
      auxLabel: 'WATER PER BAR',
      currentInputIndex: i,
    });
  }

  steps.push({
    stepIndex: steps.length,
    description: `Trapping Rain Water complete. Total water trapped = ${totalWater} units.`,
    codeLine: 10,
    elements: stack.map((idx) => ({ id: `st-${idx}`, value: `h=${heights[idx]} (i=${idx})`, state: 'sorted' as NodeState })),
    auxElements: water.map((v: number, j: number) => ({ id: `w-${j}`, value: `i=${j}`, state: 'sorted' as NodeState, auxValue: v })),
    auxLabel: 'WATER PER BAR',
    currentInputIndex: n,
  });

  // Attach the bar heights so the renderer can draw the histogram
  return steps.map((s) => ({ ...s, inputString: heights.join(' ') }));
}

// ─── LARGEST RECTANGLE IN HISTOGRAM (LEETCODE #84) ENGINE ─────────

export function generateLargestRectangleSteps(heights: number[]): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const stack: number[] = [];
  let bestArea = 0;
  const ext = [...heights, 0];

  steps.push({
    stepIndex: 0,
    description: `Largest Rectangle for [${heights.join(', ')}]. Monotonic increasing stack + sentinel 0.`,
    codeLine: 1,
    elements: [],
    auxElements: [{ id: 'best-0', value: 'Best Area', state: 'default' as NodeState, auxValue: 0 }],
    auxLabel: 'BEST AREA',
    currentInputIndex: 0,
  });

  for (let i = 0; i < ext.length; i++) {
    const h = ext[i];
    const isSentinel = i === ext.length - 1;
    steps.push({
      stepIndex: steps.length,
      description: isSentinel ? `Sentinel bar ${i}: h=0. Flush remaining stack entries.` : `Bar ${i}: h=${h}. Compare with stack top.`,
      codeLine: 3,
      elements: stack.map((idx) => ({ id: `st-${idx}`, value: `h=${ext[idx]} (i=${idx})`, state: 'default' as NodeState })),
      auxElements: [{ id: 'best-0', value: 'Best Area', state: 'active' as NodeState, auxValue: bestArea }],
      auxLabel: 'BEST AREA',
      currentInputIndex: i,
    });

    while (stack.length > 0 && ext[stack[stack.length - 1]] > h) {
      const top = stack.pop()!;
      const topH = ext[top];
      const width = stack.length === 0 ? i : i - stack[stack.length - 1] - 1;
      const area = topH * width;
      if (area > bestArea) bestArea = area;
      steps.push({
        stepIndex: steps.length,
        description: `Pop bar ${top} (h=${topH}). width=${width}, area = ${topH} × ${width} = ${area}. Best = ${bestArea}.`,
        codeLine: 6,
        elements: stack.map((idx) => ({ id: `st-${idx}`, value: `h=${ext[idx]} (i=${idx})`, state: 'comparing' as NodeState })),
        auxElements: [{ id: 'best-0', value: 'Best Area', state: area >= bestArea ? 'sorted' as NodeState : 'active' as NodeState, auxValue: bestArea }],
        auxLabel: 'BEST AREA',
        currentInputIndex: i,
      });
    }

    stack.push(i);
    steps.push({
      stepIndex: steps.length,
      description: isSentinel ? `Push sentinel bar ${i} (h=0).` : `Push bar ${i} (h=${h}) onto stack.`,
      codeLine: 8,
      elements: stack.map((idx) => ({ id: `st-${idx}`, value: `h=${ext[idx]} (i=${idx})`, state: idx === i ? 'pushed' as NodeState : 'default' as NodeState })),
      auxElements: [{ id: 'best-0', value: 'Best Area', state: 'default' as NodeState, auxValue: bestArea }],
      auxLabel: 'BEST AREA',
      currentInputIndex: i,
    });
  }

  steps.push({
    stepIndex: steps.length,
    description: `Largest Rectangle complete. Maximum area = ${bestArea}.`,
    codeLine: 10,
    elements: [],
    auxElements: [{ id: 'best-0', value: 'Best Area', state: 'sorted' as NodeState, auxValue: bestArea }],
    auxLabel: 'BEST AREA',
    currentInputIndex: ext.length,
  });

  // Attach the bar heights so the renderer can draw the histogram
  return steps.map((s) => ({ ...s, inputString: heights.join(' ') }));
}

// ─── STACK VIA TWO QUEUES (LEETCODE #225) ENGINE ─────────────────

export function generateStackViaQueuesSteps(
  mainQueue: (number | string)[],
  auxQueue: (number | string)[],
  operation: 'push' | 'pop',
  newVal?: number | string
): { steps: StackQueueStep[]; newMain: (number | string)[]; newAux: (number | string)[] } {
  const steps: StackQueueStep[] = [];

  if (operation === 'push' && newVal !== undefined) {
    let main = [...mainQueue];
    const aux: (number | string)[] = [newVal];

    steps.push({
      stepIndex: 0,
      description: `Push '${newVal}': Enqueue into aux queue first.`,
      codeLine: 2,
      elements: main.map((v, i) => ({ id: `mq-${i}`, value: v, state: 'default' as NodeState })),
      auxElements: [{ id: `aq-0`, value: newVal, state: 'pushed' as NodeState }],
      auxLabel: 'AUX QUEUE',
    });

    const drainCount = main.length;
    for (let k = 0; k < drainCount; k++) {
      const item = main[0];
      main = main.slice(1);
      aux.push(item);
      steps.push({
        stepIndex: steps.length,
        description: `Drain: Dequeue '${item}' from main, enqueue into aux.`,
        codeLine: 4,
        elements: main.map((v, i) => ({ id: `mq-${i}`, value: v, state: 'popped' as NodeState })),
        auxElements: aux.map((v, i) => ({ id: `aq-${i}`, value: v, state: i === aux.length - 1 ? 'pushed' as NodeState : 'default' as NodeState })),
        auxLabel: 'AUX QUEUE',
      });
    }

    steps.push({
      stepIndex: steps.length,
      description: `Swap queues. '${newVal}' is now at front of main queue (stack top).`,
      codeLine: 6,
      elements: aux.map((v, i) => ({ id: `mq-${i}`, value: v, state: i === 0 ? 'highlight' as NodeState : 'default' as NodeState })),
      auxElements: [],
      auxLabel: 'AUX QUEUE',
    });

    return { steps, newMain: aux, newAux: [] };
  } else {
    if (mainQueue.length === 0) {
      steps.push({
        stepIndex: 0,
        description: `Underflow Warning: Cannot pop from empty main queue (stack is empty)!`,
        codeLine: 1,
        elements: [],
        auxElements: auxQueue.map((v, i) => ({ id: `aq-${i}`, value: v, state: 'default' as NodeState })),
        auxLabel: 'AUX QUEUE',
      });
      return { steps, newMain: mainQueue, newAux: auxQueue };
    }

    const frontVal = mainQueue[0];
    const remaining = mainQueue.slice(1);

    steps.push({
      stepIndex: 0,
      description: `Pop: Dequeue front element '${frontVal}' from main queue (stack top).`,
      codeLine: 8,
      elements: mainQueue.map((v, i) => ({ id: `mq-${i}`, value: v, state: i === 0 ? 'popped' as NodeState : 'default' as NodeState })),
      auxElements: auxQueue.map((v, i) => ({ id: `aq-${i}`, value: v, state: 'default' as NodeState })),
      auxLabel: 'AUX QUEUE',
    });

    steps.push({
      stepIndex: 1,
      description: `Popped '${frontVal}'. Stack size is now ${remaining.length}.`,
      codeLine: 9,
      elements: remaining.map((v, i) => ({ id: `mq-${i}`, value: v, state: 'default' as NodeState })),
      auxElements: auxQueue.map((v, i) => ({ id: `aq-${i}`, value: v, state: 'default' as NodeState })),
      auxLabel: 'AUX QUEUE',
    });

    return { steps, newMain: remaining, newAux: auxQueue };
  }
}

// ─── CIRCULAR DEQUE (LEETCODE #641) ENGINE ──────────────────────

export function generateCircularDequeSteps(
  elements: (number | string | null)[],
  front: number,
  rear: number,
  capacity: number,
  operation: 'insertFront' | 'insertLast' | 'deleteFront' | 'deleteLast',
  value?: number | string
): { steps: StackQueueStep[]; newElements: (number | string | null)[]; newFront: number; newRear: number } {
  const steps: StackQueueStep[] = [];
  const count = elements.filter((e) => e !== null).length;
  const isEmpty = count === 0;
  const isFull = count === capacity;
  const snap = (arr: (number | string | null)[], f: number, r: number, desc: string, hlIdx?: number, hlState?: NodeState): void => {
    steps.push({
      stepIndex: steps.length,
      description: desc,
      elements: arr.map((v, i) => ({ id: `dq-${i}`, value: v ?? '-', state: i === hlIdx && hlState ? hlState : 'default' as NodeState })),
      capacity,
      frontIndex: f,
      rearIndex: r,
    });
  };

  if ((operation === 'insertFront' || operation === 'insertLast') && isFull) {
    snap(elements, front, rear, `Overflow: Deque is full (capacity=${capacity}). Cannot ${operation}.`, undefined, 'error');
    return { steps, newElements: elements, newFront: front, newRear: rear };
  }
  if ((operation === 'deleteFront' || operation === 'deleteLast') && isEmpty) {
    snap(elements, front, rear, `Underflow: Deque is empty. Cannot ${operation}.`, undefined, 'error');
    return { steps, newElements: elements, newFront: front, newRear: rear };
  }

  const newArr = [...elements];
  let nF = front;
  let nR = rear;

  if (operation === 'insertFront' && value !== undefined) {
    nF = isEmpty ? 0 : (front - 1 + capacity) % capacity;
    newArr[nF] = value;
    snap(newArr, nF, nR, `insertFront '${value}': front wraps: (${front}-1+${capacity}) % ${capacity} = ${nF}. Place at [${nF}].`, nF, 'pushed');
    snap(newArr, nF, nR, `Inserted '${value}' at front. FRONT=${nF}, REAR=${nR}, size=${count + 1}.`);
  } else if (operation === 'insertLast' && value !== undefined) {
    nR = isEmpty ? 0 : (rear + 1) % capacity;
    newArr[nR] = value;
    snap(newArr, nF, nR, `insertLast '${value}': rear wraps: (${rear}+1) % ${capacity} = ${nR}. Place at [${nR}].`, nR, 'pushed');
    snap(newArr, nF, nR, `Inserted '${value}' at rear. FRONT=${nF}, REAR=${nR}, size=${count + 1}.`);
  } else if (operation === 'deleteFront') {
    const removed = newArr[front];
    newArr[front] = null;
    snap(newArr, nF, nR, `deleteFront: Remove '${removed}' at index [${front}].`, front, 'popped');
    if (count === 1) { nF = -1; nR = -1; } else { nF = (front + 1) % capacity; }
    snap(newArr, nF, nR, `Deleted '${removed}' from front. FRONT=${nF}, REAR=${nR}, size=${count - 1}.`);
  } else if (operation === 'deleteLast') {
    const removed = newArr[rear];
    newArr[rear] = null;
    snap(newArr, nF, nR, `deleteLast: Remove '${removed}' at index [${rear}].`, rear, 'popped');
    if (count === 1) { nF = -1; nR = -1; } else { nR = (rear - 1 + capacity) % capacity; }
    snap(newArr, nF, nR, `Deleted '${removed}' from rear. FRONT=${nF}, REAR=${nR}, size=${count - 1}.`);
  }

  return { steps, newElements: newArr, newFront: nF, newRear: nR };
}

// ─── FIRST NON-REPEATING CHARACTER IN STREAM ENGINE ──────────────

export function generateFirstNonRepeatingSteps(stream: string): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const queue: string[] = [];
  const charCount = new Map<string, number>();
  const timeline: string[] = [];

  steps.push({
    stepIndex: 0,
    description: `Find first non-repeating character in stream "${stream}".`,
    codeLine: 1,
    elements: [],
    auxElements: [],
    auxLabel: 'FIRST NON-REPEATING TIMELINE',
    inputString: stream,
    currentInputIndex: 0,
  });

  for (let i = 0; i < stream.length; i++) {
    const c = stream[i];
    const prevCount = charCount.get(c) ?? 0;
    charCount.set(c, prevCount + 1);

    if (prevCount === 0) {
      queue.push(c);
    }
    steps.push({
      stepIndex: steps.length,
      description: `Char '${c}': count ${prevCount} → ${prevCount + 1}. ${prevCount === 0 ? 'Enqueue to candidate queue.' : 'Already seen → mark repeated.'}`,
      codeLine: 3,
      elements: queue.map((v, j) => ({ id: `q-${j}`, value: v, state: j === queue.length - 1 && prevCount === 0 ? 'pushed' as NodeState : 'default' as NodeState })),
      auxElements: timeline.map((v, j) => ({ id: `tl-${j}`, value: v, state: 'default' as NodeState })),
      auxLabel: 'FIRST NON-REPEATING TIMELINE',
      inputString: stream,
      currentInputIndex: i,
    });

    while (queue.length > 0 && (charCount.get(queue[0]) ?? 0) > 1) {
      const removed = queue.shift()!;
      steps.push({
        stepIndex: steps.length,
        description: `Clean head: '${removed}' has count ${(charCount.get(removed) ?? 0)} > 1 → dequeue.`,
        codeLine: 5,
        elements: queue.map((v, j) => ({ id: `q-${j}`, value: v, state: 'default' as NodeState })),
        auxElements: timeline.map((v, j) => ({ id: `tl-${j}`, value: v, state: 'default' as NodeState })),
        auxLabel: 'FIRST NON-REPEATING TIMELINE',
        inputString: stream,
        currentInputIndex: i,
      });
    }

    const first = queue.length > 0 ? queue[0] : '-';
    timeline.push(first);
    steps.push({
      stepIndex: steps.length,
      description: `After '${c}': first non-repeating = '${first}'.`,
      codeLine: 7,
      elements: queue.map((v, j) => ({ id: `q-${j}`, value: v, state: j === 0 ? 'highlight' as NodeState : 'default' as NodeState })),
      auxElements: timeline.map((v, j) => ({ id: `tl-${j}`, value: v, state: j === timeline.length - 1 ? 'sorted' as NodeState : 'default' as NodeState })),
      auxLabel: 'FIRST NON-REPEATING TIMELINE',
      inputString: stream,
      currentInputIndex: i,
    });
  }

  steps.push({
    stepIndex: steps.length,
    description: `Stream complete. Timeline: [${timeline.join(', ')}]`,
    codeLine: 9,
    elements: queue.map((v, j) => ({ id: `q-${j}`, value: v, state: 'default' as NodeState })),
    auxElements: timeline.map((v, j) => ({ id: `tl-${j}`, value: v, state: 'sorted' as NodeState })),
    auxLabel: 'FIRST NON-REPEATING TIMELINE',
    inputString: stream,
    currentInputIndex: stream.length,
  });

  return steps;
}

// ─── MOVING AVERAGE FROM DATA STREAM (LEETCODE #346) ENGINE ────────

export function generateMovingAverageSteps(nums: number[], k: number): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const window: number[] = [];
  const averages: { sum: number; count: number }[] = [];
  let sum = 0;

  steps.push({
    stepIndex: 0,
    description: `Moving Average: stream [${nums.join(', ')}], window k=${k}.`,
    codeLine: 1,
    elements: [],
    auxElements: [],
    auxLabel: 'EMITTED AVERAGES',
    currentInputIndex: 0,
  });

  for (let i = 0; i < nums.length; i++) {
    const n = nums[i];
    window.push(n);
    sum += n;
    steps.push({
      stepIndex: steps.length,
      description: `Enqueue ${n}. sum = ${sum}. Window = [${window.join(', ')}].`,
      codeLine: 3,
      elements: window.map((v, j) => ({ id: `w-${j}`, value: v, state: j === window.length - 1 ? 'pushed' as NodeState : 'default' as NodeState })),
      auxElements: averages.map((a, j) => ({ id: `av-${j}`, value: a.sum / a.count, state: 'default' as NodeState, auxValue: Number((a.sum / a.count).toFixed(2)) })),
      auxLabel: 'EMITTED AVERAGES',
      slidingWindowRange: window.length >= k ? [i - k + 1, i] : [0, i],
      currentInputIndex: i,
    });

    if (window.length > k) {
      const old = window.shift()!;
      sum -= old;
      steps.push({
        stepIndex: steps.length,
        description: `Window full: dequeue ${old}. sum += new - old = ${sum + old} - ${old} = ${sum}.`,
        codeLine: 5,
        elements: window.map((v, j) => ({ id: `w-${j}`, value: v, state: 'default' as NodeState })),
        auxElements: averages.map((a, j) => ({ id: `av-${j}`, value: a.sum / a.count, state: 'default' as NodeState, auxValue: Number((a.sum / a.count).toFixed(2)) })),
        auxLabel: 'EMITTED AVERAGES',
        slidingWindowRange: [i - k + 1, i],
        currentInputIndex: i,
      });
    }

    const count = window.length;
    const avg = sum / count;
    averages.push({ sum, count });
    steps.push({
      stepIndex: steps.length,
      description: `Average = ${sum}/${count} = ${avg}.`,
      codeLine: 7,
      elements: window.map((v, j) => ({ id: `w-${j}`, value: v, state: 'default' as NodeState })),
      auxElements: averages.map((a, j) => ({ id: `av-${j}`, value: a.sum / a.count, state: j === averages.length - 1 ? 'sorted' as NodeState : 'default' as NodeState, auxValue: Number((a.sum / a.count).toFixed(2)) })),
      auxLabel: 'EMITTED AVERAGES',
      slidingWindowRange: count >= k ? [i - k + 1, i] : [0, i],
      currentInputIndex: i,
    });
  }

  steps.push({
    stepIndex: steps.length,
    description: `Moving Average complete. Averages: [${averages.map((a) => Number((a.sum / a.count).toFixed(2)).toString()).join(', ')}]`,
    codeLine: 9,
    elements: window.map((v, j) => ({ id: `w-${j}`, value: v, state: 'sorted' as NodeState })),
    auxElements: averages.map((a, j) => ({ id: `av-${j}`, value: a.sum / a.count, state: 'sorted' as NodeState, auxValue: Number((a.sum / a.count).toFixed(2)) })),
    auxLabel: 'EMITTED AVERAGES',
    currentInputIndex: nums.length,
  });

  // Attach the stream so the renderer can draw the input ribbon
  return steps.map((s) => ({ ...s, inputString: nums.join(' ') }));
}

// ─── TASK SCHEDULER (LEETCODE #621) ENGINE ────────────────────────

export function generateTaskSchedulerSteps(tasks: string[], cooldown: number): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const remaining = new Map<string, number>();
  for (const t of tasks) remaining.set(t, (remaining.get(t) ?? 0) + 1);

  const cooling: { task: string; rem: number; readyAt: number }[] = [];
  let schedule = '';
  let tick = 0;

  const readySnap = (): StackElementData[] => {
    const entries = [...remaining.entries()].filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
    return entries.map(([t, c], i) => ({ id: `rd-${t}-${i}`, value: `${t} ×${c}`, state: 'default' as NodeState }));
  };
  const coolSnap = (ct: number): StackElementData[] =>
    cooling.map((c, i) => ({ id: `cl-${i}`, value: `${c.task} ×${c.rem} (ready t=${c.readyAt})`, state: c.readyAt <= ct ? 'highlight' as NodeState : 'default' as NodeState }));

  steps.push({
    stepIndex: 0,
    description: `Schedule [${tasks.join(', ')}] with cooldown n=${cooldown}. Greedy: pick highest-count ready task.`,
    codeLine: 1,
    elements: readySnap(),
    auxElements: [],
    auxLabel: 'COOLING QUEUE',
    inputString: schedule,
    currentInputIndex: 0,
  });

  const totalTasks = tasks.length;
  let executed = 0;

  while (executed < totalTasks) {
    for (let j = cooling.length - 1; j >= 0; j--) {
      if (cooling[j].readyAt <= tick) {
        const c = cooling.splice(j, 1)[0];
        remaining.set(c.task, c.rem);
      }
    }

    const ready = [...remaining.entries()].filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);

    if (ready.length > 0) {
      const [taskName] = ready[0];
      const cnt = remaining.get(taskName)!;
      remaining.set(taskName, 0);
      executed++;
      schedule += taskName;
      const newRem = cnt - 1;
      if (newRem > 0) cooling.push({ task: taskName, rem: newRem, readyAt: tick + cooldown + 1 });

      steps.push({
        stepIndex: steps.length,
        description: `t=${tick}: Execute '${taskName}' (highest remaining = ${cnt}). Schedule: "${schedule}".`,
        codeLine: 4,
        elements: readySnap(),
        auxElements: coolSnap(tick),
        auxLabel: 'COOLING QUEUE',
        inputString: schedule,
        currentInputIndex: tick + 1,
      });
    } else {
      schedule += '·';
      steps.push({
        stepIndex: steps.length,
        description: `t=${tick}: IDLE — all tasks in cooldown. Schedule: "${schedule}".`,
        codeLine: 6,
        elements: readySnap(),
        auxElements: coolSnap(tick),
        auxLabel: 'COOLING QUEUE',
        inputString: schedule,
        currentInputIndex: tick + 1,
      });
    }
    tick++;
  }

  steps.push({
    stepIndex: steps.length,
    description: `Task Scheduler complete. Total time = ${tick}. Schedule: "${schedule}".`,
    codeLine: 8,
    elements: [],
    auxElements: [],
    auxLabel: 'COOLING QUEUE',
    inputString: schedule,
    currentInputIndex: tick,
  });

  return steps;
}

// ─── ROTTING ORANGES (LEETCODE #994) ENGINE ──────────────────────

export function generateRottingOrangesSteps(grid: number[][]): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const rows = grid.length;
  const cols = rows > 0 ? grid[0].length : 0;
  const g = grid.map((row) => row.slice());
  const serialize = (): string => g.map((row) => row.join(' ')).join(';');

  const queue: [number, number][] = [];
  let freshCount = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (g[r][c] === 2) queue.push([r, c]);
      if (g[r][c] === 1) freshCount++;
    }
  }

  steps.push({
    stepIndex: 0,
    description: `Rotting Oranges: ${queue.length} rotten source(s), ${freshCount} fresh. BFS.`,
    codeLine: 1,
    elements: queue.map(([r, c], i) => ({ id: `bfs-${i}`, value: `R${r}C${c}`, state: 'default' as NodeState })),
    auxElements: [{ id: 'fc-0', value: 'Fresh Left', state: 'default' as NodeState, auxValue: freshCount }],
    auxLabel: 'FRESH ORANGES LEFT',
    inputString: serialize(),
    currentInputIndex: 0,
  });

  if (freshCount === 0) {
    steps.push({
      stepIndex: 1,
      description: `No fresh oranges. Time = 0 minutes.`,
      codeLine: 10,
      elements: [],
      auxElements: [{ id: 'fc-0', value: 'Fresh Left', state: 'sorted' as NodeState, auxValue: 0 }],
      auxLabel: 'FRESH ORANGES LEFT',
      inputString: serialize(),
      currentInputIndex: 0,
    });
    return steps;
  }

  const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const seen = new Set<string>();
  let minutes = 0;

  while (queue.length > 0 && freshCount > 0) {
    const batchSize = queue.length;
    minutes++;

    for (let b = 0; b < batchSize; b++) {
      const [r, c] = queue.shift()!;
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        const key = `${nr},${nc}`;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && g[nr][nc] === 1 && !seen.has(key)) {
          seen.add(key);
          g[nr][nc] = 2;
          freshCount--;
          queue.push([nr, nc]);
        }
      }
    }

    steps.push({
      stepIndex: steps.length,
      description: `Minute ${minutes}: Rotted ${batchSize} source(s). ${freshCount} fresh left.`,
      codeLine: 5,
      elements: queue.map(([r, c], i) => ({ id: `bfs-${i}`, value: `R${r}C${c}`, state: 'pushed' as NodeState })),
      auxElements: [{ id: 'fc-0', value: 'Fresh Left', state: 'active' as NodeState, auxValue: freshCount }],
      auxLabel: 'FRESH ORANGES LEFT',
      inputString: serialize(),
      currentInputIndex: minutes,
    });
  }

  if (freshCount > 0) {
    steps.push({
      stepIndex: steps.length,
      description: `Impossible: ${freshCount} fresh remain isolated. Answer = -1.`,
      codeLine: 10,
      elements: [],
      auxElements: [{ id: 'fc-0', value: 'Fresh Left', state: 'error' as NodeState, auxValue: freshCount }],
      auxLabel: 'FRESH ORANGES LEFT',
      inputString: serialize(),
      currentInputIndex: minutes,
    });
  } else {
    steps.push({
      stepIndex: steps.length,
      description: `All rotten. Minimum time = ${minutes} minutes.`,
      codeLine: 10,
      elements: [],
      auxElements: [{ id: 'fc-0', value: 'Fresh Left', state: 'sorted' as NodeState, auxValue: 0 }],
      auxLabel: 'FRESH ORANGES LEFT',
      inputString: serialize(),
      currentInputIndex: minutes,
    });
  }

  return steps;
}

// ─── DOTA2 SENATE (LEETCODE #649) ENGINE ────────────────────────

export function generateDota2SenateSteps(senate: string): StackQueueStep[] {
  const steps: StackQueueStep[] = [];
  const cleaned = senate.toUpperCase().replace(/[^RD]/g, '');
  const rQ: number[] = [];
  const dQ: number[] = [];
  const n = cleaned.length;

  for (let i = 0; i < n; i++) {
    if (cleaned[i] === 'R') rQ.push(i);
    else dQ.push(i);
  }

  steps.push({
    stepIndex: 0,
    description: `Dota2 Senate: "${cleaned}". ${rQ.length} Radiant, ${dQ.length} Dire. Two-queue simulation.`,
    codeLine: 1,
    elements: rQ.map((idx, i) => ({ id: `r-${i}`, value: `R@${idx}`, state: 'default' as NodeState })),
    auxElements: dQ.map((idx, i) => ({ id: `d-${i}`, value: `D@${idx}`, state: 'default' as NodeState })),
    auxLabel: 'DIRE QUEUE',
    inputString: cleaned,
    currentInputIndex: 0,
  });

  let round = 0;
  while (rQ.length > 0 && dQ.length > 0) {
    round++;
    const rIdx = rQ.shift()!;
    const dIdx = dQ.shift()!;

    if (rIdx < dIdx) {
      rQ.push(rIdx + n);
      steps.push({
        stepIndex: steps.length,
        description: `Round ${round}: R@${rIdx} (earlier) bans D@${dIdx}. R re-enqueues at ${rIdx}+${n}=${rIdx + n}.`,
        codeLine: 4,
        elements: rQ.map((idx, i) => ({ id: `r-${i}`, value: `R@${idx}`, state: i === rQ.length - 1 ? 'pushed' as NodeState : 'default' as NodeState })),
        auxElements: dQ.map((idx, i) => ({ id: `d-${i}`, value: `D@${idx}`, state: 'default' as NodeState })),
        auxLabel: 'DIRE QUEUE',
        inputString: cleaned,
        currentInputIndex: round,
      });
    } else {
      dQ.push(dIdx + n);
      steps.push({
        stepIndex: steps.length,
        description: `Round ${round}: D@${dIdx} (earlier) bans R@${rIdx}. D re-enqueues at ${dIdx}+${n}=${dIdx + n}.`,
        codeLine: 6,
        elements: rQ.map((idx, i) => ({ id: `r-${i}`, value: `R@${idx}`, state: 'default' as NodeState })),
        auxElements: dQ.map((idx, i) => ({ id: `d-${i}`, value: `D@${idx}`, state: i === dQ.length - 1 ? 'pushed' as NodeState : 'default' as NodeState })),
        auxLabel: 'DIRE QUEUE',
        inputString: cleaned,
        currentInputIndex: round,
      });
    }

    if (rQ.length === 0 || dQ.length === 0) break;
  }

  const winner = rQ.length > 0 ? 'Radiant' : 'Dire';
  steps.push({
    stepIndex: steps.length,
    description: `${winner} wins! ${rQ.length > 0 ? `Dire queue empty — ${rQ.length} Radiant senator(s) remain.` : `Radiant queue empty — ${dQ.length} Dire senator(s) remain.`}`,
    codeLine: 8,
    elements: rQ.map((idx, i) => ({ id: `r-${i}`, value: `R@${idx}`, state: rQ.length > 0 ? 'sorted' as NodeState : 'default' as NodeState })),
    auxElements: dQ.map((idx, i) => ({ id: `d-${i}`, value: `D@${idx}`, state: dQ.length > 0 ? 'sorted' as NodeState : 'default' as NodeState })),
    auxLabel: 'DIRE QUEUE',
    inputString: cleaned,
    currentInputIndex: round,
  });

  return steps;
}
