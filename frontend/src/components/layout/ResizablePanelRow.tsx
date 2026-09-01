import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Resizable } from 're-resizable';
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

// Edge/PanelId types removed — re-resizable handles all drag machinery internally.

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

  /* ── Collision constraint helpers ───────────────────────────────── */
  /** Maximum width the LEFT panel can be without violating the gap. */
  const maxLW = useCallback(
    () => clamp(containerW - MIN_GAP - sizesRef.current.rw, MIN_W, containerW - MIN_GAP - MIN_W),
    [containerW],
  );

  /** Maximum width the RIGHT panel can be without violating the gap. */
  const maxRW = useCallback(
    () => clamp(containerW - MIN_GAP - sizesRef.current.lw, MIN_W, containerW - MIN_GAP - MIN_W),
    [containerW],
  );

  const resetLayout = useCallback(() => {
    const half = Math.max(MIN_W, (containerW - MIN_GAP) / 2);
    const next: Sizes = { lw: half, rw: half, lh: DEFAULT_H, rh: DEFAULT_H };
    setSizes(next);
    try {
      window.localStorage.removeItem(storageId(storageKey));
    } catch {
      /* ignore */
    }
  }, [containerW, storageKey]);

  /* ── Custom handle elements ─────────────────────────────────────── */
  /**
   * re-resizable's `handleComponent` prop lets us pass our own elements
   * that sit EXACTLY on each edge — these are the ONLY clickable drag targets.
   * Interior content is completely unaffected.
   */
  const makeHandle = (axis: 'ns' | 'ew', label: string) => (
    <div
      className={`rp-handle rp-handle--${axis}`}
      aria-label={label}
      title="Drag to resize • double-click to reset"
      onDoubleClick={resetLayout}
    />
  );

  /* Debugger (left) — resize RIGHT edge (horizontal) + BOTTOM edge (vertical) */
  const debuggerHandles = {
    right: makeHandle('ew', 'Resize Debugger panel from right'),
    bottom: makeHandle('ns', 'Resize Debugger panel from bottom'),
  };

  /* Explanation (right) — resize LEFT edge (horizontal) + BOTTOM edge (vertical) */
  const explanationHandles = {
    left: makeHandle('ew', 'Resize Explanation panel from left'),
    bottom: makeHandle('ns', 'Resize Explanation panel from bottom'),
  };

  const { lw, rw, lh, rh } = sizes;

  return (
    <div
      ref={rowRef}
      className={`bottom-row rp-row${stacked ? ' rp-stacked' : ''}${hasDebugger ? '' : ' bottom-row--single'}`}
    >
      {/* ── Debugger Panel ─────────────────────────────────────────── */}
      {hasDebugger && (
        <Resizable
          className="rp-slot"
          size={twoUp ? { width: lw, height: lh } : { width: '100%', height: lh }}
          minWidth={MIN_W}
          minHeight={MIN_H}
          maxWidth={twoUp ? maxLW() : undefined}
          maxHeight={MAX_H}
          enable={{
            top: false,
            right: twoUp,   // horizontal resize only when two panels are side-by-side
            bottom: true,
            left: false,
            topRight: false,
            bottomRight: false,
            bottomLeft: false,
            topLeft: false,
          }}
          handleComponent={debuggerHandles}
          onResizeStop={(_e, _dir, _ref, delta) => {
            setSizes((prev) => {
              const newLW = clamp(prev.lw + delta.width, MIN_W, maxLW());
              const newLH = clamp(prev.lh + delta.height, MIN_H, MAX_H);
              const next = { ...prev, lw: newLW, lh: newLH };
              try {
                window.localStorage.setItem(storageId(storageKey), JSON.stringify(next));
              } catch { /* ignore */ }
              return next;
            });
          }}
        >
          {debuggerPanel}
        </Resizable>
      )}

      {/* ── Gap spacer ─────────────────────────────────────────────── */}
      {hasDebugger && twoUp && <div className="rp-spacer" aria-hidden="true" />}

      {/* ── Explanation Card ───────────────────────────────────────── */}
      <Resizable
        className="rp-slot"
        size={twoUp ? { width: rw, height: rh } : { width: '100%', height: rh }}
        minWidth={MIN_W}
        minHeight={MIN_H}
        maxWidth={twoUp ? maxRW() : undefined}
        maxHeight={MAX_H}
        enable={{
          top: false,
          right: false,
          bottom: true,
          left: twoUp,    // horizontal resize only when two panels are side-by-side
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
        handleComponent={explanationHandles}
        onResizeStop={(_e, _dir, _ref, delta) => {
          setSizes((prev) => {
            // left-handle drag: re-resizable reports delta.width as positive when
            // shrinking from the left. We invert it so the panel grows correctly.
            const newRW = clamp(prev.rw - delta.width, MIN_W, maxRW());
            const newRH = clamp(prev.rh + delta.height, MIN_H, MAX_H);
            const next = { ...prev, rw: newRW, rh: newRH };
            try {
              window.localStorage.setItem(storageId(storageKey), JSON.stringify(next));
            } catch { /* ignore */ }
            return next;
          });
        }}
      >
        {explanationPanel}
      </Resizable>
    </div>
  );
};

