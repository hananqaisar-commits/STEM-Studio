/** Shared GSAP motion vocabulary. Renderers call semantic presets only. */
import { gsap } from 'gsap';

export const DURATION = { instant: 0.15, fast: 0.25, normal: 0.4, slow: 0.6 };
export const EASE = {
  snap: 'power3.out',
  settle: 'power2.out',
  sharp: 'power2.in',
  bounce: 'power2.out',
  smooth: 'power1.inOut',
};

type Target = gsap.TweenTarget;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** Apply a preset's final state without interpolating when motion is reduced. */
const setFinal = (target: Target, values: gsap.TweenVars) => gsap.set(target, values);

const run = (target: Target, vars: gsap.TweenVars) =>
  prefersReducedMotion() ? setFinal(target, vars) : gsap.to(target, vars);

export function dropSettle(el: Target) {
  if (prefersReducedMotion()) return setFinal(el, { y: 0, opacity: 1, scale: 1, scaleX: 1, scaleY: 1 });
  return gsap.fromTo(
    el,
    { y: -18, opacity: 0, scale: 0.98 },
    { y: 0, opacity: 1, scale: 1, duration: DURATION.normal, ease: EASE.settle },
  );
}

export function popIn(el: Target) {
  if (prefersReducedMotion()) return setFinal(el, { scale: 1, opacity: 1, rotate: 0 });
  return gsap.fromTo(
    el,
    { scale: 0.94, opacity: 0 },
    { scale: 1, opacity: 1, duration: DURATION.fast, ease: EASE.settle },
  );
}

export function slideInQueue(el: Target, fromX = 80) {
  if (prefersReducedMotion()) return setFinal(el, { x: 0, opacity: 1 });
  return gsap.fromTo(el, { x: fromX, opacity: 0 }, { x: 0, opacity: 1, duration: DURATION.normal, ease: 'power3.out' });
}

export function slideOutQueue(el: Target, onComplete?: () => void) {
  return run(el, { x: -80, opacity: 0, duration: DURATION.fast + 0.1, ease: EASE.sharp, onComplete });
}

export function fadeGrow(el: Target) {
  if (prefersReducedMotion()) return setFinal(el, { opacity: 1, scale: 1 });
  return gsap.fromTo(el, { opacity: 0, scale: 0.97 }, { opacity: 1, scale: 1, duration: DURATION.fast, ease: EASE.settle });
}

export function flyAway(el: Target, onComplete?: () => void) {
  return run(el, { y: -100, x: 30, rotate: 12, opacity: 0, duration: DURATION.fast + 0.1, ease: EASE.sharp, onComplete });
}

export function collapseRemove(el: Target, siblingsAfter?: Target, shiftBy = 64) {
  if (prefersReducedMotion()) {
    const removal = setFinal(el, { scale: 0.96, opacity: 0 });
    if (siblingsAfter) setFinal(siblingsAfter, { x: `-=${shiftBy}` });
    return removal;
  }

  const tl = gsap.timeline();
  tl.to(el, { scale: 0.96, opacity: 0, duration: DURATION.fast, ease: EASE.sharp });
  if (siblingsAfter) tl.to(siblingsAfter, { x: `-=${shiftBy}`, duration: DURATION.normal, ease: EASE.settle }, '-=0.1');
  return tl;
}

export function pulseCompare(a: Target, b?: Target) {
  return run(b ? [a, b] : a, { scale: 1.04, duration: 0.16, yoyo: true, repeat: 1, ease: EASE.smooth });
}

export function flashState(el: Target, color = '59,130,246') {
  if (prefersReducedMotion()) return setFinal(el, { clearProps: 'boxShadow' });
  return gsap.fromTo(
    el,
    { boxShadow: `0 0 0 rgba(${color},0)` },
    { boxShadow: `0 0 12px rgba(${color},.55)`, duration: 0.16, yoyo: true, repeat: 1 },
  );
}

export function shakeReject(el: Target) {
  if (prefersReducedMotion()) return setFinal(el, { x: 0 });
  return gsap.to(el, { x: 8, duration: 0.06, repeat: 5, yoyo: true, ease: EASE.smooth, onComplete: () => gsap.set(el, { x: 0 }) });
}

export function liftShiftDrop(el: Target, targetX: number) {
  if (prefersReducedMotion()) return setFinal(el, { x: 0, y: 0 });
  const reset = () => gsap.set(el, { x: 0, y: 0 });
  return gsap.timeline({ onComplete: reset, onInterrupt: reset })
    .to(el, { y: -20, duration: 0.15, ease: EASE.settle })
    .to(el, { x: targetX, duration: 0.28, ease: EASE.smooth }, '-=.02')
    .to(el, { x: 0, y: 0, duration: 0.15, ease: EASE.sharp });
}

export function prepEdgeForTraverse(el: SVGGeometryElement) {
  const length = el.getTotalLength();
  gsap.set(el, { strokeDasharray: length, strokeDashoffset: length });
  return length;
}

