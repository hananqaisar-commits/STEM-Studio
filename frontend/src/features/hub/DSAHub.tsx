import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye, Target, Code2, Maximize2, Edit3, Star, User, Mail,
  MessageSquare, ChevronDown, Send, Sparkles,
  ArrowRight, BookOpen, Cpu, Monitor, Home as HomeIcon, Layers, Zap,
  type LucideIcon,
} from 'lucide-react';
import { DSA_CATEGORIES, MODULES } from '../../data/categories';
import { apiClient } from '../../api/apiClient';
import { Octa, useMascot } from '../../components/mascot';
import { GooeyInput } from '../../components/ui/gooey-input';
import { TextHoverEffect } from '../../components/ui/text-hover-effect';
import '../../components/mascot/Mascot.css';
import './DSAHub.css';

const MODULE_ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, Cpu, Monitor,
};

/* ── Bubble positions for subject modules around the hero image ──────
   Positions are kept close to the image so the visual feels connected
   and compact rather than scattered. */
const BUBBLE_POSITIONS = [
  { top: '18%', left: '18%' },
  { top: '14%', right: '18%' },
  { bottom: '16%', left: '26%' },
];

/* ── Features data ────────────────────────────────────────────────── */
const FEATURES = [
  { icon: Eye, title: 'Interactive Visualizers', desc: 'Step-by-step algorithm visualization with play, pause, and seek controls' },
  { icon: Target, title: 'Quiz Mode', desc: 'Three learning modes: Concept, Guided, and Challenge with pre-quiz revision and post-quiz reports' },
  { icon: Code2, title: 'Multi-Language Debugger', desc: 'View code in Python, C++, Java, Go, and Pseudocode with variable tracking' },
  { icon: Maximize2, title: 'Fullscreen Canvas', desc: 'Immersive fullscreen visualization mode for detailed exploration' },
  { icon: Layers, title: '14 DSA Categories', desc: 'From Sorting to Trie, covering beginner to advanced topics' },
  { icon: Edit3, title: 'Custom Input Editor', desc: 'Test any algorithm with your own custom data inputs' },
];

/* ── FAQs data ────────────────────────────────────────────────────── */
const FAQS = [
  { q: 'What is STEM Studio?', a: 'STEM Studio is an interactive learning platform for Data Structures and Algorithms. It provides step-by-step visualizations, quiz-based learning, and multi-language code support for 14+ DSA categories.' },
  { q: 'How many algorithms are covered?', a: 'We cover 14 categories with 138+ topics including Sorting, Arrays, Strings, Linked Lists, Trees, Graphs, Dynamic Programming, Backtracking, Greedy algorithms, Hash Maps, Recursion, Trie, and more.' },
  { q: 'What quiz modes are available?', a: 'Three modes: Concept (core understanding, no pressure), Guided (step-by-step predictions with hints), and Challenge (all questions timed with streak multipliers). Each mode includes pre-quiz revision and post-quiz performance reports.' },
  { q: 'Can I use my own input data?', a: 'Yes! Most categories have a Custom Values editor where you can input your own arrays, strings, or data structures to test how algorithms behave with your specific inputs.' },
  { q: 'Is it free to use?', a: 'Yes, STEM Studio is completely free and open source. Our goal is to make DSA learning accessible to everyone.' },
  { q: 'What programming languages are supported?', a: 'The multi-language debugger supports Python, C++, Java, Go, and Pseudocode. You can switch between languages to see how the same algorithm is implemented differently.' },
];

/* ── Inline SVG brand icons (not available in lucide-react v1.x) ── */
const LinkedinIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
);
const InstagramIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
);
const GithubIcon: React.FC<{ size?: number; className?: string }> = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
);

/* ── Footer social links ──────────────────────────────────────────── */
const SOCIAL_LINKS = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/hanan-qaisar-22b0b6368', icon: LinkedinIcon },
  { name: 'Instagram', url: 'https://www.instagram.com/hanan.qaisar', icon: InstagramIcon },
  { name: 'GitHub', url: 'https://github.com/hananqaisar', icon: GithubIcon },
];

const AFTAB_LINKEDIN = 'https://www.linkedin.com/in/m-aftab-riaz-6468332b9/?skipRedirect=true';

