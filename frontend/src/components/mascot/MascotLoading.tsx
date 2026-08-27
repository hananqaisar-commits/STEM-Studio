import React, { useEffect, useState } from 'react';
import { Octa } from './Octa';
import './Mascot.css';

export interface MascotLoadingProps {
  message?: string;
}

/**
 * Premium loading screen: Octa drags the STEM letters into place.
 * Each letter represents its field with a representative color:
 *   S = Science (green)  |  T = Technology (cyan)
 *   E = Engineering (amber)  |  M = Mathematics (pink)
 */
export const MascotLoading: React.FC<MascotLoadingProps> = ({
  message = 'Loading...',
}) => {
  const [phase, setPhase] = useState<'dragging' | 'settled' | 'fadeout'>('dragging');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('settled'), 1800);
    const t2 = setTimeout(() => setPhase('fadeout'), 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className={`mascot-loading mascot-loading-${phase}`} role="status" aria-live="polite">
      <div className="mascot-loading-scene">
        {/* Octa mascot dragging the letters */}
        <div className="mascot-loading-dragger">
          <Octa expression="helping" size="large" interactive={false} />
        </div>

        {/* STEM letters being dragged into place */}
        <div className="mascot-loading-letters" aria-label="STEM Studio">
          <span className="mascot-letter mascot-letter-s">S</span>
          <span className="mascot-letter mascot-letter-t">T</span>
          <span className="mascot-letter mascot-letter-e">E</span>
          <span className="mascot-letter mascot-letter-m">M</span>
        </div>
      </div>

      <p className="mascot-loading-text">{message}</p>

      {/* Progress bar with field colors */}
      <div className="mascot-loading-progress">
        <div className="mascot-loading-bar" />
      </div>
    </div>
  );
};

export default MascotLoading;
