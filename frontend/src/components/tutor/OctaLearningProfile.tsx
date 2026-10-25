import React, { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, RotateCcw, X } from 'lucide-react';
import {
  clearTutorFeedbackProfile,
  getTutorLearningProfile,
  updateTutorResponseStyle,
  type OctaResponseStyle,
  type OctaTutorLearningProfile as LearningProfile,
} from '../../api/octaTutorApi';
import { CATEGORY_TOPICS } from '../../data/categoryTopics';
import { useDialogFocus } from '../../hooks/useDialogFocus';

const STYLE_OPTIONS: Array<{ id: OctaResponseStyle; title: string; detail: string }> = [
  { id: 'balanced', title: 'Balanced', detail: 'Intuition, reasoning, and an example when useful' },
  { id: 'simpler', title: 'Simpler', detail: 'Plain language first, with technical terms defined' },
  { id: 'stepwise', title: 'Step by step', detail: 'Numbered steps and explicit state changes' },
  { id: 'examples', title: 'Examples first', detail: 'Concrete worked examples before the general rule' },
];

function topicName(categoryId: string, algorithmId: string) {
  const category = CATEGORY_TOPICS.find((item) => item.categoryId === categoryId);
  const topic = category?.topics.find((item) => item.id === algorithmId);
  return topic?.name || algorithmId.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[-_]/g, ' ');
}

interface Props {
  onClose: () => void;
  onProfileChange?: (profile: LearningProfile) => void;
}

export const OctaLearningProfile: React.FC<Props> = ({ onClose, onProfileChange }) => {
  const [profile, setProfile] = useState<LearningProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLElement>(null);
  useDialogFocus(true, onClose, dialogRef);

  useEffect(() => {
    let alive = true;
    getTutorLearningProfile()
      .then((data) => { if (alive) setProfile(data); })
      .catch(() => { if (alive) setError('Could not load your learning profile. Try again in a moment.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const save = async (style: OctaResponseStyle) => {
    setSaving(true);
    setError('');
    try {
      const updated = await updateTutorResponseStyle(style);
      setProfile(updated);
      onProfileChange?.(updated);
    } catch {
      setError('Your preference could not be saved. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  const clear = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await clearTutorFeedbackProfile();
      setProfile(updated);
      onProfileChange?.(updated);
    } catch {
      setError('Saved feedback could not be cleared. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tutor-profile-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="tutor-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="tutor-profile-title" tabIndex={-1}>
        <header className="tutor-profile-header">
          <div>
            <p className="tutor-eyebrow">PERSONALIZATION</p>
            <h2 id="tutor-profile-title">Your learning profile</h2>
          </div>
          <button className="tutor-icon-btn" type="button" aria-label="Close learning profile" onClick={onClose}><X size={18} /></button>
        </header>

        <p className="tutor-profile-description">
          Octa adapts explanations from quiz trends and your direct answer feedback. It does not infer your mood or personality.
        </p>

        {loading ? <div className="tutor-profile-loading"><LoaderCircle size={18} className="tutor-spin" /> Loading your profile…</div> : (
          <>
            <section className="tutor-profile-section" aria-labelledby="response-style-title">
              <div className="tutor-profile-section-heading">
                <h3 id="response-style-title">How should Octa explain?</h3>
                <span>Saved for future chats</span>
              </div>
              <div className="tutor-style-options" role="radiogroup" aria-label="Preferred explanation style">
                {STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={profile?.response_style === option.id}
                    className={`tutor-style-option ${profile?.response_style === option.id ? 'selected' : ''}`}
                    disabled={saving}
                    onClick={() => void save(option.id)}
                  >
                    <span><strong>{option.title}</strong><small>{option.detail}</small></span>
                    {profile?.response_style === option.id && <Check size={17} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </section>

            <section className="tutor-profile-section" aria-labelledby="topic-signals-title">
              <div className="tutor-profile-section-heading">
                <h3 id="topic-signals-title">Topic signals</h3>
                <span>{profile?.quiz_signals_used ?? 0} recent quiz answers</span>
              </div>
              <p className="tutor-profile-note">A topic appears after at least 3 quiz attempts. These are learning cues, not ability labels.</p>
              <div className="tutor-profile-columns">
                <div>
                  <h4>Going well</h4>
                  {profile?.strengths.length ? profile.strengths.map((item) => <div className="tutor-topic-signal" key={`${item.category}-${item.algorithm_id}`}>
                    <span>{topicName(item.category, item.algorithm_id)}</span><b>{item.accuracy_percent}%</b>
                  </div>) : <p className="tutor-profile-empty">More quiz activity will reveal steady topics.</p>}
                </div>
                <div>
                  <h4>Worth another look</h4>
                  {profile?.practice_areas.length ? profile.practice_areas.map((item) => <div className="tutor-topic-signal" key={`${item.category}-${item.algorithm_id}`}>
                    <span>{topicName(item.category, item.algorithm_id)}</span><b>{item.accuracy_percent}%</b>
                  </div>) : <p className="tutor-profile-empty">No topic needs extra practice based on current quiz trends.</p>}
                </div>
              </div>
            </section>

            <div className="tutor-feedback-summary">
              <span>{profile?.helpful_count ?? 0} helpful</span>
              <span>{profile?.needs_detail_count ?? 0} asked for a different explanation</span>
            </div>
          </>
        )}

        {error && <p className="tutor-profile-error" role="alert">{error}</p>}
        <footer className="tutor-profile-footer">
          <button type="button" className="tutor-profile-reset" onClick={() => void clear()} disabled={saving || loading}>
            {saving ? <LoaderCircle size={15} className="tutor-spin" /> : <RotateCcw size={15} />}
            Clear saved feedback
          </button>
          <button type="button" className="tutor-profile-done" onClick={onClose}>Done</button>
        </footer>
        <p className="tutor-profile-footnote">Clearing removes your chosen style and answer ratings. Quiz history stays in your account and can still guide topic explanations.</p>
      </section>
    </div>
  );
};
