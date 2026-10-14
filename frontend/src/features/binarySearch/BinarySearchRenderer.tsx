import React, { useEffect, useRef } from 'react';
import type { BinarySearchStep } from './binarySearchEngine';
import { MotionPresets } from '../../engine/motionEngine';
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
  const midCellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (midCellRef.current && step?.mid != null) {
      MotionPresets.nodePulse(midCellRef.current);
    }
  }, [step?.mid]);
  const displayArray =
    step?.array ||
    array.map((val, idx) => ({
      index: idx,
      value: val,
      state: 'default' as const,
      pointerLabels: [],
    }));

  const activeComparison = step?.comparison;
  const boundInterval = step?.halfOpenRange;
  const boundResultAtEnd = step?.boundResultIndex === displayArray.length;

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

      {boundInterval && (
        <div className="bs-bound-interval" aria-live="polite">
          <span className="bs-bound-interval-label">ACTIVE CANDIDATES</span>
          <code>[{boundInterval.left}, {boundInterval.rightExclusive})</code>
          <span className="bs-bound-interval-note">
            R is exclusive{boundInterval.left === boundInterval.rightExclusive ? ' · no candidates remain' : ` · inspect indices ${boundInterval.left} through ${boundInterval.rightExclusive - 1}`}
          </span>
        </div>
      )}

      {step?.boundResultIndex !== undefined && step.boundResultLabel && (
        <div className="bs-bound-result" aria-live="polite">
          <span>{step.boundResultLabel}</span>
          <strong>index {step.boundResultIndex}</strong>
          <span>{boundResultAtEnd ? 'end sentinel (after the last value)' : `arr[${step.boundResultIndex}] = ${displayArray[step.boundResultIndex]?.value}`}</span>
        </div>
      )}

      {/* Array Elements Visual Track */}
      <div className="bs-array-track">
        {displayArray.map((elem) => {
          const stateClass = `state-${elem.state}`;
          const inBoundRange = boundInterval != null && elem.index >= boundInterval.left && elem.index < boundInterval.rightExclusive;
          const rightBoundaryHere = boundInterval != null && (
            (boundInterval.rightExclusive > 0 && elem.index === boundInterval.rightExclusive - 1)
            || (boundInterval.rightExclusive === 0 && elem.index === 0)
          );

          return (
            <div key={elem.index} className={`bs-elem-cell${inBoundRange ? ' in-bound-range' : ''}${rightBoundaryHere ? ' has-exclusive-end' : ''}${boundInterval?.rightExclusive === 0 && rightBoundaryHere ? ' exclusive-at-start' : ''}`}>
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
              <div
                ref={elem.index === step?.mid ? midCellRef : null}
                className={`bs-elem-box ${stateClass}`}
              >
                {elem.value}
              </div>

              {/* Index Subscript */}
              <span className="bs-elem-index">idx: {elem.index}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
