import React from 'react';

interface SortedEdgeEntry {
  edgeId: string;
  from: string;
  to: string;
  weight: number;
  state: 'pending' | 'current' | 'accepted' | 'rejected';
}

interface SortedEdgePanelProps {
  edges: SortedEdgeEntry[];
  dsuComponents?: string[][];
}

const STATE_COLORS: Record<SortedEdgeEntry['state'], { bg: string; border: string; text: string; label: string }> = {
  pending:  { bg: 'var(--color-surface)',          border: 'var(--color-border)', text: 'var(--color-text-secondary)', label: '' },
  current:  { bg: '#1e3a5f',                        border: '#38bdf8',              text: '#e0f2fe',                    label: '⟶ Evaluating' },
  accepted: { bg: '#14532d',                        border: '#4ade80',              text: '#dcfce7',                    label: '✓ In MST' },
  rejected: { bg: '#3b1b1b',                        border: '#f87171',              text: '#fee2e2',                    label: '✗ Cycle' },
};

const COMPONENT_COLORS = [
  '#38bdf8', '#4ade80', '#c084fc', '#fbbf24', '#f87171', '#34d399', '#a78bfa', '#60a5fa',
];

export const SortedEdgePanel: React.FC<SortedEdgePanelProps> = ({ edges, dsuComponents }) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        padding: '8px',
        background: 'var(--color-surface)',
        borderRadius: '10px',
        border: '1px solid var(--color-border)',
        minWidth: '200px',
        maxHeight: '320px',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          paddingBottom: '6px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <span
          style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'var(--color-text-muted)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Sorted Edge List
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '0.6rem',
            color: 'var(--color-text-muted)',
          }}
        >
          {edges.filter((e) => e.state === 'accepted').length} / {edges.length} in MST
        </span>
      </div>

      {/* Edge rows */}
      {edges.map((edge, i) => {
        const colors = STATE_COLORS[edge.state];
        return (
          <div
            key={edge.edgeId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 8px',
              borderRadius: '6px',
              background: colors.bg,
              border: `1.5px solid ${colors.border}`,
              transition: 'all 0.25s',
              flexShrink: 0,
            }}
          >
            {/* Rank number */}
            <span
              style={{
                fontSize: '0.65rem',
                color: 'var(--color-text-muted)',
                fontFamily: 'monospace',
                minWidth: '16px',
              }}
            >
              {i + 1}.
            </span>

            {/* Edge identifier */}
            <span
              style={{
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: colors.text,
                flex: 1,
              }}
            >
              {edge.from}–{edge.to}
            </span>

            {/* Weight badge */}
            <span
              style={{
                fontSize: '0.72rem',
                fontFamily: 'monospace',
                fontWeight: 700,
                color: colors.text,
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(0,0,0,0.2)',
              }}
            >
              w={edge.weight}
            </span>

            {/* State label */}
            {colors.label && (
              <span
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: colors.text,
                  opacity: 0.9,
                  whiteSpace: 'nowrap',
                }}
              >
                {colors.label}
              </span>
            )}
          </div>
        );
      })}

      {/* DSU Components */}
      {dsuComponents && dsuComponents.length > 0 && (
        <div
          style={{
            marginTop: '4px',
            paddingTop: '6px',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          <div
            style={{
              fontSize: '0.6rem',
              color: 'var(--color-text-muted)',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            DSU Components
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {dsuComponents.map((component, ci) => (
              <div
                key={ci}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: `${COMPONENT_COLORS[ci % COMPONENT_COLORS.length]}18`,
                  border: `1px solid ${COMPONENT_COLORS[ci % COMPONENT_COLORS.length]}50`,
                }}
              >
                {component.map((id, j) => (
                  <span
                    key={id}
                    style={{
                      fontSize: '0.7rem',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      color: COMPONENT_COLORS[ci % COMPONENT_COLORS.length],
                    }}
                  >
                    {id}{j < component.length - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
