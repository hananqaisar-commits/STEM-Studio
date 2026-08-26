import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, BarChart2, LayoutList, Type, GitCommit, Layers, Search, Hash,
  GitPullRequest, Share2, Repeat, CornerDownRight, Zap, Grid3x3, Binary,
  Home, type LucideIcon,
} from 'lucide-react';
import { MODULES, DSA_CATEGORIES, type CategoryDef } from '../../data/categories';
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
 * Resolve which categories belong to a given module.
 */
function getCategoriesForModule(moduleId: string): CategoryDef[] {
  if (moduleId === 'dsa') return DSA_CATEGORIES;
  return [];
}

export const TopicMenu: React.FC<TopicMenuProps> = ({
  activeModule,
  onSelectModule,
  isOpen = false,
  onClose,
  activeCategory,
}) => {
  const navigate = useNavigate();

  // Determine if we have a selected module to show categories
  const selectedModule = MODULES.find(m => m.id === activeModule);
  const categories = selectedModule ? getCategoriesForModule(activeModule) : [];

  const handleDashboardClick = () => {
    navigate('/dashboard');
    if (onClose) onClose();
  };

  const handleCategoryClick = (cat: CategoryDef) => {
    if (!cat.available) return;
    navigate(`/dashboard/${cat.id}`);
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
          <span className="sidebar-title">
            {selectedModule ? `${selectedModule.name.toUpperCase()}` : 'MODULES'}
          </span>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        <nav className="topic-list">
          {categories.length > 0 ? (
            /* Show categories for the selected module */
            categories.map((cat) => {
              const Icon = CATEGORY_ICON_MAP[cat.iconName] ?? Activity;
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  className={`topic-card ${isActive ? 'active' : ''} ${!cat.available ? 'module-card-disabled' : ''}`}
                  onClick={() => handleCategoryClick(cat)}
                  disabled={!cat.available}
                >
                  <div className="topic-icon"><Icon size={16} /></div>
                  <div className="topic-info">
                    <span className="topic-name">{cat.name}</span>
                    <span className="topic-category">{cat.topicCount} topics</span>
                  </div>
                </button>
              );
            })
          ) : (
            /* Fallback: show modules list */
            MODULES.map((mod) => {
              const isActive = mod.id === activeModule;
              return (
                <button
                  key={mod.id}
                  className={`topic-card module-card ${isActive ? 'active' : ''} ${!mod.available ? 'module-card-disabled' : ''}`}
                  onClick={() => {
                    if (!mod.available) return;
                    onSelectModule(mod.id);
                    if (onClose) onClose();
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
              );
            })
          )}
        </nav>
      </aside>
    </>
  );
};
