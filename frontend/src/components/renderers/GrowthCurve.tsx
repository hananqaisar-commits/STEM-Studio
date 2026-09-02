import React, { useEffect, useRef } from 'react';
import { MotionPresets } from '../../engine/motionEngine';
import './Renderers.css';

export interface CurveData {
  id: string;
  label: string;
  color: string;
  /** SVG path `d` attribute string */
  pathData: string;
}

export interface GrowthCurveProps {
  curves: CurveData[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
}

export const GrowthCurve: React.FC<GrowthCurveProps> = ({
  curves,
  title = 'GROWTH CURVE CANVAS',
  subtitle = 'Complexity Analysis Chart',
  emptyMessage = 'No curves to display.',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const paths = Array.from(
      svgRef.current.querySelectorAll<SVGGeometryElement>('.growthcurve-path')
    );
    paths.forEach((path, i) => {
      MotionPresets.curveDraw(path, i * 0.3);
    });
  }, [curves]);

  if (!curves || curves.length === 0) {
    return (
      <div className="shared-canvas-container">
        <div className="shared-canvas-empty">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="shared-canvas-container animate-fade-in">
      <div className="shared-canvas-header">
        <div className="canvas-header-left">
          <span className="shared-canvas-title">{title}</span>
          {subtitle && <span className="shared-canvas-subtitle">{subtitle}</span>}
        </div>
      </div>

      <div className="growthcurve-workspace">
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          className="growthcurve-svg"
          preserveAspectRatio="none"
        >
          {/* Axes */}
          <line x1="0" y1="100" x2="100" y2="100" stroke="var(--border-secondary, #cbd5e1)" strokeWidth="0.5" />
          <line x1="0" y1="0" x2="0" y2="100" stroke="var(--border-secondary, #cbd5e1)" strokeWidth="0.5" />

          {/* Curves */}
          {curves.map((curve) => (
            <path
              key={curve.id}
              className="growthcurve-path"
              d={curve.pathData}
              fill="none"
              stroke={curve.color}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        {/* Legend */}
        <div className="growthcurve-legend">
          {curves.map((curve) => (
            <div key={curve.id} className="growthcurve-legend-item">
              <div className="growthcurve-legend-dot" style={{ backgroundColor: curve.color }} />
              <span className="growthcurve-legend-label">{curve.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
