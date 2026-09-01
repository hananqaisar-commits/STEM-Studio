import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import './ResizablePanelRow.css';

/* ─────────────────────────────────────────────────────────────────────
   ResizablePanelRow — the ONE shared, constraint-aware dock for the
   Debugger (left) and Explanation Card (right) used by every studio.

   Guarantees:
   • Both panels are independently resizable from all four sides.
   • Panels can NEVER overlap: widths always satisfy
         debuggerW + explanationW + MIN_GAP ≤ containerW
     because growth only consumes free space between the anchored panels
     and stops at the minimum safe gap.
   • When no space remains the handle stops at the boundary; the user
     must shrink one panel before the other can grow — the sibling card
     is never pushed, moved, or covered.
   • The invariant is re-clamped on every drag frame (mouse or touch),
     on container resize, and on mode changes (stacked / single panel).
   ───────────────────────────────────────────────────────────────────── */

const MIN_W = 320;
const MIN_H = 220;
const MAX_H = 760;
/** Minimum safe gap — the collision boundary between the two panels. */
const MIN_GAP = 20;
const DEFAULT_H = 380;
/** Below this container width the dock stacks vertically. */
const STACKED_MAX_W = MIN_W * 2 + MIN_GAP + 40;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

type Edge = 'left' | 'right' | 'top' | 'bottom';
type PanelId = 'left' | 'right';

interface Sizes {
  lw: number;
  rw: number;
  lh: number;
  rh: number;
}

interface ResizablePanelRowProps {
  /** Namespace for persisting this dock's sizes (usually the category id). */
  storageKey: string;
  /** Debugger panel content. Pass null to hide it (explanation reclaims the row). */
  debuggerPanel: React.ReactNode;
  /** Explanation Card content. */
  explanationPanel: React.ReactNode;
}

const storageId = (key: string) => `stemstudio.rp.${key}`;

