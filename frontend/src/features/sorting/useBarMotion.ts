import { useLayoutEffect, useRef } from 'react';

interface BarRect {
  left: number;
  top: number;
}

/**
 * Gives bars stable identities across value swaps and FLIP animates their
 * actual rendered position. Each transition starts from the prior slot and
 * finishes at the exact slot React laid out; no accumulated pixel offsets.
 */
export function useBarMotion(values: number[]) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const identityRef = useRef<{ values: number[]; ids: string[]; nextId: number }>({ values: [], ids: [], nextId: 0 });
  const positionsRef = useRef<Map<string, BarRect>>(new Map());
  const animationsRef = useRef<Map<string, Animation>>(new Map());

  const previous = identityRef.current;
  const remaining = new Map<number, string[]>();
  previous.values.forEach((value, index) => {
    const list = remaining.get(value) ?? [];
    list.push(previous.ids[index]);
    remaining.set(value, list);
  });
  const ids = values.map((value) => {
    const reusable = remaining.get(value)?.shift();
    if (reusable) return reusable;
    const id = `bar-${identityRef.current.nextId++}`;
    return id;
  });
  identityRef.current = { values: [...values], ids, nextId: identityRef.current.nextId };
  const signature = ids.join('|');

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const nextPositions = new Map<string, BarRect>();
    const bars = canvas.querySelectorAll<HTMLElement>('[data-bar-id]');
    bars.forEach((bar) => {
      const id = bar.dataset.barId;
      if (!id) return;
      const rect = bar.getBoundingClientRect();
      nextPositions.set(id, { left: rect.left, top: rect.top });
      const oldPosition = positionsRef.current.get(id);
      if (!oldPosition) return;
      const deltaX = oldPosition.left - rect.left;
      const deltaY = oldPosition.top - rect.top;
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || typeof bar.animate !== 'function') return;
      const animation = bar.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px)` },
          { transform: 'translate(0, 0)' },
        ],
        { duration: 240, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
      animationsRef.current.set(id, animation);
      animation.onfinish = () => {
        if (animationsRef.current.get(id) === animation) animationsRef.current.delete(id);
      };
    });
    positionsRef.current = nextPositions;

    // Capture the on-screen position before React lays out the next step. If
    // playback advances mid-animation, the following FLIP starts from where
    // the bar is visibly rendered instead of its previous logical slot.
    return () => {
      const currentCanvas = canvasRef.current;
      if (currentCanvas) {
        const visiblePositions = new Map<string, BarRect>();
        currentCanvas.querySelectorAll<HTMLElement>('[data-bar-id]').forEach((bar) => {
          const id = bar.dataset.barId;
          if (!id) return;
          const rect = bar.getBoundingClientRect();
          visiblePositions.set(id, { left: rect.left, top: rect.top });
        });
        positionsRef.current = visiblePositions;
      }
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current.clear();
    };
  }, [signature]);

  return { canvasRef, barIds: ids };
}