export function edgeTraverse(el: SVGGeometryElement | null, length: number, reverse = false) {
  if (!el) return undefined;
  const finalOffset = reverse ? length : 0;
  if (prefersReducedMotion()) return setFinal(el, { strokeDashoffset: finalOffset });
  return gsap.fromTo(
    el,
    { strokeDashoffset: reverse ? 0 : length },
    { strokeDashoffset: finalOffset, duration: DURATION.slow, ease: EASE.smooth },
  );
}

export function rotateFlip(el: Target, direction: 'left' | 'right' = 'right') {
  if (prefersReducedMotion()) return setFinal(el, { rotate: 0 });
  return gsap.timeline()
    .to(el, { rotate: direction === 'right' ? 10 : -10, duration: 0.12, ease: EASE.settle })
    .to(el, { rotate: 0, duration: 0.18, ease: EASE.settle });
}

export function curveDraw(el: SVGGeometryElement | null, delay = 0) {
  if (!el) return undefined;
  prepEdgeForTraverse(el);
  return run(el, { strokeDashoffset: 0, duration: 1, delay, ease: EASE.smooth });
}

export function counterTick(target: { value: number }, to: number, onUpdate: (value: number) => void, duration = DURATION.normal) {
  return run(target, { value: to, duration, ease: EASE.smooth, onUpdate: () => onUpdate(Math.round(target.value)) });
}

export function windowSlide(el: Target, values: { x?: number; width?: number }, duration = DURATION.normal) {
  return run(el, { ...values, duration, ease: EASE.smooth });
}

export function pointerConverge(a: Target, b: Target, { xA, xB }: { xA: number; xB: number }, onMeet?: () => void) {
  if (prefersReducedMotion()) {
    setFinal(a, { x: xA });
    setFinal(b, { x: xB });
    onMeet?.();
    return gsap.timeline();
  }
  return gsap.timeline()
    .to(a, { x: xA, duration: DURATION.normal, ease: EASE.smooth }, 0)
    .to(b, { x: xB, duration: DURATION.normal, ease: EASE.smooth }, 0)
    .call(() => onMeet?.());
}

export function gridFillWave(
  cells: Element[],
  { stagger = 0.05, color = '59,130,246', onCellFilled }: { stagger?: number; color?: string; onCellFilled?: (cell: Element, index: number) => void } = {},
) {
  const tl = gsap.timeline();
  if (prefersReducedMotion()) {
    cells.forEach((cell, index) => {
      setFinal(cell, { backgroundColor: `rgba(${color},.35)`, scale: 1 });
      onCellFilled?.(cell, index);
    });
    return tl;
  }
  cells.forEach((cell, i) => tl.fromTo(
    cell,
    { backgroundColor: `rgba(${color},0)`, scale: 0.97 },
    { backgroundColor: `rgba(${color},.35)`, scale: 1, duration: 0.25, ease: EASE.settle, onStart: () => onCellFilled?.(cell, i) },
    i * stagger,
  ));
  return tl;
}

export function treePruneCollapse(nodes: Target) {
  return run(nodes, { scale: 0.96, opacity: 0, duration: DURATION.fast, stagger: 0.06, ease: EASE.sharp });
}

export function branchExpand(nodes: Target) {
  if (prefersReducedMotion()) return setFinal(nodes, { scale: 1, opacity: 1, y: 0 });
  return gsap.fromTo(nodes, { scale: 0.96, opacity: 0, y: -6 }, { scale: 1, opacity: 1, y: 0, duration: DURATION.fast, stagger: 0.06, ease: EASE.settle });
}

export function bucketDistribute(el: Target, targetX: number, targetY: number, delay = 0) {
  if (prefersReducedMotion()) return setFinal(el, { x: targetX, y: targetY });
  return gsap.timeline({ delay })
    .to(el, { y: '-=40', duration: 0.15, ease: EASE.settle })
    .to(el, { x: targetX, duration: 0.3, ease: EASE.smooth }, '-=.05')
    .to(el, { y: targetY, duration: 0.2, ease: EASE.sharp });
}

export function trieDescend(nodes: Element[], stagger = 0.15) {
  const tl = gsap.timeline();
  if (prefersReducedMotion()) {
    nodes.forEach((node) => setFinal(node, { scale: 1, opacity: 1, clearProps: 'boxShadow' }));
    return tl;
  }
  nodes.forEach((node, i) => tl
    .fromTo(node, { scale: 0.97, opacity: 0.7 }, { scale: 1, opacity: 1, duration: 0.2, ease: EASE.settle }, i * stagger)
    .to(node, { boxShadow: '0 0 10px rgba(37,99,235,.55)', duration: 0.14, yoyo: true, repeat: 1 }, '-=.05'));
  return tl;
}

export const MotionPresets = {
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
  stackPush: dropSettle,
  stackPop: flyAway,
  peekPulse: (el: Target) => flashState(el),
  queueEnqueue: slideInQueue,
  queueDequeue: slideOutQueue,
  nodeEntrance: popIn,
  nodePulse: (el: Target) => pulseCompare(el),
};

export const presets = MotionPresets;
