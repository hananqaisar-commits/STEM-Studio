import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, BarChart2, LayoutList, Type, GitCommit, Layers, Search, Hash,
  GitPullRequest, Share2, Repeat, CornerDownRight, Zap, Grid3x3, Binary,
  Sparkles, X, ArrowLeft, type LucideIcon,
} from 'lucide-react';
import { MODULES, DSA_CATEGORIES, type CategoryDef } from '../../data/categories';
import './DSAHub.css';

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Activity, BarChart2, LayoutList, Type, GitCommit, Layers, Search, Hash,
  GitPullRequest, Share2, Repeat, CornerDownRight, Zap, Grid3x3, Binary,
};

/**
 * Resolve which categories belong to a given module.
 * Currently all categories belong to DSA; future modules will add their own.
 */
function getCategoriesForModule(moduleId: string): CategoryDef[] {
  if (moduleId === 'dsa') return DSA_CATEGORIES;
  return [];
}

interface ModuleHubProps {
  moduleId: string;
}

export const ModuleHub: React.FC<ModuleHubProps> = ({ moduleId }) => {
  const navigate = useNavigate();
  const module = MODULES.find(m => m.id === moduleId);
  const categories = getCategoriesForModule(moduleId);

  /* ── New feature detection (moved from DSAHub) ────────────────── */
  const [newFeatures, setNewFeatures] = useState<string[]>([]);
  const [dismissedNew, setDismissedNew] = useState(false);

  useEffect(() => {
    if (categories.length === 0) return;
    const STORAGE_KEY = `stem-studio-known-${moduleId}`;
    const currentIds = categories.filter(c => c.available).map(c => c.id);
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const knownIds: string[] = JSON.parse(stored);
      const newOnes = currentIds.filter(id => !knownIds.includes(id));
      if (newOnes.length > 0) {
        setNewFeatures(newOnes);
      }
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentIds));
    }
  }, [moduleId, categories]);

  const dismissNewFeatures = useCallback(() => {
    const STORAGE_KEY = `stem-studio-known-${moduleId}`;
    const currentIds = categories.filter(c => c.available).map(c => c.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentIds));
    setDismissedNew(true);
  }, [moduleId, categories]);

  if (!module) {
    return (
      <div className="dsa-hub">
        <div className="module-page-header">
          <button className="module-back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <h2>Module not found</h2>
        </div>
      </div>
    );
  }

  if (!module.available) {
    return (
      <div className="dsa-hub">
        <div className="module-page-header">
          <button className="module-back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
          <h2>{module.name}</h2>
          <p className="module-coming-soon-msg">This module is coming soon. Stay tuned!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dsa-hub">
      <div className="module-page-header">
        <button className="module-back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <h2 className="module-page-title">{module.name}</h2>
        <p className="module-page-desc">{module.description}</p>
        <div className="module-page-stats">
          <span className="hub-stat-badge">{categories.filter(c => c.available).length} Categories</span>
          <span className="hub-stat-badge">{categories.reduce((s, c) => s + c.topicCount, 0)}+ Topics</span>
        </div>
      </div>

      {/* New Feature Banner */}
      {newFeatures.length > 0 && !dismissedNew && (
        <div className="new-feature-banner">
          <div className="new-feature-content">
            <Sparkles size={18} className="new-feature-icon" />
            <div>
              <strong>What&apos;s New!</strong>
              {newFeatures.map(id => {
                const cat = categories.find(c => c.id === id);
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

      {/* Category Grid */}
      <div className="hub-grid">
        {categories.map((cat) => {
          const Icon = CATEGORY_ICON_MAP[cat.iconName] ?? Activity;
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
    </div>
  );
};
