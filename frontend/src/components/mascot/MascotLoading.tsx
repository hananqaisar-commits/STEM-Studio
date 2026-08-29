import React from 'react';
import { Octa } from './Octa';
import { StemWordmark } from '../common/StemWordmark';
import './Mascot.css';

export type MascotLoadingPhase = 'loading' | 'complete';

export interface MascotLoadingProps {
  message?: string;
  /**
   * Driven by the REAL application loading state (session restore / auth
   * check) — never by a fake timer inside this component.
   */
  phase?: MascotLoadingPhase;
  /** Plays the exit fade; the parent unmounts once it finishes. */
  exiting?: boolean;
}

/**
 * Premium branded loading experience.
 *
 * The vector STEM wordmark is the visual anchor; Octa waits below with a
 * surprised expression and smoothly crossfades to happy when `phase` flips
 * to "complete". No hardcoded durations, no fake progress — the parent
 * (BootSplash / route guards) controls the lifecycle from real state.
 */
export const MascotLoading: React.FC<MascotLoadingProps> = ({
  message = 'Preparing your studio',
  phase = 'loading',
  exiting = false,
}) => {
  const done = phase === 'complete';

  return (
    <div
      className={[
        'mascot-loading',
        done ? 'mascot-loading--complete' : '',
        exiting ? 'mascot-loading--exit' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
      aria-busy={!done}
    >
      <div className="mascot-loading-stage">
        <StemWordmark settled={done} />

        {/* Octa: surprised while loading, happy once complete (crossfade) */}
        <div className="mascot-loading-mascot">
          <span className="mascot-layer mascot-layer--surprised" aria-hidden={done}>
            <Octa expression="surprised" size={96} interactive={false} label="Octa, waiting" />
          </span>
          <span className="mascot-layer mascot-layer--happy" aria-hidden={!done}>
            <Octa expression="happy" size={96} interactive={false} label="Octa, ready" />
          </span>
        </div>

        <div className="splash-status">
          <span className="splash-status__label splash-status__label--loading">
            {message}
          </span>
          <span className="splash-status__label splash-status__label--done">
            Ready when you are
          </span>
          <div className="splash-shimmer-track">
            <div className="splash-shimmer-fill" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MascotLoading;
