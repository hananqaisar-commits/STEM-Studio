import { useState } from 'react';
import { Bookmark, Check, LoaderCircle } from 'lucide-react';
import { apiClient } from '../../api/apiClient';

interface SaveVisualizerSnapshotProps {
  moduleName: string;
  algorithmId: string;
  title: string;
  snapshot: Record<string, unknown>;
}

/** Persist the learner's input and playback position for a later resume. */
export function SaveVisualizerSnapshot({ moduleName, algorithmId, title, snapshot }: SaveVisualizerSnapshotProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);

  const saveSnapshot = async () => {
    if (saving) return;
    setSaving(true);
    setMessage('');
    setSaved(false);
    try {
      const dataset = JSON.stringify({ version: 1, ...snapshot });
      if (dataset.length > 5000) {
        setMessage('This snapshot is too large to save.');
        return;
      }
      await apiClient('/api/progress/sessions', {
        method: 'POST',
        requiresAuth: true,
        body: {
          title: `${title} · ${new Date().toLocaleString()}`.slice(0, 100),
          module_name: moduleName,
          algorithm_id: algorithmId,
          dataset_json: dataset,
        },
      });
      setSaved(true);
      setMessage('Snapshot saved to your dashboard.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this snapshot.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className="saved-snapshot-action">
      <button type="button" className="viz-action-btn" onClick={() => void saveSnapshot()} disabled={saving}>
        {saving ? <LoaderCircle size={14} className="saved-snapshot-spin" /> : saved ? <Check size={14} /> : <Bookmark size={14} />}
        <span>{saving ? 'Saving…' : saved ? 'Saved' : 'Save snapshot'}</span>
      </button>
      <span className="saved-snapshot-status" role="status" aria-live="polite">{message}</span>
    </span>
  );
}
