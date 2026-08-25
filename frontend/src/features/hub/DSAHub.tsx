import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart2,
  LayoutList,
  Type,
  GitCommit,
  Layers,
  Search,
  Hash,
  GitPullRequest,
  Share2,
  Repeat,
  CornerDownRight,
  Zap,
  Grid3x3,
  Binary,
  type LucideIcon,
} from 'lucide-react';
import { DSA_CATEGORIES } from '../../data/categories';
import './DSAHub.css';

const ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  BarChart2,
  LayoutList,
  Type,
  GitCommit,
  Layers,
  Search,
  Hash,
  GitPullRequest,
  Share2,
  Repeat,
  CornerDownRight,
  Zap,
  Grid3x3,
  Binary,
};

export const DSAHub: React.FC = () => {
  const navigate = useNavigate();

  const totalCategories = DSA_CATEGORIES.length;
  const totalTopics = DSA_CATEGORIES.reduce((sum, c) => sum + c.topicCount, 0);

  return (
    <div className="dsa-hub">
      <header className="hub-header">
        <h1>Data Structures & Algorithms</h1>
        <p>
          Interactive visualizers, step-by-step execution, and quiz-based learning
          for core computer science concepts.
        </p>
      </header>

      <div className="hub-stats-bar">
        <span className="hub-stat-badge">{totalCategories} categories</span>
        <span className="hub-stat-badge">{totalTopics} topics</span>
      </div>

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
                <span
                  className={`hub-card-difficulty diff-${cat.difficulty.toLowerCase()}`}
                >
                  {cat.difficulty}
                </span>
                {!cat.available && (
                  <span className="hub-card-soon">Coming Soon</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
