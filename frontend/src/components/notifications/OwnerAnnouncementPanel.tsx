import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, Megaphone, Send, Users, Trash2, RotateCw } from 'lucide-react';
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
  email_requested: boolean;
  email_audience_size: number;
  email_status: string;
  email_sent_count: number;
  email_failed_count: number;
}

interface AnnouncementAudience {
  active_verified_accounts: number;
  marketing_opt_in_accounts: number;
  email_configured: boolean;
}

const kindNames: Record<AnnouncementKind, string> = {
  announcement: 'General announcement',
  product_update: 'Product update',
  promotion: 'Promotion',
  maintenance: 'Service notice',
};

export function OwnerAnnouncementPanel() {
  const [audienceSize, setAudienceSize] = useState<number | null>(null);
  const [marketingAudienceSize, setMarketingAudienceSize] = useState<number | null>(null);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [history, setHistory] = useState<Announcement[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [kind, setKind] = useState<AnnouncementKind>('announcement');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [audience, announcements] = await Promise.all([
        apiClient<AnnouncementAudience>('/api/notifications/owner/audience-size', { requiresAuth: true }),
        apiClient<Announcement[]>('/api/notifications/owner/announcements', { requiresAuth: true }),
      ]);
      setAudienceSize(audience.active_verified_accounts);
      setMarketingAudienceSize(audience.marketing_opt_in_accounts);
      setEmailConfigured(audience.email_configured);
      setHistory(announcements);
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : 'Could not load announcement details.');
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!history.some((item) => item.email_status === 'queued')) return;
    const timer = window.setInterval(() => { void refresh(); }, 4000);
    return () => window.clearInterval(timer);
  }, [history, refresh]);

  const reviewDraft = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || title.trim().length < 4 || message.trim().length < 10) return;
    setBusy(true);
    setStatus('');
    try {
      const audience = await apiClient<AnnouncementAudience>(
        '/api/notifications/owner/audience-size',
        { requiresAuth: true },
      );
      setAudienceSize(audience.active_verified_accounts);
      setMarketingAudienceSize(audience.marketing_opt_in_accounts);
      setEmailConfigured(audience.email_configured);
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
        body: { title: title.trim(), message: message.trim(), kind, send_email: sendEmail },
        requiresAuth: true,
      });
      setTitle('');
      setMessage('');
      setConfirming(false);
      setAudienceSize(published.audience_size);
      setStatus(sendEmail
        ? published.email_status === 'queued'
          ? `Published in-app to ${published.audience_size.toLocaleString()} accounts. Email delivery is queued for ${published.email_audience_size.toLocaleString()} eligible recipients; progress will update in broadcast history.`
          : `Published in-app to ${published.audience_size.toLocaleString()} accounts. Email: ${published.email_sent_count.toLocaleString()} of ${published.email_audience_size.toLocaleString()} accepted by SMTP, ${published.email_failed_count.toLocaleString()} failed${published.email_status === 'no_recipients' ? ' (no eligible email recipients)' : ''}.`
        : `Published to ${published.audience_size.toLocaleString()} active, verified accounts. It is now in their in-app inbox.`);
      await refresh();
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : 'The announcement could not be published.');
    } finally {
      setBusy(false);
    }
  };

  const deleteBroadcasts = async (deleteAll: boolean) => {
    if (!deleteAll && selectedIds.length === 0) return;
    const count = history.filter((item) => deleteAll || selectedIds.includes(item.announcement_id)).length;
    if (!window.confirm(deleteAll
      ? 'Delete all broadcasts and their in-app read receipts and email delivery records? This cannot be undone.'
      : `Delete ${count} selected broadcasts and their read receipts/email delivery records? This cannot be undone.`)) return;
    setBusy(true); setStatus('');
    try {
      const result = await apiClient<{ deleted: number }>('/api/notifications/owner/announcements', {
        method: 'DELETE', requiresAuth: true, body: { announcement_ids: deleteAll ? [] : selectedIds, delete_all: deleteAll },
      });
      setSelectedIds([]);
      setStatus(`${result.deleted} broadcast(s) deleted.`);
      await refresh();
    } catch (error) { setStatus(error instanceof ApiError ? error.message : 'Broadcasts could not be deleted.'); }
    finally { setBusy(false); }
  };

  const retryEmail = async (item: Announcement) => {
    if (!window.confirm(`Queue a retry for failed email deliveries for “${item.title}”? Previously accepted messages will not be sent again.`)) return;
    setBusy(true); setStatus('');
    try {
      const result = await apiClient<{ retry_queued: number }>('/api/notifications/owner/announcements/' + item.announcement_id + '/retry-email', { method: 'POST', requiresAuth: true, body: {} });
      setStatus(`Queued ${result.retry_queued} failed email delivery${result.retry_queued === 1 ? '' : 'ies'} for retry.`);
      await refresh();
    } catch (error) { setStatus(error instanceof ApiError ? error.message : 'Email retry could not be queued.'); }
    finally { setBusy(false); }
  };

  const isPromotional = kind === 'promotion' || kind === 'product_update';
  const eligibleEmailCount = isPromotional ? marketingAudienceSize : audienceSize;

  return (
    <section className="owner-announcement-panel" aria-labelledby="owner-announcement-heading">
      <div className="owner-announcement-heading">
          <span className="owner-announcement-icon"><Megaphone size={18} aria-hidden="true" /></span>
        <div>
          <p className="owner-announcement-eyebrow">Owner tools</p>
          <h3 id="owner-announcement-heading">Broadcast to learners</h3>
          <p>Publish to the in-app inbox, and optionally email eligible accounts.</p>
        </div>
        <div className="owner-announcement-audience">
            <Users size={16} aria-hidden="true" />
          <strong>{audienceSize === null ? '—' : audienceSize.toLocaleString()}</strong>
          <span>in-app accounts</span>
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
        <label className="owner-announcement-email-toggle">
          <input type="checkbox" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} disabled={!emailConfigured || busy} />
          <span><strong>Email this message too</strong><small>{isPromotional
            ? `${eligibleEmailCount === null ? 'Checking' : eligibleEmailCount.toLocaleString()} active, verified accounts have opted in to product and promotional email.`
            : `${eligibleEmailCount === null ? 'Checking' : eligibleEmailCount.toLocaleString()} active, verified accounts can receive this service announcement by email.`}</small></span>
        </label>
        {!emailConfigured && <p className="owner-announcement-email-warning">Email is unavailable because backend SMTP credentials are not configured. In-app publishing still works.</p>}
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
            <p>This message will appear in their in-app inbox. {sendEmail
              ? `It will also be emailed to ${eligibleEmailCount?.toLocaleString() ?? 0} ${isPromotional ? 'opted-in promotional email subscribers' : 'active, verified accounts'}.`
              : 'No email will be sent.'} New accounts created later are not included.</p>
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
        <div className="owner-announcement-history-heading"><h4>Recent broadcasts</h4><label><input type="checkbox" checked={history.length > 0 && selectedIds.length === history.length} onChange={(event) => setSelectedIds(event.target.checked ? history.map((item) => item.announcement_id) : [])} /> Select all</label></div>
        {history.length > 0 && <div className="owner-announcement-delete-tools"><button type="button" onClick={() => void deleteBroadcasts(false)} disabled={busy || selectedIds.length === 0}><Trash2 size={13} /> Delete selected ({selectedIds.length})</button><button type="button" className="danger" onClick={() => void deleteBroadcasts(true)} disabled={busy}><Trash2 size={13} /> Delete all</button></div>}
        {history.length === 0 ? <p className="owner-announcement-empty">No broadcasts have been published yet.</p> : history.map((item) => (
          <article key={item.announcement_id}>
            <label className="owner-announcement-select"><input type="checkbox" checked={selectedIds.includes(item.announcement_id)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, item.announcement_id] : ids.filter((id) => id !== item.announcement_id))} aria-label={`Select broadcast ${item.title}`} /></label>
            <div><span>{kindNames[item.kind]}</span><time dateTime={item.published_at}>{new Date(item.published_at).toLocaleString()}</time></div>
            <strong>{item.title}</strong>
            <p>{item.message}</p>
            <small>In-app: {item.audience_size.toLocaleString()} accounts{item.email_requested
              ? ` · Email status: ${item.email_status} · SMTP accepted: ${item.email_sent_count.toLocaleString()} of ${item.email_audience_size.toLocaleString()}, failed: ${item.email_failed_count.toLocaleString()}${item.email_status === 'no_recipients' ? ' · no eligible recipients' : ''}`
              : ' · no email sent'}</small>
            {item.email_status === 'partial' || item.email_status === 'failed' ? <button className="owner-announcement-retry" type="button" disabled={busy} onClick={() => void retryEmail(item)}><RotateCw size={12} /> Retry failed emails</button> : null}
          </article>
        ))}
      </div>
      <p className="owner-announcement-email-note">Promotions and product updates go only to active, verified accounts that opted in under Settings → Account. General announcements and service notices can be emailed to all active, verified accounts. The owner never sees recipients’ email list in this screen. SMTP acceptance confirms the provider accepted a message; it does not guarantee inbox placement.</p>
    </section>
  );
}
