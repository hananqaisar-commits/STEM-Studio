import React, { useMemo } from 'react';
import { Maximize2, Hash, Database } from 'lucide-react';
import { Bar } from '../../components/primitives/Bar';
import type { ArrayStep, ElementState } from '../../engine/types/Step';
import '../sorting/Sorting.css';
import './HashMaps.css';

interface HashMapRendererProps {
  currentStep: ArrayStep | null;
  onElementClick?: (index: number, currentValue: number) => void;
  onToggleFullscreen?: () => void;
}

interface MapEntry {
  key: string;
  value: string;
  status: 'default' | 'lookup' | 'new';
}

function parseMapEntries(
  entriesStr: string,
  highlightKey: string,
  newKey: string
): MapEntry[] {
  if (!entriesStr || entriesStr.trim() === '') return [];
  return entriesStr.split(',').map((pair) => {
    const [k, v] = pair.split(':');
    const keyTrimmed = k?.trim() ?? '';
    let status: MapEntry['status'] = 'default';
    if (highlightKey && keyTrimmed === highlightKey.trim()) status = 'lookup';
    if (newKey && keyTrimmed === newKey.trim()) status = 'new';
    return { key: keyTrimmed, value: v?.trim() ?? '', status };
  });
}

export const HashMapRenderer: React.FC<HashMapRendererProps> = ({
  currentStep,
  onElementClick,
  onToggleFullscreen,
}) => {
  if (!currentStep) {
    return (
      <div className="sorting-canvas-empty">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.15rem' }}>
          <Hash size={40} style={{ opacity: 0.3 }} />
          <span style={{ fontWeight: 600, opacity: 0.7 }}>No hash map data available</span>
          <span style={{ fontSize: '0.78rem', opacity: 0.5 }}>Run an algorithm to begin visualization</span>
        </div>
      </div>
    );
  }

  const {
    array,
    comparingIndices = [],
    swappingIndices = [],
    sortedIndices = [],
    pivotIndex,
    variables = {},
  } = currentStep;

  const max = Math.max(...array, 1);

  const mapEntriesStr = typeof variables.mapEntries === 'string' ? variables.mapEntries : '';
  const mapHighlight = typeof variables.mapHighlight === 'string' ? variables.mapHighlight : '';
  const mapNew = typeof variables.mapNew === 'string' ? variables.mapNew : '';

  const mapEntries = useMemo(
    () => parseMapEntries(mapEntriesStr, mapHighlight, mapNew),
    [mapEntriesStr, mapHighlight, mapNew]
  );

  const getElementState = (index: number): ElementState => {
    if (swappingIndices.includes(index)) return 'swapping';
    if (comparingIndices.includes(index)) return 'comparing';
    if (pivotIndex === index) return 'pivot';
    if (sortedIndices.includes(index)) return 'sorted';
    return 'default';
  };

  return (
    <div className="hashmap-renderer-root animate-fade-in">
      {/* ── Array Canvas ─────────────────────────────────────────────── */}
      <div className="sorting-canvas-container">
        <div className="sorting-canvas-header">
          <div className="canvas-header-left">
            <span className="bst-title">ARRAY CANVAS</span>
            <span className="bst-subtitle">{array.length} elements</span>
          </div>
          {onToggleFullscreen && (
            <button className="fullscreen-toggle-btn" onClick={onToggleFullscreen} title="Full Screen">
              <Maximize2 size={14} />
              <span>Fullscreen</span>
            </button>
          )}
        </div>
        <div className="bars-canvas">
          {array.map((value, index) => {
            const heightPercent = (value / max) * 100;
            const state = getElementState(index);
            return (
              <div
                key={index}
                className="interactive-bar-wrapper"
                onClick={() => onElementClick?.(index, value)}
              >
                <Bar value={value} heightPercent={heightPercent} state={state} showValue={array.length <= 25} />
                {array.length <= 30 && <span className="bar-index-label">[{index}]</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── HashMap Visualisation ──────────────────────────────────── */}
      <div className="hashmap-panel">
        <div className="hashmap-panel-header">
          <Database size={14} />
          <span className="hashmap-panel-title">HASH MAP</span>
          <span className="hashmap-panel-count">{mapEntries.length} entr{mapEntries.length === 1 ? 'y' : 'ies'}</span>
        </div>

        {mapEntries.length === 0 ? (
          <div className="hashmap-empty">
            <span>HashMap is empty</span>
          </div>
        ) : (
          <div className="hashmap-table">
            <div className="hashmap-table-head">
              <span className="hashmap-col-key">Key</span>
              <span className="hashmap-col-value">Value</span>
              <span className="hashmap-col-status">Status</span>
            </div>
            <div className="hashmap-table-body">
              {mapEntries.map((entry, idx) => (
                <div
                  key={`${entry.key}-${idx}`}
                  className={`hashmap-row hashmap-row-${entry.status}`}
                >
                  <span className="hashmap-col-key hashmap-cell-key">{entry.key}</span>
                  <span className="hashmap-col-value hashmap-cell-value">{entry.value}</span>
                  <span className="hashmap-col-status hashmap-cell-status">
                    {entry.status === 'lookup' && <span className="hm-badge hm-badge-lookup">LOOKUP</span>}
                    {entry.status === 'new' && <span className="hm-badge hm-badge-new">NEW</span>}
                    {entry.status === 'default' && <span className="hm-badge hm-badge-stored">STORED</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
