import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ChevronDown, CircleHelp, Pause, Play, RotateCcw,
  SkipBack, SkipForward, Sparkles,
} from 'lucide-react';
import type { RuntimeObject, RuntimeTraceEvent, RuntimeValue } from '../../api/liveCode';
import { LiveHeapVisualizer } from './LiveHeapVisualizer';

export type LiveExecutionStatus = 'idle' | 'draft' | 'waiting' | 'running' | 'ok' | 'error';

interface LiveRuntimeInspectorProps {
  status: LiveExecutionStatus;
  statusMessage: string;
  events: RuntimeTraceEvent[];
  source: string;
  stdout: string;
  outputRevision: string | null;
  error: string | null;
  language: string;
  traceLanguage: string;
  traceSupport: 'automatic' | 'not_available';
  traceTruncated: boolean;
  traceRevision: string | null;
  liveEnabled: boolean;
  onLiveEnabledChange: (enabled: boolean) => void;
  onRunNow: () => void;
  busy: boolean;
  tutorEnabled: boolean;
  onTutorEnabledChange: (enabled: boolean) => void;
  tutorHint: string | null;
  tutorReviewing: boolean;
  onActiveLineChange: (line: number | null) => void;
}

function formatScalar(value: RuntimeValue): string {
  if (value.kind === 'ref') return `→ @${value.object_id}`;
  if (value.kind === 'opaque') return value.preview ?? `<${value.type}>`;
  if (typeof value.value === 'string') return JSON.stringify(value.value);
  if (value.value === null) return 'None';
  if (typeof value.value === 'object') return JSON.stringify(value.value);
  return String(value.value);
}

function ObjectCard({ objectId, object }: { objectId: string; object: RuntimeObject }) {
  return (
    <details className="live-heap-object" open>
      <summary>
        <span className="live-object-id">@{objectId}</span>
        <span className="live-object-type">{object.type}</span>
        {object.truncated && <span className="live-object-muted">partial</span>}
      </summary>
      <dl>
        {object.entries.map((entry) => (
          <div className="live-heap-entry" key={`${objectId}:${entry.key}`}>
            <dt>{entry.key}</dt>
            <dd className={entry.value.kind === 'ref' ? 'is-reference' : ''}>
              {formatScalar(entry.value)}
            </dd>
          </div>
        ))}
        {object.entries.length === 0 && <div className="live-object-muted">No expandable fields</div>}
      </dl>
    </details>
  );
}

