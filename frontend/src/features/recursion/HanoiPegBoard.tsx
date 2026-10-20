import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MotionPresets } from '../../engine/motionEngine';

export interface HanoiPegSnapshot {
  pegs: Record<string, number[]>; // bottom → top disk sizes
  move: { disk: number; from: string; to: string } | null;
}

interface HanoiPegBoardProps {
  snapshot: HanoiPegSnapshot;
  totalDisks: number;
}

const PEG_ORDER = ['A', 'B', 'C'];

/* 3-peg board for Tower of Hanoi. The moved disk is re-rendered on its new
   peg, then shifted back to the old peg's x and lifted across with the
   shared liftShiftDrop preset so the transfer reads as one motion. */
export const HanoiPegBoard: React.FC<HanoiPegBoardProps> = ({ snapshot, totalDisks }) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const moveKeyRef = useRef<string>('');

  useEffect(() => {
    const board = boardRef.current;
    const { move } = snapshot;
    if (!board || !move) return;
    const key = `${move.disk}:${move.from}:${move.to}`;
    if (moveKeyRef.current === key) return;
    moveKeyRef.current = key;

    const el = board.querySelector<HTMLElement>(`[data-disk="${move.disk}"]`);
    if (!el) return;
    const width = board.clientWidth;
    const pegX = (peg: string) => (PEG_ORDER.indexOf(peg) + 0.5) * (width / 3);
    gsap.set(el, { x: pegX(move.from) - pegX(move.to) });
    MotionPresets.liftShiftDrop(el, 0);
  }, [snapshot]);

  const maxDisk = Math.max(totalDisks, 1);

  return (
    <div className="hanoi-board" ref={boardRef}>
      <div className="hanoi-pegs">
        {PEG_ORDER.map((peg) => (
          <div key={peg} className="hanoi-peg-col">
            <div className="hanoi-peg-label">Peg {peg}</div>
            <div className="hanoi-peg-stack" style={{ minHeight: totalDisks * 20 + 64 }}>
              <div className="hanoi-rod" />
              <div className="hanoi-disks">
                {[...snapshot.pegs[peg]].reverse().map((disk) => (
                  <div
                    key={disk}
                    data-disk={disk}
                    className={`hanoi-disk ${snapshot.move?.disk === disk ? 'hanoi-disk-moving' : ''}`}
                    style={{ width: `${38 + (disk / maxDisk) * 58}%` }}
                  >
                    {disk}
                  </div>
                ))}
              </div>
              <div className="hanoi-base" />
            </div>
          </div>
        ))}
      </div>
      <div className="hanoi-move-bar">
        {snapshot.move
          ? `Disk ${snapshot.move.disk}: Peg ${snapshot.move.from} → Peg ${snapshot.move.to}`
          : 'No disk moved at this step'}
      </div>
    </div>
  );
};
