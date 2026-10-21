import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, KeyRound, RefreshCw, Search, ShieldCheck, Users, Megaphone, LifeBuoy, ScrollText, Layers, Eye, Clock3, X } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { OwnerAnnouncementPanel } from '../../components/notifications/OwnerAnnouncementPanel';
import { SupportDesk } from '../../components/support/SupportDesk';
import './OwnerControlCenter.css';

type Overview = { registered_users: number; enabled_accounts: number; verified_accounts: number; audit_events: number; current_owner: string };
type OwnerUser = { user_id: number; username: string; email: string; is_active: boolean; is_verified: boolean; is_owner: boolean; created_at: string; active_sessions: number };
type FeaturePolicy = { feature_key: string; label: string; is_premium: boolean; is_enabled: boolean; updated_at: string | null };
type OwnerUserDetail = {
  profile: { user_id: number; username: string; email: string; first_name: string | null; last_name: string | null; phone: string | null; is_active: boolean; is_verified: boolean; is_owner: boolean; created_at: string; updated_at: string };
  learning: { quiz_count: number; correct_quiz_count: number; quiz_accuracy: number; current_streak: number; highest_streak: number; modules: Array<{ module_name: string; completed_algorithms: string; completion_percentage: number; updated_at: string }>; recent_quiz_attempts: Array<{ module_name: string; algorithm_id: string; question_prompt: string; selected_option: string; is_correct: boolean; created_at: string }>; saved_sessions: Array<{ session_id: number; title: string; module_name: string; algorithm_id: string; dataset_json: string; created_at: string }> };
  preferences: { theme: string | null; marketing_email_opt_in: boolean };
  tutor_learning_profile: { response_style: string; helpful_count: number; needs_detail_count: number; updated_at: string } | null;
  feature_overrides: Array<{ feature_key: string; granted: boolean; expires_at: string | null; updated_at: string }>;
  sessions: Array<{ created_at: string; expires_at: string; revoked_at: string | null }>;
  support_tickets: Array<{ ticket_id: number; category: string; subject: string; message: string; status: string; owner_reply: string | null; created_at: string; updated_at: string }>;
  recent_sign_in_activity: Array<{ attempted_at: string; successful: boolean }>;
};
type AuditEvent = { event_id: number; actor: string; target?: string | null; action: string; outcome: string; details: Record<string, unknown>; created_at: string };
type UserPage = { items: OwnerUser[]; page: number; page_size: number; total: number };
type Section = 'overview' | 'users' | 'features' | 'broadcasts' | 'support' | 'audit';

const sectionItems: { id: Section; label: string; icon: typeof Users }[] = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'features', label: 'Features & access', icon: Layers },
  { id: 'broadcasts', label: 'Broadcasts', icon: Megaphone },
  { id: 'support', label: 'Support inbox', icon: LifeBuoy },
  { id: 'audit', label: 'Audit log', icon: ScrollText },
];

function featureOverrideStatus(override: OwnerUserDetail['feature_overrides'][number]) {
  if (override.expires_at && new Date(override.expires_at).getTime() <= Date.now()) return 'Expired';
  return override.granted ? 'Granted' : 'Revoked';
}

