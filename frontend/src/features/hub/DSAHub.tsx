import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, BarChart2, LayoutList, Type, GitCommit, Layers, Search, Hash,
  GitPullRequest, Share2, Repeat, CornerDownRight, Zap, Grid3x3, Binary,
  Sparkles, X, Eye, Target, Code2, Maximize2, Edit3, Star, User, Mail,
  MessageSquare, ChevronDown, ExternalLink, AtSign, Send, Heart,
  ArrowRight, type LucideIcon,
} from 'lucide-react';
import { DSA_CATEGORIES } from '../../data/categories';
import './DSAHub.css';

const ICON_MAP: Record<string, LucideIcon> = {
  Activity, BarChart2, LayoutList, Type, GitCommit, Layers, Search, Hash,
  GitPullRequest, Share2, Repeat, CornerDownRight, Zap, Grid3x3, Binary,
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

/* ── Reviews data ─────────────────────────────────────────────────── */
const REVIEWS = [
  { stars: 5, text: 'The visualizations made recursion click for me. Seeing the call tree build up step by step was exactly what I needed to understand how recursive functions work.', name: 'Ayesha K.', role: 'CS Student' },
  { stars: 4, text: 'Quiz mode in Challenge level is intense but incredibly rewarding. The 15-second timer really pushes you to think fast and build intuition.', name: 'Ahmed R.', role: 'Self-learner' },
  { stars: 5, text: "Best DSA tool I've used. The multi-language debugger is a game changer — seeing the same algorithm in Python and C++ side by side really deepens understanding.", name: 'Fatima S.', role: 'CS Student' },
  { stars: 5, text: "The Dynamic Programming section finally made 2D grid problems clear. The color-coded cells showing computed values step by step is brilliant.", name: 'Usman M.', role: 'Bootcamp Graduate' },
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

/* ── Contributors data ────────────────────────────────────────────── */
const CONTRIBUTORS = [
  {
    name: 'Hanan Qaisar',
    role: 'Lead Developer',
    initials: 'HQ',
    github: 'https://github.com/hananqaisar',
    work: 'Database, API, Dashboard, all 14 DSA categories, Quiz mode system, overall architecture and project lead',
  },
  {
    name: 'Muhammad Hassan',
    role: 'UI Developer',
    initials: 'MH',
    github: 'https://github.com/muhammadhassan',
    work: 'Theme system (4 themes), Fullscreen mode, UI alignments, visual improvements, and responsive design',
  },
  {
    name: 'Muhammad Aftab',
    role: 'Visualizer Developer',
    initials: 'MA',
    github: 'https://github.com/muhammadaftab',
    work: 'Linked List, Trees, and Graph visualizers, Debugger UI components, and algorithm engine development',
  },
];

export const DSAHub: React.FC = () => {
  const navigate = useNavigate();

  const totalCategories = DSA_CATEGORIES.length;
  const totalTopics = DSA_CATEGORIES.reduce((sum, c) => sum + c.topicCount, 0);

  /* ── New feature detection ──────────────────────────────────────── */
  const [newFeatures, setNewFeatures] = useState<string[]>([]);
  const [dismissedNew, setDismissedNew] = useState(false);

  useEffect(() => {
    const STORAGE_KEY = 'stem-studio-known-categories';
    const currentIds = DSA_CATEGORIES.filter(c => c.available).map(c => c.id);
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const knownIds: string[] = JSON.parse(stored);
      const newOnes = currentIds.filter(id => !knownIds.includes(id));
      if (newOnes.length > 0) {
        setNewFeatures(newOnes);
      }
    } else {
      // First visit — store all current
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentIds));
    }
  }, []);

  const dismissNewFeatures = useCallback(() => {
    const currentIds = DSA_CATEGORIES.filter(c => c.available).map(c => c.id);
    localStorage.setItem('stem-studio-known-categories', JSON.stringify(currentIds));
    setDismissedNew(true);
  }, []);

  /* ── FAQ accordion state ────────────────────────────────────────── */
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  /* ── Share experience form ──────────────────────────────────────── */
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewName, setReviewName] = useState('');
  const [reviewEmail, setReviewEmail] = useState('');
  const [reviewText, setReviewText] = useState('');

  /* ── FAQ question form ──────────────────────────────────────────── */
  const [faqQuestion, setFaqQuestion] = useState('');

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Review from ${reviewName}`);
    const body = encodeURIComponent(`Rating: ${reviewStars}/5\nName: ${reviewName}\nEmail: ${reviewEmail}\n\nReview:\n${reviewText}`);
    window.open(`mailto:hananqaisar316@gmail.com?subject=${subject}&body=${body}`, '_blank');
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
            <button className="hero-btn hero-btn-primary" onClick={() => scrollToSection('categories')}>
              Start Learning <ArrowRight size={16} />
            </button>
            <button className="hero-btn hero-btn-secondary" onClick={() => scrollToSection('features')}>
              Explore Features
            </button>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-num">{totalCategories}</span>
              <span className="hero-stat-label">Categories</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">{totalTopics}+</span>
              <span className="hero-stat-label">Topics</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">3</span>
              <span className="hero-stat-label">Quiz Modes</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <img
            src="/images/hero-students.jpeg"
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
                  onClick={() => navigate(`/dashboard/${cat.id}`)}
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

      {/* ── New Feature Card ───────────────────────────────────────── */}
      {newFeatures.length > 0 && !dismissedNew && (
        <div className="new-feature-banner">
          <div className="new-feature-content">
            <Sparkles size={18} className="new-feature-icon" />
            <div>
              <strong>What&apos;s New!</strong>
              {newFeatures.map(id => {
                const cat = DSA_CATEGORIES.find(c => c.id === id);
                return cat ? (
                  <span key={id} className="new-feature-chip" onClick={() => navigate(`/dashboard/${cat.id}`)}>
                    {cat.name} — {cat.topicCount} topics
                  </span>
                ) : null;
              })}
            </div>
          </div>
          <button className="new-feature-dismiss" onClick={dismissNewFeatures}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Category Grid (existing) ──────────────────────────────── */}
      <section id="categories" className="hub-categories-section">
        <header className="hub-header">
          <h2>All Categories</h2>
          <p>Choose a category to start learning with interactive visualizations and quizzes.</p>
        </header>
        <div className="hub-grid">
          {DSA_CATEGORIES.map((cat) => {
            const Icon = ICON_MAP[cat.iconName] ?? Activity;
            return (
              <div
                key={cat.id}
                className={`hub-card ${!cat.available ? 'hub-card-disabled' : ''}`}
                onClick={() => cat.available && navigate(`/dashboard/${cat.id}`)}
              >
                <div className="hub-card-icon">
                  <Icon size={22} />
                </div>
                <div className="hub-card-body">
                  <h3>{cat.name}</h3>
                  <p>{cat.description}</p>
                </div>
                <div className="hub-card-footer">
                  <span className="hub-card-topics">{cat.topicCount} topics</span>
                  <span className={`hub-card-difficulty diff-${cat.difficulty.toLowerCase()}`}>
                    {cat.difficulty}
                  </span>
                  {!cat.available && <span className="hub-card-soon">Coming Soon</span>}
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
          {REVIEWS.map((r, i) => (
            <div key={i} className="review-card">
              <div className="review-stars">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star key={si} size={14} fill={si < r.stars ? 'currentColor' : 'none'} />
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
          ))}
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
              <label><Mail size={13} /> Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="your@email.com"
                value={reviewEmail}
                onChange={(e) => setReviewEmail(e.target.value)}
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
            />
          </div>
          <button type="submit" className="review-submit-btn">
            Submit Review <Send size={14} />
          </button>
        </form>
      </section>

      {/* ── Footer / Contributors ──────────────────────────────────── */}
      <footer id="contributors" className="landing-footer">
        <div className="footer-grid">
          {/* Contributors */}
          <div className="footer-col">
            <h3 className="footer-heading">Contributors</h3>
            <div className="contributor-list">
              {CONTRIBUTORS.map((c) => (
                <div key={c.name} className="contributor-card">
                  <div className="contributor-avatar">{c.initials}</div>
                  <div className="contributor-info">
                    <div className="contributor-name-row">
                      <span className="contributor-name">{c.name}</span>
                      <span className="contributor-role">{c.role}</span>
                    </div>
                    <p className="contributor-work">{c.work}</p>
                    <a href={c.github} target="_blank" rel="noopener noreferrer" className="contributor-github">
                      <ExternalLink size={13} /> GitHub
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="footer-col">
            <h3 className="footer-heading">Contact</h3>
            <div className="footer-links">
              <a href="https://www.linkedin.com/in/hanan-qaisar-22b0b6368" target="_blank" rel="noopener noreferrer" className="footer-link">
                <ExternalLink size={15} /> LinkedIn
              </a>
              <a href="https://www.instagram.com/hanan.qaisar" target="_blank" rel="noopener noreferrer" className="footer-link">
                <AtSign size={15} /> Instagram
              </a>
              <a href="https://github.com/hananqaisar" target="_blank" rel="noopener noreferrer" className="footer-link">
                <ExternalLink size={15} /> GitHub
              </a>
              <a href="mailto:hananqaisar316@gmail.com" className="footer-link">
                <Mail size={15} /> hananqaisar316@gmail.com
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h3 className="footer-heading">Quick Links</h3>
            <div className="footer-links">
              <button className="footer-link-btn" onClick={() => scrollToSection('hero')}>Home</button>
              <button className="footer-link-btn" onClick={() => scrollToSection('features')}>Features</button>
              <button className="footer-link-btn" onClick={() => scrollToSection('reviews')}>Reviews</button>
              <button className="footer-link-btn" onClick={() => scrollToSection('faqs')}>FAQs</button>
              <button className="footer-link-btn" onClick={() => scrollToSection('categories')}>Categories</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>Built with <Heart size={13} fill="currentColor" /> by STEM Studio Team</p>
          <p className="footer-copy">&copy; {new Date().getFullYear()} STEM Studio. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
