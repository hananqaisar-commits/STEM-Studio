import { useSyncExternalStore } from 'react';

type Listener = () => void;

let controlsEnabled = false;
let recentVisualizerIntentAt = 0;
const listeners = new Set<Listener>();
const guideListeners = new Set<Listener>();
const guideClaimOrder: string[] = [];
let guideOwnerId: string | null = null;
let trackingUsers = 0;

const notify = () => listeners.forEach((listener) => listener());

export function getVisualizerControlsEnabled() {
  return controlsEnabled;
}

export function useVisualizerControlsEnabled() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getVisualizerControlsEnabled,
    () => false,
  );
}

export function enableVisualizerControls() {
  if (controlsEnabled) return;
  controlsEnabled = true;
  notify();
}

export function resetVisualizerControls() {
  controlsEnabled = false;
  recentVisualizerIntentAt = 0;
  notify();
}

export function hasRecentVisualizerIntent() {
  // Allow slower pasted-code execution and async visualizer generation to finish.
  return Date.now() - recentVisualizerIntentAt < 60_000;
}

function recordVisualizerIntent(event: Event) {
  const target = event.target;
  if (!(target instanceof Element) || !target.closest('.dashboard-main, .fs-modal-overlay')) return;
  if (target.closest('.floating-controller, .player-bar, .step-controls-group, [data-playback-control]')) return;
  recentVisualizerIntentAt = Date.now();
}

/** Capture dataset edits and operation clicks so the matching trace can unlock playback. */
export function trackVisualizerIntent() {
  trackingUsers += 1;
  if (trackingUsers === 1) {
    document.addEventListener('click', recordVisualizerIntent, true);
    document.addEventListener('input', recordVisualizerIntent, true);
    document.addEventListener('change', recordVisualizerIntent, true);
    document.addEventListener('submit', recordVisualizerIntent, true);
  }

  return () => {
    trackingUsers = Math.max(0, trackingUsers - 1);
    if (trackingUsers === 0) {
      document.removeEventListener('click', recordVisualizerIntent, true);
      document.removeEventListener('input', recordVisualizerIntent, true);
      document.removeEventListener('change', recordVisualizerIntent, true);
      document.removeEventListener('submit', recordVisualizerIntent, true);
    }
  };
}

export function releaseControllerGuide(ownerId: string) {
  const index = guideClaimOrder.indexOf(ownerId);
  if (index >= 0) guideClaimOrder.splice(index, 1);
  if (guideOwnerId !== ownerId) return;
  guideOwnerId = guideClaimOrder[0] ?? null;
  guideListeners.forEach((listener) => listener());
}

export function useIsControllerGuideOwner(ownerId: string) {
  return useSyncExternalStore(
    (listener) => {
      guideListeners.add(listener);
      return () => guideListeners.delete(listener);
    },
    () => guideOwnerId === ownerId,
    () => false,
  );
}

export function claimControllerGuide(ownerId: string) {
  if (!guideClaimOrder.includes(ownerId)) guideClaimOrder.push(ownerId);
  if (guideOwnerId !== null) return guideOwnerId === ownerId;
  guideOwnerId = ownerId;
  guideListeners.forEach((listener) => listener());
  return true;
}