function loadSizes(key: string): Partial<Sizes> | null {
  try {
    const raw = window.localStorage.getItem(storageId(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<Sizes> = {};
    (['lw', 'rw', 'lh', 'rh'] as const).forEach((k) => {
      const v = parsed[k];
      if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    });
    return out;
  } catch {
    return null;
  }
}

/** Shrink widths proportionally (never below MIN_W) so the collision
    invariant holds for the current container width. */
function fitWidths(lw: number, rw: number, containerW: number): [number, number] {
  const budget = containerW - MIN_GAP;
  if (budget <= MIN_W * 2) return [MIN_W, MIN_W];
  if (lw + rw <= budget) {
    return [clamp(lw, MIN_W, budget - MIN_W), clamp(rw, MIN_W, budget - MIN_W)];
  }
  const shrinkable = Math.max(0, lw - MIN_W) + Math.max(0, rw - MIN_W);
  const excess = lw + rw - budget;
  const shareL = shrinkable > 0 ? Math.max(0, lw - MIN_W) / shrinkable : 0.5;
  const nextL = clamp(lw - excess * shareL, MIN_W, budget - MIN_W);
  const nextR = clamp(rw - excess * (1 - shareL), MIN_W, budget - MIN_W);
  return [nextL, nextR];
}

export const ResizablePanelRow: React.FC<ResizablePanelRowProps> = ({
  storageKey,
  debuggerPanel,
  explanationPanel,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [sizes, setSizes] = useState<Sizes>({ lw: 0, rw: 0, lh: DEFAULT_H, rh: DEFAULT_H });

  const hasDebugger =
    debuggerPanel !== null && debuggerPanel !== undefined && debuggerPanel !== false;
  const stacked = containerW > 0 && containerW < STACKED_MAX_W;
  const twoUp = hasDebugger && !stacked;

  const sizesRef = useRef(sizes);
  sizesRef.current = sizes;
  const initializedRef = useRef(false);

  /* ── Measure the row (synchronously first, then keep in sync) ───── */
  useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      setContainerW((prev) => (Math.abs(prev - w) < 1 ? prev : w));
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  /* ── Initialize from storage + re-fit the invariant on every
        container/mode change (runs before paint — no layout flash) ── */
  useLayoutEffect(() => {
    if (containerW <= 0) return;
    setSizes((prev) => {
      let { lw, rw, lh, rh } = prev;
      if (!initializedRef.current) {
        const saved = loadSizes(storageKey);
        lw = saved?.lw ?? 0;
        rw = saved?.rw ?? 0;
        lh = saved?.lh ?? DEFAULT_H;
        rh = saved?.rh ?? DEFAULT_H;
        initializedRef.current = true;
      }
      lh = clamp(lh, MIN_H, MAX_H);
      rh = clamp(rh, MIN_H, MAX_H);
      if (twoUp) {
        if (lw < MIN_W || rw < MIN_W) {
          const half = Math.max(MIN_W, (containerW - MIN_GAP) / 2);
          lw = half;
          rw = half;
        }
        [lw, rw] = fitWidths(lw, rw, containerW);
      }
      return { lw, rw, lh, rh };
    });
  }, [containerW, twoUp, storageKey]);

  /* ── Drag machinery ─────────────────────────────────────────────── */
  interface DragInfo {
    panel: PanelId;
    edge: Edge;
    startX: number;
    startY: number;
    base: Sizes;
    pointerId: number;
  }
  const dragRef = useRef<DragInfo | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);

  const persist = useCallback(() => {
    try {
      window.localStorage.setItem(storageId(storageKey), JSON.stringify(sizesRef.current));
    } catch {
      /* storage unavailable — resize still works for this session */
    }
  }, [storageKey]);

  const applyDrag = useCallback(
    (x: number, y: number) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = x - d.startX;
      const dy = y - d.startY;

      setSizes(() => {
        const { base, panel, edge } = d;
        let { lw, rw, lh, rh } = base;

        if (edge === 'top' || edge === 'bottom') {
          const delta = edge === 'top' ? -dy : dy;
          if (panel === 'left') lh = clamp(base.lh + delta, MIN_H, MAX_H);
          else rh = clamp(base.rh + delta, MIN_H, MAX_H);
          return { lw, rw, lh, rh };
        }

        /* Horizontal — every branch re-derives both widths so the
           invariant lw + rw ≤ containerW − MIN_GAP cannot break. */
        const budget = containerW - MIN_GAP;
        if (panel === 'left' && edge === 'right') {
          // Grow/shrink the debugger into the free space, stop at the gap.
          lw = clamp(base.lw + dx, MIN_W, budget - rw);
        } else if (panel === 'left' && edge === 'left') {
          // Outer boundary: shrink only (panel is anchored to the row edge).
          lw = clamp(base.lw - dx, MIN_W, base.lw);
        } else if (panel === 'right' && edge === 'left') {
          // Grow/shrink the explanation into the free space, stop at the gap.
          rw = clamp(base.rw - dx, MIN_W, budget - lw);
        } else if (panel === 'right' && edge === 'right') {
          // Outer boundary: shrink only.
          rw = clamp(base.rw + dx, MIN_W, base.rw);
        }
        return { lw, rw, lh, rh };
      });
    },
    [containerW],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    pendingRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingRef.current) applyDrag(pendingRef.current.x, pendingRef.current.y);
      });
    }
  }, [applyDrag]);

  const endDrag = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setActiveHandle(null);
    persist();
  }, [persist]);

  const startDrag = useCallback(
    (panel: PanelId, edge: Edge) => (e: React.PointerEvent<HTMLDivElement>) => {
      if (!twoUp && (edge === 'left' || edge === 'right')) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        panel,
        edge,
        startX: e.clientX,
        startY: e.clientY,
        base: { ...sizesRef.current },
        pointerId: e.pointerId,
      };
      setActiveHandle(`${panel}-${edge}`);
    },
    [twoUp],
  );

  const resetLayout = useCallback(() => {
    const half = Math.max(MIN_W, (containerW - MIN_GAP) / 2);
    setSizes({ lw: half, rw: half, lh: DEFAULT_H, rh: DEFAULT_H });
    try {
      window.localStorage.removeItem(storageId(storageKey));
    } catch {
      /* ignore */
    }
  }, [containerW, storageKey]);

  useEffect(() => () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  /* ── Handle rendering ───────────────────────────────────────────── */
  const renderHandles = (panel: PanelId) => {
    const handle = (edge: Edge) => (
      <div
        key={edge}
        className={`rp-handle rp-handle--${edge}${activeHandle === `${panel}-${edge}` ? ' rp-active' : ''}`}
        role="separator"
        aria-orientation={edge === 'left' || edge === 'right' ? 'vertical' : 'horizontal'}
        aria-label={`Resize ${panel === 'left' ? 'debugger' : 'explanation'} panel (${edge} edge)`}
        title="Drag to resize • double-click to reset layout"
        onPointerDown={startDrag(panel, edge)}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={resetLayout}
      />
    );
    return (
      <>
        {twoUp && handle('left')}
        {twoUp && handle('right')}
        {handle('top')}
        {handle('bottom')}
      </>
    );
  };

  const { lw, rw, lh, rh } = sizes;

  return (
    <div
      ref={rowRef}
      className={`bottom-row rp-row${stacked ? ' rp-stacked' : ''}${hasDebugger ? '' : ' bottom-row--single'}`}
    >
      {hasDebugger && (
        <div
          className="rp-slot"
          style={twoUp ? { width: lw, height: lh } : { width: '100%', height: lh }}
        >
          {debuggerPanel}
          {renderHandles('left')}
        </div>
      )}
      {hasDebugger && <div className="rp-spacer" aria-hidden="true" />}
      <div
        className="rp-slot"
        style={twoUp ? { width: rw, height: rh } : { width: '100%', height: rh }}
      >
        {explanationPanel}
        {renderHandles('right')}
      </div>
    </div>
  );
};
