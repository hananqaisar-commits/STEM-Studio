import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  Code2,
  Menu,
  Moon,
  MonitorPlay,
  Sun,
  Target,
  TerminalSquare,
  X,
  type LucideIcon,
} from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { MarketingFooter } from './MarketingFooter';
import { DSA_CATEGORIES } from '../../data/categories';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import './MarketingHome.css';

const featureCards: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: MonitorPlay,
    title: 'Watch each step happen',
    description: 'Play, pause, and move through an algorithm one operation at a time, so the logic stays visible.',
  },
  {
    icon: Code2,
    title: 'Compare code languages',
    description: 'Follow the same idea in Python, C++, Java, Go, or pseudocode with a multi-language debugger.',
  },
  {
    icon: Target,
    title: 'Check your understanding',
    description: 'Use concept, guided, and challenge quizzes to practice what you have just explored.',
  },
  {
    icon: TerminalSquare,
    title: 'Try your own input',
    description: 'Change the values and trace how an algorithm responds to data you choose.',
  },
];

const faqs = [
  {
    question: 'What can I learn with STEM Studio?',
    answer: 'Explore data structures, algorithms, and operating system topics with visualizers, code examples, and practice quizzes.',
  },
  {
    question: 'Which programming languages are available?',
    answer: 'The debugger provides examples in Python, C++, Java, and Go, alongside pseudocode.',
  },
  {
    question: 'Can I use my own examples?',
    answer: 'Many visualizers include custom input controls, so you can change the data and follow each operation.',
  },
  {
    question: 'Is STEM Studio free?',
    answer: 'Yes. STEM Studio is free to use, and an account lets you open interactive modules and save your learning progress.',
  },
];

const bars = [
  { value: 3, height: 36 },
  { value: 7, height: 72 },
  { value: 5, height: 54 },
  { value: 9, height: 92 },
  { value: 2, height: 28 },
  { value: 6, height: 63 },
];

