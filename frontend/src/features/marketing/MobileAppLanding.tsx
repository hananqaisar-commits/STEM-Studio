import { ArrowLeftRight, ArrowRight, BookOpen, Code2, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';
import './MobileAppLanding.css';

const sortBars = [
  { value: 3, height: 34 },
  { value: 7, height: 68 },
  { value: 5, height: 51 },
  { value: 9, height: 88, active: true },
  { value: 2, height: 27, active: true },
  { value: 6, height: 60 },
];

export function MobileAppLanding() {
  return (
    <div className="native-app-landing">
      <header className="native-app-landing__header">
        <Link className="native-app-landing__brand" to="/" aria-label="STEM Studio home">
          <img src="/mascot_favicon_exact.png" alt="" />
          <span>STEM <strong>Studio</strong></span>
        </Link>
        <Link className="native-app-landing__sign-in" to="/login">Sign in</Link>
      </header>

      <main className="native-app-landing__main">
        <section className="native-app-landing__hero" aria-labelledby="native-landing-title">
          <p className="native-app-landing__eyebrow"><span /> Interactive computer science</p>
          <h1 id="native-landing-title">Make algorithms <span>make sense.</span></h1>
          <p className="native-app-landing__intro">
            Watch data structures change one step at a time. Explore the logic, follow the code, and try it yourself.
          </p>
        </section>

        <section className="native-sort-preview" aria-label="Example Bubble Sort visualization">
          <div className="native-sort-preview__topline">
            <div>
              <p>Sorting visualizer</p>
              <h2>Bubble Sort</h2>
            </div>
            <span className="native-sort-preview__step">04 <i>/ 12</i></span>
          </div>
          <div className="native-sort-preview__chart" aria-label="Array values 3, 7, 5, 9, 2, 6. Values 9 and 2 are being compared." role="img">
            {sortBars.map(({ value, height, active }) => (
              <div className="native-sort-preview__column" key={value}>
                <span className={`native-sort-preview__bar${active ? ' is-active' : ''}`} style={{ height: `${height}%` }} />
                <span className="native-sort-preview__value">{value}</span>
              </div>
            ))}
          </div>
          <div className="native-sort-preview__note">
            <span aria-hidden="true"><ArrowLeftRight size={17} /></span>
            <p><strong>Compare neighboring values.</strong> See why the next swap happens.</p>
          </div>
        </section>

        <section className="native-app-landing__paths" aria-label="Explore STEM Studio subjects">
          <Link className="native-learning-path" to="/dashboard/dsa">
            <span className="native-learning-path__icon"><BookOpen size={20} aria-hidden="true" /></span>
            <span className="native-learning-path__copy">
              <strong>Data Structures &amp; Algorithms</strong>
              <small>15 categories · visualizers, code, and quizzes</small>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link className="native-learning-path" to="/dashboard/os">
            <span className="native-learning-path__icon native-learning-path__icon--systems"><Terminal size={20} aria-hidden="true" /></span>
            <span className="native-learning-path__copy">
              <strong>Operating Systems</strong>
              <small>Linux commands and a virtual file-system lab</small>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>

        <aside className="native-octa-note">
          <Code2 size={19} aria-hidden="true" />
          <p><strong>Learn with Octa</strong><span>Get help with the step and code you’re viewing.</span></p>
        </aside>
      </main>

      <footer className="native-app-landing__actions">
        <Link className="native-app-landing__primary" to="/dashboard">
          Explore the studio <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <p>New to STEM Studio? <Link to="/signup">Create a free account</Link></p>
      </footer>
    </div>
  );
}
