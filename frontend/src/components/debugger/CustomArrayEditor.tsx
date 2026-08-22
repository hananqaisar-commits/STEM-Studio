import React, { useState } from 'react';
import { Edit3, Check, X } from 'lucide-react';
import './Debugger.css';

interface CustomArrayEditorProps {
  currentArray: number[];
  onApplyCustomArray: (newArray: number[]) => void;
  onClose: () => void;
}

export const CustomArrayEditor: React.FC<CustomArrayEditorProps> = ({
  currentArray,
  onApplyCustomArray,
  onClose,
}) => {
  const [inputText, setInputText] = useState(currentArray.join(', '));
  const [error, setError] = useState<string | null>(null);

  const handleApply = () => {
    try {
      const parsed = inputText
        .split(',')
        .map((val) => val.trim())
        .filter((val) => val !== '')
        .map((val) => {
          const num = Number(val);
          if (isNaN(num)) throw new Error(`Invalid number '${val}'`);
          return Math.min(100, Math.max(5, num)); // Keep values in 5-100 range for display
        });

      if (parsed.length < 3) {
        setError('Please enter at least 3 numbers.');
        return;
      }

      if (parsed.length > 50) {
        setError('Maximum array limit is 50 numbers.');
        return;
      }

      onApplyCustomArray(parsed);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Invalid input format');
    }
  };

  return (
    <div className="custom-editor-overlay animate-fade-in">
      <div className="custom-editor-modal">
        <div className="modal-header">
          <Edit3 size={18} />
          <h3>Custom Array Editor</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <label className="editor-label">Enter comma-separated numbers (e.g. 45, 12, 89, 7, 23, 60):</label>
          <textarea
            className="custom-array-textarea"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setError(null);
            }}
            rows={3}
            placeholder="e.g. 42, 18, 95, 4, 30"
          />

          {error && <div className="editor-error-msg">{error}</div>}

          <div className="preset-buttons">
            <span className="preset-label">Quick Presets:</span>
            <button
              className="preset-chip"
              onClick={() => setInputText('50, 40, 30, 20, 10, 5')}
            >
              Strict Worst Case
            </button>
            <button
              className="preset-chip"
              onClick={() => setInputText('10, 20, 30, 40, 50, 60')}
            >
              Already Sorted
            </button>
            <button
              className="preset-chip"
              onClick={() => setInputText('42, 7, 19, 88, 3, 15, 62, 29')}
            >
              Random Mixed
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="modal-btn apply" onClick={handleApply}>
            <Check size={16} />
            Apply Custom Values
          </button>
        </div>
      </div>
    </div>
  );
};
