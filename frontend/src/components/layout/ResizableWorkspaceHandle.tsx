import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import './ResizableWorkspaceHandle.css';

const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 300;
const MAX_WIDTH = 620;
const HANDLE_WIDTH = 24;
const MIN_HEIGHT = 220;
const MAX_HEIGHT = 760;
const HEIGHT_HANDLE_SIZE = 16;

type WorkspacePanel = 'renderer' | 'quiz';

interface PanelHandlePosition {
  left: number;
  top: number;
  width: number;
}

interface ResizableWorkspaceHandleProps {
  storageKey: string;
}

export const ResizableWorkspaceHandle: React.FC<ResizableWorkspaceHandleProps> = ({ storageKey }) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, height: 0, width: DEFAULT_WIDTH });
  const [heightHandles, setHeightHandles] = useState<Record<WorkspacePanel, PanelHandlePosition>>({
    renderer: { left: 0, top: 0, width: 0 },
    quiz: { left: 0, top: 0, width: 0 },
  });
  const key = `stemstudio.workspaceWidth.${storageKey}`;
  const heightKey = useCallback((panel: WorkspacePanel) => `stemstudio.workspaceHeight.${storageKey}.${panel}`, [storageKey]);

  const updatePosition = useCallback((workspace: HTMLElement, widthOverride?: number) => {
    const renderer = workspace.querySelector<HTMLElement>('.renderer-section');
    const quiz = workspace.querySelector<HTMLElement>('.quiz-rail');
    if (!renderer || !quiz) return;
    const workspaceRect = workspace.getBoundingClientRect();
    const rendererRect = renderer.getBoundingClientRect();
    const quizRect = quiz.getBoundingClientRect();
    const cssWidth = Number.parseFloat(window.getComputedStyle(workspace).getPropertyValue('--viz-side-col')) || DEFAULT_WIDTH;
    setHeightHandles({
      renderer: {
        left: rendererRect.left - workspaceRect.left,
        top: rendererRect.bottom - workspaceRect.top - HEIGHT_HANDLE_SIZE / 2,
        width: rendererRect.width,
      },
      quiz: {
        left: quizRect.left - workspaceRect.left,
        top: quizRect.bottom - workspaceRect.top - HEIGHT_HANDLE_SIZE / 2,
        width: quizRect.width,
      },
    });
    setPosition({
      left: quizRect.left - workspaceRect.left - HANDLE_WIDTH / 2,
      top: rendererRect.top - workspaceRect.top,
      height: rendererRect.height,
      width: widthOverride ?? cssWidth,
    });
  }, []);

  useLayoutEffect(() => {
    const handle = handleRef.current;
    const workspace = handle?.closest<HTMLElement>('.scene-workspace');
    if (!workspace) return;
    let width = DEFAULT_WIDTH;
    try {
      const saved = Number(window.localStorage.getItem(key));
      if (Number.isFinite(saved) && saved > 0) width = saved;
    } catch {
      // Keep the default when storage is unavailable.
    }
    workspace.style.setProperty('--viz-side-col', `${width}px`);
    const renderer = workspace.querySelector<HTMLElement>('.renderer-section');
    const quiz = workspace.querySelector<HTMLElement>('.quiz-rail');
    if (window.innerWidth > 1024) {
      ([['renderer', renderer], ['quiz', quiz]] as const).forEach(([panelName, panel]) => {
        if (!panel) return;
        try {
          const savedHeight = Number(window.localStorage.getItem(heightKey(panelName)));
          if (Number.isFinite(savedHeight) && savedHeight >= MIN_HEIGHT && savedHeight <= MAX_HEIGHT) {
            panel.style.height = `${savedHeight}px`;
            panel.style.maxHeight = `${savedHeight}px`;
            panel.style.overflowY = 'auto';
          }
        } catch {
          // Keep the content-driven height when storage is unavailable.
        }
      });
    }
    updatePosition(workspace, width);
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updatePosition(workspace))
      : null;
    observer?.observe(workspace);
    if (renderer) observer?.observe(renderer);
    if (quiz) observer?.observe(quiz);
    const onResize = () => updatePosition(workspace);
    window.addEventListener('resize', onResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [heightKey, key, updatePosition]);

  const setWidth = useCallback((nextWidth: number) => {
    const workspace = handleRef.current?.closest<HTMLElement>('.scene-workspace');
    if (!workspace) return;
    const available = workspace.getBoundingClientRect().width;
    const style = window.getComputedStyle(workspace);
    const gap = Number.parseFloat(style.columnGap) || 24;
    const max = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, available - 360 - gap));
    const width = Math.round(Math.max(MIN_WIDTH, Math.min(max, nextWidth)));
    workspace.style.setProperty('--viz-side-col', `${width}px`);
    setPosition((previous) => ({ ...previous, width }));
    try {
      window.localStorage.setItem(key, String(width));
    } catch {
      // The current resize still works when persistence is unavailable.
    }
    requestAnimationFrame(() => updatePosition(workspace, width));
  }, [key, updatePosition]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = position.width;
    const move = (moveEvent: PointerEvent) => setWidth(startWidth - (moveEvent.clientX - startX));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      setWidth(position.width + (event.key === 'ArrowLeft' ? 24 : -24));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setWidth(event.key === 'Home' ? MIN_WIDTH : MAX_WIDTH);
    }
  };

  const setPanelHeight = useCallback((panelName: WorkspacePanel, height: number) => {
    const workspace = handleRef.current?.closest<HTMLElement>('.scene-workspace');
    const panel = workspace?.querySelector<HTMLElement>(panelName === 'renderer' ? '.renderer-section' : '.quiz-rail');
    if (!workspace || !panel) return;
    const clampedHeight = Math.round(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, height)));
    panel.style.height = `${clampedHeight}px`;
    panel.style.maxHeight = `${clampedHeight}px`;
    panel.style.overflowY = 'auto';
    try {
      window.localStorage.setItem(heightKey(panelName), String(clampedHeight));
    } catch {
      // Resizing remains available for this session when storage is unavailable.
    }
    requestAnimationFrame(() => updatePosition(workspace));
  }, [heightKey, updatePosition]);

  const startHeightResize = (panelName: WorkspacePanel) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const workspace = handleRef.current?.closest<HTMLElement>('.scene-workspace');
    const panel = workspace?.querySelector<HTMLElement>(panelName === 'renderer' ? '.renderer-section' : '.quiz-rail');
    if (!panel) return;
    event.preventDefault();
    const startY = event.clientY;
    const startHeight = panel.getBoundingClientRect().height;
    const move = (moveEvent: PointerEvent) => setPanelHeight(panelName, startHeight + moveEvent.clientY - startY);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const resetPanelHeight = (panelName: WorkspacePanel) => {
    const workspace = handleRef.current?.closest<HTMLElement>('.scene-workspace');
    const panel = workspace?.querySelector<HTMLElement>(panelName === 'renderer' ? '.renderer-section' : '.quiz-rail');
    if (!workspace || !panel) return;
    panel.style.removeProperty('height');
    panel.style.removeProperty('max-height');
    panel.style.removeProperty('overflow-y');
    try {
      window.localStorage.removeItem(heightKey(panelName));
    } catch {
      // Keep the reset in the current layout even if storage is unavailable.
    }
    requestAnimationFrame(() => updatePosition(workspace));
  };

  const nudgePanelHeight = (panelName: WorkspacePanel) => (event: React.KeyboardEvent<HTMLDivElement>) => {
    const workspace = handleRef.current?.closest<HTMLElement>('.scene-workspace');
    const panel = workspace?.querySelector<HTMLElement>(panelName === 'renderer' ? '.renderer-section' : '.quiz-rail');
    if (!panel) return;
    const currentHeight = panel.getBoundingClientRect().height;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      setPanelHeight(panelName, currentHeight + (event.key === 'ArrowDown' ? 24 : -24));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      setPanelHeight(panelName, event.key === 'Home' ? MIN_HEIGHT : MAX_HEIGHT);
    }
  };

  return (
    <>
      <div
        ref={handleRef}
        className="rvq-resize-handle"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize visualizer and quiz panel widths"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        aria-valuenow={Math.round(position.width)}
        tabIndex={0}
        style={{ left: position.left, top: position.top, height: position.height }}
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
      >
        <span className="rvq-resize-handle__grip" />
      </div>
      {(['renderer', 'quiz'] as const).map((panelName) => {
        const panel = handleRef.current?.closest<HTMLElement>('.scene-workspace')
          ?.querySelector<HTMLElement>(panelName === 'renderer' ? '.renderer-section' : '.quiz-rail');
        const height = panel?.getBoundingClientRect().height ?? 0;
        return (
          <div
            key={panelName}
            className="rvq-height-resize-handle"
            role="separator"
            aria-orientation="horizontal"
            aria-label={`Resize ${panelName === 'renderer' ? 'visualizer' : 'quiz'} panel height`}
            aria-valuemin={MIN_HEIGHT}
            aria-valuemax={MAX_HEIGHT}
            aria-valuenow={Math.round(height)}
            tabIndex={0}
            style={heightHandles[panelName]}
            onPointerDown={startHeightResize(panelName)}
            onKeyDown={nudgePanelHeight(panelName)}
            onDoubleClick={() => resetPanelHeight(panelName)}
          >
            <span className="rvq-height-resize-handle__grip" />
          </div>
        );
      })}
    </>
  );
};
