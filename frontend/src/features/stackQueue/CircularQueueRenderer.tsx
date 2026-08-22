import React from 'react';
import type { StackQueueStep } from './stackQueueEngine';
import './StackQueue.css';

interface CircularQueueRendererProps {
  currentStep: StackQueueStep | null;
}

export const CircularQueueRenderer: React.FC<CircularQueueRendererProps> = ({ currentStep }) => {
  if (!currentStep) return null;

  const capacity = currentStep.capacity ?? 6;
  const front = currentStep.frontIndex ?? -1;
  const rear = currentStep.rearIndex ?? -1;
  const elements = currentStep.elements;

  // Calculate circular coordinates for ring layout
  const radius = 130;
  const centerX = 200;
  const centerY = 180;

  return (
    <div className="circular-queue-container animate-fade-in">
      <div className="chamber-header">
        <span className="chamber-title">CIRCULAR RING BUFFER (BOUNDED QUEUE)</span>
        <span className="chamber-subtitle">
          Capacity: {capacity} · FRONT = {front === -1 ? 'None' : front} · REAR = {rear === -1 ? 'None' : rear}
        </span>
      </div>

      <div className="circular-workspace">
        <svg className="ring-svg-canvas" width="400" height="360" viewBox="0 0 400 360">
          {/* Main ring track */}
          <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="rgba(148, 163, 184, 0.2)" strokeWidth="20" />

          {/* Slots & Nodes along the ring */}
          {Array.from({ length: capacity }).map((_, idx) => {
            const angle = (idx * (360 / capacity) - 90) * (Math.PI / 180);
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);

            const isFront = idx === front;
            const isRear = idx === rear;
            const elData = elements[idx];
            const hasVal = elData && elData.value !== '-';

            let fillColor = 'rgba(30, 41, 59, 0.9)';
            let strokeColor = '#475569';
            if (isFront) strokeColor = '#38bdf8';
            if (isRear) strokeColor = '#f59e0b';
            if (hasVal) fillColor = 'rgba(59, 130, 246, 0.25)';

            return (
              <g key={idx} className="cq-slot-group">
                <circle
                  cx={x}
                  cy={y}
                  r="24"
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isFront || isRear ? '3' : '2'}
                  className="cq-circle"
                />

                {/* Index label */}
                <text x={x} y={y + 36} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="700">
                  [{idx}]
                </text>

                {/* Value text */}
                <text x={x} y={y + 4} textAnchor="middle" fill={hasVal ? '#ffffff' : '#64748b'} fontSize="13" fontWeight="800">
                  {elData ? elData.value : '-'}
                </text>

                {/* FRONT / REAR pointers */}
                {isFront && (
                  <text x={x} y={y - 32} textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="900">
                    FRONT
                  </text>
                )}
                {isRear && (
                  <text x={x} y={y + (isFront ? -42 : -32)} textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="900">
                    REAR
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
