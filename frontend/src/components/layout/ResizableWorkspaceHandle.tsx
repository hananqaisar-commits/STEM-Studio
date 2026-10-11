import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import './ResizableWorkspaceHandle.css';

const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 300;
const MAX_WIDTH = 620;
const HANDLE_WIDTH = 24;

interface ResizableWorkspaceHandleProps {
  storageKey: string;
}

export const ResizableWorkspaceHandle: React.FC<ResizableWorkspaceHandleProps> = ({ storageKey }) => {
  const handleRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, height: 0, width: DEFAULT_WIDTH });
  const key = `stemstudio.workspaceWidth.${storageKey}`;

  const updatePosition = useCallback((workspace: HTMLElement, widthOverride?: number) => {
    const renderer = workspace.querySelector<HTMLElement>('.renderer-section');
    const quiz = workspace.querySelector<HTMLElement>('.quiz-rail');
    if (!renderer || !quiz) return;
    const workspaceRect = workspace.getBoundingClientRect();
    const rendererRect = renderer.getBoundingClientRect();
    const quizRect = quiz.getBoundingClientRect();
    const cssWidth = Number.parseFloat(window.getComputedStyle(workspace).getPropertyValue('--viz-side-col')) || DEFAULT_WIDTH;
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
    updatePosition(workspace, width);
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => updatePosition(workspace))
      : null;
    observer?.observe(workspace);
    const renderer = workspace.querySelector('.renderer-section');
    const quiz = workspace.querySelector('.quiz-rail');
    if (renderer) observer?.observe(renderer);
    if (quiz) observer?.observe(quiz);
    const onResize = () => updatePosition(workspace);
    window.addEventListener('resize', onResize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [key, updatePosition]);

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

  return (
    <div
      ref={handleRef}
      className="rvq-resize-handle"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize visualizer and quiz panels"
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
  );
};