export function MarketingHome() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const categoryCount = DSA_CATEGORIES.filter((category) => category.available).length;

  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    if (location.pathname !== '/' || !location.hash) return;
    const sectionId = decodeURIComponent(location.hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, location.hash]);

  return (
    <div className="marketing-home">
      <SEOHead
        title="Interactive Data Structures & Algorithms Learning | STEM Studio"
        description="Learn data structures and algorithms by watching each step unfold. Explore visualizers, compare code in four languages, and practice with guided quizzes."
        canonical="https://stem-studio-one.vercel.app/"
      />
      <a className="marketing-skip-link" href="#main-content">Skip to content</a>

      <header className="marketing-header">
        <div className="marketing-header-inner">
          <Link className="marketing-brand" to="/" aria-label="STEM Studio home" onClick={closeMobileMenu}>
            <img src="/mascot_favicon_exact.png" alt="" aria-hidden="true" />
            <span>STEM <strong>Studio</strong></span>
          </Link>

          <nav id="marketing-navigation" className={`marketing-nav ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
            <a href="#features" onClick={closeMobileMenu}>Features</a>
            <a href="#how-it-works" onClick={closeMobileMenu}>How it works</a>
            <a href="#faq" onClick={closeMobileMenu}>FAQ</a>
            {!isAuthenticated && <Link className="marketing-nav-login" to="/login" onClick={closeMobileMenu}>Log in</Link>}
            <Link className="marketing-button marketing-button-small marketing-button-primary" to={isAuthenticated ? '/dashboard' : '/signup'} onClick={closeMobileMenu}>
              {isAuthenticated ? 'Open studio' : 'Get started'} <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </nav>

          <div className="marketing-header-actions">
            <button
              className="marketing-theme-toggle"
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </button>
            <button
              className="marketing-menu-toggle"
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="marketing-navigation"
            >
              {mobileMenuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <main id="main-content">
        <section className="marketing-hero" aria-labelledby="marketing-title">
          <div className="marketing-hero-copy">
            <p className="marketing-eyebrow"><span aria-hidden="true" /> A clearer way to learn computer science</p>
            <h1 id="marketing-title">Make algorithms <span>make sense.</span></h1>
            <p className="marketing-hero-description">
              See how data structures and algorithms work, one step at a time. Explore interactive visualizers, compare code, and practice until the ideas click.
            </p>
            <div className="marketing-hero-actions">
              <Link className="marketing-button marketing-button-primary" to="/dashboard">
                {isAuthenticated ? 'Open your studio' : 'Explore the studio'} <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className="marketing-button marketing-button-secondary" to={isAuthenticated ? '/dashboard/dsa' : '/signup'}>
                {isAuthenticated ? 'Browse all topics' : 'Create a free account'}
              </Link>
            </div>
            <div className="marketing-proof-row">
              <span><strong>{categoryCount}</strong> DSA categories</span>
              <i aria-hidden="true" />
              <span>Python, C++, Java, Go &amp; pseudocode</span>
            </div>
          </div>

          <figure className="marketing-demo-card" aria-labelledby="demo-caption">
            <div className="marketing-demo-topbar">
              <span className="marketing-demo-dots" aria-hidden="true"><i /><i /><i /></span>
              <span>Sorting visualizer</span>
              <span className="marketing-demo-step">Example step</span>
            </div>
            <div className="marketing-demo-content">
              <div className="marketing-demo-heading">
                <div>
                  <p className="marketing-demo-kicker">Bubble sort</p>
                  <h2>Compare neighboring values</h2>
                </div>
                <span className="marketing-demo-step-count">04 <small>/ 12</small></span>
              </div>
              <div className="marketing-bars" role="img" aria-label="Array values 3, 7, 5, 9, 2, 6. Values 9 and 2 are being compared.">
                {bars.map((bar, index) => (
                  <div className={`marketing-bar-column ${index === 3 || index === 4 ? 'is-active' : ''}`} key={bar.value}>
                    <span className="marketing-bar" style={{ height: `${bar.height}%` }} />
                    <span className="marketing-bar-value">{bar.value}</span>
                  </div>
                ))}
              </div>
              <div className="marketing-demo-note">
                <span className="marketing-note-icon" aria-hidden="true">↔</span>
                <p><strong>9 is greater than 2.</strong> Swap the pair to move the larger value toward the end.</p>
              </div>
              <div className="marketing-code-preview" aria-label="Pseudocode example">
                <span><i>01</i> for each neighboring pair</span>
                <span className="is-current"><i>02</i> &nbsp;if left value &gt; right value:</span>
                <span><i>03</i> &nbsp;&nbsp;swap the values</span>
              </div>
            </div>
            <figcaption id="demo-caption">A visual step makes the comparison and swap easy to follow.</figcaption>
          </figure>
        </section>

        <section className="marketing-benefit-strip" aria-label="Learning tools">
          <span>Learn by seeing</span><i aria-hidden="true" />
          <span>Practice at your pace</span><i aria-hidden="true" />
          <span>Connect ideas to code</span>
        </section>

        <section className="marketing-section" id="features" aria-labelledby="features-title">
          <div className="marketing-section-heading">
            <p className="marketing-eyebrow">Built for understanding</p>
            <h2 id="features-title">A hands-on way to learn the ideas behind the code.</h2>
            <p>Move from reading about a concept to seeing it work, then try it yourself.</p>
          </div>
          <div className="marketing-feature-grid">
            {featureCards.map(({ icon: Icon, title, description }, index) => (
              <article className="marketing-feature-card" key={title}>
                <span className={`marketing-feature-icon feature-icon-${index + 1}`}><Icon size={21} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="marketing-how-section" id="how-it-works" aria-labelledby="how-title">
          <div className="marketing-how-intro">
            <p className="marketing-eyebrow">A simple learning loop</p>
            <h2 id="how-title">See it. Try it. Understand it.</h2>
            <p>Each tool is designed to make the next step in learning feel clear.</p>
            <Link className="marketing-text-link" to="/dashboard/dsa">Browse all DSA topics <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          <ol className="marketing-steps">
            <li><span>01</span><div><h3>Choose a concept</h3><p>Pick a topic and begin with a visual explanation.</p></div></li>
            <li><span>02</span><div><h3>Follow the process</h3><p>Step through each comparison, decision, and change.</p></div></li>
            <li><span>03</span><div><h3>Practice the idea</h3><p>Use custom inputs and quizzes to check what you know.</p></div></li>
          </ol>
        </section>

        <section className="marketing-faq-section" id="faq" aria-labelledby="faq-title">
          <div className="marketing-section-heading">
            <p className="marketing-eyebrow">Good to know</p>
            <h2 id="faq-title">A few quick answers.</h2>
          </div>
          <div className="marketing-faq-list">
            {faqs.map(({ question, answer }) => (
              <details key={question}>
                <summary>{question}<span aria-hidden="true">+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="marketing-final-cta" aria-labelledby="final-cta-title">
          <div>
            <p className="marketing-eyebrow">Your next concept is closer than it looks</p>
            <h2 id="final-cta-title">Start with one idea. Build from there.</h2>
            <p>Explore the library and find a clear next step in your learning.</p>
          </div>
          <Link className="marketing-button marketing-button-light" to="/dashboard">
            Open the learning studio <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
