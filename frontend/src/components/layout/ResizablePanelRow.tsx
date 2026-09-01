import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import './ResizablePanelRow.css';

/* ─────────────────────────────────────────────────────────────────────────────
   ResizablePanelRow — the ONE shared constraint-aware dock for the
   Debugger (left) and Explanation Card (right) used by every studio.

   Uses `react-resizable-panels` for the horizontal split (shared divider).
   This guarantees the panels NEVER overlap — resizing one automatically 
   shrinks the other because they share the same container width.
   
   Independent heights are managed via a simple manual bottom handle.
   ─────────────────────────────────────────────────────────────────────────── */

const MIN_W_PX = 320;
const MIN_H = 220;
const MAX_H = 760;
const DEFAULT_H = 380;
/** Below this container width the dock stacks vertically. */
const STACKED_MAX_W = MIN_W_PX * 2 + 60;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Sizes {
  lh: number;
  rh: number;
  layout: Record<string, number>; // percentages {left, right}
}

interface ResizablePanelRowProps {
  storageKey: string;
  debuggerPanel: React.ReactNode;
  explanationPanel: React.ReactNode;
}

const storageId = (key: string) => `stemstudio.rp.${key}`;

function loadSizes(key: string): Partial<Sizes> | null {
  try {
    const raw = window.localStorage.getItem(storageId(key));
    if (!raw) return null;
    return JSON.parse(raw) as Partial<Sizes>;
  } catch {
    return null;
  }
}

function saveSizes(key: string, sizes: Sizes) {
  try {
    window.localStorage.setItem(storageId(key), JSON.stringify(sizes));
  } catch {
    /* storage unavailable */
  }
}

export const ResizablePanelRow: React.FC<ResizablePanelRowProps> = ({
  storageKey,
  debuggerPanel,
  explanationPanel,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [containerW, setContainerW] = useState(0);
  const [sizes, setSizes] = useState<Sizes>({ lh: DEFAULT_H, rh: DEFAULT_H, layout: { left: 50, right: 50 } });
  const initializedRef = useRef(false);

  const hasDebugger =
    debuggerPanel !== null && debuggerPanel !== undefined && debuggerPanel !== false;
  const stacked = containerW > 0 && containerW < STACKED_MAX_W;
  const twoUp = hasDebugger && !stacked;

  /* ── Measure the row ───────────────────────────────────────────── */
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

  /* ── Initialize from storage ────────────────────────────────────── */
  useLayoutEffect(() => {
    if (containerW <= 0) return;
    setSizes((prev) => {
      if (!initializedRef.current) {
        const saved = loadSizes(storageKey);
        initializedRef.current = true;
        return {
          lh: clamp(saved?.lh ?? DEFAULT_H, MIN_H, MAX_H),
          rh: clamp(saved?.rh ?? DEFAULT_H, MIN_H, MAX_H),
          layout: saved?.layout && Object.keys(saved.layout).length === 2 ? saved.layout : { left: 50, right: 50 },
        };
      }
      return prev;
    });
  }, [containerW, storageKey]);

  const onLayout = useCallback(
    (layout: Record<string, number>) => {
      setSizes((prev) => {
        const next = { ...prev, layout };
        saveSizes(storageKey, next);
        return next;
      });
    },
    [storageKey]
  );

  const resetLayout = useCallback(() => {
    const next: Sizes = { lh: DEFAULT_H, rh: DEFAULT_H, layout: { left: 50, right: 50 } };
    setSizes(next);
    saveSizes(storageKey, next);
  }, [storageKey]);

  /* ── Manual Height Resize Logic (Bottom Handles) ────────────────── */
  const startDragHeight = (panel: 'left' | 'right') => (e: React.PointerEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = panel === 'left' ? sizes.lh : sizes.rh;

    const onMove = (moveEvt: PointerEvent) => {
      const delta = moveEvt.clientY - startY;
      setSizes((prev) => {
        const newH = clamp(startH + delta, MIN_H, MAX_H);
        const next = { ...prev, [panel === 'left' ? 'lh' : 'rh']: newH };
        saveSizes(storageKey, next);
        return next;
      });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    document.body.style.cursor = 'row-resize';
  };

  const { lh, rh, layout } = sizes;
  const minPct = containerW > 0 ? (MIN_W_PX / containerW) * 100 : 20;

  return (
    <div
      ref={rowRef}
      className={`bottom-row rp-row${stacked ? ' rp-stacked' : ''}${!hasDebugger ? ' bottom-row--single' : ''}`}
    >
      {twoUp ? (
        <PanelGroup orientation="horizontal" onLayoutChanged={onLayout} id={storageKey}>
          <Panel id="left" defaultSize={layout.left ?? 50} minSize={minPct} className="rp-panel-wrapper">
            <div className="rp-slot" style={{ height: lh }}>
              {debuggerPanel}
              <div
                className="rp-handle rp-handle--ns rp-handle--bottom"
                onPointerDown={startDragHeight('left')}
                onDoubleClick={resetLayout}
              />
            </div>
          </Panel>
          <PanelResizeHandle className="rp-shared-divider">
            <div className="rp-shared-divider-grip" />
          </PanelResizeHandle>
          <Panel id="right" defaultSize={layout.right ?? 50} minSize={minPct} className="rp-panel-wrapper">
            <div className="rp-slot" style={{ height: rh }}>
              {explanationPanel}
              <div
                className="rp-handle rp-handle--ns rp-handle--bottom"
                onPointerDown={startDragHeight('right')}
                onDoubleClick={resetLayout}
              />
            </div>
          </Panel>
        </PanelGroup>
      ) : (
        <>
          {hasDebugger && (
            <div className="rp-slot" style={{ height: lh, width: '100%' }}>
              {debuggerPanel}
              <div
                className="rp-handle rp-handle--ns rp-handle--bottom"
                onPointerDown={startDragHeight('left')}
                onDoubleClick={resetLayout}
              />
            </div>
          )}
          <div className="rp-slot" style={{ height: rh, width: '100%' }}>
            {explanationPanel}
            <div
              className="rp-handle rp-handle--ns rp-handle--bottom"
              onPointerDown={startDragHeight('right')}
              onDoubleClick={resetLayout}
            />
          </div>
        </>
      )}
    </div>
  );
};
