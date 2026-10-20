import React, { useEffect, useRef } from 'react';
import { MotionPresets } from '../../engine/motionEngine';
import './Renderers.css';

export interface PegDisk {
  id: string;
  size: number;
  label?: string;
}

export interface PegState {
  id: string;
  label: string;
  disks: PegDisk[];
}

export interface PegTowerProps {
  pegs: PegState[];
  title?: string;
  subtitle?: string;
}

const DISK_COLORS = [
  'var(--color-purple, #a855f7)',
  'var(--color-blue, #3b82f6)',
  'var(--color-teal, #14b8a6)',
  'var(--color-amber, #f59e0b)',
  'var(--color-pink, #ec4899)',
  'var(--color-indigo, #6366f1)',
];

export const PegTower: React.FC<PegTowerProps> = ({
  pegs,
  title = 'PEG TOWER CANVAS',
  subtitle = 'Tower of Hanoi Trace',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Animate the topmost disk on each peg (the one most recently moved)
    const topDisks = Array.from(
      containerRef.current.querySelectorAll<HTMLElement>('.pegtower-disk:last-child')
    );
    topDisks.forEach((el) => MotionPresets.dropSettle(el));
  }, [pegs]);

  if (!pegs || pegs.length !== 3) {
    return (
      <div className="shared-canvas-container">
        <div className="shared-canvas-empty">Requires exactly 3 pegs.</div>
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

      <div className="pegtower-workspace">
        {pegs.map((peg) => (
          <div key={peg.id} className="pegtower-peg">
            {/* Pole */}
            <div className="pegtower-pole" />

            {/* Base */}
            <div className="pegtower-base" />

            {/* Disks (bottom-up: first disk in array = bottom) */}
            <div className="pegtower-disk-stack">
              {peg.disks.map((disk) => {
                const width = 40 + disk.size * 15;
                const color = DISK_COLORS[(disk.size - 1) % DISK_COLORS.length];

                return (
                  <div
                    key={disk.id}
                    className="pegtower-disk"
                    style={{
                      width: `${width}px`,
                      backgroundColor: color,
                    }}
                  >
                    {disk.label || disk.size}
                  </div>
                );
              })}
            </div>

            {/* Label */}
            <div className="pegtower-label">{peg.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