function useTypewriter(words: string[], typingSpeed = 80, deletingSpeed = 40, pauseDuration = 1800) {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (words.length === 0) return;
    const currentWord = words[index];

    if (!isDeleting && subIndex === currentWord.length) {
      const timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && subIndex === 0) {
      setIsDeleting(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timeout = setTimeout(
      () => {
        setSubIndex((prev) => prev + (isDeleting ? -1 : 1));
      },
      isDeleting ? deletingSpeed : typingSpeed
    );

    return () => clearTimeout(timeout);
  }, [subIndex, index, isDeleting, words, typingSpeed, deletingSpeed, pauseDuration]);

  return `${words[index].substring(0, subIndex)}`;
}

interface PlatformStats {
  active_learners: number;
  total_reviews: number;
  average_rating: number;
}

interface ReviewItem {
  review_id: number;
  name: string;
  role: string;
  rating: number;
  text: string;
  created_at: string;
}

import { LegalModal, type LegalDocType } from '../../components/layout/LegalModal';

export const DSAHub: React.FC = () => {
  const navigate = useNavigate();
  const [legalDoc, setLegalDoc] = useState<LegalDocType>(null);
  const { state: mascotState, setExpression, setContext } = useMascot();

  const typedExploreText = useTypewriter([
    "Interactive Visualizations",
    "14+ Core Algorithm Categories",
    "Step-by-Step Multi-Language Code",
    "Quiz & Assessment Challenges",
  ]);

  useEffect(() => {
    setContext('dashboard');
  }, [setContext]);

  const availableModules = MODULES.filter(m => m.available).length;
  const totalCategories = MODULES.reduce((sum, m) => sum + m.categoryCount, 0);
  const totalTopics = DSA_CATEGORIES.reduce((sum, c) => sum + c.topicCount, 0);

  /* ── FAQ accordion state ────────────────────────────────────────── */
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  /* ── Platform stats ─────────────────────────────────────────────── */
  const [stats, setStats] = useState<PlatformStats>({
    active_learners: 0,
    total_reviews: 0,
    average_rating: 0,
  });

  /* ── Reviews ────────────────────────────────────────────────────── */
  const [reviews, setReviews] = useState<ReviewItem[]>([]);

  /* ── Share experience form ──────────────────────────────────────── */
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewName, setReviewName] = useState('');
  const [reviewRole, setReviewRole] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  /* ── FAQ question form ──────────────────────────────────────────── */
  const [faqQuestion, setFaqQuestion] = useState('');

  const fetchStats = () => {
    apiClient<PlatformStats>('/api/stats/platform')
      .then(setStats)
      .catch(() => {
        // Fallback to local counts if backend is unavailable
        setStats({ active_learners: 0, total_reviews: 0, average_rating: 0 });
      });
  };

  const fetchReviews = () => {
    apiClient<ReviewItem[]>('/api/stats/reviews?limit=10')
      .then(setReviews)
      .catch(() => setReviews([]));
  };

  useEffect(() => {
    fetchStats();
    fetchReviews();
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewStars === 0) return;
    setReviewStatus('submitting');
    setExpression('focused');
    try {
      await apiClient('/api/stats/reviews', {
        method: 'POST',
        body: {
          name: reviewName,
          role: reviewRole,
          rating: reviewStars,
          text: reviewText,
        },
      });
      setReviewStatus('success');
      setExpression('happy', { temporary: true, durationMs: 1500 });
      setReviewStars(0);
      setReviewName('');
      setReviewRole('');
      setReviewText('');
      fetchReviews();
      fetchStats();
    } catch {
      setReviewStatus('error');
      setExpression('sad', { temporary: true, durationMs: 2000 });
    }
  };

  const handleFaqSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim()) return;
    const subject = encodeURIComponent('DSA Question from STEM Studio');
    const body = encodeURIComponent(faqQuestion);
    window.open(`mailto:hananqaisar316@gmail.com?subject=${subject}&body=${body}`, '_blank');
    setFaqQuestion('');
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  /* ── Subject module bubbles are rendered directly from MODULES ───── */
  // (kept close to the hero image for a premium, compact visual)

  return (
    <div className="dsa-hub">
      {/* ── Hero Section ───────────────────────────────────────────── */}
      <section id="hero" className="hero-section">
        <div className="hero-text">
          <h1 className="hero-title">
            Explore & Master DSA Through<br />
            <span className="hero-accent">
              {typedExploreText}
              <span className="animate-pulse text-purple-500 font-normal">|</span>
            </span>
          </h1>
          <p className="hero-subtitle">
            Build algorithm intuition by tracing each operation, checking your understanding,
            and comparing implementations across languages.
          </p>
          <div className="hero-cta">
            <button className="hero-btn hero-btn-primary" onClick={() => navigate('/dashboard/dsa')}>
              Start Learning <ArrowRight size={16} />
            </button>
            <button className="hero-btn hero-btn-secondary" onClick={() => scrollToSection('features')}>
              Explore Features
            </button>
          </div>
          <div className="hero-social-proof">
            <div className="hero-avatar-stack">
              {['A', 'S', 'R', 'M'].map((initial, i) => (
                <div
                  key={i}
                  className="hero-avatar-chip"
                  style={{ background: ['#3b82f6', '#f59e0b', '#10b981', '#8b5cf6'][i] }}
                >
                  {initial}
                </div>
              ))}
            </div>
            <div className="hero-social-text">
              <span className="hero-social-count">{stats.active_learners.toLocaleString()}</span>
              <span> Active Learners</span>
            </div>
            {stats.total_reviews > 0 && (
              <div className="hero-social-rating">
                <Star size={14} fill="currentColor" />
                <span>{stats.average_rating.toFixed(2)}/5</span>
                <span className="hero-rating-count">({stats.total_reviews} Reviews)</span>
              </div>
            )}
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-num">{availableModules}</span>
              <span className="hero-stat-label">Modules</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">{totalCategories}</span>
              <span className="hero-stat-label">Categories</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">{totalTopics}+</span>
              <span className="hero-stat-label">Topics</span>
            </div>
          </div>
        </div>
        <div className="hero-visual mascot-hero">
          <div className="mascot-hero-center">
            <Octa expression={mascotState.expression} size="xl" />
          </div>
          <div className="hero-bubbles">
            {MODULES.map((mod, i) => {
              const Icon = MODULE_ICON_MAP[mod.iconName] ?? BookOpen;
              const pos = BUBBLE_POSITIONS[i] || BUBBLE_POSITIONS[0];
              return (
                <button
                  key={mod.id}
                  className={`hero-bubble ${!mod.available ? 'hero-bubble-soon' : ''}`}
                  style={{
                    ...pos,
                    animationDelay: `${i * 0.5}s`,
                  } as React.CSSProperties}
                  onMouseEnter={() => setExpression('focused', { temporary: true, durationMs: 800 })}
                  onClick={() => {
                    if (!mod.available) return;
                    setExpression('focused', { temporary: true, durationMs: 500 });
                    navigate(`/dashboard/${mod.id}`);
                  }}
                  title={mod.available ? mod.name : `${mod.name} — Coming Soon`}
                  disabled={!mod.available}
                  type="button"
                >
                  <Icon size={18} />
                  <span className="hero-bubble-label">{mod.name.split(' ')[0]}</span>
                  {!mod.available && <span className="hero-bubble-soon-badge">Soon</span>}
                </button>
              );
            })}
          </div>
        </div>
      </section>


      {/* ── Module Grid ──────────────────────────────────────────────── */}
      <section id="modules" className="hub-modules-section">
        <header className="hub-header">
          <h2>All Modules</h2>
          <p>Choose a module to explore its categories, visualizers, and quizzes.</p>
        </header>
        <div className="module-grid">
          {MODULES.map((mod) => {
            const Icon = MODULE_ICON_MAP[mod.iconName] ?? BookOpen;
            return (
              <div
                key={mod.id}
                className={`module-card ${!mod.available ? 'module-card-disabled' : ''}`}
                onClick={() => mod.available && navigate(`/dashboard/${mod.id}`)}
              >
                <div className="module-card-icon">
                  <Icon size={28} />
                </div>
                <div className="module-card-body">
                  <h3>{mod.name}</h3>
                  <p>{mod.description}</p>
                </div>
                <div className="module-card-footer">
                  {mod.available ? (
                    <span className="module-card-count">{mod.categoryCount} categories</span>
                  ) : (
                    <span className="module-card-soon">Coming Soon</span>
                  )}
                  <ArrowRight size={16} className="module-card-arrow" />
                </div>
              </div>
            );
          })}
        </div>
      </section>


      {/* ── Features Section ───────────────────────────────────────── */}
      <section id="features" className="landing-section">
        <h2 className="section-title">Features We Offer</h2>
        <p className="section-subtitle">Tools that turn algorithm practice into visible, testable understanding.</p>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">
                <f.icon size={22} />
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Reviews Section ────────────────────────────────────────── */}
      <section id="reviews" className="landing-section">
        <h2 className="section-title">What Students Say</h2>
        <p className="section-subtitle">Real feedback from learners using STEM Studio</p>
        <div className="reviews-scroll">
          {reviews.length > 0 ? (
            reviews.map((r) => (
              <div key={r.review_id} className="review-card">
                <div className="review-stars">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star key={si} size={14} fill={si < r.rating ? 'currentColor' : 'none'} />
                  ))}
                </div>
                <p className="review-text">&ldquo;{r.text}&rdquo;</p>
                <div className="review-author">
                  <div className="review-avatar"><User size={14} /></div>
                  <div>
                    <span className="review-name">{r.name}</span>
                    <span className="review-role">{r.role}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="review-card review-card-placeholder" role="status">
              <p className="review-text">Student feedback will appear here after review. Share your learning experience to help shape STEM Studio.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── FAQs Section ───────────────────────────────────────────── */}
      <section id="faqs" className="landing-section">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <p className="section-subtitle">Common questions about STEM Studio</p>
        <div className="faq-list">
          {FAQS.map((faq, i) => (
            <div key={i} className={`faq-item${openFaq === i ? ' is-open' : ''}`}>
              <button
                className="faq-question"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
                aria-controls={`faq-answer-${i}`}
              >
                <span>{faq.q}</span>
                <ChevronDown size={16} className="faq-chevron" />
              </button>
              {openFaq === i && (
                <div id={`faq-answer-${i}`} className="faq-answer" role="region" aria-label={faq.q}>
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Ask a question */}
        <form className="faq-ask-form" onSubmit={handleFaqSubmit}>
          <h3>Have a question?</h3>
          <textarea
            className="faq-ask-input"
            placeholder="Type your question here..."
            value={faqQuestion}
            onChange={(e) => setFaqQuestion(e.target.value)}
            rows={3}
          />
          <button type="submit" className="faq-ask-btn" disabled={!faqQuestion.trim()}>
            <Send size={14} /> Send Question
          </button>
        </form>
      </section>

      {/* ── Share Experience Section ───────────────────────────────── */}
      <section id="share-experience" className="landing-section">
        <h2 className="section-title">Share Your Experience</h2>
        <p className="section-subtitle">Tell us how STEM Studio helped you learn DSA</p>
        <div className="review-mascot-wrap">
          <div className="review-mascot">
            <Octa
              expression={reviewStatus === 'success' ? 'happy' : reviewStatus === 'error' ? 'sad' : 'review'}
              size="medium"
              className={reviewStatus === 'submitting' ? 'octa-nod' : ''}
            />
            {reviewStatus === 'success' && (
              <span className="mascot-speech-bubble animate-fade-in">Thanks!</span>
            )}
            {reviewStatus === 'success' && (
              <svg className="paper-plane-fly" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <form className="review-form" onSubmit={handleReviewSubmit}>
          <div className="review-form-row">
            <div className="review-form-field">
              <label>Your Rating</label>
              <div className="star-selector">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`star-btn${s <= reviewStars ? ' is-active' : ''}`}
                    onMouseEnter={() => {
                      if (s <= 2) setExpression('thinking', { temporary: true, durationMs: 600 });
                      else if (s >= 4) setExpression('happy', { temporary: true, durationMs: 600 });
                    }}
                    onClick={() => setReviewStars(s)}
                  >
                    <Star size={20} fill={s <= reviewStars ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="review-form-row review-form-two-col">
            <div className="review-form-field">
              <label><User size={13} /> Full Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Your name"
                value={reviewName}
                onChange={(e) => setReviewName(e.target.value)}
                required
              />
            </div>
            <div className="review-form-field">
              <label><Star size={13} /> Role</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CS Student"
                value={reviewRole}
                onChange={(e) => setReviewRole(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="review-form-field">
            <label><MessageSquare size={13} /> Your Review</label>
            <textarea
              className="form-input form-textarea"
              placeholder="Share your experience with STEM Studio..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
              required
              minLength={10}
            />
          </div>
          {reviewStatus === 'success' && (
            <p className="review-status review-status-success">
              Thank you! Your review has been submitted for approval.
            </p>
          )}
          {reviewStatus === 'error' && (
            <p className="review-status review-status-error">
              Failed to submit review. Please try again later.
            </p>
          )}
          <button
            type="submit"
            className="review-submit-btn"
            disabled={reviewStatus === 'submitting' || reviewStars === 0}
          >
            {reviewStatus === 'submitting' ? 'Submitting...' : 'Submit Review'} <Send size={14} />
          </button>
          </form>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer id="footer" className="landing-footer">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-col footer-brand-col">
            <Link to="/dashboard" className="footer-brand">
              <div className="footer-brand-logo">
                <Sparkles size={20} />
              </div>
              <span className="footer-brand-title">STEM <span>Studio</span></span>
            </Link>
            <p className="footer-desc">
              Interactive visualization tools for mastering data structures and algorithms.
            </p>
            <p className="footer-made-with" style={{ fontWeight: 600, letterSpacing: '0.5px' }}>
              <Sparkles size={13} style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'text-bottom' }} /> Crafted by{' '}
              <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
                Octa Team
              </span>
            </p>
            <a href="mailto:hanankaesar316@gmail.com" className="footer-email">
              <Mail size={15} /> hanankaesar316@gmail.com
            </a>

          </div>

          {/* Navigation */}
          <div className="footer-col">
            <h3 className="footer-heading">Navigation</h3>
            <div className="footer-links">
              <button className="footer-link-btn" onClick={() => scrollToSection('hero')}>
                <HomeIcon size={15} /> Home
              </button>
              <button className="footer-link-btn" onClick={() => scrollToSection('features')}>
                <Zap size={15} /> Features
              </button>
              <button className="footer-link-btn" onClick={() => navigate('/dashboard/dsa')}>
                <Eye size={15} /> Visualizer
              </button>
              <button className="footer-link-btn" onClick={() => scrollToSection('reviews')}>
                <Star size={15} /> Reviews
              </button>
              <button className="footer-link-btn" onClick={() => scrollToSection('faqs')}>
                <MessageSquare size={15} /> FAQs
              </button>
            </div>
          </div>

          {/* Legal */}
          <div className="footer-col">
            <h3 className="footer-heading">Legal</h3>
            <div className="footer-links">
              <button className="footer-link-btn" onClick={() => setLegalDoc('privacy')}>Privacy Policy</button>
              <button className="footer-link-btn" onClick={() => setLegalDoc('terms')}>Terms of Service</button>
              <button className="footer-link-btn" onClick={() => setLegalDoc('cookies')}>Cookies</button>
            </div>
          </div>

          {/* Connect */}
          <div className="footer-col">
            <h3 className="footer-heading">Connect</h3>
            <div className="footer-social-row">
              {SOCIAL_LINKS.map((social) => {
                const Icon = social.icon;
                return (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="footer-social-btn"
                    aria-label={social.name}
                    title={social.name}
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <div className="footer-team-section">
          <h3 className="footer-heading footer-team-heading">Team / Contributors</h3>
          <div className="footer-team-cards">
            <div className="footer-team-card">
              <span className="team-role">Lead</span>
              <span className="team-name">Hanan</span>
              <p className="team-desc">Architecture · API · Database · Core Features</p>
              <div className="team-socials">
                <a href="https://www.linkedin.com/in/hanan-qaisar-22b0b6368" target="_blank" rel="noopener noreferrer"><LinkedinIcon size={14} /></a>
                <a href="https://www.instagram.com/hanan.qaisar" target="_blank" rel="noopener noreferrer"><InstagramIcon size={14} /></a>
                <a href="https://github.com/hananqaisar" target="_blank" rel="noopener noreferrer"><GithubIcon size={14} /></a>
              </div>
            </div>
            <div className="footer-team-card">
              <span className="team-role">UI / Frontend</span>
              <span className="team-name">Hassan</span>
              <p className="team-desc">Dashboard · Navigation · Visual Polish</p>
            </div>
            <div className="footer-team-card">
              <span className="team-role">Algorithms</span>
              <span className="team-name">Aftab</span>
              <p className="team-desc">Animation · Creative Features</p>
              <div className="team-socials">
                <a href={AFTAB_LINKEDIN} target="_blank" rel="noopener noreferrer"><LinkedinIcon size={14} /></a>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            &copy; {new Date().getFullYear()} STEM Studio. All rights reserved. •{' '}
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#a855f7', textDecoration: 'none', fontWeight: 600 }}
              title="View MIT License"
            >
              MIT License
            </a>
          </p>
          <div className="footer-bottom-links">
            <button onClick={() => navigate('/sitemap')}>Sitemap</button>
            <button onClick={() => navigate('/contact')}>Contact</button>
          </div>
        </div>

        {/* Giant OCTA Hover Effect Banner */}
        <div className="footer-octa-banner w-full h-[20rem] md:h-[28rem] flex items-center justify-center -mb-8 overflow-hidden">
          <TextHoverEffect text="OCTA" />
        </div>
      </footer>
      {/* Legal Modal */}
      <LegalModal docType={legalDoc} onClose={() => setLegalDoc(null)} />
    </div>
  );
};
