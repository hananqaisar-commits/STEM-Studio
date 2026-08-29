/** Shared GSAP motion vocabulary. Renderers call semantic presets only. */
import { gsap } from 'gsap';

export const DURATION = { instant: 0.15, fast: 0.25, normal: 0.4, slow: 0.6 };
export const EASE = { snap: 'back.out(2.2)', settle: 'power2.out', sharp: 'power2.in', bounce: 'bounce.out', smooth: 'power1.inOut' };
type Target = gsap.TweenTarget;
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const run = (target: Target, vars: gsap.TweenVars) => reduced() ? gsap.set(target, vars) : gsap.to(target, vars);

export function dropSettle(el: Target) { return gsap.fromTo(el, { y: -60, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: DURATION.normal, ease: EASE.bounce, onComplete: () => run(el, { scaleX: 1.06, scaleY: 0.92, duration: 0.09, yoyo: true, repeat: 1 }) }); }
export function popIn(el: Target) { return gsap.fromTo(el, { scale: 0, opacity: 0, rotate: -8 }, { scale: 1, opacity: 1, rotate: 0, duration: DURATION.normal, ease: EASE.snap }); }
export function slideInQueue(el: Target, fromX = 80) { return gsap.fromTo(el, { x: fromX, opacity: 0 }, { x: 0, opacity: 1, duration: DURATION.normal, ease: 'power3.out' }); }
export function slideOutQueue(el: Target, onComplete?: () => void) { return run(el, { x: -80, opacity: 0, duration: DURATION.fast + 0.1, ease: EASE.sharp, onComplete }); }
export function fadeGrow(el: Target) { return gsap.fromTo(el, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: DURATION.fast, ease: EASE.settle }); }
export function flyAway(el: Target, onComplete?: () => void) { return run(el, { y: -100, x: 30, rotate: 12, opacity: 0, duration: DURATION.fast + 0.1, ease: EASE.sharp, onComplete }); }
export function collapseRemove(el: Target, siblingsAfter?: Target, shiftBy = 64) { const tl = gsap.timeline(); tl.to(el, { scale: 0.4, opacity: 0, duration: DURATION.fast, ease: EASE.sharp }); if (siblingsAfter) tl.to(siblingsAfter, { x: `-=${shiftBy}`, duration: DURATION.normal, ease: EASE.settle }, '-=0.1'); return tl; }
export function pulseCompare(a: Target, b?: Target) { return run(b ? [a, b] : a, { scale: 1.12, duration: 0.18, yoyo: true, repeat: 1, ease: EASE.smooth }); }
export function flashState(el: Target, color = '59,130,246') { return gsap.fromTo(el, { boxShadow: `0 0 0 rgba(${color},0)` }, { boxShadow: `0 0 18px rgba(${color},.8)`, duration: 0.2, yoyo: true, repeat: 1 }); }
export function shakeReject(el: Target) { return run(el, { x: 8, duration: 0.06, repeat: 5, yoyo: true, ease: EASE.smooth, onComplete: () => gsap.set(el, { x: 0 }) }); }
export function liftShiftDrop(el: Target, targetX: number) { return gsap.timeline().to(el, { y: -20, duration: .15, ease: EASE.settle }).to(el, { x: targetX, duration: .28, ease: EASE.smooth }, '-=.02').to(el, { y: 0, duration: .15, ease: EASE.sharp }); }
export function prepEdgeForTraverse(el: SVGGeometryElement) { const length = el.getTotalLength(); gsap.set(el, { strokeDasharray: length, strokeDashoffset: length }); return length; }
export function edgeTraverse(el: SVGGeometryElement | null, length: number, reverse = false) { return el ? gsap.fromTo(el, { strokeDashoffset: reverse ? 0 : length }, { strokeDashoffset: reverse ? length : 0, duration: DURATION.slow, ease: EASE.smooth }) : undefined; }
export function rotateFlip(el: Target, direction: 'left' | 'right' = 'right') { return gsap.timeline().to(el, { rotate: direction === 'right' ? 15 : -15, duration: .15 }).to(el, { rotate: 0, duration: .25, ease: 'elastic.out(1,.6)' }); }
export function curveDraw(el: SVGGeometryElement | null, delay = 0) { if (!el) return; const length = prepEdgeForTraverse(el); return run(el, { strokeDashoffset: 0, duration: 1, delay, ease: EASE.smooth }); }
export function counterTick(target: { value: number }, to: number, onUpdate: (value: number) => void, duration = DURATION.normal) { return run(target, { value: to, duration, ease: EASE.smooth, onUpdate: () => onUpdate(Math.round(target.value)) }); }
export function windowSlide(el: Target, values: { x?: number; width?: number }, duration = DURATION.normal) { return run(el, { ...values, duration, ease: EASE.smooth }); }
export function pointerConverge(a: Target, b: Target, { xA, xB }: { xA: number; xB: number }, onMeet?: () => void) { return gsap.timeline().to(a, { x: xA, duration: DURATION.normal, ease: EASE.smooth }, 0).to(b, { x: xB, duration: DURATION.normal, ease: EASE.smooth }, 0).call(() => onMeet?.()); }
export function gridFillWave(cells: Element[], { stagger = .05, color = '59,130,246', onCellFilled }: { stagger?: number; color?: string; onCellFilled?: (cell: Element, index: number) => void } = {}) { const tl = gsap.timeline(); cells.forEach((cell, i) => tl.fromTo(cell, { backgroundColor: `rgba(${color},0)`, scale: .85 }, { backgroundColor: `rgba(${color},.35)`, scale: 1, duration: .25, ease: EASE.settle, onStart: () => onCellFilled?.(cell, i) }, i * stagger)); return tl; }
export function treePruneCollapse(nodes: Target) { return run(nodes, { scale: 0, opacity: 0, duration: DURATION.fast, stagger: .06, ease: EASE.sharp }); }
export function branchExpand(nodes: Target) { return gsap.fromTo(nodes, { scale: 0, opacity: 0, y: -10 }, { scale: 1, opacity: 1, y: 0, duration: DURATION.fast, stagger: .08, ease: EASE.snap }); }
export function bucketDistribute(el: Target, targetX: number, targetY: number, delay = 0) { return gsap.timeline({ delay }).to(el, { y: '-=40', duration: .15 }).to(el, { x: targetX, duration: .3, ease: EASE.smooth }, '-=.05').to(el, { y: targetY, duration: .2, ease: EASE.sharp }); }
export function trieDescend(nodes: Element[], stagger = .15) { const tl = gsap.timeline(); nodes.forEach((node, i) => tl.fromTo(node, { scale: .7, opacity: .4 }, { scale: 1, opacity: 1, duration: .2, ease: 'back.out(1.8)' }, i * stagger).to(node, { boxShadow: '0 0 12px rgba(37,99,235,.7)', duration: .15, yoyo: true, repeat: 1 }, '-=.05')); return tl; }

export const MotionPresets = { dropSettle, popIn, slideInQueue, slideOutQueue, fadeGrow, flyAway, collapseRemove, pulseCompare, flashState, shakeReject, liftShiftDrop, prepEdgeForTraverse, edgeTraverse, rotateFlip, curveDraw, counterTick, windowSlide, pointerConverge, gridFillWave, treePruneCollapse, branchExpand, bucketDistribute, trieDescend, stackPush: dropSettle, stackPop: flyAway, peekPulse: (el: Target) => flashState(el), queueEnqueue: slideInQueue, queueDequeue: slideOutQueue, nodeEntrance: popIn, nodePulse: (el: Target) => pulseCompare(el), barSwap: (a: Target, b: Target, x: number) => { liftShiftDrop(a, x); return liftShiftDrop(b, -x); }, barLiftAndShift: liftShiftDrop };
export const presets = MotionPresets;
