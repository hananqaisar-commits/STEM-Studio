import type { FC } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart2,
  BookOpen,
  Grid3x3,
  Monitor,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import { SEOHead } from '../../components/common/SEOHead';
import { DSA_CATEGORIES, MODULES, OS_CATEGORIES } from '../../data/categories';
import './DashboardHome.css';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Activity,
  BarChart2,
  Share2,
  Grid3x3,
};

const QUICK_START_IDS = ['complexity', 'sorting', 'graph', 'dp'];

const countTopics = (categories: typeof DSA_CATEGORIES) =>
  categories.reduce((total, category) => total + category.topicCount, 0);

export const DashboardHome: FC = () => {
  const dsaCategories = DSA_CATEGORIES.filter((category) => category.available);
  const osCategories = OS_CATEGORIES.filter((category) => category.available);
  const dsaModule = MODULES.find((module) => module.id === 'dsa');
  const osModule = MODULES.find((module) => module.id === 'os');
  const quickStartTopics = QUICK_START_IDS
    .map((id) => DSA_CATEGORIES.find((category) => category.id === id))
    .filter((category) => category?.available);

  return (
    <div className="dashboard-home">
      <SEOHead
        title="Your Learning Studio | STEM Studio"
        description="Choose a computer science subject or jump into a data structures and algorithms topic in STEM Studio."
        canonical="https://stem-studio-one.vercel.app/dashboard"
        noIndex
      />

      <header className="dashboard-home-heading">
        <p className="dashboard-home-eyebrow">Your learning studio</p>
        <h1>Where would you like to start?</h1>
        <p>Choose a subject library or jump straight into a topic.</p>
        <Link className="dashboard-about-link" to="/">About STEM Studio <ArrowRight size={14} aria-hidden="true" /></Link>
      </header>

      <section className="dashboard-subject-grid" aria-label="Subject libraries">
        {dsaModule && (
          <Link className="dashboard-subject-card dashboard-subject-dsa" to="/dashboard/dsa">
            <span className="dashboard-subject-icon"><BookOpen size={22} aria-hidden="true" /></span>
            <span className="dashboard-subject-copy">
              <span className="dashboard-subject-kicker">{dsaCategories.length} categories · {countTopics(dsaCategories)} topics</span>
              <strong>{dsaModule.name}</strong>
              <span>{dsaModule.description}</span>
            </span>
            <ArrowRight className="dashboard-subject-arrow" size={20} aria-hidden="true" />
          </Link>
        )}
        {osModule && (
          <Link className="dashboard-subject-card dashboard-subject-os" to="/dashboard/os">
            <span className="dashboard-subject-icon"><Monitor size={22} aria-hidden="true" /></span>
            <span className="dashboard-subject-copy">
              <span className="dashboard-subject-kicker">{osCategories.length} categories · {countTopics(osCategories)} topics</span>
              <strong>{osModule.name}</strong>
              <span>{osModule.description}</span>
            </span>
            <ArrowRight className="dashboard-subject-arrow" size={20} aria-hidden="true" />
          </Link>
        )}
      </section>

      <section className="dashboard-quick-start" aria-labelledby="quick-start-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="dashboard-home-eyebrow">Quick start</p>
            <h2 id="quick-start-title">Pick a topic</h2>
          </div>
          <Link className="dashboard-all-topics-link" to="/dashboard/dsa">
            All DSA topics <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="dashboard-topic-grid">
          {quickStartTopics.map((category) => {
            if (!category) return null;
            const Icon = CATEGORY_ICONS[category.iconName] ?? Activity;

            return (
              <Link className="dashboard-topic-card" to={`/dashboard/${category.id}`} key={category.id}>
                <span className="dashboard-topic-icon"><Icon size={19} aria-hidden="true" /></span>
                <span className="dashboard-topic-copy">
                  <strong>{category.name}</strong>
                  <span>{category.topicCount} topics · {category.difficulty}</span>
                </span>
                <ArrowRight className="dashboard-topic-arrow" size={16} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
};
