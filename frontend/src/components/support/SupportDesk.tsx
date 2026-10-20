import { useEffect, useState } from 'react';
import { LifeBuoy, Send, Inbox, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';
import { apiClient, ApiError } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { OwnerAnnouncementPanel } from '../notifications/OwnerAnnouncementPanel';
import './SupportDesk.css';

interface Ticket {
  ticket_id: number;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  owner_reply?: string | null;
  created_at: string;
  updated_at: string;
  username?: string;
  email?: string;
}

interface ReviewItem { review_id: number; name: string; role: string; rating: number; text: string; created_at: string; }

export function SupportDesk() {
  const { isAuthenticated } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pendingReviews, setPendingReviews] = useState<ReviewItem[]>([]);
  const [category, setCategory] = useState('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});

  const load = async () => {
    if (!isAuthenticated) return;
    try {
      const capability = await apiClient<{ is_owner: boolean }>('/api/support/capabilities', { requiresAuth: true });
      setIsOwner(capability.is_owner);
      const own = await apiClient<Ticket[]>('/api/support/tickets/mine', { requiresAuth: true });
      setTickets(own);
      if (capability.is_owner) {
        const inbox = await apiClient<Ticket[]>('/api/support/inbox', { requiresAuth: true });
        setTickets(inbox);
        const reviews = await apiClient<ReviewItem[]>('/api/stats/reviews/pending', { requiresAuth: true });
        setPendingReviews(reviews);
      }
    } catch {
      setStatusMessage('Support requests are temporarily unavailable. Your draft stays on screen.');
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    void load();
    const refresh = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(refresh);
  }, [isAuthenticated]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !subject.trim() || message.trim().length < 10) return;
    setBusy(true);
    setStatusMessage('');
    try {
      await apiClient<Ticket>('/api/support/tickets', {
        method: 'POST',
        body: { category, subject: subject.trim(), message: message.trim() },
        requiresAuth: true,
      });
      setSubject('');
      setMessage('');
      setStatusMessage('Sent to the STEM Studio owner inbox. You can track the response below.');
      await load();
    } catch (error) {
      setStatusMessage(error instanceof ApiError ? error.message : 'Could not send your request. Please try again.');
    } finally { setBusy(false); }
  };

  const updateTicket = async (ticket: Ticket, nextStatus: 'in_progress' | 'resolved' = 'in_progress') => {
    const reply = replyDrafts[ticket.ticket_id] ?? ticket.owner_reply ?? '';
    try {
      await apiClient(`/api/support/inbox/${ticket.ticket_id}`, {
        method: 'PATCH',
        body: { status: nextStatus, owner_reply: reply },
        requiresAuth: true,
      });
      await load();
    } catch (error) {
      setStatusMessage(error instanceof ApiError ? error.message : 'Could not update the support request.');
    }
  };

  const moderateReview = async (reviewId: number, approve: boolean) => {
    try {
      if (approve) {
        await apiClient(`/api/stats/reviews/${reviewId}/approve`, { method: 'PATCH', requiresAuth: true });
      } else {
        await apiClient(`/api/stats/reviews/${reviewId}`, { method: 'DELETE', requiresAuth: true });
      }
      const reviews = await apiClient<ReviewItem[]>('/api/stats/reviews/pending', { requiresAuth: true });
      setPendingReviews(reviews);
    } catch (error) {
      setStatusMessage(error instanceof ApiError ? error.message : 'Could not moderate the review.');
    }
  };

  return (
    <section className="support-desk" aria-labelledby="support-desk-title">
      <div className="support-desk-heading">
        <span className="support-desk-icon"><LifeBuoy size={19} aria-hidden="true" /></span>
        <div>
          <p className="support-desk-eyebrow">Help and feedback</p>
          <h2 id="support-desk-title">Send a question to the owner</h2>
          <p>Bug reports and questions are saved to your account and appear in the owner inbox.</p>
        </div>
        {isAuthenticated && <button className="support-refresh" type="button" onClick={() => void load()} aria-label="Refresh support inbox"><RefreshCw size={15} /></button>}
      </div>

      {!isAuthenticated ? (
        <p className="support-auth-note">Sign in to send a private support request and track its reply.</p>
      ) : (
        <div className="support-desk-grid">
          <form className="support-form" onSubmit={submit}>
            <label>Request type
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="bug">Report a bug</option>
                <option value="question">Ask a question</option>
                <option value="idea">Suggest an improvement</option>
              </select>
            </label>
            <label>Subject
              <input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={120} required placeholder="What do you need help with?" />
            </label>
            <label>Details
              <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} minLength={10} required rows={4} placeholder="Describe what happened, where you saw it, and what you expected." />
            </label>
            <div className="support-form-footer"><span>{message.length}/5000</span><button type="submit" disabled={busy || message.trim().length < 10}><Send size={15} />{busy ? 'Sending…' : 'Send to owner'}</button></div>
            {statusMessage && <p className="support-status" role="status">{statusMessage}</p>}
          </form>

          <div className="support-ticket-list">
            <h3><Inbox size={16} />{isOwner ? 'Owner inbox' : 'Your requests'} <span>{tickets.length}</span></h3>
            {tickets.length === 0 ? <p className="support-empty">No requests yet. Replies will appear here.</p> : tickets.map((ticket) => (
              <article className="support-ticket" key={ticket.ticket_id}>
                <div className="support-ticket-meta"><span>#{ticket.ticket_id} · {ticket.category}</span><span className={`support-ticket-status is-${ticket.status}`}>{ticket.status.replace('_', ' ')}</span></div>
                <h4>{ticket.subject}</h4>
                {isOwner && <p className="support-ticket-by">{ticket.username} · {ticket.email}</p>}
                <p className="support-ticket-message">{ticket.message}</p>
                {ticket.owner_reply && <p className="support-ticket-reply"><strong>Owner reply</strong>{ticket.owner_reply}</p>}
                {isOwner && <div className="support-owner-reply"><textarea aria-label={`Reply to request ${ticket.ticket_id}`} value={replyDrafts[ticket.ticket_id] ?? ticket.owner_reply ?? ''} onChange={(event) => setReplyDrafts((drafts) => ({ ...drafts, [ticket.ticket_id]: event.target.value }))} placeholder="Write a reply…" rows={2} /><div><button type="button" onClick={() => void updateTicket(ticket)}><CheckCircle2 size={14} />Save reply</button><button type="button" className="support-resolve-button" onClick={() => void updateTicket(ticket, 'resolved')}>Mark resolved</button></div></div>}
                <small><Clock3 size={12} />{new Date(ticket.created_at).toLocaleString()}</small>
              </article>
            ))}
            {isOwner && <section className="support-review-inbox">
              <h3>Review moderation <span>{pendingReviews.length}</span></h3>
              {pendingReviews.length === 0 ? <p className="support-empty">No reviews awaiting approval.</p> : pendingReviews.map((review) => <article className="support-ticket" key={review.review_id}>
                <div className="support-ticket-meta"><span>Review #{review.review_id} · {review.rating}/5 stars</span><span>{review.name} · {review.role}</span></div>
                <p className="support-ticket-message">{review.text}</p>
                <div className="support-review-actions"><button type="button" onClick={() => void moderateReview(review.review_id, true)}>Approve and publish</button><button type="button" onClick={() => void moderateReview(review.review_id, false)}>Reject</button></div>
              </article>)}
            </section>}
          </div>
        </div>
      )}
      {isAuthenticated && isOwner && <OwnerAnnouncementPanel />}
    </section>
  );
}
