import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import './ResizablePanelRow.css';

const MIN_W_PX = 320;
const MIN_H = 220;
const MAX_H = 760;
const DEFAULT_H = 380;
const STACKED_MAX_W = MIN_W_PX * 2 + 60;

interface Sizes {
  lh: number;
  rh: number;
  layout: Record<string, number>;
}

interface ResizablePanelRowProps {
  storageKey: string;
  debuggerPanel: React.ReactNode;
  explanationPanel: React.ReactNode;
}

const storageId = (key: string) => `stemstudio.rp.${key}`;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function loadSizes(key: string): Partial<Sizes> | null {
  try {
    const raw = window.localStorage.getItem(storageId(key));
    return raw ? JSON.parse(raw) as Partial<Sizes> : null;
  } catch {
    return null;
  }
}

function saveSizes(key: string, sizes: Sizes) {
  try {
    window.localStorage.setItem(storageId(key), JSON.stringify(sizes));
  } catch {
    // Browser storage can be disabled.
  }
}

export const ResizablePanelRow: React.FC<ResizablePanelRowProps> = ({
  storageKey,
  debuggerPanel,
  explanationPanel,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const [containerW, setContainerW] = useState(0);
  const [sizes, setSizes] = useState<Sizes>({ lh: DEFAULT_H, rh: DEFAULT_H, layout: { left: 50, right: 50 } });
  const hasDebugger = debuggerPanel !== null && debuggerPanel !== undefined && debuggerPanel !== false;
  const stacked = containerW > 0 && containerW < STACKED_MAX_W;
  const twoUp = hasDebugger && !stacked;

  useLayoutEffect(() => {
    const element = rowRef.current;
    if (!element) return;
    const measure = () => {
      const width = element.getBoundingClientRect().width;
      setContainerW((previous) => Math.abs(previous - width) < 1 ? previous : width);
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useLayoutEffect(() => {
    if (containerW <= 0 || initializedRef.current) return;
    const saved = loadSizes(storageKey);
    const validLayout = saved?.layout && Number.isFinite(saved.layout.left) && Number.isFinite(saved.layout.right);
    setSizes({
      lh: clamp(saved?.lh ?? DEFAULT_H, MIN_H, MAX_H),
      rh: clamp(saved?.rh ?? DEFAULT_H, MIN_H, MAX_H),
      layout: validLayout ? saved.layout! : { left: 50, right: 50 },
    });
    initializedRef.current = true;
  }, [containerW, storageKey]);

  const onLayout = useCallback((layout: Record<string, number>) => {
    setSizes((previous) => {
      const next = { ...previous, layout };
      saveSizes(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const saveHeight = useCallback((panel: 'left' | 'right', height: number) => {
    setSizes((previous) => {
      const next = { ...previous, [panel === 'left' ? 'lh' : 'rh']: clamp(height, MIN_H, MAX_H) };
      saveSizes(storageKey, next);
      return next;
    });
  }, [storageKey]);

  const resetLayout = useCallback(() => {
    const next = { lh: DEFAULT_H, rh: DEFAULT_H, layout: { left: 50, right: 50 } };
    setSizes(next);
    saveSizes(storageKey, next);
  }, [storageKey]);

  const startDragHeight = (panel: 'left' | 'right') => (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = panel === 'left' ? sizes.lh : sizes.rh;
    const onMove = (moveEvent: PointerEvent) => saveHeight(panel, startHeight + moveEvent.clientY - startY);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.cursor = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    document.body.style.cursor = 'row-resize';
  };

  const nudgeHeight = (panel: 'left' | 'right') => (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = panel === 'left' ? sizes.lh : sizes.rh;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      saveHeight(panel, current + (event.key === 'ArrowUp' ? 24 : -24));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      saveHeight(panel, event.key === 'Home' ? MIN_H : MAX_H);
    }
  };

  const minPercent = containerW > 0 ? (MIN_W_PX / containerW) * 100 : 20;
  const heightHandle = (panel: 'left' | 'right', height: number, label: string) => (
    <div
      className="rp-handle rp-handle--ns rp-handle--bottom"
      role="separator"
      aria-orientation="horizontal"
      aria-label={`Resize ${label} panel height`}
      aria-valuenow={height}
      aria-valuemin={MIN_H}
      aria-valuemax={MAX_H}
      tabIndex={0}
      onPointerDown={startDragHeight(panel)}
      onKeyDown={nudgeHeight(panel)}
      onDoubleClick={resetLayout}
    />
  );

  return (
    <div ref={rowRef} className={`bottom-row rp-row${stacked ? ' rp-stacked' : ''}${!hasDebugger ? ' bottom-row--single' : ''}`}>
      {twoUp ? (
        <PanelGroup orientation="horizontal" onLayoutChanged={onLayout} id={storageKey}>
          <Panel id="left" defaultSize={sizes.layout.left ?? 50} minSize={minPercent} className="rp-panel-wrapper">
            <div className="rp-slot" style={{ height: sizes.lh }}>
              {debuggerPanel}
              {heightHandle('left', sizes.lh, 'Debugger')}
            </div>
          </Panel>
          <PanelResizeHandle className="rp-shared-divider" aria-label="Resize debugger and execution trace panels">
            <div className="rp-shared-divider-grip" />
          </PanelResizeHandle>
          <Panel id="right" defaultSize={sizes.layout.right ?? 50} minSize={minPercent} className="rp-panel-wrapper">
            <div className="rp-slot" style={{ height: sizes.rh }}>
              {explanationPanel}
              {heightHandle('right', sizes.rh, 'Execution trace')}
            </div>
          </Panel>
        </PanelGroup>
      ) : (
        <>
          {hasDebugger && (
            <div className="rp-slot" style={{ height: sizes.lh, width: '100%' }}>
              {debuggerPanel}
              {heightHandle('left', sizes.lh, 'Debugger')}
            </div>
          )}
          <div className="rp-slot" style={{ height: sizes.rh, width: '100%' }}>
            {explanationPanel}
            {heightHandle('right', sizes.rh, 'Execution trace')}
          </div>
        </>
      )}
    </div>
  );
};