export function OwnerControlCenter() {
  const { user, logout } = useAuth();
  const [section, setSection] = useState<Section>('overview');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserPage | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [features, setFeatures] = useState<FeaturePolicy[]>([]);
  const [selectedUser, setSelectedUser] = useState<OwnerUserDetail | null>(null);
  const [selectedFeature, setSelectedFeature] = useState('');
  const [grantExpiresAt, setGrantExpiresAt] = useState('');
  const [deleteUserConfirmation, setDeleteUserConfirmation] = useState('');
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

  const loadFeatures = useCallback(async () => {
    setFeatures(await apiClient<FeaturePolicy[]>('/api/owner/features', { requiresAuth: true }));
  }, []);

  const loadVisibleSection = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      if (section === 'overview') await loadOverview();
      if (section === 'users') await loadUsers();
      if (section === 'audit') await loadAudit();
      if (section === 'features') await loadFeatures();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load owner data.');
    } finally {
      setBusy(false);
    }
  }, [loadAudit, loadFeatures, loadOverview, loadUsers, section]);

  const loadUserDetail = async (target: OwnerUser) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const availableFeatures = features.length
        ? features
        : await apiClient<FeaturePolicy[]>('/api/owner/features', { requiresAuth: true });
      if (!features.length) setFeatures(availableFeatures);
      const detail = await apiClient<OwnerUserDetail>(`/api/owner/users/${target.user_id}`, { requiresAuth: true });
      setSelectedUser(detail);
      setDeleteUserConfirmation('');
      setSelectedFeature(availableFeatures[0]?.feature_key ?? '');
      setGrantExpiresAt('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load account details.'); }
    finally { setBusy(false); }
  };

  const updateFeaturePolicy = async (feature: FeaturePolicy, changes: Partial<Pick<FeaturePolicy, 'is_premium' | 'is_enabled'>>) => {
    const next = { is_premium: changes.is_premium ?? feature.is_premium, is_enabled: changes.is_enabled ?? feature.is_enabled };
    const changeLabel = changes.is_premium !== undefined
      ? (next.is_premium ? 'Mark this module as premium for learners without an override' : 'Make this module free for learners')
      : (next.is_enabled ? 'Enable this module platform-wide' : 'Disable this module platform-wide');
    if (!window.confirm(`${changeLabel}: ${feature.label}?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await apiClient(`/api/owner/features/${feature.feature_key}`, { method: 'PATCH', requiresAuth: true, body: next });
      setNotice(`${feature.label} access policy updated.`);
      await loadFeatures();
      await loadAudit();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update this feature.'); }
    finally { setBusy(false); }
  };

  const setUserFeature = async (granted: boolean) => {
    if (!selectedUser || !selectedFeature) return;
    const feature = features.find((item) => item.feature_key === selectedFeature);
    if (!window.confirm(`${granted ? 'Grant' : 'Revoke'} ${feature?.label ?? selectedFeature} access for ${selectedUser.profile.username}?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const expires = grantExpiresAt ? new Date(grantExpiresAt).toISOString() : null;
      await apiClient(`/api/owner/users/${selectedUser.profile.user_id}/features`, {
        method: 'PUT', requiresAuth: true, body: { feature_key: selectedFeature, granted, expires_at: expires },
      });
      const refreshed = await apiClient<OwnerUserDetail>(`/api/owner/users/${selectedUser.profile.user_id}`, { requiresAuth: true });
      setSelectedUser(refreshed);
      setNotice(`${feature?.label ?? 'Feature'} ${granted ? 'granted' : 'revoked'} for ${refreshed.profile.username}.`);
      await loadAudit();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to update user access.'); }
    finally { setBusy(false); }
  };

  const deleteManagedUser = async () => {
    if (!selectedUser || selectedUser.profile.is_owner || deleteUserConfirmation !== selectedUser.profile.username) return;
    if (!window.confirm(`Permanently delete ${selectedUser.profile.username} and their saved progress, sessions, quiz history, and support records? This cannot be undone.`)) return;
    const userId = selectedUser.profile.user_id;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiClient<{ deleted: boolean; username: string }>(`/api/owner/users/${userId}`, {
        method: 'DELETE', requiresAuth: true, body: { confirmation: 'DELETE', expected_username: deleteUserConfirmation },
      });
      setSelectedUser(null);
      setDeleteUserConfirmation('');
      setNotice(`${result.username} and their account data were permanently deleted.`);
      await Promise.all([loadUsers(), loadOverview(), loadAudit()]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to delete this account.'); }
    finally { setBusy(false); }
  };

  useEffect(() => { void loadVisibleSection(); }, [loadVisibleSection]);

  useEffect(() => {
    if (!selectedUser) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelectedUser(null); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [selectedUser]);

  const updateStatus = async (target: OwnerUser) => {
    const nextActive = !target.is_active;
    if (!window.confirm(`${nextActive ? 'Unblock' : 'Block'} ${target.username}? ${nextActive ? 'They can sign in again.' : 'Their active sessions will be revoked immediately.'}`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await apiClient(`/api/owner/users/${target.user_id}/status`, { method: 'PATCH', requiresAuth: true, body: { is_active: nextActive } });
      setNotice(`${target.username} ${nextActive ? 'unblocked' : 'blocked'} successfully.`);
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
          {users?.items.map((target) => <tr key={target.user_id}><td><strong>{target.username}</strong><small>{target.email}</small></td><td><span className={`owner-status ${target.is_active ? 'enabled' : 'suspended'}`}>{target.is_active ? 'Enabled' : 'Blocked'}</span></td><td>{target.is_verified ? 'Verified' : 'Unverified'}</td><td>{target.active_sessions}</td><td>{new Date(target.created_at).toLocaleDateString()}</td><td><div className="owner-row-actions"><button type="button" onClick={() => void loadUserDetail(target)} disabled={busy}><Eye size={13} /> Details</button>{!target.is_owner && <><button type="button" onClick={() => void updateStatus(target)} disabled={busy}>{target.is_active ? 'Block' : 'Unblock'}</button><button type="button" onClick={() => void revokeSessions(target)} disabled={busy}>Revoke sessions</button></>}</div></td></tr>)}
          {users && users.items.length === 0 && <tr><td colSpan={6} className="owner-empty">No matching accounts.</td></tr>}
        </tbody></table></div>
        <div className="owner-pagination"><span>Page {users?.page ?? page} of {Math.max(1, Math.ceil((users?.total ?? 0) / 25))}</span><div><button type="button" aria-label="Previous page" disabled={page <= 1 || busy} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button><button type="button" aria-label="Next page" disabled={!users || page * 25 >= users.total || busy} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></div>
      </section>}

      {section === 'features' && <section className="owner-section">
        <div className="owner-section-heading"><div><p className="owner-eyebrow">Global and individual entitlements</p><h2>Features &amp; access</h2></div><button type="button" className="owner-secondary" onClick={() => void loadFeatures()} disabled={busy}><RefreshCw size={14} /> Refresh</button></div>
        <p className="owner-honesty-note">Mark a module premium to require an owner-granted entitlement. Premium access here is manually managed; this project has no payment or subscription billing integration.</p>
        {busy && features.length === 0 ? <p className="owner-muted">Loading module policies…</p> : <div className="owner-feature-list">
          {features.map((feature) => <article className="owner-feature-row" key={feature.feature_key}>
            <div><strong>{feature.label}</strong><small>{feature.is_enabled ? (feature.is_premium ? 'Premium access required by default' : 'Available to all enabled accounts') : 'Disabled for all learner accounts'}</small></div>
            <label><input type="checkbox" checked={feature.is_premium} disabled={busy || !feature.is_enabled} onChange={(event) => void updateFeaturePolicy(feature, { is_premium: event.target.checked })} /><span>Premium</span></label>
            <label><input type="checkbox" checked={feature.is_enabled} disabled={busy} onChange={(event) => void updateFeaturePolicy(feature, { is_enabled: event.target.checked })} /><span>Enabled</span></label>
          </article>)}
        </div>}
      </section>}

      {section === 'broadcasts' && <OwnerAnnouncementPanel />}
      {section === 'support' && <SupportDesk />}
      {section === 'audit' && <section className="owner-section"><div className="owner-section-heading"><div><p className="owner-eyebrow">Administrative history</p><h2>Audit log</h2></div><span className="owner-count">Latest 100</span></div><div className="owner-audit-list">{audit.map((event) => <article key={event.event_id}><div><strong>{event.action.replaceAll('.', ' ')}</strong><span>{event.actor}{event.target ? ` → ${event.target}` : ''}</span></div><time>{new Date(event.created_at).toLocaleString()}</time><small>{event.outcome}{Object.keys(event.details).length ? ` · ${Object.entries(event.details).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}` : ''}</small></article>)}{audit.length === 0 && <p className="owner-empty">No administrative events have been recorded yet.</p>}</div></section>}

      {selectedUser && <div className="owner-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedUser(null); }}>
        <section className="owner-user-detail" role="dialog" aria-modal="true" aria-labelledby="owner-user-detail-title">
          <header className="owner-user-detail-header"><div><p className="owner-eyebrow">Account record · #{selectedUser.profile.user_id}</p><h2 id="owner-user-detail-title">{selectedUser.profile.username}</h2><p>{selectedUser.profile.email}</p></div><button type="button" aria-label="Close account details" onClick={() => setSelectedUser(null)}><X size={18} /></button></header>
          <div className="owner-detail-stats"><article><span>Quiz accuracy</span><strong>{selectedUser.learning.quiz_accuracy}%</strong></article><article><span>Quiz attempts</span><strong>{selectedUser.learning.quiz_count}</strong></article><article><span>Current streak</span><strong>{selectedUser.learning.current_streak}</strong></article><article><span>Active sessions</span><strong>{selectedUser.sessions.filter((session) => !session.revoked_at && new Date(session.expires_at).getTime() > Date.now()).length}</strong></article></div>
          <div className="owner-detail-grid">
            <section><h3>Profile &amp; preferences</h3><dl><dt>Name</dt><dd>{[selectedUser.profile.first_name, selectedUser.profile.last_name].filter(Boolean).join(' ') || 'Not provided'}</dd><dt>Phone</dt><dd>{selectedUser.profile.phone || 'Not provided'}</dd><dt>Account</dt><dd>{selectedUser.profile.is_active ? 'Enabled' : 'Blocked'} · {selectedUser.profile.is_verified ? 'Email verified' : 'Unverified'}</dd><dt>Created</dt><dd>{new Date(selectedUser.profile.created_at).toLocaleString()}</dd><dt>Promotional email</dt><dd>{selectedUser.preferences.marketing_email_opt_in ? 'Opted in' : 'Opted out'}</dd></dl></section>
            {selectedUser.tutor_learning_profile && <section><h3>Octa learning preferences</h3><dl><dt>Response style</dt><dd>{selectedUser.tutor_learning_profile.response_style}</dd><dt>Helpful feedback</dt><dd>{selectedUser.tutor_learning_profile.helpful_count}</dd><dt>Needs more detail</dt><dd>{selectedUser.tutor_learning_profile.needs_detail_count}</dd><dt>Last updated</dt><dd>{new Date(selectedUser.tutor_learning_profile.updated_at).toLocaleString()}</dd></dl></section>}
            <section><h3>Module progress</h3>{selectedUser.learning.modules.length ? selectedUser.learning.modules.map((module) => <div className="owner-detail-progress" key={module.module_name}><div><strong>{module.module_name}</strong><span>{module.completion_percentage}%</span></div><progress value={module.completion_percentage} max={100} /><small>{module.completed_algorithms}</small></div>) : <p className="owner-muted">No saved progress yet.</p>}</section>
            {!selectedUser.profile.is_owner && <section className="owner-detail-entitlements"><h3>Grant or revoke module access</h3><p className="owner-muted">An access grant cannot override a module that is disabled globally.</p><div className="owner-detail-grant-form"><select value={selectedFeature} onChange={(event) => setSelectedFeature(event.target.value)} aria-label="Choose module to grant"><option value="" disabled>Select a module</option>{features.map((feature) => <option value={feature.feature_key} key={feature.feature_key}>{feature.label}</option>)}</select><label>Optional expiry<input type="datetime-local" value={grantExpiresAt} onChange={(event) => setGrantExpiresAt(event.target.value)} /></label><div><button type="button" onClick={() => void setUserFeature(true)} disabled={busy || !selectedFeature}>Grant access</button><button type="button" className="owner-detail-revoke" onClick={() => void setUserFeature(false)} disabled={busy || !selectedFeature}>Revoke access</button></div></div><ul>{selectedUser.feature_overrides.map((override) => <li key={override.feature_key}><span>{features.find((feature) => feature.feature_key === override.feature_key)?.label ?? override.feature_key}</span><strong>{featureOverrideStatus(override)}{override.expires_at ? ` · until ${new Date(override.expires_at).toLocaleString()}` : ''}</strong></li>)}</ul></section>}
            <section><h3>Recent quizzes ({selectedUser.learning.recent_quiz_attempts.length})</h3><div className="owner-detail-scroll">{selectedUser.learning.recent_quiz_attempts.map((attempt, index) => <article className="owner-detail-record" key={`${attempt.algorithm_id}-${attempt.created_at}-${index}`}><strong>{attempt.module_name} · {attempt.algorithm_id}</strong><p>{attempt.question_prompt}</p><small>{attempt.is_correct ? 'Correct' : 'Incorrect'} · {attempt.selected_option} · {new Date(attempt.created_at).toLocaleString()}</small></article>)}{selectedUser.learning.recent_quiz_attempts.length === 0 && <p className="owner-muted">No quiz attempts recorded.</p>}</div></section>
            <section><h3>Saved visualizer sessions ({selectedUser.learning.saved_sessions.length})</h3><div className="owner-detail-scroll">{selectedUser.learning.saved_sessions.map((saved) => <details className="owner-detail-record" key={saved.session_id}><summary><strong>{saved.title}</strong><span>{saved.module_name} · {saved.algorithm_id} · {new Date(saved.created_at).toLocaleDateString()}</span></summary><pre>{saved.dataset_json}</pre></details>)}{selectedUser.learning.saved_sessions.length === 0 && <p className="owner-muted">No saved visualizer sessions.</p>}</div></section>
            <section><h3>Support tickets ({selectedUser.support_tickets.length})</h3><div className="owner-detail-scroll">{selectedUser.support_tickets.map((ticket) => <article className="owner-detail-record" key={ticket.ticket_id}><strong>{ticket.subject} · {ticket.status}</strong><p>{ticket.message}</p>{ticket.owner_reply && <small>Owner reply: {ticket.owner_reply}</small>}</article>)}{selectedUser.support_tickets.length === 0 && <p className="owner-muted">No support requests.</p>}</div></section>
            <section><h3>Sign-in activity</h3><ul className="owner-detail-events">{selectedUser.recent_sign_in_activity.map((event, index) => <li key={`${event.attempted_at}-${index}`}><span>{new Date(event.attempted_at).toLocaleString()}</span><strong>{event.successful ? 'Success' : 'Failed'}</strong></li>)}{selectedUser.recent_sign_in_activity.length === 0 && <li>No recorded sign-in attempts.</li>}</ul><h3 className="owner-session-heading"><Clock3 size={15} /> Session history</h3><ul className="owner-detail-events">{selectedUser.sessions.map((session, index) => <li key={`${session.created_at}-${index}`}><span>{new Date(session.created_at).toLocaleString()}</span><strong>{session.revoked_at ? 'Revoked' : new Date(session.expires_at).getTime() > Date.now() ? 'Active' : 'Expired'}</strong></li>)}</ul></section>
          </div>
          {!selectedUser.profile.is_owner && <section className="owner-delete-user"><div><strong>Delete this account permanently</strong><p>Removes the learner and their saved progress, quizzes, sessions, preferences, and support records. This cannot be undone.</p></div><label>Type <b>{selectedUser.profile.username}</b> to confirm<input value={deleteUserConfirmation} onChange={(event) => setDeleteUserConfirmation(event.target.value)} autoComplete="off" /></label><button type="button" onClick={() => void deleteManagedUser()} disabled={busy || deleteUserConfirmation !== selectedUser.profile.username}>Delete account and data</button></section>}
        </section>
      </div>}
    </main>
  );
}
