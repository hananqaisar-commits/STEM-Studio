import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, KeyRound, RefreshCw, Search, ShieldCheck, Users, Megaphone, LifeBuoy, ScrollText } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { OwnerAnnouncementPanel } from '../../components/notifications/OwnerAnnouncementPanel';
import { SupportDesk } from '../../components/support/SupportDesk';
import './OwnerControlCenter.css';

type Overview = { registered_users: number; enabled_accounts: number; verified_accounts: number; audit_events: number; current_owner: string };
type OwnerUser = { user_id: number; username: string; email: string; is_active: boolean; is_verified: boolean; is_owner: boolean; created_at: string; active_sessions: number };
type AuditEvent = { event_id: number; actor: string; target?: string | null; action: string; outcome: string; details: Record<string, unknown>; created_at: string };
type UserPage = { items: OwnerUser[]; page: number; page_size: number; total: number };
type Section = 'overview' | 'users' | 'broadcasts' | 'support' | 'audit';

const sectionItems: { id: Section; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'broadcasts', label: 'Broadcasts', icon: Megaphone },
  { id: 'support', label: 'Support inbox', icon: LifeBuoy },
  { id: 'audit', label: 'Audit log', icon: ScrollText },
];

export function OwnerControlCenter() {
  const { user, logout } = useAuth();
  const [section, setSection] = useState<Section>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserPage | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthCode, setReauthCode] = useState('');

  const loadOverview = useCallback(async () => {
    const data = await apiClient<Overview>('/api/owner/overview', { requiresAuth: true });
    setOverview(data);
  }, []);

  const loadUsers = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), page_size: '25', q: query });
    if (activeFilter !== 'all') params.set('active', activeFilter);
    setUsers(await apiClient<UserPage>(`/api/owner/users?${params}`, { requiresAuth: true }));
  }, [activeFilter, page, query]);

  const loadAudit = useCallback(async () => {
    setAudit(await apiClient<AuditEvent[]>('/api/owner/audit?limit=100', { requiresAuth: true }));
  }, []);

  const loadVisibleSection = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      if (section === 'overview') await loadOverview();
      if (section === 'users') await loadUsers();
      if (section === 'audit') await loadAudit();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load owner data.');
    } finally {
      setBusy(false);
    }
  }, [loadAudit, loadOverview, loadUsers, section]);

  useEffect(() => { void loadVisibleSection(); }, [loadVisibleSection]);

  const updateStatus = async (target: OwnerUser) => {
    const nextActive = !target.is_active;
    if (!window.confirm(`${nextActive ? 'Restore' : 'Suspend'} ${target.username}? ${nextActive ? 'They can sign in again.' : 'Their active sessions will be revoked immediately.'}`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await apiClient(`/api/owner/users/${target.user_id}/status`, { method: 'PATCH', requiresAuth: true, body: { is_active: nextActive } });
      setNotice(`${target.username} ${nextActive ? 'restored' : 'suspended'} successfully.`);
      await Promise.all([loadUsers(), loadOverview(), loadAudit()]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update this account.'); }
    finally { setBusy(false); }
  };

  const revokeSessions = async (target: OwnerUser) => {
    if (!window.confirm(`Revoke all ${target.username}'s active sessions? They will need to sign in again.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiClient<{ sessions_revoked: number }>(`/api/owner/users/${target.user_id}/revoke-sessions`, { method: 'POST', requiresAuth: true, body: {} });
      setNotice(`${result.sessions_revoked} session(s) revoked for ${target.username}.`);
      await Promise.all([loadUsers(), loadAudit()]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to revoke sessions.'); }
    finally { setBusy(false); }
  };

  const reauthenticate = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await apiClient('/api/auth/owner-reauth', { method: 'POST', requiresAuth: true, body: { password: reauthPassword, mfa_code: reauthCode } });
      setReauthPassword(''); setReauthCode('');
      setNotice('Owner verification renewed for the next 10 minutes.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Re-authentication failed.'); }
    finally { setBusy(false); }
  };

  if (!user?.is_owner_session) {
    return <main className="owner-access-denied"><ShieldCheck size={28} /><h1>Owner verification required</h1><p>This control center is only available in an MFA-verified owner session.</p><a href="/login">Sign in as owner</a></main>;
  }

  return (
    <main className="owner-center">
      <header className="owner-center-header">
        <div><p className="owner-eyebrow">STEM Studio · Administration</p><h1>Owner Control Center</h1><p>Signed in as <strong>{user.username}</strong>. Every management request is checked by the server.</p></div>
        <button className="owner-refresh" type="button" onClick={() => void loadVisibleSection()} disabled={busy}><RefreshCw size={15} /> Refresh</button>
      </header>

      <section className="owner-reauth" aria-label="Sensitive action verification">
        <div className="owner-reauth-copy"><KeyRound size={17} /><div><strong>Verify sensitive changes</strong><span>Re-enter your password and current authenticator code to authorize high-impact changes for 10 minutes.</span></div></div>
        <form onSubmit={reauthenticate} className="owner-reauth-form">
          <input aria-label="Owner password" type="password" autoComplete="current-password" placeholder="Owner password" value={reauthPassword} onChange={(event) => setReauthPassword(event.target.value)} required />
          <input aria-label="Authenticator code" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" pattern="[0-9]{6}" maxLength={6} value={reauthCode} onChange={(event) => setReauthCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required />
          <button type="submit" disabled={busy}><Check size={14} /> Verify</button>
        </form>
      </section>

      <nav className="owner-section-nav" aria-label="Owner sections">
        {sectionItems.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={section === id ? 'active' : ''} onClick={() => { setSection(id); setError(''); setNotice(''); }}><Icon size={16} />{label}</button>)}
      </nav>

      {error && <p className="owner-feedback error" role="alert">{error}{error.toLowerCase().includes('recent owner mfa') && <span> Complete the verification form above, then retry.</span>}</p>}
      {notice && <p className="owner-feedback success" role="status">{notice}</p>}

      {section === 'overview' && <section className="owner-section">
        <div className="owner-section-heading"><div><p className="owner-eyebrow">Live database counts</p><h2>Platform overview</h2></div><button type="button" className="owner-secondary" onClick={() => void logout()}>End owner session</button></div>
        {busy && !overview ? <p className="owner-muted">Loading overview…</p> : overview && <div className="owner-stat-grid">
          <article><span>Registered users</span><strong>{overview.registered_users.toLocaleString()}</strong><small>Accounts stored in the database</small></article>
          <article><span>Enabled accounts</span><strong>{overview.enabled_accounts.toLocaleString()}</strong><small>Accounts permitted to sign in</small></article>
          <article><span>Verified accounts</span><strong>{overview.verified_accounts.toLocaleString()}</strong><small>Email-verified accounts</small></article>
          <article><span>Audit events</span><strong>{overview.audit_events.toLocaleString()}</strong><small>Recorded owner actions</small></article>
        </div>}
        <p className="owner-honesty-note">“Enabled accounts” means the account is not suspended. The platform does not currently track live human activity, so it does not label these users as online.</p>
      </section>}

      {section === 'users' && <section className="owner-section">
        <div className="owner-section-heading"><div><p className="owner-eyebrow">Accounts and sessions</p><h2>User management</h2></div><span className="owner-count">{users?.total ?? 0} accounts</span></div>
        <div className="owner-user-filters"><label><Search size={15} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search username or email" aria-label="Search users" /></label><select aria-label="Filter by account status" value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }}><option value="all">All accounts</option><option value="true">Enabled</option><option value="false">Suspended</option></select><button type="button" className="owner-secondary" onClick={() => void loadUsers()}><Search size={14} /> Search</button></div>
        <div className="owner-table-wrap"><table className="owner-table"><thead><tr><th>User</th><th>Status</th><th>Verified</th><th>Sessions</th><th>Created</th><th>Actions</th></tr></thead><tbody>
          {users?.items.map((target) => <tr key={target.user_id}><td><strong>{target.username}</strong><small>{target.email}</small></td><td><span className={`owner-status ${target.is_active ? 'enabled' : 'suspended'}`}>{target.is_active ? 'Enabled' : 'Suspended'}</span></td><td>{target.is_verified ? 'Verified' : 'Unverified'}</td><td>{target.active_sessions}</td><td>{new Date(target.created_at).toLocaleDateString()}</td><td><div className="owner-row-actions">{!target.is_owner && <><button type="button" onClick={() => void updateStatus(target)} disabled={busy}>{target.is_active ? 'Suspend' : 'Restore'}</button><button type="button" onClick={() => void revokeSessions(target)} disabled={busy}>Revoke sessions</button></>}</div></td></tr>)}
          {users && users.items.length === 0 && <tr><td colSpan={6} className="owner-empty">No matching accounts.</td></tr>}
        </tbody></table></div>
        <div className="owner-pagination"><span>Page {users?.page ?? page} of {Math.max(1, Math.ceil((users?.total ?? 0) / 25))}</span><div><button type="button" aria-label="Previous page" disabled={page <= 1 || busy} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button><button type="button" aria-label="Next page" disabled={!users || page * 25 >= users.total || busy} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></div>
      </section>}

      {section === 'broadcasts' && <OwnerAnnouncementPanel />}
      {section === 'support' && <SupportDesk />}
      {section === 'audit' && <section className="owner-section"><div className="owner-section-heading"><div><p className="owner-eyebrow">Administrative history</p><h2>Audit log</h2></div><span className="owner-count">Latest 100</span></div><div className="owner-audit-list">{audit.map((event) => <article key={event.event_id}><div><strong>{event.action.replaceAll('.', ' ')}</strong><span>{event.actor}{event.target ? ` → ${event.target}` : ''}</span></div><time>{new Date(event.created_at).toLocaleString()}</time><small>{event.outcome}{Object.keys(event.details).length ? ` · ${Object.entries(event.details).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}` : ''}</small></article>)}{audit.length === 0 && <p className="owner-empty">No administrative events have been recorded yet.</p>}</div></section>}
    </main>
  );
}
