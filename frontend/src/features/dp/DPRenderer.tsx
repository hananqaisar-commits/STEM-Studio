import React from 'react';
import type { ArrayStep } from '../../engine/types/Step';
import { Grid2D } from '../../components/renderers/Grid2D';

interface DPRendererProps {
  currentStep: ArrayStep | null;
  onToggleFullscreen?: () => void;
}

export const DPRenderer: React.FC<DPRendererProps> = ({
  currentStep,
  onToggleFullscreen,
}) => {
  if (!currentStep) {
    return (
      <div className="shared-canvas-empty">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.35, marginBottom: '0.5rem' }}>
            <rect x="4" y="4" width="16" height="16" rx="2" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <rect x="24" y="4" width="16" height="16" rx="2" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <rect x="4" y="24" width="16" height="16" rx="2" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <rect x="24" y="24" width="16" height="16" rx="2" stroke="#64748b" strokeWidth="1.5" fill="none" />
          </svg>
          <span style={{ fontWeight: 600, opacity: 0.7 }}>No DP data available</span>
          <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>Run a DP algorithm to visualize the table</span>
        </div>
      </div>
    );
  }

  const { array = [], comparingIndices = [], sortedIndices = [], variables = {} } = currentStep;
  const isGrid = variables.isGrid === true;
  const rows = typeof variables.rows === 'number' ? variables.rows : 0;
  const cols = typeof variables.cols === 'number' ? variables.cols : 0;

  // Build row and column labels for string/item DP
  const s1 = typeof variables.s1 === 'string' ? variables.s1 : '';
  const s2 = typeof variables.s2 === 'string' ? variables.s2 : '';

  const rowLabels: string[] = [];
  if (rows > 0) {
    for (let r = 0; r < rows; r++) {
      if (r === 0) rowLabels.push('\u2205');
      else if (s1.length >= r) rowLabels.push(s1[r - 1]);
      else rowLabels.push(`Item ${r}`);
    }
  }

  const colLabels: string[] = [];
  if (cols > 0) {
    for (let c = 0; c < cols; c++) {
      if (c === 0) colLabels.push('\u2205');
      else if (s2.length >= c) colLabels.push(s2[c - 1]);
      else colLabels.push(`${c}`);
    }
  }

  // Parse backtrack path if provided in step variables
  const backtrackPath: number[] = Array.isArray(variables.backtrackPath)
    ? (variables.backtrackPath as number[])
    : [];

  const cellDependencies: number[] = Array.isArray(variables.dependencies)
    ? (variables.dependencies as number[])
    : [];

  if (isGrid && rows > 0 && cols > 0) {
    return (
      <Grid2D
        mode="2D"
        array={array}
        rows={rows}
        cols={cols}
        rowLabels={rowLabels}
        colLabels={colLabels}
        activeIndices={comparingIndices}
        computedIndices={sortedIndices}
        backtrackPath={backtrackPath}
        cellDependencies={cellDependencies}
        title="DP TABLE MATRIX"
        subtitle={`${rows} \u00d7 ${cols} matrix`}
        onToggleFullscreen={onToggleFullscreen}
      />
    );
  }

  return (
    <Grid2D
      mode="1D"
      array={array}
      activeIndices={comparingIndices}
      computedIndices={sortedIndices}
      backtrackPath={backtrackPath}
      cellDependencies={cellDependencies}
      title="DP TABLE ARRAY"
      subtitle={`${array.length} cells`}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
};
