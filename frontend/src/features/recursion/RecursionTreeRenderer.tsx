import React from 'react';
import type { ArrayStep } from '../../engine/types/Step';
import { DecisionTree, type DecisionTreeNode } from '../../components/renderers/DecisionTree';
import './Recursion.css';

interface RecursionTreeRendererProps {
  currentStep: ArrayStep | null;
  onToggleFullscreen?: () => void;
}

export const RecursionTreeRenderer: React.FC<RecursionTreeRendererProps> = ({
  currentStep,
  onToggleFullscreen,
}) => {
  if (!currentStep?.variables?.nodeLabels) {
    return (
      <div className="shared-canvas-empty">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ opacity: 0.35, marginBottom: '0.4rem' }}>
            <circle cx="22" cy="10" r="5" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <circle cx="12" cy="28" r="5" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <circle cx="32" cy="28" r="5" stroke="#64748b" strokeWidth="1.5" fill="none" />
            <line x1="22" y1="15" x2="12" y2="23" stroke="#64748b" strokeWidth="1.2" />
            <line x1="22" y1="15" x2="32" y2="23" stroke="#64748b" strokeWidth="1.2" />
          </svg>
          <span style={{ fontWeight: 600, opacity: 0.7 }}>Recursion Call Tree Canvas</span>
          <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>Click Play to visualize the call tree</span>
        </div>
      </div>
    );
  }

  const vars = currentStep.variables;
  const labels: string[] = String(vars.nodeLabels).split(',');
  const parents: number[] = String(vars.parentMap).split(',').map(Number);
  const states: string[] = String(vars.nodeStates).split(',');
  const retVals: string[] = String(vars.returnValues).split(',');
  const callStack: string[] = currentStep.callStack ?? [];

  const nodes: DecisionTreeNode[] = labels.map((label, i) => ({
    id: i,
    label,
    parentId: parents[i] ?? -1,
    state: (states[i] as any) || 'pending',
    returnValue: retVals[i] ?? '?',
  }));

  return (
    <DecisionTree
      nodes={nodes}
      callStack={callStack}
      title="RECURSION CALL TREE"
      subtitle={`${nodes.length} call${nodes.length !== 1 ? 's' : ''}`}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
};
