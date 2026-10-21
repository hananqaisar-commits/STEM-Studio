import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient, ApiError } from '../../api/apiClient';
import { CreditCard, Plus, RefreshCw, ShieldCheck, Trash2, WalletCards } from 'lucide-react';
import './OwnerBillingPanel.css';

type Feature = { feature_key: string; label: string; is_archived: boolean };
type Plan = {
  plan_id: number; code: string; name: string; description: string; price_minor: number; list_price_minor: number;
  discount_label: string | null; currency: 'PKR' | 'USD'; billing_interval: 'monthly' | 'yearly'; is_free: boolean;
  is_active: boolean; is_public: boolean; is_featured: boolean; safepay_plan_id: string | null; feature_keys: string[]; active_subscribers: number;
};
type ManualMethod = { payment_method_id: number; provider_key: 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'other'; label: string; account_name: string; account_identifier: string; instructions: string; currency: 'PKR' | 'USD'; is_active: boolean };
type Claim = { claim_id: number; user_id: number; username: string; email: string; plan_id: number; plan_name: string; amount_minor: number; currency: string; payment_method: string; transaction_reference: string; status: string; owner_note: string | null; created_at: string };
type Subscription = { subscription_id: number; user_id: number; username: string; email: string; plan_id: number; plan_name: string; provider: string; status: string; period_end: string | null };
type OwnerUser = { user_id: number; username: string; email: string; is_owner: boolean };
type AdConfig = { is_enabled: boolean; publisher_id: string; landing_slot_id: string; learner_slot_id: string };

