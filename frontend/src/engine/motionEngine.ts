/**
 * ═══════════════════════════════════════════════════════════════════
 *  STEM STUDIO — COMPLETE MOTION PRESET SYSTEM (21 PRIMITIVES + ALIASES)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Provides all 21 master animation primitives covering 104 syllabus topics:
 *  1. dropSettle            12. rotateFlip
 *  2. popIn                 13. curveDraw (Complexity graphs)
 *  3. slideInQueue/Out      14. counterTick (Live number counters)
 *  4. fadeGrow              15. windowSlide (Sliding window rect)
 *  5. flyAway               16. pointerConverge (Two pointers / BS)
 *  6. collapseRemove        17. gridFillWave (DP table waves)
 *  7. pulseCompare          18. treePruneCollapse (Backtracking prune)
 *  8. flashState            19. branchExpand (Subtree expansion)
 *  9. shakeReject           20. bucketDistribute (Bucket/Radix sort)
 *  10. liftShiftDrop        21. trieDescend (Trie char traversal)
 *  11. edgeTraverse
 * ───────────────────────────────────────────────────────────────────
 */

export const DURATION = {
  instant: 0.15,
  fast: 0.25,
  normal: 0.4,
  slow: 0.6,
};

export const EASE = {
  snap: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  settle: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  sharp: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
};

type TargetElement = HTMLElement | SVGElement | null;

// ---------------------------------------------------------------------------
// A. ENTRANCE
// ---------------------------------------------------------------------------

/** 1. Stack push / gravity-based drop: bounce settle + squash/stretch. */
export function dropSettle(el: TargetElement, onComplete?: () => void) {
  if (!el) return;
  const animation = el.animate(
    [
      { transform: 'translateY(-60px) scale(0.9)', opacity: 0 },
      { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.65 },
      { transform: 'translateY(0) scaleX(1.06) scaleY(0.92)', opacity: 1, offset: 0.85 },
      { transform: 'translateY(0) scale(1)', opacity: 1, offset: 1.0 },
    ],
    {
      duration: DURATION.normal * 1000,
      easing: EASE.bounce,
      fill: 'forwards',
    }
  );
  if (onComplete) animation.onfinish = onComplete;
  return animation;
}

/** 2. Tree/graph node materializing: scale+rotate overshoot. */
export function popIn(el: TargetElement, onComplete?: () => void) {
  if (!el) return;
  const animation = el.animate(
    [
      { transform: 'scale(0) rotate(-8deg)', opacity: 0 },
      { transform: 'scale(1.12) rotate(2deg)', opacity: 1, offset: 0.7 },
      { transform: 'scale(1) rotate(0deg)', opacity: 1, offset: 1.0 },
    ],
    {
      duration: DURATION.normal * 1000,
      easing: EASE.snap,
      fill: 'forwards',
    }
  );
  if (onComplete) animation.onfinish = onComplete;
  return animation;
}

/** 3a. Queue enqueue: directional slide from the rear. */
export function slideInQueue(el: TargetElement, fromX = 80, onComplete?: () => void) {
  if (!el) return;
  const animation = el.animate(
    [
      { transform: `translateX(${fromX}px)`, opacity: 0 },
      { transform: 'translateX(0)', opacity: 1 },
    ],
    {
      duration: DURATION.normal * 1000,
      easing: EASE.settle,
      fill: 'forwards',
    }
  );
  if (onComplete) animation.onfinish = onComplete;
  return animation;
}

/** 3b. Queue dequeue: directional slide out the front. */
export function slideOutQueue(el: TargetElement, onComplete?: () => void) {
  if (!el) return;
  const animation = el.animate(
    [
      { transform: 'translateX(0)', opacity: 1 },
      { transform: 'translateX(-80px)', opacity: 0 },
    ],
    {
      duration: (DURATION.fast + 0.1) * 1000,
      easing: EASE.sharp,
      fill: 'forwards',
    }
  );
  if (onComplete) animation.onfinish = onComplete;
  return animation;
}

