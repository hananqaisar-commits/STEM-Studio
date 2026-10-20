import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Megaphone, Send, Users } from 'lucide-react';
import { apiClient, ApiError } from '../../api/apiClient';
import './OwnerAnnouncementPanel.css';

type AnnouncementKind = 'announcement' | 'product_update' | 'promotion' | 'maintenance';
interface Announcement {
  announcement_id: number;
  title: string;
  message: string;
  kind: AnnouncementKind;
  published_at: string;
  audience_size: number;
}

const kindNames: Record<AnnouncementKind, string> = {
  announcement: 'General announcement',
  product_update: 'Product update',
  promotion: 'Promotion',
  maintenance: 'Service notice',
};

export function OwnerAnnouncementPanel() {
  const [audienceSize, setAudienceSize] = useState<number | null>(null);
  const [history, setHistory] = useState<Announcement[]>([]);
  const [kind, setKind] = useState<AnnouncementKind>('announcement');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [audience, announcements] = await Promise.all([
        apiClient<{ active_verified_accounts: number }>('/api/notifications/owner/audience-size', { requiresAuth: true }),
        apiClient<Announcement[]>('/api/notifications/owner/announcements', { requiresAuth: true }),
      ]);
      setAudienceSize(audience.active_verified_accounts);
      setHistory(announcements);
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : 'Could not load announcement details.');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const reviewDraft = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || title.trim().length < 4 || message.trim().length < 10) return;
    setBusy(true);
    setStatus('');
    try {
      const audience = await apiClient<{ active_verified_accounts: number }>(
        '/api/notifications/owner/audience-size',
        { requiresAuth: true },
      );
      setAudienceSize(audience.active_verified_accounts);
      setConfirming(true);
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : 'Could not refresh the audience count. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (busy || audienceSize === null) return;
    setBusy(true);
    setStatus('');
    try {
      const published = await apiClient<Announcement>('/api/notifications/owner/announcements', {
        method: 'POST',
        body: { title: title.trim(), message: message.trim(), kind },
        requiresAuth: true,
      });
      setTitle('');
      setMessage('');
      setConfirming(false);
      setAudienceSize(published.audience_size);
      setStatus(`Published to ${published.audience_size.toLocaleString()} active, verified accounts. It is now in their in-app inbox.`);
      await refresh();
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : 'The announcement could not be published.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="owner-announcement-panel" aria-labelledby="owner-announcement-heading">
      <div className="owner-announcement-heading">
          <span className="owner-announcement-icon"><Megaphone size={18} aria-hidden="true" /></span>
        <div>
          <p className="owner-announcement-eyebrow">Owner tools</p>
          <h3 id="owner-announcement-heading">Broadcast to learners</h3>
          <p>Publish one in-app announcement to all active, verified accounts.</p>
        </div>
        <div className="owner-announcement-audience">
            <Users size={16} aria-hidden="true" />
          <strong>{audienceSize === null ? '—' : audienceSize.toLocaleString()}</strong>
          <span>accounts</span>
        </div>
      </div>

      <form className="owner-announcement-form" onSubmit={reviewDraft}>
        <div className="owner-announcement-form-row">
          <label>Message type
            <select value={kind} onChange={(event) => setKind(event.target.value as AnnouncementKind)}>
              {Object.entries(kindNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label className="owner-announcement-title-field">Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} minLength={4} maxLength={140} required placeholder="What should learners know?" />
          </label>
        </div>
        <label>Message
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={10} maxLength={3000} rows={4} required placeholder="Write a short, useful update for your learners." />
        </label>
        <div className="owner-announcement-footer">
          <span>{message.length}/3000</span>
          <button type="submit" disabled={busy || audienceSize === null || audienceSize === 0 || title.trim().length < 4 || message.trim().length < 10}>
            <Send size={15} aria-hidden="true" />{busy ? 'Checking audience…' : 'Review audience'}
          </button>
        </div>
      </form>

      {confirming && (
        <div className="owner-announcement-confirm" role="status">
          <AlertTriangle size={18} aria-hidden="true" />
          <div>
            <strong>Publish to {audienceSize?.toLocaleString()} active, verified accounts?</strong>
            <p>This message will appear in their in-app notification inbox. New accounts created later are not included.</p>
            <div className="owner-announcement-preview"><span>{kindNames[kind]}</span><b>{title.trim()}</b><p>{message.trim()}</p></div>
            <div className="owner-announcement-confirm-actions">
              <button type="button" className="owner-announcement-cancel" onClick={() => setConfirming(false)} disabled={busy}>Go back</button>
              <button type="button" className="owner-announcement-publish" onClick={() => void publish()} disabled={busy}>
                <Send size={14} aria-hidden="true" />{busy ? 'Publishing…' : 'Publish now'}
              </button>
            </div>
          </div>
        </div>
      )}
      {status && <p className="owner-announcement-status" role="status">{status}</p>}

      <div className="owner-announcement-history">
        <h4>Recent broadcasts</h4>
        {history.length === 0 ? <p className="owner-announcement-empty">No broadcasts have been published yet.</p> : history.slice(0, 5).map((item) => (
          <article key={item.announcement_id}>
            <div><span>{kindNames[item.kind]}</span><time dateTime={item.published_at}>{new Date(item.published_at).toLocaleString()}</time></div>
            <strong>{item.title}</strong>
            <p>{item.message}</p>
            <small>Published to {item.audience_size.toLocaleString()} accounts</small>
          </article>
        ))}
      </div>
      <p className="owner-announcement-email-note">This system sends in-app notifications. Bulk email is kept separate: professional promotional email requires a verified sender, subscriber consent, unsubscribe handling, and a bulk email provider.</p>
    </section>
  );
}