export const LiveRuntimeInspector: React.FC<LiveRuntimeInspectorProps> = ({
  status,
  statusMessage,
  events,
  source,
  stdout,
  outputRevision,
  error,
  language,
  traceLanguage,
  traceSupport,
  traceTruncated,
  traceRevision,
  liveEnabled,
  onLiveEnabledChange,
  onRunNow,
  busy,
  tutorEnabled,
  onTutorEnabledChange,
  tutorHint,
  tutorReviewing,
  onActiveLineChange,
}) => {
  const [eventIndex, setEventIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(650);
  const [scopeOpen, setScopeOpen] = useState(true);
  const [heapOpen, setHeapOpen] = useState(true);
  const activeEvent = events[eventIndex] ?? null;
  const activeFrame = activeEvent?.frames?.[activeEvent.frames.length - 1] ?? null;
  const sourceLine = useMemo(() => {
    if (!activeEvent || activeEvent.line < 1) return '';
    return source.split('\n')[activeEvent.line - 1] ?? '';
  }, [activeEvent, source]);
  const heapEntries = useMemo(() => Object.entries(activeEvent?.heap ?? {}).slice(0, 24), [activeEvent]);

  useEffect(() => {
    setEventIndex(events.length ? events.length - 1 : -1);
    setPlaying(false);
  }, [traceRevision, events.length]);

  useEffect(() => {
    onActiveLineChange(activeEvent?.line ?? null);
  }, [activeEvent?.line, onActiveLineChange]);

  useEffect(() => {
    if (!playing || events.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setEventIndex((current) => {
        if (current >= events.length - 1) {
          setPlaying(false);
          return events.length - 1;
        }
        return Math.max(0, current + 1);
      });
    }, speedMs);
    return () => window.clearInterval(timer);
  }, [playing, events.length, speedMs]);

  const statusClass = `live-status live-status-${status}`;
  const statusLabel = status === 'ok' && traceSupport === 'not_available'
    ? 'Program ran'
    : status === 'ok'
      ? 'Trace ready'
      : status === 'waiting'
        ? 'Waiting to trace'
        : status === 'running'
          ? 'Running'
          : status === 'draft'
            ? 'Draft changed'
            : status === 'error'
              ? 'Run failed'
              : 'Live trace';
  const traceIsCurrent = traceRevision != null
    && traceRevision === outputRevision
    && traceSupport === 'automatic';

  return (
    <section className="live-runtime-inspector" aria-label="Live program trace">
      <div className="live-inspector-toolbar">
        <div className="live-inspector-heading">
          <Activity size={15} aria-hidden="true" />
          <strong>Live trace</strong>
          <span className={statusClass} role="status" aria-live="polite">
            {busy && <span className="live-status-dot" />}
            {statusLabel}
          </span>
          {traceRevision && <span className="live-revision-label">{traceLanguage} {traceIsCurrent ? 'trace' : 'last trace'} {traceRevision}</span>}
        </div>
        <div className="live-inspector-actions">
          <label className="live-auto-toggle">
            <input
              type="checkbox"
              checked={liveEnabled}
              onChange={(event) => onLiveEnabledChange(event.target.checked)}
            />
            <span>Auto trace</span>
          </label>
          <button
            type="button"
            className={`live-octa-toggle${tutorEnabled ? ' enabled' : ''}`}
            aria-pressed={tutorEnabled}
            onClick={() => onTutorEnabledChange(!tutorEnabled)}
          >
            <Sparkles size={14} />
            Tutor {tutorEnabled ? 'on' : 'off'}
          </button>
          <button type="button" className="live-run-button" onClick={onRunNow} disabled={busy}>
            {busy ? <span className="live-status-dot" /> : <RotateCcw size={13} />}
            {busy ? 'Running' : 'Run now'}
          </button>
        </div>
      </div>

      <p className="live-status-message">{statusMessage}</p>

      {traceSupport === 'not_available' && (
        <div className="live-adapter-note" role="note">
          <CircleHelp size={14} aria-hidden="true" />
          <span>
            {language} programs run as complete programs and show their real output. Automatic line and object snapshots are not available for this runtime yet.
          </span>
        </div>
      )}

      {traceTruncated && (
        <div className="live-adapter-note" role="status">
          <CircleHelp size={14} aria-hidden="true" />
          <span>Trace limit reached. The program continued; only the first {events.length} runtime events are shown.</span>
        </div>
      )}

      {events.length > 0 && (
        <div className="live-playback-controls" aria-label="Trace playback controls">
          <button type="button" aria-label="First event" onClick={() => { setPlaying(false); setEventIndex(0); }} disabled={eventIndex <= 0}>
            <SkipBack size={14} />
          </button>
          <button type="button" aria-label="Previous event" onClick={() => { setPlaying(false); setEventIndex((index) => Math.max(0, index - 1)); }} disabled={eventIndex <= 0}>
            <SkipBack size={14} className="single-step-icon" />
          </button>
          <button type="button" aria-label={playing ? 'Pause trace' : 'Play trace'} onClick={() => {
            if (eventIndex >= events.length - 1) setEventIndex(0);
            setPlaying((value) => !value);
          }} disabled={events.length < 2}>
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button type="button" aria-label="Next event" onClick={() => { setPlaying(false); setEventIndex((index) => Math.min(events.length - 1, index + 1)); }} disabled={eventIndex >= events.length - 1}>
            <SkipForward size={14} className="single-step-icon" />
          </button>
          <button type="button" aria-label="Last event" onClick={() => { setPlaying(false); setEventIndex(events.length - 1); }} disabled={eventIndex >= events.length - 1}>
            <SkipForward size={14} />
          </button>
          <input
            className="live-event-range"
            type="range"
            min={0}
            max={Math.max(0, events.length - 1)}
            value={Math.max(0, eventIndex)}
            onChange={(event) => { setPlaying(false); setEventIndex(Number(event.target.value)); }}
            aria-label="Trace event position"
          />
          <span className="live-event-count">{eventIndex + 1} / {events.length}</span>
          <select aria-label="Trace playback speed" value={speedMs} onChange={(event) => setSpeedMs(Number(event.target.value))}>
            <option value={1000}>0.5×</option>
            <option value={650}>1×</option>
            <option value={350}>2×</option>
          </select>
        </div>
      )}

      {activeEvent && (
        <div className="live-current-step">
          <div className="live-current-step-meta">
            <span>#{activeEvent.seq + 1}</span>
            <span>{activeEvent.kind}</span>
            <span>{activeEvent.function}</span>
            <span>line {activeEvent.line}</span>
          </div>
          {sourceLine && <code className="live-current-source-line">{sourceLine.trim() || ' '}</code>}
        </div>
      )}

      <LiveHeapVisualizer event={activeEvent} />

      {(tutorHint || tutorReviewing) && (
        <div className="live-octa-feedback" role="status">
          <Sparkles size={14} />
          {tutorReviewing ? <span>OctaTutor is reviewing this run…</span> : <span>{tutorHint}</span>}
        </div>
      )}

      <details className="live-supporting-details">
        <summary><ChevronDown size={13} /> Variables, heap details, and run information</summary>
      <div className="live-inspector-grid">
        <section className="live-inspector-section">
          <button type="button" className="live-section-heading" onClick={() => setScopeOpen((value) => !value)} aria-expanded={scopeOpen}>
            <ChevronDown size={13} className={scopeOpen ? '' : 'collapsed'} />
            <span>Scope</span>
            <span className="live-count-badge">{Object.keys(activeFrame?.scope ?? {}).length}</span>
          </button>
          {scopeOpen && (
            <div className="live-scope-content">
              {activeFrame && Object.entries(activeFrame.scope).length > 0 ? (
                Object.entries(activeFrame.scope).map(([name, value]) => (
                  <div className="live-scope-row" key={name}>
                    <code>{name}</code>
                    <span className={value.kind === 'ref' ? 'is-reference' : ''}>{formatScalar(value)}</span>
                    <small>{value.type}</small>
                  </div>
                ))
              ) : <p className="live-empty-note">No local variables in this frame.</p>}
            </div>
          )}
        </section>

        <section className="live-inspector-section">
          <button type="button" className="live-section-heading" onClick={() => setHeapOpen((value) => !value)} aria-expanded={heapOpen}>
            <ChevronDown size={13} className={heapOpen ? '' : 'collapsed'} />
            <span>Heap and references</span>
            <span className="live-count-badge">{heapEntries.length}{Object.keys(activeEvent?.heap ?? {}).length > heapEntries.length ? '+' : ''}</span>
          </button>
          {heapOpen && (
            <div className="live-heap-list">
              {heapEntries.length > 0
                ? heapEntries.map(([objectId, object]) => <ObjectCard key={objectId} objectId={objectId} object={object} />)
                : <p className="live-empty-note">Objects appear here when the program creates or references them.</p>}
            </div>
          )}
        </section>

        {activeEvent?.frames?.length > 1 && (
          <section className="live-inspector-section live-call-stack-section">
            <div className="live-section-heading static-heading">
              <span>Call stack</span>
              <span className="live-count-badge">{activeEvent.frames.length}</span>
            </div>
            <ol className="live-call-stack">
              {activeEvent.frames.slice().reverse().map((frame, index) => (
                <li className={index === 0 ? 'active' : ''} key={`${frame.function}:${frame.line}:${index}`}>
                  <span>{activeEvent.frames.length - index - 1}</span>
                  <code>{frame.function}</code>
                  <small>line {frame.line}</small>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      {(stdout || error) && (
        <section className="live-output-section" aria-label="Program output">
          <strong>{error ? 'Run details' : 'Program output'}{outputRevision ? ` · ${outputRevision}` : ''}</strong>
          {error && <pre className="live-error-output">{error}</pre>}
          {stdout && <pre>{stdout}</pre>}
        </section>
      )}

      <div className="live-octa-row">
        {tutorEnabled && <span className="live-octa-note">OctaTutor sends this program and available run output or trace to your configured tutor service. It labels source-based suggestions when runtime snapshots are unavailable.</span>}
        {!tutorEnabled && <span className="live-octa-off-note">Proactive trace hints are paused for this category.</span>}
      </div>
      </details>
    </section>
  );
};
