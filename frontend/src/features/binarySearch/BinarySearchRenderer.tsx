import React from 'react';
import type { BinarySearchStep } from './binarySearchEngine';
import './BinarySearch.css';

interface BinarySearchRendererProps {
  step: BinarySearchStep | null;
  array: number[];
  target: number;
}

export const BinarySearchRenderer: React.FC<BinarySearchRendererProps> = ({
  step,
  array,
  target,
}) => {
  const displayArray =
    step?.array ||
    array.map((val, idx) => ({
      index: idx,
      value: val,
      state: 'default' as const,
      pointerLabels: [],
    }));

  const activeComparison = step?.comparison;

  return (
    <div className="bs-canvas-body">
      {/* Real-Time Comparison HUD */}
      <div className="bs-hud-card">
        <div className="bs-hud-metric">
          <span className="bs-hud-label">TARGET</span>
          <span className="bs-hud-val" style={{ color: '#34d399' }}>
            {step ? step.target : target}
          </span>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }} />

        <div className="bs-hud-metric">
          <span className="bs-hud-label">ARR[MID]</span>
          <span className="bs-hud-val" style={{ color: '#f59e0b' }}>
            {step?.mid !== null && step?.mid !== undefined && displayArray[step.mid]
              ? displayArray[step.mid].value
              : '—'}
          </span>
        </div>

        <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }} />

        <div className="bs-hud-metric">
          <span className="bs-hud-label">EVALUATION</span>
          <span
            className="bs-hud-val"
            style={{
              fontSize: '0.85rem',
              color:
                activeComparison?.result === 'equal'
                  ? '#34d399'
                  : activeComparison?.result === 'less'
                  ? '#38bdf8'
                  : '#ec4899',
            }}
          >
            {activeComparison?.condition || 'Awaiting Step'}
          </span>
        </div>
      </div>

      {/* Array Elements Visual Track */}
      <div className="bs-array-track">
        {displayArray.map((elem) => {
          const stateClass = `state-${elem.state}`;

          return (
            <div key={elem.index} className="bs-elem-cell">
              {/* Pointer Badges */}
              {elem.pointerLabels && elem.pointerLabels.length > 0 && (
                <div className="bs-elem-pointer-tags">
                  {elem.pointerLabels.map((label) => (
                    <span
                      key={label}
                      className={`bs-pointer-badge badge-${label.toLowerCase()}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}

              {/* Element Value Box */}
              <div className={`bs-elem-box ${stateClass}`}>{elem.value}</div>

              {/* Index Subscript */}
              <span className="bs-elem-index">idx: {elem.index}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
