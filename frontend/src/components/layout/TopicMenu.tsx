import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, BarChart2, LayoutList, Type, GitCommit, Layers, Search, Hash,
  GitPullRequest, Share2, Repeat, CornerDownRight, Zap, Grid3x3, Binary,
  Home, ChevronDown, type LucideIcon,
} from 'lucide-react';
import { MODULES, DSA_CATEGORIES, type CategoryDef } from '../../data/categories';
import { CATEGORY_TOPICS } from '../../data/categoryTopics';
import './Layout.css';

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Activity, BarChart2, LayoutList, Type, GitCommit, Layers, Search, Hash,
  GitPullRequest, Share2, Repeat, CornerDownRight, Zap, Grid3x3, Binary,
};

interface TopicMenuProps {
  activeModule: string;
  onSelectModule: (moduleId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  /** Currently active category route segment (e.g. 'sorting') */
  activeCategory?: string;
}

/**
 * Build a map of categoryId -> topics from the centralized registry.
 */
const TOPICS_BY_CATEGORY = new Map(
  CATEGORY_TOPICS.map((cat) => [cat.categoryId, cat.topics])
);

export const TopicMenu: React.FC<TopicMenuProps> = ({
  activeModule,
  onSelectModule,
  isOpen = false,
  onClose,
  activeCategory = '',
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const activeTopic = searchParams.get('topic') || '';

  // Determine if we have a selected module to show categories
  const selectedModule = MODULES.find((m) => m.id === activeModule);
  const categories = selectedModule ? DSA_CATEGORIES : [];

  // Which categories are expanded? First one by default; active category also open.
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (DSA_CATEGORIES.length > 0) {
      initial.add(DSA_CATEGORIES[0].id);
    }
    if (activeCategory && DSA_CATEGORIES.some((c) => c.id === activeCategory)) {
      initial.add(activeCategory);
    }
    return initial;
  });

  // Keep the active category expanded whenever it changes.
  useEffect(() => {
    if (activeCategory && DSA_CATEGORIES.some((c) => c.id === activeCategory)) {
      setExpandedCategories((prev) => new Set(prev).add(activeCategory));
    }
  }, [activeCategory]);

  const toggleCategory = (catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const handleDashboardClick = () => {
    navigate('/dashboard');
    if (onClose) onClose();
  };

  const handleCategoryHeaderClick = (cat: CategoryDef) => {
    if (!cat.available) return;
    toggleCategory(cat.id);
  };

  const handleTopicClick = (cat: CategoryDef, topicId: string) => {
    if (!cat.available) return;
    setExpandedCategories((prev) => new Set(prev).add(cat.id));
    navigate(`/dashboard/${cat.id}?topic=${topicId}`);
    if (onClose) onClose();
  };

  return (
    <>
      {/* Overlay backdrop — only visible on mobile/tablet when sidebar is open */}
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`topic-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Dashboard back button */}
        <div className="sidebar-dashboard-row">
          <button className="sidebar-dashboard-btn" onClick={handleDashboardClick}>
            <Home size={16} />
            <span>Dashboard</span>
          </button>
        </div>

        {/* Module header */}
        <div className="sidebar-header">
          <span className="sidebar-title">MODULES</span>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        <nav className="topic-list">
          {MODULES.map((mod) => {
            const isModuleActive = mod.id === activeModule;
            const moduleCategories = isModuleActive ? DSA_CATEGORIES : [];
            
            return (
              <div key={mod.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button
                  className={`topic-card module-card ${isModuleActive ? 'active' : ''} ${!mod.available ? 'module-card-disabled' : ''}`}
                  onClick={() => {
                    if (!mod.available) return;
                    onSelectModule(mod.id);
                  }}
                  disabled={!mod.available}
                >
                  <div className="topic-icon">
                    {mod.id === 'dsa' ? <Layers size={18} /> : <Activity size={18} />}
                  </div>
                  <div className="topic-info">
                    <span className="topic-name">{mod.name}</span>
                    <span className="topic-category">{mod.description}</span>
                  </div>
                  {!mod.available && (
                    <span className="module-soon-badge">Soon</span>
                  )}
                </button>

                {isModuleActive && moduleCategories.length > 0 && (
                  <div className="module-categories-container" style={{ paddingLeft: '0.75rem', marginTop: '0.25rem', marginBottom: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {moduleCategories.map((cat, index) => {
                      const Icon = CATEGORY_ICON_MAP[cat.iconName] ?? Activity;
                      const isCategoryActive = cat.id === activeCategory;
                      const isExpanded = expandedCategories.has(cat.id);
                      const topics = TOPICS_BY_CATEGORY.get(cat.id) ?? [];

                      return (
                        <div
                          key={cat.id}
                          className={`category-accordion ${isCategoryActive ? 'active' : ''} ${!cat.available ? 'disabled' : ''}`}
                        >
                          <button
                            className="category-header"
                            onClick={() => handleCategoryHeaderClick(cat)}
                            disabled={!cat.available}
                            aria-expanded={isExpanded}
                          >
                            <div className="category-header-left">
                              <div className="category-icon">
                                <Icon size={16} />
                              </div>
                              <div className="category-meta">
                                <span className="category-name">{index + 1}. {cat.name}</span>
                                <span className="category-count">{cat.topicCount} topics</span>
                              </div>
                            </div>
                            <div className={`category-chevron ${isExpanded ? 'rotated' : ''}`}>
                              <ChevronDown size={16} />
                            </div>
                          </button>

                          <div className={`category-topics ${isExpanded ? 'open' : ''}`}>
                            <ul className="category-topics-list">
                              {topics.map((topic) => {
                                const isTopicActive = isCategoryActive && topic.id === activeTopic;
                                return (
                                  <li key={topic.id}>
                                    <button
                                      className={`topic-item ${isTopicActive ? 'active' : ''}`}
                                      onClick={() => handleTopicClick(cat, topic.id)}
                                      disabled={!cat.available}
                                    >
                                      <span className="topic-dot" />
                                      <span className="topic-item-name">{topic.name}</span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
