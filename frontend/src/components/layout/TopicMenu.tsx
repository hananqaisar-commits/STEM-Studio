import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity, BarChart2, LayoutList, Type, GitCommit, Layers, Search, Hash,
  GitPullRequest, Share2, Repeat, CornerDownRight, Zap, Grid3x3, Binary,
  Home, ChevronDown, PanelLeftClose, BookOpen, Cpu, Monitor, ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { MODULES, DSA_CATEGORIES, type CategoryDef } from '../../data/categories';
import { CATEGORY_TOPICS } from '../../data/categoryTopics';
import './Layout.css';

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Activity, BarChart2, LayoutList, Type, GitCommit, Layers, Search, Hash,
  GitPullRequest, Share2, Repeat, CornerDownRight, Zap, Grid3x3, Binary,
  BookOpen, Cpu, Monitor,
};

interface TopicMenuProps {
  activeModule: string;
  onSelectModule: (moduleId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
  activeCategory?: string;
  sidebarWidth?: number;
  onWidthChange?: (width: number) => void;
}

const TOPICS_BY_CATEGORY = new Map(
  CATEGORY_TOPICS.map((cat) => [cat.categoryId, cat.topics])
);

export const TopicMenu: React.FC<TopicMenuProps> = ({
  activeModule,
  onSelectModule,
  isOpen = false,
  onClose,
  onOpen,
  activeCategory = '',
  sidebarWidth = 340,
  onWidthChange,
}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTopic = searchParams.get('topic') || '';

  // Track expanded modules — DSA expanded by default
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => new Set(['dsa']));

  // Track expanded categories — active category expanded by default
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeCategory && DSA_CATEGORIES.some((c) => c.id === activeCategory)) {
      initial.add(activeCategory);
    } else {
      initial.add('sorting'); // default to sorting if none active
    }
    return initial;
  });

  useEffect(() => {
    if (activeCategory && DSA_CATEGORIES.some((c) => c.id === activeCategory)) {
      setExpandedCategories((prev) => new Set(prev).add(activeCategory));
      setExpandedModules((prev) => new Set(prev).add('dsa'));
    }
  }, [activeCategory]);

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) {
        next.delete(modId);
      } else {
        next.add(modId);
      }
      return next;
    });
    onSelectModule(modId);
  };

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

  const handleTopicClick = (cat: CategoryDef, topicId: string) => {
    if (!cat.available) return;
    setExpandedCategories((prev) => new Set(prev).add(cat.id));
    navigate(`/dashboard/${cat.id}?topic=${topicId}`);
    if (onClose) onClose();
  };

  // --- Resizing logic ---
  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(sidebarWidth);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = sidebarWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const handleDoubleClick = () => {
    if (onWidthChange) {
      onWidthChange(340);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !onWidthChange) return;
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(Math.max(startWidthRef.current + delta, 260), 550);
      onWidthChange(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
      }
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, onWidthChange]);

  return (
    <>
      {!isOpen && onOpen && (
        <div
          className="sidebar-hover-trigger"
          onMouseEnter={onOpen}
          title="Hover to show Navigation"
          aria-label="Open Navigation"
        />
      )}

      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`topic-sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'} ${isResizing ? 'is-resizing' : ''}`}
        style={{
          width: `${sidebarWidth}px`,
          minWidth: `${sidebarWidth}px`,
          maxWidth: `${sidebarWidth}px`,
        }}
      >
        <div className="sidebar-dashboard-row">
          <button className="sidebar-dashboard-btn" onClick={handleDashboardClick}>
            <Home size={16} />
            <span>Dashboard</span>
          </button>
        </div>

        <div className="sidebar-header">
          <span className="sidebar-title">CURRICULUM MODULES</span>
          {onClose && (
            <button
              className="sidebar-close-btn desktop-hide-btn"
              onClick={onClose}
              aria-label="Hide sidebar"
              title="Hide Sidebar"
            >
              <PanelLeftClose size={16} />
            </button>
          )}
        </div>

        <nav className="topic-list">
          {MODULES.map((mod) => {
            const isModuleExpanded = expandedModules.has(mod.id);
            const isModuleActive = mod.id === activeModule;
            const ModuleIcon = CATEGORY_ICON_MAP[mod.iconName] ?? BookOpen;

            return (
              <div key={mod.id} className="module-group">
                <button
                  className={`topic-card module-card ${isModuleActive ? 'active' : ''} ${!mod.available ? 'module-card-disabled' : ''}`}
                  onClick={() => mod.available && toggleModule(mod.id)}
                  disabled={!mod.available}
                  title={mod.available ? (isModuleExpanded ? 'Click to collapse module' : 'Click to expand module') : 'Coming Soon'}
                >
                  <div className="topic-icon">
                    <ModuleIcon size={18} />
                  </div>
                  <div className="topic-info">
                    <span className="topic-name">{mod.name}</span>
                    <span className="topic-category">{mod.description}</span>
                  </div>
                  {mod.available ? (
                    <ChevronDown size={16} className={`module-chevron ${isModuleExpanded ? 'rotated' : ''}`} />
                  ) : (
                    <span className="module-soon-badge">Soon</span>
                  )}
                </button>

                {/* Sub-categories inside Module */}
                {isModuleExpanded && mod.id === 'dsa' && (
                  <div className="module-categories-container">
                    {DSA_CATEGORIES.map((cat, index) => {
                      const Icon = CATEGORY_ICON_MAP[cat.iconName] ?? Activity;
                      const isCategoryActive = cat.id === activeCategory;
                      const isCategoryExpanded = expandedCategories.has(cat.id);
                      const topics = TOPICS_BY_CATEGORY.get(cat.id) ?? [];

                      return (
                        <div
                          key={cat.id}
                          className={`category-accordion ${isCategoryActive ? 'active' : ''} ${!cat.available ? 'disabled' : ''}`}
                        >
                          {/* Category Accordion Header */}
                          <button
                            className="category-header"
                            onClick={() => cat.available && toggleCategory(cat.id)}
                            disabled={!cat.available}
                            aria-expanded={isCategoryExpanded}
                          >
                            <div className="category-header-left">
                              <div className="category-icon">
                                <Icon size={15} />
                              </div>
                              <div className="category-meta">
                                <span className="category-name">{index + 1}. {cat.name}</span>
                                <span className="category-count">{cat.topicCount} topics</span>
                              </div>
                            </div>
                            <div className={`category-chevron ${isCategoryExpanded ? 'rotated' : ''}`}>
                              <ChevronDown size={14} />
                            </div>
                          </button>

                          {/* Unordered List of Specific Algorithms/Topics */}
                          {isCategoryExpanded && (
                            <div className="category-topics open">
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
                                        {topic.group && (
                                          <span className="topic-badge">{topic.group}</span>
                                        )}
                                      </button>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Vertical Resizer Handle */}
        <div
          className="sidebar-resizer"
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          title="Double-click to reset width • Drag right border to resize"
        >
          <div className="resizer-handle-grip" />
        </div>
      </aside>
    </>
  );
};
