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
 * Premium branded loading experience:
 * - Mascot Octa positioned on the LEFT side of the text block.
 * - Dancing letters for "STEM" (top line, large) and "STUDIO" (bottom line, smaller).
 * - Light and dark theme adaptive gradient colors.
 * - Clean design without status lines/shimmer bars as requested.
 */
export const MascotLoading: React.FC<MascotLoadingProps> = ({
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
      <div className="mascot-loading-stage-horizontal">
        {/* Octa Mascot on LEFT */}
        <div className="mascot-loading-mascot-left">
          <span className="mascot-layer mascot-layer--surprised" aria-hidden={done}>
            <Octa expression="surprised" size={210} interactive={false} label="Octa, waiting" />
          </span>
          <span className="mascot-layer mascot-layer--happy" aria-hidden={!done}>
            <Octa expression="happy" size={210} interactive={false} label="Octa, ready" />
          </span>
        </div>

        {/* STEM STUDIO Dancing Letters on RIGHT */}
        <div className="mascot-loading-text-right">
          <StemWordmark settled={done} />
        </div>
      </div>
    </div>
  );
};

export default MascotLoading;
