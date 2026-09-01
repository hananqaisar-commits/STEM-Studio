import type { ElementState } from '../../engine/types/Step';

/* ─────────────────────────────────────────────────────────────────────
   STEM Studio — Global Visualization Palette (single source of truth)

   These values MUST stay in sync with the `--viz-*` custom properties
   declared in Primitives.css. Every renderer derives its element colors
   from this palette (or the CSS tokens) so no feature can drift into a
   local, inconsistent color scheme again.
   ───────────────────────────────────────────────────────────────────── */

export interface VizStateColor {
  light: string;
  base: string;
  deep: string;
  /** "r,g,b" triplet for glow / flash effects (MotionPresets.flashState). */
  rgb: string;
}

export const VIZ_STATES: Record<ElementState, VizStateColor> = {
  default: { light: '#79b5ff', base: '#3b82f6', deep: '#1d4ed8', rgb: '59,130,246' },
  current: { light: '#93c5fd', base: '#2563eb', deep: '#1e40af', rgb: '37,99,235' },
  comparing: { light: '#fde047', base: '#f59e0b', deep: '#b45309', rgb: '245,158,11' },
  swapping: { light: '#fca5a5', base: '#ef4444', deep: '#b91c1c', rgb: '239,68,68' },
  sorted: { light: '#6ee7b7', base: '#10b981', deep: '#047857', rgb: '16,185,129' },
  pivot: { light: '#ddd6fe', base: '#8b5cf6', deep: '#6d28d9', rgb: '139,92,246' },
  selected: { light: '#fbcfe8', base: '#ec4899', deep: '#be185d', rgb: '236,72,153' },
};

/** Base element color for a state (circles, bars, edges). */
export function vizStateColor(state: ElementState): string {
  return VIZ_STATES[state].base;
}

/** "r,g,b" triplet for MotionPresets.flashState — always matches the state color. */
export function vizFlash(state: ElementState): string {
  return VIZ_STATES[state].rgb;
}

/** Readable text variant per state (labels, values rendered on the canvas).
    Slightly lighter than the element base so it reads on dark surfaces. */
const VIZ_LABELS: Record<ElementState, string> = {
  default: '#64748b',
  current: '#60a5fa',
  comparing: '#fbbf24',
  swapping: '#f87171',
  sorted: '#34d399',
  pivot: '#c4b5fd',
  selected: '#f9a8d4',
};

export function vizLabelColor(state: ElementState): string {
  return VIZ_LABELS[state];
}