const money = (minor: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(minor / 100);
const blankMethod = (): Omit<ManualMethod, 'payment_method_id'> => ({ provider_key: 'easypaisa', label: '', account_name: '', account_identifier: '', instructions: '', currency: 'PKR', is_active: true });

export function OwnerBillingPanel() {
  const [tab, setTab] = useState<'plans' | 'methods' | 'claims' | 'subscriptions' | 'ads'>('plans');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [methods, setMethods] = useState<ManualMethod[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [users, setUsers] = useState<OwnerUser[]>([]);
  const [ads, setAds] = useState<AdConfig>({ is_enabled: false, publisher_id: '', landing_slot_id: '', learner_slot_id: '' });
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [planDraft, setPlanDraft] = useState({ code: '', name: '', description: '', price: '', listPrice: '', discountLabel: '', interval: 'monthly' as 'monthly' | 'yearly', currency: 'PKR' as 'PKR' | 'USD', safepayId: '', featureKeys: [] as string[], isPublic: true, isFeatured: false });
  const [editingMethodId, setEditingMethodId] = useState<number | null>(null);
  const [methodDraft, setMethodDraft] = useState(blankMethod());
  const [featureQuery, setFeatureQuery] = useState('');
  const [grantDraft, setGrantDraft] = useState({ userId: '', planId: '', days: '30' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    const [planRows, featureRows, methodRows, claimRows, subscriptionRows, adConfig, userPage] = await Promise.all([
      apiClient<Plan[]>('/api/owner/billing/plans', { requiresAuth: true }),
      apiClient<Feature[]>('/api/owner/features', { requiresAuth: true }),
      apiClient<ManualMethod[]>('/api/owner/billing/manual-methods', { requiresAuth: true }),
      apiClient<Claim[]>('/api/owner/billing/manual-claims?limit=200', { requiresAuth: true }),
      apiClient<Subscription[]>('/api/owner/billing/subscriptions?limit=200', { requiresAuth: true }),
      apiClient<AdConfig>('/api/owner/billing/ads', { requiresAuth: true }),
      apiClient<{ items: OwnerUser[] }>('/api/owner/users?page=1&page_size=100', { requiresAuth: true }),
    ]);
    setPlans(planRows); setFeatures(featureRows); setMethods(methodRows); setClaims(claimRows);
    setSubscriptions(subscriptionRows); setAds(adConfig); setUsers(userPage.items.filter((user) => !user.is_owner));
  }, []);

  useEffect(() => { void refresh().catch((cause) => setError(cause instanceof Error ? cause.message : 'Billing controls could not load.')); }, [refresh]);
  const activeFeatures = useMemo(() => features.filter((feature) => !feature.is_archived), [features]);
  const filteredFeatures = useMemo(() => activeFeatures.filter((feature) => `${feature.label} ${feature.feature_key}`.toLowerCase().includes(featureQuery.toLowerCase())), [activeFeatures, featureQuery]);

  const run = async (task: () => Promise<void>, success: string) => {
    setBusy(true); setError(''); setNotice('');
    try { await task(); setNotice(success); await refresh(); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : cause instanceof Error ? cause.message : 'The owner request failed.'); }
    finally { setBusy(false); }
  };

  const resetPlan = () => { setEditingPlanId(null); setPlanDraft({ code: '', name: '', description: '', price: '', listPrice: '', discountLabel: '', interval: 'monthly', currency: 'PKR', safepayId: '', featureKeys: [], isPublic: true, isFeatured: false }); };
  const editPlan = (plan: Plan) => { setEditingPlanId(plan.plan_id); setPlanDraft({ code: plan.code, name: plan.name, description: plan.description, price: String(plan.price_minor / 100), listPrice: plan.list_price_minor > plan.price_minor ? String(plan.list_price_minor / 100) : '', discountLabel: plan.discount_label ?? '', interval: plan.billing_interval, currency: plan.currency, safepayId: plan.safepay_plan_id ?? '', featureKeys: plan.feature_keys, isPublic: plan.is_public, isFeatured: plan.is_featured }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const savePlan = () => run(async () => {
    const payload = { code: planDraft.code.trim().toLowerCase(), name: planDraft.name.trim(), description: planDraft.description.trim(), price_minor: Math.round(Number(planDraft.price) * 100), list_price_minor: planDraft.listPrice ? Math.round(Number(planDraft.listPrice) * 100) : undefined, discount_label: planDraft.discountLabel.trim() || undefined, currency: planDraft.currency, billing_interval: planDraft.interval, is_free: false, is_active: true, is_public: planDraft.isPublic, is_featured: planDraft.isFeatured, safepay_plan_id: planDraft.safepayId.trim() || undefined, feature_keys: planDraft.featureKeys };
    await apiClient(editingPlanId ? `/api/owner/billing/plans/${editingPlanId}` : '/api/owner/billing/plans', { method: editingPlanId ? 'PATCH' : 'POST', requiresAuth: true, body: payload });
    resetPlan();
  }, 'Plan saved. Existing subscriber prices stay tied to their version.');

  const retirePlan = (plan: Plan) => {
    if (plan.is_free || !window.confirm(`Retire ${plan.name} from new purchases? Current paid periods will keep their access until expiry.`)) return;
    void run(async () => {
      await apiClient(`/api/owner/billing/plans/${plan.plan_id}`, { method: 'DELETE', requiresAuth: true });
      if (editingPlanId === plan.plan_id) resetPlan();
    }, 'Plan retired from new purchases. Existing subscriptions remain valid through their period end.');
  };

  const saveMethod = () => run(async () => {
    await apiClient(editingMethodId ? `/api/owner/billing/manual-methods/${editingMethodId}` : '/api/owner/billing/manual-methods', { method: editingMethodId ? 'PATCH' : 'POST', requiresAuth: true, body: methodDraft });
    setEditingMethodId(null); setMethodDraft(blankMethod());
  }, 'Payment method saved.');

  const retireMethod = (method: ManualMethod) => {
    if (!window.confirm(`Remove ${method.label} from the payment options learners can select? Existing transfer records will remain for audit.`)) return;
    void run(async () => {
      await apiClient(`/api/owner/billing/manual-methods/${method.payment_method_id}`, { method: 'DELETE', requiresAuth: true });
      if (editingMethodId === method.payment_method_id) { setEditingMethodId(null); setMethodDraft(blankMethod()); }
    }, 'Payment method removed from new transfer claims. Existing records remain saved.');
  };

  const reviewClaim = (claim: Claim, approve: boolean) => {
    const prompt = approve ? `Confirm you checked the bank/wallet statement and verified ${claim.transaction_reference} for ${money(claim.amount_minor, claim.currency)} from ${claim.username}?` : `Reject transfer ${claim.transaction_reference} from ${claim.username}?`;
    if (!window.confirm(prompt)) return;
    void run(async () => {
      await apiClient(`/api/owner/billing/manual-claims/${claim.claim_id}/review`, { method: 'POST', requiresAuth: true, body: { approve, owner_note: '' } });
    }, approve ? 'Transfer verified; subscription access is active.' : 'Transfer claim rejected.');
  };

  const subscriptionAction = (row: Subscription, action: 'suspend' | 'restore' | 'end') => {
    if (!window.confirm(`${action === 'end' ? 'End' : action === 'suspend' ? 'Suspend' : 'Restore'} ${row.username}'s ${row.plan_name} access?`)) return;
    void run(async () => { await apiClient(`/api/owner/users/${row.user_id}/subscription`, { method: 'POST', requiresAuth: true, body: { action } }); }, `Subscription ${action} request completed.`);
  };

  const saveAds = () => run(async () => {
    await apiClient('/api/owner/billing/ads', { method: 'PUT', requiresAuth: true, body: ads });
  }, 'Advertisement settings saved.');

  const grantPlan = () => run(async () => {
    if (!grantDraft.userId || !grantDraft.planId) throw new Error('Choose a learner and a plan.');
    await apiClient(`/api/owner/users/${grantDraft.userId}/subscription`, { method: 'POST', requiresAuth: true, body: { action: 'grant', plan_id: Number(grantDraft.planId), duration_days: Number(grantDraft.days) } });
  }, 'Time-limited premium plan granted.');

  const tabs: Array<[typeof tab, string]> = [['plans', 'Plans & prices'], ['methods', 'Bank & wallets'], ['claims', 'Transfer reviews'], ['subscriptions', 'Subscriptions'], ['ads', 'Ads']];
  return <section className="owner-section owner-billing-panel">
    <div className="owner-section-heading"><div><p className="owner-eyebrow">Access, payments, and promotions</p><h2>Plans &amp; billing</h2></div><button className="owner-secondary" type="button" onClick={() => void refresh()} disabled={busy}><RefreshCw size={14} /> Refresh</button></div>
    <p className="owner-honesty-note">Premium access comes from the free/paid plan, an owner grant, a signed Safepay webhook, or a bank/wallet payment that you verify against your statement. This panel never collects card details. Safepay plan IDs and merchant credentials must match the charged recurring price.</p>
    <nav className="owner-billing-tabs">{tabs.map(([id, label]) => <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}{id === 'claims' && claims.filter((item) => item.status === 'pending').length > 0 && <b>{claims.filter((item) => item.status === 'pending').length}</b>}</button>)}</nav>
    {error && <p className="owner-feedback error">{error}</p>}{notice && <p className="owner-feedback success">{notice}</p>}

    {tab === 'plans' && <div className="owner-billing-columns">
      <form className="owner-billing-form" onSubmit={(event) => { event.preventDefault(); void savePlan(); }}>
        <h3>{editingPlanId ? 'Edit subscription plan' : 'Create monthly or yearly plan'}</h3>
        <div className="owner-billing-form-grid">
          <label>Plan code<input required minLength={2} maxLength={80} pattern="[a-z0-9][a-z0-9_-]*" value={planDraft.code} onChange={(e) => setPlanDraft({ ...planDraft, code: e.target.value })} placeholder="premium-monthly" /></label>
          <label>Plan name<input required minLength={2} maxLength={120} value={planDraft.name} onChange={(e) => setPlanDraft({ ...planDraft, name: e.target.value })} placeholder="Premium Monthly" /></label>
          <label>Billing interval<select value={planDraft.interval} onChange={(e) => setPlanDraft({ ...planDraft, interval: e.target.value as 'monthly' | 'yearly' })}><option value="monthly">Monthly</option><option value="yearly">Yearly</option></select></label>
          <label>Currency<select value={planDraft.currency} onChange={(e) => setPlanDraft({ ...planDraft, currency: e.target.value as 'PKR' | 'USD' })}><option>PKR</option><option>USD</option></select></label>
          <label>Amount charged each renewal<input type="number" min="1" step="0.01" required value={planDraft.price} onChange={(e) => setPlanDraft({ ...planDraft, price: e.target.value })} placeholder="e.g. 799" /></label>
          <label>Regular price (optional)<input type="number" min="0" step="0.01" value={planDraft.listPrice} onChange={(e) => setPlanDraft({ ...planDraft, listPrice: e.target.value })} placeholder="Show a discount against this" /></label>
          <label>Discount label<input maxLength={80} value={planDraft.discountLabel} onChange={(e) => setPlanDraft({ ...planDraft, discountLabel: e.target.value })} placeholder="Launch offer" /></label>
          <label>Safepay recurring plan ID<input maxLength={120} value={planDraft.safepayId} onChange={(e) => setPlanDraft({ ...planDraft, safepayId: e.target.value })} placeholder="Required for hosted card checkout" /></label>
        </div>
        <label>Description<textarea maxLength={1000} rows={2} value={planDraft.description} onChange={(e) => setPlanDraft({ ...planDraft, description: e.target.value })} /></label>
        <div className="owner-billing-check-row"><label><input type="checkbox" checked={planDraft.isPublic} onChange={(e) => setPlanDraft({ ...planDraft, isPublic: e.target.checked })} /> Show to new learners</label><label><input type="checkbox" checked={planDraft.isFeatured} onChange={(e) => setPlanDraft({ ...planDraft, isFeatured: e.target.checked })} /> Recommended</label></div>
        <fieldset className="owner-plan-features"><legend>Features included in this plan ({planDraft.featureKeys.length})</legend><input value={featureQuery} onChange={(e) => setFeatureQuery(e.target.value)} placeholder="Filter modules and algorithm topics" aria-label="Filter plan features" /><div>{filteredFeatures.map((feature) => <label key={feature.feature_key}><input type="checkbox" checked={planDraft.featureKeys.includes(feature.feature_key)} onChange={(e) => setPlanDraft({ ...planDraft, featureKeys: e.target.checked ? [...planDraft.featureKeys, feature.feature_key] : planDraft.featureKeys.filter((key) => key !== feature.feature_key) })} />{feature.label}</label>)}</div></fieldset>
        <p className="owner-billing-caption">Discounted recurring price stays in effect for existing subscriptions. Safepay’s plan must charge the displayed amount; use a new plan code and matching provider plan ID when changing price for new subscribers.</p>
        <div className="owner-billing-actions"><button className="owner-primary" type="submit" disabled={busy}><Plus size={14} />{busy ? 'Saving…' : editingPlanId ? 'Save plan' : 'Create plan'}</button>{editingPlanId && <button className="owner-secondary" type="button" onClick={resetPlan}>Cancel edit</button>}</div>
      </form>
      <div className="owner-billing-list"><h3>Available packages</h3>{plans.map((plan) => <article key={plan.plan_id}>
        <div><strong>{plan.name}</strong><small>{plan.is_free ? 'Free' : `${plan.billing_interval} · ${money(plan.price_minor, plan.currency)}`}{plan.list_price_minor > plan.price_minor && ` · was ${money(plan.list_price_minor, plan.currency)}`} · {plan.active_subscribers} subscribers</small><span>{plan.feature_keys.length} included features · {plan.is_public ? 'Listed' : 'Hidden'} · {plan.safepay_plan_id ? 'Card-ready' : 'Manual transfer only'}</span></div>
        <div className="owner-billing-actions"><button type="button" onClick={() => editPlan(plan)} disabled={busy || plan.is_free}>Edit</button>{!plan.is_free && <button type="button" onClick={() => retirePlan(plan)} disabled={busy || !plan.is_active}><Trash2 size={13} />{plan.is_active ? 'Retire' : 'Retired'}</button>}</div>
      </article>)}{!plans.length && <p className="owner-muted">No plans configured.</p>}</div>
    </div>}

    {tab === 'methods' && <div className="owner-billing-columns">
      <form className="owner-billing-form" onSubmit={(event) => { event.preventDefault(); void saveMethod(); }}><h3>{editingMethodId ? 'Edit payment method' : 'Add Easypaisa, JazzCash, or bank transfer'}</h3>
        <div className="owner-billing-form-grid"><label>Provider<select value={methodDraft.provider_key} onChange={(e) => setMethodDraft({ ...methodDraft, provider_key: e.target.value as ManualMethod['provider_key'] })}><option value="easypaisa">Easypaisa</option><option value="jazzcash">JazzCash</option><option value="bank_transfer">Bank transfer</option><option value="other">Other manual method</option></select></label><label>Display label<input required value={methodDraft.label} onChange={(e) => setMethodDraft({ ...methodDraft, label: e.target.value })} placeholder="Easypaisa wallet" /></label><label>Account holder<input required value={methodDraft.account_name} onChange={(e) => setMethodDraft({ ...methodDraft, account_name: e.target.value })} /></label><label>Account number / IBAN<input required value={methodDraft.account_identifier} onChange={(e) => setMethodDraft({ ...methodDraft, account_identifier: e.target.value })} /></label><label>Currency<select value={methodDraft.currency} onChange={(e) => setMethodDraft({ ...methodDraft, currency: e.target.value as 'PKR' | 'USD' })}><option>PKR</option><option>USD</option></select></label></div>
        <label>Instructions<textarea rows={3} maxLength={1000} value={methodDraft.instructions} onChange={(e) => setMethodDraft({ ...methodDraft, instructions: e.target.value })} /></label><label className="owner-billing-check-row"><input type="checkbox" checked={methodDraft.is_active} onChange={(e) => setMethodDraft({ ...methodDraft, is_active: e.target.checked })} /> Visible to learners</label>
        <div className="owner-billing-actions"><button className="owner-primary" type="submit" disabled={busy}><WalletCards size={14} />{editingMethodId ? 'Save method' : 'Add method'}</button>{editingMethodId && <button className="owner-secondary" type="button" onClick={() => { setEditingMethodId(null); setMethodDraft(blankMethod()); }}>Cancel</button>}</div>
      </form>
      <div className="owner-billing-list"><h3>Payment instructions shown to users</h3>{methods.map((method) => <article key={method.payment_method_id}><div><strong>{method.label}</strong><small>{method.account_name} · {method.account_identifier}</small><span>{method.currency} · {method.is_active ? 'Visible' : 'Hidden'}</span></div><div className="owner-billing-actions"><button type="button" onClick={() => { setEditingMethodId(method.payment_method_id); setMethodDraft({ provider_key: method.provider_key, label: method.label, account_name: method.account_name, account_identifier: method.account_identifier, instructions: method.instructions, currency: method.currency, is_active: method.is_active }); }}>Edit</button>{method.is_active && <button type="button" onClick={() => retireMethod(method)} disabled={busy}><Trash2 size={13} />Remove</button>}</div></article>)}</div>
    </div>}

    {tab === 'claims' && <div className="owner-billing-table"><div className="owner-billing-alert"><ShieldCheck size={16} /><span><strong>Verify the transfer in your actual bank or wallet statement first.</strong> A screenshot or user-entered reference alone is not proof of payment.</span></div><table><thead><tr><th>Learner</th><th>Plan / amount</th><th>Method / reference</th><th>Status</th><th>Action</th></tr></thead><tbody>{claims.map((claim) => <tr key={claim.claim_id}><td><strong>{claim.username}</strong><small>{claim.email}</small></td><td>{claim.plan_name}<small>{money(claim.amount_minor, claim.currency)}</small></td><td>{claim.payment_method}<small>{claim.transaction_reference}</small></td><td>{claim.status}</td><td>{claim.status === 'pending' ? <div className="owner-billing-actions"><button type="button" onClick={() => reviewClaim(claim, true)} disabled={busy}>Verify &amp; approve</button><button type="button" onClick={() => reviewClaim(claim, false)} disabled={busy}>Reject</button></div> : claim.owner_note}</td></tr>)}{!claims.length && <tr><td colSpan={5}>No transfer claims.</td></tr>}</tbody></table></div>}

    {tab === 'subscriptions' && <>
      <form className="owner-grant-plan" onSubmit={(event) => { event.preventDefault(); void grantPlan(); }}><div><h3>Grant a learner a temporary paid plan</h3><p>Does not mark a payment as received. The grant is recorded as owner-provided access and expires on its end date.</p></div><select aria-label="Select learner" value={grantDraft.userId} onChange={(e) => setGrantDraft({ ...grantDraft, userId: e.target.value })}><option value="">Choose learner</option>{users.map((target) => <option key={target.user_id} value={target.user_id}>{target.username} · {target.email}</option>)}</select><select aria-label="Select plan" value={grantDraft.planId} onChange={(e) => setGrantDraft({ ...grantDraft, planId: e.target.value })}><option value="">Choose plan</option>{plans.filter((plan) => !plan.is_free && plan.is_active).map((plan) => <option value={plan.plan_id} key={plan.plan_id}>{plan.name}</option>)}</select><input aria-label="Grant duration in days" type="number" min="1" max="366" value={grantDraft.days} onChange={(e) => setGrantDraft({ ...grantDraft, days: e.target.value })} /><button className="owner-primary" type="submit" disabled={busy}>Grant access</button></form>
      <div className="owner-billing-table"><table><thead><tr><th>Learner</th><th>Plan</th><th>Provider</th><th>Status</th><th>Period end</th><th>Actions</th></tr></thead><tbody>{subscriptions.map((row) => <tr key={row.subscription_id}><td><strong>{row.username}</strong><small>{row.email}</small></td><td>{row.plan_name}</td><td>{row.provider}</td><td>{row.status}</td><td>{row.period_end ? new Date(row.period_end).toLocaleString() : 'Not set'}</td><td><div className="owner-billing-actions">{row.status === 'active' && <button type="button" onClick={() => subscriptionAction(row, 'suspend')} disabled={busy}>Suspend</button>}{row.status === 'suspended' && <button type="button" onClick={() => subscriptionAction(row, 'restore')} disabled={busy}>Restore</button>}{['active','past_due','payment_hold','suspended'].includes(row.status) && <button type="button" onClick={() => subscriptionAction(row, 'end')} disabled={busy}>End</button>}</div></td></tr>)}{!subscriptions.length && <tr><td colSpan={6}>No subscriptions yet.</td></tr>}</tbody></table></div>
    </>}

    {tab === 'ads' && <section className="owner-ad-settings"><div><h3>Advertisements for free accounts</h3><p>Ads remain off until the site is approved in Google AdSense and you have the publisher ID plus both ad-slot IDs. This controls where approved AdSense placements may render; it does not create an AdSense account or guarantee ad serving.</p></div><label><input type="checkbox" checked={ads.is_enabled} onChange={(e) => setAds({ ...ads, is_enabled: e.target.checked })} /> Enable placements after approval</label><div className="owner-billing-form-grid"><label>Publisher ID<input value={ads.publisher_id} onChange={(e) => setAds({ ...ads, publisher_id: e.target.value })} placeholder="pub-0000000000000000" /></label><label>Landing page slot ID<input value={ads.landing_slot_id} onChange={(e) => setAds({ ...ads, landing_slot_id: e.target.value })} /></label><label>Learning page slot ID<input value={ads.learner_slot_id} onChange={(e) => setAds({ ...ads, learner_slot_id: e.target.value })} /></label></div><button className="owner-primary" type="button" onClick={() => void saveAds()} disabled={busy}>Save ad settings</button></section>}
  </section>;
}
