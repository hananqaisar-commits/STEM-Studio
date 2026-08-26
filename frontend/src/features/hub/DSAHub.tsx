import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity, BarChart2, LayoutList, Type, GitCommit, Layers, Search, Hash,
  GitPullRequest, Share2, Repeat, CornerDownRight, Zap, Grid3x3, Binary,
  Eye, Target, Code2, Maximize2, Edit3, Star, User, Mail,
  MessageSquare, ChevronDown, ExternalLink, Send, Heart, Sparkles,
  ArrowRight, BookOpen, Cpu, Monitor, Home as HomeIcon,
  type LucideIcon,
} from 'lucide-react';
import { DSA_CATEGORIES, MODULES } from '../../data/categories';
import { apiClient } from '../../api/apiClient';
import './DSAHub.css';

const ICON_MAP: Record<string, LucideIcon> = {
  Activity, BarChart2, LayoutList, Type, GitCommit, Layers, Search, Hash,
  GitPullRequest, Share2, Repeat, CornerDownRight, Zap, Grid3x3, Binary,
};

const MODULE_ICON_MAP: Record<string, LucideIcon> = {
  BookOpen, Cpu, Monitor,
};

/* ── Bubble positions for dynamic category circles ────────────────── */
const BUBBLE_POSITIONS = [
  { top: '5%', left: '-10%' },
  { top: '-5%', right: '10%' },
  { top: '40%', left: '-15%' },
  { bottom: '10%', left: '-8%' },
  { bottom: '0%', right: '5%' },
  { top: '20%', right: '-12%' },
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

/* ── Footer social links ──────────────────────────────────────────── */
const LinkedInIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const SOCIAL_LINKS = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/hanan-qaisar-22b0b6368', icon: LinkedInIcon },
  { name: 'Instagram', url: 'https://www.instagram.com/hanan.qaisar', icon: ExternalLink },
  { name: 'GitHub', url: 'https://github.com/hananqaisar', icon: ExternalLink },
];

const AFTAB_LINKEDIN = 'https://www.linkedin.com/in/m-aftab-riaz-6468332b9/?skipRedirect=true';

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

export const DSAHub: React.FC = () => {
  const navigate = useNavigate();

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

  useEffect(() => {
    // Fetch public platform stats
    apiClient<PlatformStats>('/api/stats/platform')
      .then(setStats)
      .catch(() => {
        // Fallback to local counts if backend is unavailable
        setStats({ active_learners: 0, total_reviews: 0, average_rating: 0 });
      });

    // Fetch latest approved reviews
    apiClient<ReviewItem[]>('/api/stats/reviews?limit=10')
      .then(setReviews)
      .catch(() => setReviews([]));
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewStars === 0) return;
    setReviewStatus('submitting');
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
      setReviewStars(0);
      setReviewName('');
      setReviewRole('');
      setReviewText('');
    } catch {
      setReviewStatus('error');
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

  /* ── Dynamic bubbles — pick 6 available categories ──────────────── */
  const bubbleCategories = DSA_CATEGORIES.filter(c => c.available).slice(0, 6);

  return (
    <div className="dsa-hub">
      {/* ── Hero Section ───────────────────────────────────────────── */}
      <section id="hero" className="hero-section">
        <div className="hero-text">
          <h1 className="hero-title">
            Master DSA Through<br />
            <span className="hero-accent">Interactive Visualization</span>
          </h1>
          <p className="hero-subtitle">
            Learn, visualize, and master data structures and algorithms through
            step-by-step execution, quiz-based learning, and multi-language code support.
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
        <div className="hero-visual">
          <img
            src="/images/hero-students.png"
            alt="Students learning DSA"
            className="hero-image"
          />
          <div className="hero-bubbles">
            {bubbleCategories.map((cat, i) => {
              const Icon = ICON_MAP[cat.iconName] ?? Activity;
              const pos = BUBBLE_POSITIONS[i] || BUBBLE_POSITIONS[0];
              return (
                <button
                  key={cat.id}
                  className="hero-bubble"
                  style={{
                    ...pos,
                    animationDelay: `${i * 0.5}s`,
                  } as React.CSSProperties}
                  onClick={() => navigate('/dashboard/dsa')}
                  title={cat.name}
                >
                  <Icon size={18} />
                  <span className="hero-bubble-label">{cat.name.split(' ')[0]}</span>
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
        <p className="section-subtitle">Everything you need to master DSA interactively</p>
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
            <div className="review-card review-card-placeholder">
              <p className="review-text">No approved reviews yet. Be the first to share your experience!</p>
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
              <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{faq.q}</span>
                <ChevronDown size={16} className="faq-chevron" />
              </button>
              {openFaq === i && (
                <div className="faq-answer">
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
            <p className="footer-made-with">
              <Heart size={13} fill="currentColor" /> Made with love by{' '}
              <a href={AFTAB_LINKEDIN} target="_blank" rel="noopener noreferrer">
                Ascentify Studio
              </a>
            </p>
            <a href="mailto:hello@dsavisualizer.in" className="footer-email">
              <Mail size={15} /> hello@dsavisualizer.in
            </a>
            <a
              href="https://www.producthunt.com/products/stem-studio"
              target="_blank"
              rel="noopener noreferrer"
              className="product-hunt-badge"
            >
              <span className="product-hunt-icon">P</span>
              <span className="product-hunt-text">
                <small>FIND US ON</small>
                <strong>Product Hunt</strong>
              </span>
              <span className="product-hunt-votes">3</span>
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
              <button className="footer-link-btn" onClick={() => navigate('/privacy')}>Privacy Policy</button>
              <button className="footer-link-btn" onClick={() => navigate('/terms')}>Terms of Service</button>
              <button className="footer-link-btn" onClick={() => navigate('/cookies')}>Cookies</button>
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
            <h3 className="footer-heading footer-team-heading">Team</h3>
            <div className="footer-links">
              <a
                href={AFTAB_LINKEDIN}
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                <LinkedInIcon /> M. Aftab Riaz
              </a>
              <a
                href="https://www.linkedin.com/in/hanan-qaisar-22b0b6368"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-link"
              >
                <LinkedInIcon /> Hanan Qaisar
              </a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} STEM Studio. All rights reserved.</p>
          <div className="footer-bottom-links">
            <button onClick={() => navigate('/sitemap')}>Sitemap</button>
            <button onClick={() => navigate('/contact')}>Contact</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