/** 4. Neutral low-weight appearance. */
export function fadeGrow(el: TargetElement, onComplete?: () => void) {
  if (!el) return;
  const animation = el.animate(
    [
      { opacity: 0, transform: 'scale(0.85)' },
      { opacity: 1, transform: 'scale(1)' },
    ],
    {
      duration: DURATION.fast * 1000,
      easing: EASE.settle,
      fill: 'forwards',
    }
  );
  if (onComplete) animation.onfinish = onComplete;
  return animation;
}

// ---------------------------------------------------------------------------
// B. EXIT
// ---------------------------------------------------------------------------

/** 5. Stack pop / discard: lift, drift, rotate, fade. */
export function flyAway(el: TargetElement, onComplete?: () => void) {
  if (!el) return;
  const animation = el.animate(
    [
      { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
      { transform: 'translate(30px, -100px) rotate(12deg) scale(0.85)', opacity: 0 },
    ],
    {
      duration: (DURATION.fast + 0.1) * 1000,
      easing: EASE.sharp,
      fill: 'forwards',
    }
  );
  if (onComplete) animation.onfinish = onComplete;
  return animation;
}

/** 6. Structural deletion: element shrinks away. */
export function collapseRemove(el: TargetElement, onComplete?: () => void) {
  if (!el) return;
  const animation = el.animate(
    [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.4)', opacity: 0 },
    ],
    {
      duration: DURATION.fast * 1000,
      easing: EASE.sharp,
      fill: 'forwards',
    }
  );
  if (onComplete) animation.onfinish = onComplete;
  return animation;
}

// ---------------------------------------------------------------------------
// C. EMPHASIS & STATE FEEDBACK
// ---------------------------------------------------------------------------

/** 7. Two elements being compared: brief synchronized scale pulse. */
export function pulseCompare(elA: TargetElement, elB?: TargetElement) {
  [elA, elB].forEach((el) => {
    if (!el) return;
    el.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.12)', offset: 0.5 },
        { transform: 'scale(1)' },
      ],
      {
        duration: 360,
        easing: EASE.smooth,
      }
    );
  });
}

/** 8. Glow pulse without geometry change. */
export function flashState(el: TargetElement, color = '59,130,246') {
  if (!el) return;
  return el.animate(
    [
      { boxShadow: `0 0 0px rgba(${color},0)` },
      { boxShadow: `0 0 18px rgba(${color},0.8)`, offset: 0.5 },
      { boxShadow: `0 0 0px rgba(${color},0)` },
    ],
    {
      duration: 400,
      easing: EASE.smooth,
    }
  );
}

/** 9. Invalid operation feedback: horizontal jitter. */
export function shakeReject(el: TargetElement) {
  if (!el) return;
  return el.animate(
    [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-8px)', offset: 0.2 },
      { transform: 'translateX(8px)', offset: 0.4 },
      { transform: 'translateX(-6px)', offset: 0.6 },
      { transform: 'translateX(6px)', offset: 0.8 },
      { transform: 'translateX(0)' },
    ],
    {
      duration: 350,
      easing: EASE.smooth,
    }
  );
}

// ---------------------------------------------------------------------------
// D. MOVEMENT & PATHS
// ---------------------------------------------------------------------------

/** 10. Physical relocation: lift up, travel horizontally, settle down. */
export function liftShiftDrop(el: TargetElement, targetX: number, onComplete?: () => void) {
  if (!el) return;
  const animation = el.animate(
    [
      { transform: 'translate(0, 0)', offset: 0 },
      { transform: `translate(0, -20px)`, offset: 0.3 },
      { transform: `translate(${targetX}px, -20px)`, offset: 0.7 },
      { transform: `translate(${targetX}px, 0)`, offset: 1.0 },
    ],
    {
      duration: 580,
      easing: EASE.smooth,
      fill: 'forwards',
    }
  );
  if (onComplete) animation.onfinish = onComplete;
  return animation;
}

/** 11a. Prepare SVG edge element for stroke-dashoffset reveal. */
export function prepEdgeForTraverse(el: SVGGeometryElement) {
  if (!el) return 200;
  const length = el.getTotalLength ? el.getTotalLength() : 200;
  el.style.strokeDasharray = `${length}`;
  el.style.strokeDashoffset = `${length}`;
  return length;
}

