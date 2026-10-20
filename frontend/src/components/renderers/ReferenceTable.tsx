import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { MotionPresets } from '../../engine/motionEngine';
import './Renderers.css';

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface TableRow {
  id: string;
  [key: string]: any;
}

export interface ReferenceTableProps {
  columns: TableColumn[];
  data: TableRow[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
}

export const ReferenceTable: React.FC<ReferenceTableProps> = ({
  columns,
  data,
  title = 'REFERENCE TABLE',
  subtitle = 'Data Structure / Algorithm Reference',
  emptyMessage = 'No data available.',
}) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (tableRef.current) {
      MotionPresets.fadeGrow(tableRef.current);
    }
  }, []);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const valA = a[sortKey];
    const valB = b[sortKey];
    if (valA < valB) return sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  if (!data || data.length === 0 || columns.length === 0) {
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

      <div className="referencetable-workspace" ref={tableRef}>
        <table className="referencetable-table">
          <thead>
            <tr className="referencetable-head-row">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`referencetable-th ${col.sortable ? 'sortable' : ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="referencetable-th-content">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ArrowUp size={14} className="sort-icon" />
                        : <ArrowDown size={14} className="sort-icon" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row) => (
              <tr key={row.id} className="referencetable-row">
                {columns.map((col) => (
                  <td key={col.key} className="referencetable-td">
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
