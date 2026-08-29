/**
 * ═══════════════════════════════════════════════════════════════════
 *  STEM STUDIO NATIVE MOTION & ANIMATION ENGINE (WAAPI + PHYSICS)
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Architecture: Semantic Step -> Presets -> Web Animations API (WAAPI)
 *  Provides gold-standard hardware-accelerated animations across all 144 algorithms:
 *   • Stack: Drop-in bounce push, rotation-lift pop, peek pulse
 *   • Queue: Directional slide enqueue & exit dequeue
 *   • Linked List: Node materialization, connector drawing & pointer shifts
 *   • Sorting: Physical bar lifts, horizontal swaps, comparison pulses
 *   • Trees & Graphs: Overshoot node entrances, edge pulse glows, path highlights
 * ───────────────────────────────────────────────────────────────────
 */

export const MotionPresets = {
  /** STACK PUSH: Drop-in from top with elastic bounce and squash/stretch settle */
  stackPush(element: HTMLElement | null, onComplete?: () => void) {
    if (!element) return;
    
    element.animate(
      [
        { transform: 'translateY(-180px) scaleX(0.9) scaleY(1.1)', opacity: 0 },
        { transform: 'translateY(0) scaleX(1) scaleY(1)', opacity: 1, offset: 0.65 },
        { transform: 'translateY(0) scaleX(1.08) scaleY(0.88)', opacity: 1, offset: 0.82 },
        { transform: 'translateY(0) scaleX(1) scaleY(1)', opacity: 1, offset: 1.0 },
      ],
      {
        duration: 550,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Elastic spring bounce
        fill: 'forwards',
      }
    ).onfinish = () => onComplete?.();
  },

  /** STACK POP: Upward lift + diagonal arc + rotation + fade out */
  stackPop(element: HTMLElement | null, onComplete?: () => void) {
    if (!element) return;

    element.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
        { transform: 'translate(36px, -140px) rotate(14deg) scale(0.85)', opacity: 0 },
      ],
      {
        duration: 450,
        easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
        fill: 'forwards',
      }
    ).onfinish = () => onComplete?.();
  },

  /** STACK / QUEUE PEEK: Subtle pulse and glow highlight */
  peekPulse(element: HTMLElement | null) {
    if (!element) return;

    element.animate(
      [
        { transform: 'scale(1)', boxShadow: '0 4px 14px rgba(147, 51, 234, 0.2)' },
        { transform: 'scale(1.15)', boxShadow: '0 0 24px rgba(168, 85, 247, 0.6)', offset: 0.5 },
        { transform: 'scale(1)', boxShadow: '0 4px 14px rgba(147, 51, 234, 0.2)' },
      ],
      {
        duration: 440,
        easing: 'ease-in-out',
      }
    );
  },

  /** QUEUE ENQUEUE: Directional spring slide-in from right */
  queueEnqueue(element: HTMLElement | null, onComplete?: () => void) {
    if (!element) return;

    element.animate(
      [
        { transform: 'translateX(180px) scale(0.8)', opacity: 0 },
        { transform: 'translateX(0) scale(1)', opacity: 1 },
      ],
      {
        duration: 500,
        easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        fill: 'forwards',
      }
    ).onfinish = () => onComplete?.();
  },

  /** QUEUE DEQUEUE: Directional exit slide-out to left with fade */
  queueDequeue(element: HTMLElement | null, onComplete?: () => void) {
    if (!element) return;

    element.animate(
      [
        { transform: 'translateX(0) scale(1)', opacity: 1 },
        { transform: 'translateX(-180px) scale(0.75)', opacity: 0 },
      ],
      {
        duration: 400,
        easing: 'ease-in',
        fill: 'forwards',
      }
    ).onfinish = () => onComplete?.();
  },

  /** TREE / GRAPH / LINKED LIST NODE ENTRANCE: Scale 0 -> Overshoot -> Settle */
  nodeEntrance(element: HTMLElement | SVGElement | null, onComplete?: () => void) {
    if (!element) return;

    element.animate(
      [
        { transform: 'scale(0)', opacity: 0 },
        { transform: 'scale(1.12)', opacity: 1, offset: 0.7 },
        { transform: 'scale(1)', opacity: 1, offset: 1.0 },
      ],
      {
        duration: 450,
        easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        fill: 'forwards',
      }
    ).onfinish = () => onComplete?.();
  },

  /** NODE / CELL PULSE: Highlight comparison or current traversal step */
  nodePulse(element: HTMLElement | SVGElement | null) {
    if (!element) return;

    element.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.2)', offset: 0.5 },
        { transform: 'scale(1)' },
      ],
      {
        duration: 380,
        easing: 'ease-in-out',
      }
    );
  },

  /** SORTING BAR SWAP: Physical horizontal swap animation */
  barSwap(elementA: HTMLElement | null, elementB: HTMLElement | null, distanceX: number, onComplete?: () => void) {
    if (!elementA || !elementB) return;

    elementA.animate(
      [
        { transform: 'translateX(0)' },
        { transform: `translateX(${distanceX}px)` },
      ],
      { duration: 350, easing: 'ease-in-out', fill: 'forwards' }
    );

    elementB.animate(
      [
        { transform: 'translateX(0)' },
        { transform: `translateX(${-distanceX}px)` },
      ],
      { duration: 350, easing: 'ease-in-out', fill: 'forwards' }
    ).onfinish = () => onComplete?.();
  },
};
