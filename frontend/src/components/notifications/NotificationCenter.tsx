import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, Check, CheckCheck, Inbox, LoaderCircle, X } from 'lucide-react';
import { apiClient, ApiError } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import './NotificationCenter.css';

interface Announcement {
  announcement_id: number;
  title: string;
  message: string;
  kind: 'announcement' | 'product_update' | 'promotion' | 'maintenance';
  published_at: string;
  is_read: boolean;
}

interface NotificationInbox {
  unread_count: number;
  items: Announcement[];
}

const announcementLabels: Record<Announcement['kind'], string> = {
  announcement: 'Announcement',
  product_update: 'Product update',
  promotion: 'From STEM Studio',
  maintenance: 'Service notice',
};

export function NotificationCenter() {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inbox, setInbox] = useState<NotificationInbox>({ unread_count: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const result = await apiClient<NotificationInbox>('/api/notifications', { requiresAuth: true });
      setInbox(result);
      setError('');
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return;
      setError('Notifications could not be refreshed. Try again in a moment.');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setInbox({ unread_count: 0, items: [] });
      setIsOpen(false);
      return;
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthenticated, refresh]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) setIsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const markRead = async (announcementId: number) => {
    const current = inbox;
    const wasUnread = current.items.some((item) => item.announcement_id === announcementId && !item.is_read);
    setInbox({
      unread_count: Math.max(0, current.unread_count - (wasUnread ? 1 : 0)),
      items: current.items.map((item) => item.announcement_id === announcementId ? { ...item, is_read: true } : item),
    });
    try {
      await apiClient('/api/notifications/' + announcementId + '/read', { method: 'POST', requiresAuth: true });
      void refresh();
    } catch {
      setInbox(current);
      setError('Could not mark this message as read.');
    }
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      await apiClient('/api/notifications/read-all', { method: 'POST', requiresAuth: true });
      await refresh();
    } catch {
      setError('Could not mark notifications as read.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="expandable-tab-btn notification-bell-button"
        onClick={() => { setIsOpen((open) => !open); setError(''); }}
        aria-label={inbox.unread_count ? inbox.unread_count + ' unread notifications' : 'Notifications'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Notifications"
      >
        <Bell size={18} className="tab-icon" aria-hidden="true" />
        {inbox.unread_count > 0 && (
          <span className="notification-unread-badge" aria-hidden="true">
            {inbox.unread_count > 99 ? '99+' : inbox.unread_count}
          </span>
        )}
      </button>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {inbox.unread_count === 1 ? '1 unread notification' : `${inbox.unread_count} unread notifications`}
      </span>

      {isOpen && createPortal(
        <div className="notification-popover" ref={panelRef} role="dialog" aria-label="Notifications">
          <header className="notification-popover-header">
            <div>
              <p className="notification-eyebrow">Your updates</p>
              <h2>Notifications</h2>
              <span>{inbox.unread_count} unread</span>
            </div>
            <div className="notification-header-actions">
              {inbox.unread_count > 0 && (
                <button type="button" className="notification-mark-all" onClick={() => void markAllRead()} disabled={loading}>
                  {loading ? <LoaderCircle size={14} className="notification-spin" /> : <CheckCheck size={14} />}
                  <span>Mark all read</span>
                </button>
              )}
              <button type="button" className="notification-close" aria-label="Close notifications" onClick={() => setIsOpen(false)}>
                <X size={17} />
              </button>
            </div>
          </header>
          {error && <p className="notification-error" role="status">{error}</p>}
          <div className="notification-list">
            {inbox.items.length === 0 ? (
              <div className="notification-empty"><Inbox size={24} /><strong>You’re all caught up</strong><span>New studio announcements will appear here.</span></div>
            ) : inbox.items.map((item) => (
              <article className={'notification-item ' + (item.is_read ? '' : 'is-unread')} key={item.announcement_id}>
                <div className="notification-item-marker" aria-hidden="true">{item.is_read ? <Check size={13} /> : <span />}</div>
                <div className="notification-item-copy">
                  <div className="notification-item-meta">
                    <span>{announcementLabels[item.kind] ?? 'Announcement'}</span>
                    <time dateTime={item.published_at}>{new Date(item.published_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</time>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.message}</p>
                  {!item.is_read && <button type="button" className="notification-item-read" onClick={() => void markRead(item.announcement_id)}>Mark as read</button>}
                </div>
              </article>
            ))}
          </div>
          <footer className="notification-popover-footer">Updates from STEM Studio</footer>
        </div>,
        document.body,
      )}
    </>
  );
}
