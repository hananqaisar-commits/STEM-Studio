import React from 'react';
import type { StackQueueStep } from './stackQueueEngine';
import './StackQueue.css';

interface QueueRendererProps {
  currentStep: StackQueueStep | null;
}

export const QueueRenderer: React.FC<QueueRendererProps> = ({ currentStep }) => {
  if (!currentStep) return null;

  const elements = currentStep.elements;
  const frontIdx = 0;
  const rearIdx = elements.length - 1;

  return (
    <div className="queue-container animate-fade-in">
      <div className="chamber-header">
        <span className="chamber-title">3D QUEUE CHANNEL (FIFO)</span>
        <span className="chamber-subtitle">First-In, First-Out · Exit [FRONT] ⬅️ Enter [REAR]</span>
      </div>

      <div className="queue-channel-workspace">
        <div className="queue-flow-labels">
          <span className="flow-badge exit-badge">⬅️ DEQUEUE (FRONT)</span>
          <span className="flow-badge enter-badge">ENQUEUE (REAR) ⬅️</span>
        </div>

        <div className="queue-glass-tube">
          {elements.length === 0 ? (
            <div className="queue-empty-notice">
              <span className="notice-icon">➡️</span>
              <span>Queue is Empty</span>
              <span className="notice-sub">Enqueue elements into the channel</span>
            </div>
          ) : (
            <div className="queue-elements-wrapper">
              {elements.map((el, idx) => {
                const isFront = idx === frontIdx;
                const isRear = idx === rearIdx;
                let stateClass = 'block-default';
                if (el.state === 'pushed') stateClass = 'block-pushed';
                if (el.state === 'popped') stateClass = 'block-popped';

                return (
                  <div key={el.id} className={`queue-3d-block ${stateClass}`}>
                    {/* FRONT & REAR pointer badges */}
                    {isFront && (
                      <span className="queue-pointer-badge front-badge">FRONT [{idx}]</span>
                    )}
                    {isRear && (
                      <span className="queue-pointer-badge rear-badge">REAR [{idx}]</span>
                    )}

                    <div className="block-content">
                      <span className="block-value">{el.value}</span>
                      <span className="block-index">[{idx}]</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
