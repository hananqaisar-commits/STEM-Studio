export type StackQueueCategory =
  | 'stack'
  | 'queue'
  | 'circularQueue'
  | 'monotonicStack'
  | 'validParentheses'
  | 'minStack'
  | 'postfixEval'
  | 'queueViaStacks'
  | 'dailyTemperatures'
  | 'slidingWindow';

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
        description: `✅ Expression "${expr}" is VALID! Stack is empty after processing.`,
        codeLine: 8,
        elements: [],
        inputString: expr,
        currentInputIndex: expr.length,
      });
    } else {
      steps.push({
        stepIndex: steps.length,
        description: `❌ Expression "${expr}" is INVALID! Stack still contains unclosed brackets.`,
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
    description: `✅ Postfix Evaluation Complete! Final Answer = ${finalResult}`,
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
    description: `✅ Daily Temperatures Complete! Final Waiting Days Array: [${answer.join(', ')}]`,
    codeLine: 10,
    elements: stack.map((idx) => ({ id: `st-${idx}`, value: `${temperatures[idx]}° (i=${idx})`, state: 'sorted' })),
    auxElements: answer.map((val, idx) => ({ id: `ans-${idx}`, value: val, state: 'sorted' })),
    auxLabel: 'WAITING DAYS RESULT ARRAY',
    currentInputIndex: n,
  });

  return steps;
}