/** 11b. Edge/pointer lighting up along a path. */
export function edgeTraverse(el: SVGGeometryElement | null, length: number, reverse = false) {
  if (!el) return;
  return el.animate(
    [
      { strokeDashoffset: reverse ? 0 : length },
      { strokeDashoffset: reverse ? length : 0 },
    ],
    {
      duration: DURATION.slow * 1000,
      easing: EASE.smooth,
      fill: 'forwards',
    }
  );
}

/** 12. AVL/Red-Black rebalancing: rotate container. */
export function rotateFlip(el: TargetElement, direction: 'left' | 'right' = 'right') {
  if (!el) return;
  const deg = direction === 'right' ? 15 : -15;
  return el.animate(
    [
      { transform: 'rotate(0deg)' },
      { transform: `rotate(${deg}deg)`, offset: 0.4 },
      { transform: 'rotate(0deg)', offset: 1.0 },
    ],
    {
      duration: 400,
      easing: EASE.settle,
    }
  );
}

// ---------------------------------------------------------------------------
// E. NEW SYLLABUS PRIMITIVES (13 – 21)
// ---------------------------------------------------------------------------

/** 13. Complexity graphs: progressive left-to-right curve reveal. */
export function curveDraw(el: SVGGeometryElement | null, delayMs = 0) {
  if (!el) return;
  const length = el.getTotalLength ? el.getTotalLength() : 300;
  el.style.strokeDasharray = `${length}`;
  el.style.strokeDashoffset = `${length}`;

  return el.animate(
    [
      { strokeDashoffset: length },
      { strokeDashoffset: 0 },
    ],
    {
      duration: (DURATION.slow + 0.4) * 1000,
      delay: delayMs,
      easing: EASE.smooth,
      fill: 'forwards',
    }
  );
}

