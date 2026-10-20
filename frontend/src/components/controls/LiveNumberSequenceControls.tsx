import React, { useEffect, useState } from 'react';
import { ArrowDownToLine, Plus, Trash2 } from 'lucide-react';
import './LiveNumberSequenceControls.css';

interface LiveNumberSequenceControlsProps {
  values: number[];
  onChange: (values: number[]) => void | boolean;
  maxLength?: number;
  label?: string;
  hint?: string;
}

export const LiveNumberSequenceControls: React.FC<LiveNumberSequenceControlsProps> = ({
  values,
  onChange,
  maxLength = 30,
  label = 'Quick sequence edits',
  hint = 'Indexes start at 0. Use the sequence field above for a complete replacement.',
}) => {
  const [rawValue, setRawValue] = useState('');
  const [rawIndex, setRawIndex] = useState(String(values.length));
  useEffect(() => {
    setRawIndex((current) => {
      const parsed = Number(current);
      return !Number.isInteger(parsed) || parsed > values.length ? String(values.length) : current;
    });
  }, [values.length]);
  const numericValue = Number(rawValue);
  const index = Number(rawIndex);
  const hasValue = rawValue.trim() !== '' && Number.isFinite(numericValue);
  const hasIndex = rawIndex.trim() !== '' && Number.isInteger(index) && index >= 0;

  const commit = (next: number[]) => {
    if (onChange(next) === false) return;
    setRawValue('');
    setRawIndex(String(next.length));
  };

  const append = () => {
    if (!hasValue || values.length >= maxLength) return;
    commit([...values, numericValue]);
  };

  const insert = () => {
    if (!hasValue || !hasIndex || index > values.length || values.length >= maxLength) return;
    const next = [...values];
    next.splice(index, 0, numericValue);
    commit(next);
  };

  const remove = () => {
    if (!hasIndex || index >= values.length) return;
    const next = [...values];
    next.splice(index, 1);
    commit(next);
  };

  return (
    <div className="live-sequence-controls" role="group" aria-label={label}>
      <div className="live-sequence-controls__meta">
        <strong>{label}</strong>
        <span>{values.length} / {maxLength} values · changes apply immediately</span>
      </div>
      <div className="live-sequence-controls__fields">
        <label>
          <span>Value</span>
          <input
            type="number"
            step="any"
            value={rawValue}
            onChange={(event) => setRawValue(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && append()}
            placeholder="e.g. 42"
            aria-label="Value to add to sequence"
          />
        </label>
        <label>
          <span>Index</span>
          <input
            type="number"
            min={0}
            max={values.length}
            step={1}
            value={rawIndex}
            onChange={(event) => setRawIndex(event.target.value)}
            aria-label="Zero-based sequence index"
          />
        </label>
        <button type="button" className="bst-btn btn-mode" onClick={append} disabled={!hasValue || values.length >= maxLength}>
          <Plus size={14} /><span>Append</span>
        </button>
        <button type="button" className="bst-btn btn-mode" onClick={insert} disabled={!hasValue || !hasIndex || index > values.length || values.length >= maxLength}>
          <ArrowDownToLine size={14} /><span>Insert at index</span>
        </button>
        <button type="button" className="bst-btn btn-mode" onClick={remove} disabled={!hasIndex || index >= values.length}>
          <Trash2 size={14} /><span>Remove index</span>
        </button>
      </div>
      <p className="live-sequence-controls__hint">{hint}</p>
    </div>
  );
};
