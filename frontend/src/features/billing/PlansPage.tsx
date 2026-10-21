import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Clock3, CreditCard, LockKeyhole, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react';
import { apiClient, ApiError } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { SEOHead } from '../../components/common/SEOHead';
import './PlansPage.css';

type Plan = {
  plan_id: number; code: string; name: string; description: string; price_minor: number;
  list_price_minor: number; discount_label: string | null; currency: string; billing_interval: 'monthly' | 'yearly';
  is_free: boolean; is_featured: boolean; safepay_ready?: boolean;
  features: Array<{ feature_key: string; label: string }>;
};
type PaymentMethod = { payment_method_id: number; provider_key: string; label: string; account_name: string; account_identifier: string; instructions: string; currency: string };
type BillingState = {
  effective_plan: { name: string; is_free: boolean };
  subscription: { subscription_id: number; status: string; provider: string; period_end: string | null; cancel_at_period_end?: boolean } | null;
  manual_claims: Array<{ claim_id: number; status: string; transaction_reference: string; created_at: string; owner_note: string | null }>;
};

const formatPrice = (minor: number, currency: string) => new Intl.NumberFormat(undefined, {
  style: 'currency', currency, maximumFractionDigits: 2,
}).format(minor / 100);

export function PlansPage() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [billing, setBilling] = useState<BillingState | null>(null);
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<number | null>(null);
  const [transactionReference, setTransactionReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const featureKey = new URLSearchParams(location.search).get('feature');
  const checkoutState = new URLSearchParams(location.search).get('checkout');
  const featureLabel = useMemo(() => featureKey?.split('.').slice(-1)[0]?.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ') ?? '', [featureKey]);

  const refresh = useCallback(async () => {
    const [publicData, paymentData] = await Promise.all([
      apiClient<{ plans: Plan[] }>('/api/billing/plans'),
      apiClient<PaymentMethod[]>('/api/billing/payment-methods'),
    ]);
    setPlans(publicData.plans);
    setMethods(paymentData);
    if (isAuthenticated) setBilling(await apiClient<BillingState>('/api/billing/me', { requiresAuth: true }));
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError('');
    refresh().catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Plans could not be loaded.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refresh]);

  useEffect(() => {
    if (checkoutState !== 'return' || !isAuthenticated) return;
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      void apiClient<BillingState>('/api/billing/me', { requiresAuth: true }).then((value) => {
        setBilling(value);
        if (value.subscription?.status === 'active' || attempts >= 8) {
          window.clearInterval(timer);
          setNotice(value.subscription?.status === 'active'
            ? 'Payment confirmed. Your plan is active.'
            : 'Checkout returned. We are still waiting for the payment provider’s signed confirmation; access stays unchanged until it arrives.');
        }
      }).catch(() => { if (attempts >= 8) window.clearInterval(timer); });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [checkoutState, isAuthenticated]);

  const startCheckout = async (plan: Plan) => {
    if (!isAuthenticated) { navigate('/signup?next=%2Fplans'); return; }
    if (!plan.safepay_ready) { setSelectedPlan(plan); setNotice('This plan has no hosted card checkout configured. Choose a listed wallet or bank transfer method.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiClient<{ checkout_url: string }>('/api/billing/checkout', {
        method: 'POST', requiresAuth: true, body: { plan_id: plan.plan_id },
      });
      window.location.assign(result.checkout_url);
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Hosted checkout could not be started.'); }
    finally { setBusy(false); }
  };

  const submitTransfer = async () => {
    if (!selectedPlan || !selectedMethod || !transactionReference.trim()) return;
    if (!isAuthenticated) { navigate('/signup?next=%2Fplans'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await apiClient<{ message: string }>('/api/billing/manual-claims', {
        method: 'POST', requiresAuth: true,
        body: { plan_id: selectedPlan.plan_id, payment_method_id: selectedMethod, transaction_reference: transactionReference.trim() },
      });
      setTransactionReference('');
      setNotice(result.message);
      setBilling(await apiClient<BillingState>('/api/billing/me', { requiresAuth: true }));
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Transfer reference could not be submitted.'); }
    finally { setBusy(false); }
  };

  const cancelRenewal = async () => {
    const subscription = billing?.subscription;
    if (!subscription || subscription.provider !== 'safepay' || subscription.cancel_at_period_end) return;
    if (!window.confirm('Turn off the next renewal? Premium access remains available through the period you already paid for.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await apiClient(`/api/billing/subscription/${subscription.subscription_id}/cancel`, {
        method: 'POST', requiresAuth: true, body: {},
      });
      await refresh();
      setNotice('Renewal cancelled. Your current paid access remains active until the period end date.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The renewal could not be cancelled.');
    } finally { setBusy(false); }
  };

  const visiblePlans = plans.filter((plan) => plan.is_free || plan.billing_interval === interval);
  return (
    <main className="plans-page">
      <SEOHead title="Plans & Premium Access | STEM Studio" noIndex={false} />
      <header className="plans-header">
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="plans-back"><ArrowLeft size={16} /> Back to studio</Link>
        <div className="plans-brand"><span className="plans-brand-mark">STEM</span><span>Studio plans</span></div>
        {!isAuthenticated && <Link className="plans-login" to="/login">Sign in</Link>}
      </header>
      <section className="plans-intro">
        <span className="plans-kicker"><LockKeyhole size={14} /> Premium access</span>
        <h1>Pick up where the next topic begins.</h1>
        <p>Unlock visualizers and learning modules with a verified plan. A successful redirect alone does not grant access; the server waits for payment confirmation.</p>
        {featureKey && <div className="plans-feature-callout"><LockKeyhole size={16} /><span><strong>{featureLabel || 'This learning feature'}</strong> requires a premium plan or an owner-granted entitlement.</span></div>}
        {billing && <p className="plans-current-plan"><ShieldCheck size={15} /> Signed in as {user?.username} · Current plan: <strong>{billing.effective_plan.name}</strong></p>}
      </section>

      {checkoutState === 'cancelled' && <p className="plans-feedback">Checkout was cancelled. No premium access was added.</p>}
      {notice && <p className="plans-feedback success" role="status">{notice}</p>}
      {error && <p className="plans-feedback error" role="alert">{error}</p>}

      {billing?.subscription?.status === 'active' && <section className="plans-active-banner"><Check size={18} /><div><strong>{billing.effective_plan.name} is active</strong><span>{billing.subscription.cancel_at_period_end ? 'Renewal is off. ' : ''}Access through {billing.subscription.period_end ? new Date(billing.subscription.period_end).toLocaleDateString() : 'the current billing period'}.</span></div>{billing.subscription.provider === 'safepay' && !billing.subscription.cancel_at_period_end && <button type="button" className="plan-cancel-renewal" disabled={busy} onClick={() => void cancelRenewal()}>{busy ? 'Updating…' : 'Turn off renewal'}</button>}</section>}

      <div className="plans-interval" role="group" aria-label="Billing interval">
        <button type="button" className={interval === 'monthly' ? 'active' : ''} onClick={() => setInterval('monthly')}>Monthly</button>
        <button type="button" className={interval === 'yearly' ? 'active' : ''} onClick={() => setInterval('yearly')}>Yearly <span>Annual plan</span></button>
      </div>

      {loading ? <p className="plans-loading"><RefreshCw size={15} /> Loading plans…</p> : visiblePlans.length ? <section className="plans-grid" aria-label="Available plans">
        {visiblePlans.map((plan) => <article className={`plan-card ${plan.is_featured ? 'featured' : ''}`} key={plan.plan_id}>
          {plan.is_featured && <span className="plan-featured-label">Recommended</span>}
          <p className="plan-interval-label">{plan.is_free ? 'Always available' : `${plan.billing_interval} billing`}</p>
          <h2>{plan.name}</h2><p className="plan-description">{plan.description}</p>
          <div className="plan-price"><strong>{formatPrice(plan.price_minor, plan.currency)}</strong><span>{plan.is_free ? 'forever' : `/${plan.billing_interval === 'monthly' ? 'month' : 'year'}`}</span></div>
          {!plan.is_free && plan.list_price_minor > plan.price_minor && <p className="plan-discount"><s>{formatPrice(plan.list_price_minor, plan.currency)}</s>{plan.discount_label && <span>{plan.discount_label}</span>} <small>Price charged each renewal</small></p>}
          <ul>{plan.features.map((feature) => <li key={feature.feature_key}><Check size={14} />{feature.label}</li>)}</ul>
          {plan.is_free ? <Link className="plan-cta secondary" to={isAuthenticated ? '/dashboard' : '/signup'}>{isAuthenticated ? 'Continue free' : 'Create free account'}</Link> : <button className="plan-cta" type="button" onClick={() => void startCheckout(plan)} disabled={busy}>{plan.safepay_ready ? <><CreditCard size={15} /> Subscribe securely</> : <><WalletCards size={15} /> Choose payment method</>}</button>}
        </article>)}
      </section> : !loading && <p className="plans-empty">Paid plans have not been configured yet. The free plan remains available.</p>}

      {selectedPlan && <section className="transfer-panel" aria-labelledby="transfer-heading">
        <div><p className="plans-kicker"><WalletCards size={14} /> Local payment method</p><h2 id="transfer-heading">Pay with bank or wallet transfer</h2><p>Select a configured method, complete the transfer in your own banking app, then submit its reference. An owner checks the account statement before access begins.</p></div>
        {!methods.length ? <p className="plans-empty">No Easypaisa, JazzCash, or bank transfer details are configured yet.</p> : <div className="transfer-grid">
          <label>Plan<select value={selectedPlan.plan_id} onChange={(event) => setSelectedPlan(plans.find((item) => item.plan_id === Number(event.target.value)) ?? selectedPlan)}>{plans.filter((item) => !item.is_free).map((item) => <option key={item.plan_id} value={item.plan_id}>{item.name} · {formatPrice(item.price_minor, item.currency)}</option>)}</select></label>
          <label>Payment method<select value={selectedMethod ?? ''} onChange={(event) => setSelectedMethod(Number(event.target.value) || null)}><option value="">Choose a method</option>{methods.filter((method) => method.currency === selectedPlan.currency).map((method) => <option key={method.payment_method_id} value={method.payment_method_id}>{method.label}</option>)}</select></label>
        </div>}
        {selectedMethod && methods.find((method) => method.payment_method_id === selectedMethod) && <div className="transfer-details"><strong>{methods.find((method) => method.payment_method_id === selectedMethod)?.account_name}</strong><code>{methods.find((method) => method.payment_method_id === selectedMethod)?.account_identifier}</code><p>{methods.find((method) => method.payment_method_id === selectedMethod)?.instructions}</p><span>Send exactly {formatPrice(selectedPlan.price_minor, selectedPlan.currency)}. Keep the receipt until the owner reviews the transfer.</span></div>}
        <label className="transfer-reference">Transaction reference<input value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} maxLength={160} placeholder="Reference from your transfer receipt" /></label>
        <button type="button" className="plan-cta" disabled={busy || !selectedMethod || transactionReference.trim().length < 4} onClick={() => void submitTransfer()}>{busy ? 'Submitting…' : 'Submit transfer for review'}</button>
      </section>}

      {billing?.manual_claims?.length ? <section className="billing-claims"><h2>Transfer review status</h2>{billing.manual_claims.slice(0, 5).map((claim) => <article key={claim.claim_id}><span><Clock3 size={14} /> {claim.transaction_reference}</span><strong className={`claim-${claim.status}`}>{claim.status}</strong>{claim.owner_note && <small>{claim.owner_note}</small>}</article>)}</section> : null}

      <footer className="plans-footer"><ShieldCheck size={15} /><span>Card payments are handled on the payment provider’s hosted checkout. STEM Studio never stores card numbers or security codes. Bank and wallet transfers are reconciled manually against the owner’s statement. Questions? <Link to="/dashboard#support">Contact support</Link>.</span></footer>
    </main>
  );
}

export default PlansPage;