/** 14. Live number roll-up — Big-O counters & running totals. */
export function counterTick(
  targetObj: { value: number },
  toValue: number,
  onUpdate: (val: number) => void,
  durationMs = 400
) {
  const startVal = targetObj.value;
  const startTime = performance.now();

  function step(now: number) {
    const elapsed = Math.min(1, (now - startTime) / durationMs);
    const current = Math.round(startVal + (toValue - startVal) * elapsed);
    targetObj.value = current;
    onUpdate(current);
    if (elapsed < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/** 15. Sliding window: translucent overlay rect moves/resizes. */
export function windowSlide(
  el: TargetElement,
  { x, width }: { x?: number; width?: number },
  durationMs = 400
) {
  if (!el) return;
  const targetFrame: Keyframe = {};
  if (x !== undefined) targetFrame.transform = `translateX(${x}px)`;
  if (width !== undefined) targetFrame.width = `${width}px`;

  return el.animate([{}, targetFrame], {
    duration: durationMs,
    easing: EASE.smooth,
    fill: 'forwards',
  });
}

/** 16. Two-pointer / binary search narrowing: markers move toward each other. */
export function pointerConverge(
  markerA: TargetElement,
  markerB: TargetElement,
  { xA, xB }: { xA: number; xB: number },
  onMeet?: () => void
) {
  if (markerA) {
    markerA.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(${xA}px)` }],
      { duration: DURATION.normal * 1000, easing: EASE.smooth, fill: 'forwards' }
    );
  }
  if (markerB) {
    const anim = markerB.animate(
      [{ transform: 'translateX(0)' }, { transform: `translateX(${xB}px)` }],
      { duration: DURATION.normal * 1000, easing: EASE.smooth, fill: 'forwards' }
    );
    if (onMeet) anim.onfinish = onMeet;
  }
}

/** 17. DP tables: cells fill in dependency order with staggered wave. */
export function gridFillWave(
  cells: HTMLElement[],
  {
    staggerMs = 50,
    color = '168,85,247',
    onCellFilled,
  }: { staggerMs?: number; color?: string; onCellFilled?: (cell: HTMLElement, idx: number) => void } = {}
) {
  cells.forEach((cell, i) => {
    if (!cell) return;
    setTimeout(() => {
      onCellFilled?.(cell, i);
      cell.animate(
        [
          { backgroundColor: `rgba(${color},0)`, transform: 'scale(0.85)' },
          { backgroundColor: `rgba(${color},0.35)`, transform: 'scale(1)' },
        ],
        {
          duration: 250,
          easing: EASE.settle,
          fill: 'forwards',
        }
      );
    }, i * staggerMs);
  });
}

/** 18. Backtracking dead-end: subtree collapses leaf-to-root. */
export function treePruneCollapse(nodes: HTMLElement[], staggerMs = 60) {
  nodes.forEach((node, i) => {
    if (!node) return;
    setTimeout(() => {
      node.animate(
        [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(0)', opacity: 0 },
        ],
        {
          duration: DURATION.fast * 1000,
          easing: EASE.sharp,
          fill: 'forwards',
        }
      );
    }, i * staggerMs);
  });
}

/** 19. Recursion/backtracking expansion: new subtree pops in with staggered children. */
export function branchExpand(childNodes: HTMLElement[], staggerMs = 80) {
  childNodes.forEach((node, i) => {
    if (!node) return;
    setTimeout(() => {
      node.animate(
        [
          { transform: 'scale(0) translateY(-10px)', opacity: 0 },
          { transform: 'scale(1) translateY(0)', opacity: 1 },
        ],
        {
          duration: DURATION.fast * 1000,
          easing: EASE.snap,
          fill: 'forwards',
        }
      );
    }, i * staggerMs);
  });
}

/** 20. Counting/Radix/Bucket sort: element arcs into a bucket slot. */
export function bucketDistribute(
  el: TargetElement,
  targetX: number,
  targetY: number,
  delayMs = 0
) {
  if (!el) return;
  return el.animate(
    [
      { transform: 'translate(0, 0)' },
      { transform: `translate(${targetX * 0.5}px, -40px)`, offset: 0.3 },
      { transform: `translate(${targetX}px, ${targetY}px)`, offset: 1.0 },
    ],
    {
      duration: 650,
      delay: delayMs,
      easing: EASE.smooth,
      fill: 'forwards',
    }
  );
}

/** 21. Trie descent: path nodes light up sequentially character-by-character. */
export function trieDescend(nodeRefs: HTMLElement[], staggerMs = 150) {
  nodeRefs.forEach((node, i) => {
    if (!node) return;
    setTimeout(() => {
      node.animate(
        [
          { transform: 'scale(0.7)', opacity: 0.4 },
          { transform: 'scale(1.1)', opacity: 1, offset: 0.7 },
          { transform: 'scale(1)', opacity: 1, offset: 1.0 },
        ],
        {
          duration: 220,
          easing: EASE.snap,
          fill: 'forwards',
        }
      );
    }, i * staggerMs);
  });
}

// ---------------------------------------------------------------------------
// Semantic Alias Helpers (Backward Compatibility Across All Renderers)
// ---------------------------------------------------------------------------
export const stackPush = dropSettle;
export const stackPop = flyAway;
export const peekPulse = (el: TargetElement) => flashState(el, '168,85,247');
export const queueEnqueue = slideInQueue;
export const queueDequeue = slideOutQueue;
export const nodeEntrance = popIn;
export const nodePulse = (el: TargetElement) => pulseCompare(el);
export const barSwap = (elA: TargetElement, elB: TargetElement, distanceX: number, onComplete?: () => void) => {
  if (!elA || !elB) return;
  liftShiftDrop(elA, distanceX);
  return liftShiftDrop(elB, -distanceX, onComplete);
};
export const barLiftAndShift = liftShiftDrop;

// ---------------------------------------------------------------------------
// Master Presets Object Export
// ---------------------------------------------------------------------------
export const presets = {
  dropSettle,
  popIn,
  slideInQueue,
  slideOutQueue,
  fadeGrow,
  flyAway,
  collapseRemove,
  pulseCompare,
  flashState,
  shakeReject,
  liftShiftDrop,
  prepEdgeForTraverse,
  edgeTraverse,
  rotateFlip,
  curveDraw,
  counterTick,
  windowSlide,
  pointerConverge,
  gridFillWave,
  treePruneCollapse,
  branchExpand,
  bucketDistribute,
  trieDescend,

  // Aliases
  stackPush,
  stackPop,
  peekPulse,
  queueEnqueue,
  queueDequeue,
  nodeEntrance,
  nodePulse,
  barSwap,
  barLiftAndShift,
};

export const MotionPresets = presets;
