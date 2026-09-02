import React, { useEffect, useRef } from 'react';
import { MotionPresets } from '../../engine/motionEngine';
import './Renderers.css';

export interface HashBucketItem {
  id: string;
  value: string | number;
  isNew?: boolean;
  isActive?: boolean;
}

export interface HashBucket {
  id: string;
  label: string;
  items: HashBucketItem[];
  isActive?: boolean;
}

export interface HashBucketsProps {
  buckets: HashBucket[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
}

export const HashBuckets: React.FC<HashBucketsProps> = ({
  buckets,
  title = 'HASH BUCKETS CANVAS',
  subtitle = 'Hash Map / Table Trace',
  emptyMessage = 'No buckets initialized.',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const activeEls = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('.hashbucket-item.is-active')
    );
    activeEls.forEach((el) => MotionPresets.popIn(el));
  }, [buckets]);

  if (!buckets || buckets.length === 0) {
    return (
      <div className="shared-canvas-container">
        <div className="shared-canvas-empty">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="shared-canvas-container animate-fade-in" ref={containerRef}>
      <div className="shared-canvas-header">
        <div className="canvas-header-left">
          <span className="shared-canvas-title">{title}</span>
          {subtitle && <span className="shared-canvas-subtitle">{subtitle}</span>}
        </div>
      </div>

      <div className="hashbuckets-workspace">
        {buckets.map((bucket) => {
          const isBucketActive = bucket.isActive || bucket.items.some((i) => i.isActive);

          return (
            <div key={bucket.id} className="hashbucket-column">
              {/* Bucket container */}
              <div className={`hashbucket-container ${isBucketActive ? 'is-active' : ''}`}>
                {bucket.items.map((item) => (
                  <div
                    key={item.id}
                    className={`hashbucket-item ${item.isActive ? 'is-active' : ''}`}
                  >
                    {item.value}
                  </div>
                ))}
                {bucket.items.length === 0 && (
                  <div className="hashbucket-empty-slot" />
                )}
              </div>

              {/* Bucket label */}
              <div className="hashbucket-label">{bucket.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
