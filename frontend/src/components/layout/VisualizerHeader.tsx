import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, FileCode2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { CategoryTopics } from '../../data/categoryTopics';
import { hasCustomStub } from '../../data/customCode';
import { apiClient } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import './VisualizerHeader.css';

export interface VisualizerSearchItem { id: string; name: string; description?: string; group?: string; }
interface VisualizerHeaderProps {
  icon: React.ReactNode; title: string; subtitle: string; items?: VisualizerSearchItem[];
  activeId?: string; onSelect?: (id: string) => void; placeholder?: string; actions?: React.ReactNode;
  categories?: CategoryTopics[]; activeCategoryId?: string; onSelectCategory?: (categoryId: string) => void; categorySelectorOnly?: boolean;
  isCustomCodeRunning?: boolean;
}

type EntitledTopic = { feature_key: string; label: string; has_access: boolean; is_premium: boolean; is_enabled: boolean };

/** Shared page header and entry-point gate for individual DSA topics. */
export const VisualizerHeader: React.FC<VisualizerHeaderProps> = ({ icon, title, subtitle, actions, isCustomCodeRunning, activeId, items, onSelect }) => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [entitlements, setEntitlements] = useState<EntitledTopic[]>([]);
  const [accessStatus, setAccessStatus] = useState<'idle' | 'loading' | 'allowed' | 'premium' | 'disabled' | 'missing' | 'error'>('idle');
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);
  const topicMenuRef = useRef<HTMLDivElement>(null);
  const accessDialogRef = useRef<HTMLElement>(null);
  const categoryByTitle: Record<string, string> = {
    'Sorting Algorithms Studio': 'sorting',
    'Linked List Visualizer': 'linkedList',
    'Stack & Queue Studio': 'stackQueue',
    'Tree Structures Studio': 'bst',
    'Graph Algorithms Studio': 'graph',
    'Binary Search Studio': 'binarySearch',
    'Hash Map Algorithms Studio': 'hashMaps',
    'Array Algorithms Studio': 'arrays',
    'String Algorithms Studio': 'strings',
    'Recursion Studio': 'recursion',
    'Backtracking Algorithms Studio': 'backtracking',
    'Greedy Algorithms Studio': 'greedy',
    'Dynamic Programming Studio': 'dp',
    'Trie (Prefix Tree) Studio': 'trie',
  };
  // Existing pages have explicit labels; route fallback lets new topic
  // categories use the same premium picker without adding a title mapping.
  const routeCategoryId = location.pathname.split('/')[2] || '';
  const topicCategoryId = categoryByTitle[title] ?? routeCategoryId;
  const codeSupported = topicCategoryId && activeId ? hasCustomStub(topicCategoryId, activeId) : null;
  const featureKey = topicCategoryId && activeId ? `algorithm.${topicCategoryId}.${activeId}` : '';
  const activeEntitlement = useMemo(() => entitlements.find((item) => item.feature_key === featureKey), [entitlements, featureKey]);

  useEffect(() => {
    let cancelled = false;
    if (!featureKey || !isAuthenticated || user?.is_owner_session) {
      setAccessStatus('allowed');
      return () => { cancelled = true; };
    }
    setAccessStatus('loading');
    apiClient<{ features: EntitledTopic[] }>('/api/entitlements/me', { requiresAuth: true })
      .then((result) => {
        if (cancelled) return;
        setEntitlements(result.features);
        const policy = result.features.find((item) => item.feature_key === featureKey);
        if (!policy) setAccessStatus('missing');
        else if (!policy.is_enabled) setAccessStatus('disabled');
        else setAccessStatus(policy.has_access ? 'allowed' : 'premium');
      })
      .catch(() => { if (!cancelled) setAccessStatus('error'); });
    return () => { cancelled = true; };
  }, [featureKey, isAuthenticated, user?.is_owner_session]);

  useEffect(() => {
    if (!topicMenuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!topicMenuRef.current?.contains(event.target as Node)) setTopicMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTopicMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [topicMenuOpen]);

  const handleTopicChange = (nextId: string) => {
    setTopicMenuOpen(false);
    if (!onSelect || !topicCategoryId || user?.is_owner_session) { onSelect?.(nextId); return; }
    const nextFeature = entitlements.find((item) => item.feature_key === `algorithm.${topicCategoryId}.${nextId}`);
    if (!nextFeature || !nextFeature.is_enabled || !nextFeature.has_access) {
      navigate(`/plans?feature=${encodeURIComponent(`algorithm.${topicCategoryId}.${nextId}`)}`);
      return;
    }
    onSelect(nextId);
  };

  const showAccessBlock = Boolean(featureKey) && isAuthenticated && !user?.is_owner_session && accessStatus !== 'allowed';
  const activeLabel = items?.find((item) => item.id === activeId)?.name || activeEntitlement?.label || activeId || '';
  useDialogFocus(showAccessBlock, () => {}, accessDialogRef);
  return (
    <>
    <header className="viz-header animate-fade-in">
      <div className="viz-title-group">
        <div className="viz-title-icon">{icon}</div>
        <div className="viz-title-text">
          <div className="viz-title-row">
            <h1>{title}</h1>
            {isCustomCodeRunning && (
              <span className="pasted-code-running-badge" title="Executing user-pasted custom code from debugger">
                <FileCode2 size={13} />
                <span>Pasted code is running</span>
              </span>
            )}
          </div>
          <p>{subtitle}</p>
          {codeSupported !== null && (
            <span className={`custom-code-coverage ${codeSupported ? 'is-supported' : 'is-coming'}`}>
              Custom code: {codeSupported ? 'supported' : 'coming soon'}
            </span>
          )}
        </div>
      </div>
      {items?.length ? <div className="viz-topic-picker" ref={topicMenuRef}>
        <span className="viz-topic-picker-label">Topic</span>
        <button className="viz-topic-picker-trigger" type="button" onClick={() => setTopicMenuOpen((open) => !open)} aria-expanded={topicMenuOpen} aria-haspopup="listbox" disabled={isAuthenticated && (accessStatus === 'loading' || accessStatus === 'error')} title={accessStatus === 'loading' ? 'Checking topic access…' : accessStatus === 'error' ? 'Reconnect to check topic access' : undefined}>
          <span className="viz-topic-picker-current">{activeLabel}</span>
          {activeEntitlement?.is_premium && !activeEntitlement.has_access && <span className="viz-topic-premium"><LockKeyhole size={13} /> Premium</span>}
          {activeEntitlement?.has_access && activeEntitlement.is_premium && <span className="viz-topic-premium granted"><ShieldCheck size={13} /> Included</span>}
          <ChevronDown size={14} className={topicMenuOpen ? 'is-open' : ''} aria-hidden="true" />
        </button>
        {topicMenuOpen && <div className="viz-topic-menu" role="listbox" aria-label="Choose an algorithm">
          {items.map((item) => {
            const policy = entitlements.find((entry) => entry.feature_key === `algorithm.${topicCategoryId}.${item.id}`);
            const premium = Boolean(topicCategoryId && policy?.is_premium && !policy.has_access);
            const disabled = Boolean(policy && !policy.is_enabled);
            return <button key={item.id} type="button" role="option" aria-selected={item.id === activeId} disabled={disabled} className={`viz-topic-option ${premium ? 'is-premium' : ''} ${disabled ? 'is-disabled' : ''}`} onClick={() => handleTopicChange(item.id)}>
              <span className="viz-topic-option-copy"><strong>{item.name}</strong>{item.description && <small>{item.description}</small>}</span>
              {premium ? <span className="viz-topic-option-lock"><LockKeyhole size={14} /> Premium</span> : disabled ? <span className="viz-topic-option-lock">Paused</span> : item.id === activeId ? <Check size={16} aria-label="Selected" /> : null}
            </button>;
          })}
        </div>}
      </div> : null}
      {actions}
    </header>
    {showAccessBlock && <div className="algorithm-access-backdrop">
      <section ref={accessDialogRef} className="algorithm-access-card" role="dialog" aria-modal="true" aria-labelledby="algorithm-access-title" tabIndex={-1}>
        <span className="algorithm-access-lock"><LockKeyhole size={21} /></span>
        <p className="algorithm-access-eyebrow">{accessStatus === 'loading' ? 'Checking access' : accessStatus === 'disabled' ? 'Temporarily unavailable' : 'Premium topic'}</p>
        <h2 id="algorithm-access-title">{accessStatus === 'loading' ? 'Confirming your plan…' : accessStatus === 'error' ? 'Access could not be checked' : accessStatus === 'disabled' ? `${activeLabel} is temporarily disabled` : `${activeLabel} requires premium access`}</h2>
        <p>{accessStatus === 'loading' ? 'The visualizer stays locked until the server confirms this account’s current entitlement.' : accessStatus === 'error' ? 'Reconnect and retry so the server can confirm your plan. No premium content has been opened.' : accessStatus === 'disabled' ? 'The owner has paused this topic for learner accounts. Check back later or return to the topic list.' : 'Choose a monthly or yearly plan. Access opens only after the payment provider confirms payment or the owner grants access.'}</p>
        {accessStatus !== 'loading' && accessStatus !== 'disabled' && <button type="button" onClick={() => navigate(`/plans?feature=${encodeURIComponent(featureKey)}`)}>View plans and payment methods</button>}
        {accessStatus === 'error' && <button type="button" className="algorithm-access-retry" onClick={() => window.location.reload()}>Retry access check</button>}
      </section>
    </div>}
    </>
  );
};
