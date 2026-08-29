import gsap from 'gsap';

/**
 * ═══════════════════════════════════════════════════════════════════
 *  STEM STUDIO CENTRALIZED MOTION & ANIMATION ENGINE
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Architecture: Semantic Step -> Motion Preset -> GSAP Hardware Accelerated Animation
 *  Provides gold-standard animations across all 144 DSA algorithms:
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
    gsap.killTweensOf(element);
    
    const tl = gsap.timeline({ onComplete });
    tl.fromTo(
      element,
      { y: -180, opacity: 0, scaleX: 0.9, scaleY: 1.1 },
      { y: 0, opacity: 1, scaleX: 1, scaleY: 1, duration: 0.55, ease: 'bounce.out' }
    ).to(element, {
      scaleX: 1.08,
      scaleY: 0.88,
      duration: 0.12,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut',
    });
    return tl;
  },

  /** STACK POP: Upward lift + diagonal arc + rotation + fade out */
  stackPop(element: HTMLElement | null, onComplete?: () => void) {
    if (!element) return;
    gsap.killTweensOf(element);

    return gsap.to(element, {
      y: -140,
      x: 36,
      rotate: 14,
      opacity: 0,
      scale: 0.85,
      duration: 0.45,
      ease: 'power2.in',
      onComplete,
    });
  },

  /** STACK / QUEUE PEEK: Subtle pulse and glow highlight */
  peekPulse(element: HTMLElement | null) {
    if (!element) return;
    gsap.killTweensOf(element);

    return gsap.timeline()
      .to(element, { scale: 1.15, boxShadow: '0 0 24px rgba(168, 85, 247, 0.6)', duration: 0.22 })
      .to(element, { scale: 1.0, boxShadow: '0 4px 14px rgba(147, 51, 234, 0.2)', duration: 0.22 });
  },

  /** QUEUE ENQUEUE: Directional spring slide-in from right */
  queueEnqueue(element: HTMLElement | null, onComplete?: () => void) {
    if (!element) return;
    gsap.killTweensOf(element);

    return gsap.fromTo(
      element,
      { x: 180, opacity: 0, scale: 0.8 },
      { x: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.4)', onComplete }
    );
  },

  /** QUEUE DEQUEUE: Directional exit slide-out to left with fade */
  queueDequeue(element: HTMLElement | null, onComplete?: () => void) {
    if (!element) return;
    gsap.killTweensOf(element);

    return gsap.to(element, {
      x: -180,
      opacity: 0,
      scale: 0.75,
      duration: 0.4,
      ease: 'power2.in',
      onComplete,
    });
  },

  /** TREE / GRAPH / LINKED LIST NODE ENTRANCE: Scale 0 -> Overshoot -> Settle */
  nodeEntrance(element: HTMLElement | SVGElement | null, onComplete?: () => void) {
    if (!element) return;
    gsap.killTweensOf(element);

    return gsap.fromTo(
      element,
      { scale: 0, opacity: 0, transformOrigin: 'center center' },
      { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(1.7)', onComplete }
    );
  },

  /** NODE / CELL PULSE: Highlight comparison or current traversal step */
  nodePulse(element: HTMLElement | SVGElement | null) {
    if (!element) return;
    gsap.killTweensOf(element);

    return gsap.timeline()
      .to(element, { scale: 1.2, duration: 0.18, ease: 'power1.out' })
      .to(element, { scale: 1.0, duration: 0.2, ease: 'power1.in' });
  },

  /** SORTING BAR SWAP: Physical horizontal swap animation */
  barSwap(elementA: HTMLElement | null, elementB: HTMLElement | null, distanceX: number, onComplete?: () => void) {
    if (!elementA || !elementB) return;
    gsap.killTweensOf([elementA, elementB]);

    const tl = gsap.timeline({ onComplete });
    tl.to(elementA, { x: distanceX, duration: 0.35, ease: 'power2.inOut' }, 0)
      .to(elementB, { x: -distanceX, duration: 0.35, ease: 'power2.inOut' }, 0)
      .set([elementA, elementB], { x: 0 }); // reset inline offset after DOM reorder

    return tl;
  },

  /** SORTING INSERTION SHIFT: Lift -> Horizontal Shift -> Settle */
  barLiftAndShift(element: HTMLElement | null, deltaX: number, onComplete?: () => void) {
    if (!element) return;
    gsap.killTweensOf(element);

    const tl = gsap.timeline({ onComplete });
    tl.to(element, { y: -24, duration: 0.15, ease: 'power1.out' })
      .to(element, { x: deltaX, duration: 0.3, ease: 'power2.inOut' })
      .to(element, { y: 0, duration: 0.15, ease: 'power1.in' })
      .set(element, { x: 0, y: 0 });

    return tl;
  },

  /** CONNECTING EDGE DRAW: Animate SVG stroke line connection */
  drawEdge(edgeElement: SVGLineElement | SVGPathElement | null) {
    if (!edgeElement) return;
    const length = (edgeElement as SVGPathElement).getTotalLength ? (edgeElement as SVGPathElement).getTotalLength() : 200;
    
    gsap.killTweensOf(edgeElement);
    return gsap.fromTo(
      edgeElement,
      { strokeDasharray: length, strokeDashoffset: length },
      { strokeDashoffset: 0, duration: 0.45, ease: 'power2.out' }
    );
  },
};
