import React, { useEffect, useRef } from 'react';
import { ArrowLeft, Inbox } from 'lucide-react';
import type { StackQueueStep } from './stackQueueEngine';
import { MotionPresets } from '../../engine/motionEngine';
import './StackQueue.css';

interface StackRendererProps {
  currentStep: StackQueueStep | null;
}

export const StackRenderer: React.FC<StackRendererProps> = ({ currentStep }) => {
  const topPlateRef = useRef<HTMLDivElement | null>(null);
  const prevActionRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!currentStep || !topPlateRef.current) return;
    const action = currentStep.action;

    if (action === 'PUSH' && prevActionRef.current !== 'PUSH') {
      MotionPresets.stackPush(topPlateRef.current);
    } else if (action === 'POP' && prevActionRef.current !== 'POP') {
      MotionPresets.stackPop(topPlateRef.current);
    } else if (action === 'PEEK') {
      MotionPresets.peekPulse(topPlateRef.current);
    }
    prevActionRef.current = action;
  }, [currentStep]);

  if (!currentStep) return null;

  const elements = currentStep.elements;
  const topIndex = elements.length - 1;

  return (
    <div className="stack-container animate-fade-in">
      <div className="chamber-header">
        <span className="chamber-title">3D STACK CHAMBER (LIFO)</span>
        <span className="chamber-subtitle">Last-In, First-Out · Capacity: Infinite</span>
      </div>

      <div className="stack-chamber-workspace">
        {/* Glassmorphic Stack Tube / Base Container */}
        <div className="stack-glass-tube">
          <div className="tube-base-plate">STACK BASE</div>

          {elements.length === 0 ? (
            <div className="stack-empty-notice">
              <Inbox size={24} className="notice-icon" aria-hidden="true" />
              <span>Stack is Empty</span>
              <span className="notice-sub">Push elements to fill the chamber</span>
            </div>
          ) : (
            <div className="stack-elements-wrapper">
              {elements.map((el, idx) => {
                const isTop = idx === topIndex;
                let stateClass = 'plate-default';
                if (el.state === 'pushed') stateClass = 'plate-pushed';
                if (el.state === 'popped') stateClass = 'plate-popped';
                if (el.state === 'error') stateClass = 'plate-error';

                return (
                  <div
                    key={el.id}
                    ref={isTop ? topPlateRef : null}
                    className={`stack-3d-plate ${stateClass}`}
                  >
                    {/* Animated TOP Pointer Badge */}
                    {isTop && (
                      <div className="top-pointer-badge" title={`Top of stack (index ${idx})`} aria-label={`Top of stack, index ${idx}`}>
                        <ArrowLeft size={14} strokeWidth={2.5} aria-hidden="true" />
                      </div>
                    )}

                    <div className="plate-inner-content">
                      <span className="plate-value">{el.value}</span>
                      <span className="plate-index">idx [{idx}]</span>
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
