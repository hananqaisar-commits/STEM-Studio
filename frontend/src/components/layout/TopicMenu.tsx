import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Activity, BarChart2, LayoutList, Type, GitCommit, Layers, Search, Hash,
  GitPullRequest, Share2, Repeat, CornerDownRight, Zap, Grid3x3, Binary,
  Home, ChevronDown, PanelLeftClose, BookOpen, Cpu, Monitor, User as UserIcon,
  Terminal, FolderTree,
  type LucideIcon,
} from 'lucide-react';
import { MODULES, DSA_CATEGORIES, OS_CATEGORIES, type CategoryDef } from '../../data/categories';
import { CATEGORY_TOPICS } from '../../data/categoryTopics';
import { useAuth } from '../../contexts/AuthContext';
import './Layout.css';

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Activity, BarChart2, LayoutList, Type, GitCommit, Layers, Search, Hash,
  GitPullRequest, Share2, Repeat, CornerDownRight, Zap, Grid3x3, Binary,
  BookOpen, Cpu, Monitor, Terminal, FolderTree,
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
  activeCategory = '',
  sidebarWidth = 340,
  onWidthChange,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const activeTopic = searchParams.get('topic') || '';

  // Hover state for 64px docked strip vs expanded pane
  const [isHovered, setIsHovered] = useState(false);

  // Track expanded modules — DSA & OS expanded by default
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => new Set(['dsa', 'os']));

  // Track expanded categories — active category expanded by default
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeCategory) {
      initial.add(activeCategory);
    } else {
      initial.add('sorting');
    }
    return initial;
  });

  useEffect(() => {
    if (activeCategory) {
      setExpandedCategories((prev) => new Set(prev).add(activeCategory));
    }
    if (activeModule) {
      setExpandedModules((prev) => new Set(prev).add(activeModule));
    }
  }, [activeCategory, activeModule]);

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

  const isExpanded = isHovered || isOpen;

  const getUserInitial = () => {
    if (user?.first_name) return user.first_name[0].toUpperCase();
    if (user?.username) return user.username[0].toUpperCase();
    return 'M';
  };

  const getUserDisplayName = () => {
    if (user?.first_name) return `${user.first_name} ${user.last_name || ''}`.trim();
    if (user?.username) return user.username;
    return 'Manu Arora';
  };

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`topic-sidebar ${isExpanded ? 'is-expanded' : 'is-collapsed'} ${isOpen ? 'sidebar-open' : ''} ${isResizing ? 'is-resizing' : ''}`}
        style={{
          width: isExpanded ? `${sidebarWidth}px` : '64px',
          minWidth: isExpanded ? `${sidebarWidth}px` : '64px',
          maxWidth: isExpanded ? `${sidebarWidth}px` : '64px',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top: Dashboard Navigation */}
        <div className="sidebar-dashboard-row">
          <button
            className={`sidebar-dashboard-btn ${location.pathname === '/dashboard' ? 'active' : ''}`}
            onClick={handleDashboardClick}
            title="Dashboard"
          >
            <div className="sidebar-item-icon">
              <Home size={18} />
            </div>
            {isExpanded && <span>Dashboard</span>}
          </button>
        </div>

        {/* Section Title */}
        {isExpanded && (
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
        )}

        {/* Modules & Categories List */}
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
                  <div className="sidebar-item-icon">
                    <ModuleIcon size={18} />
                  </div>
                  {isExpanded && (
                    <>
                      <div className="topic-info">
                        <span className="topic-name">{mod.name}</span>
                        <span className="topic-category">{mod.description}</span>
                      </div>
                      {mod.available ? (
                        <ChevronDown size={16} className={`module-chevron ${isModuleExpanded ? 'rotated' : ''}`} />
                      ) : (
                        <span className="module-soon-badge">Soon</span>
                      )}
                    </>
                  )}
                </button>

                {/* Sub-categories inside Module (only shown when sidebar is expanded) */}
                {isExpanded && isModuleExpanded && mod.id === 'dsa' && (
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
                            title={`${index + 1}. ${cat.name}`}
                          >
                            <div className="category-header-left">
                              <div className="sidebar-item-icon">
                                <Icon size={16} />
                              </div>
                              {isExpanded && (
                                <div className="category-meta">
                                  <span className="category-name">{index + 1}. {cat.name}</span>
                                  <span className="category-count">{cat.topicCount} topics</span>
                                </div>
                              )}
                            </div>
                            {isExpanded && (
                              <div className={`category-chevron ${isCategoryExpanded ? 'rotated' : ''}`}>
                                <ChevronDown size={14} />
                              </div>
                            )}
                          </button>

                          {/* Unordered List of Specific Algorithms/Topics */}
                          {isExpanded && isCategoryExpanded && (
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

                {/* Operating System Categories Container */}
                {isExpanded && isModuleExpanded && mod.id === 'os' && (
                  <div className="module-categories-container">
                    {OS_CATEGORIES.map((cat, index) => {
                      const Icon = CATEGORY_ICON_MAP[cat.iconName] ?? Terminal;
                      const isCategoryActive = location.pathname.includes(`/dashboard/os/${cat.id}`);

                      return (
                        <div
                          key={cat.id}
                          className={`category-accordion ${isCategoryActive ? 'active' : ''}`}
                        >
                          <button
                            className="category-header"
                            onClick={() => {
                              navigate(`/dashboard/os/${cat.id}`);
                              if (onClose) onClose();
                            }}
                            title={`${index + 1}. ${cat.name}`}
                          >
                            <div className="category-header-left">
                              <div className="sidebar-item-icon">
                                <Icon size={16} />
                              </div>
                              {isExpanded && (
                                <div className="category-meta">
                                  <span className="category-name">{index + 1}. {cat.name}</span>
                                  <span className="category-count">{cat.topicCount} {cat.id === 'commands' ? 'Groups' : 'Visualizer'}</span>
                                </div>
                              )}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="sidebar-bottom-profile">
          <div className="sidebar-user-avatar">
            {getUserInitial()}
          </div>
          {isExpanded && (
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{getUserDisplayName()}</span>
              {user?.email && <span className="sidebar-user-email">{user.email}</span>}
            </div>
          )}
        </div>

        {/* Vertical Resizer Handle when expanded */}
        {isExpanded && (
          <div
            className="sidebar-resizer"
            onMouseDown={handleMouseDown}
            onDoubleClick={handleDoubleClick}
            title="Double-click to reset width • Drag right border to resize"
          >
            <div className="resizer-handle-grip" />
          </div>
        )}
      </aside>
    </>
  );
};
