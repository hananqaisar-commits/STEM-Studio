import React, { useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Mail, Bell, Folder, FileText, Database,
  Users, Settings, Shield, Key, ChevronDown, ChevronUp, Layers, Activity,
  BarChart2, Grid3x3, Type, GitCommit, Search, Share2, Repeat, CornerDownRight,
  Hash, Binary, Zap, GitPullRequest, User as UserIcon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DSA_CATEGORIES } from '../../data/categories';
import { SettingsModal } from './SettingsModal';
import './Layout.css';

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
  Activity, BarChart2, Grid3x3, Type, GitCommit, Layers, Search, Share2,
  Repeat, CornerDownRight, Hash, Binary, Zap, GitPullRequest
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

export const TopicMenu: React.FC<TopicMenuProps> = ({
  activeCategory = '',
  isOpen = false,
  onClose,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const activeTopic = searchParams.get('topic') || '';

  const [isHovered, setIsHovered] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Collapsible section states
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    content: true,
    team: true,
    settings: true,
  });

  const toggleGroup = (groupKey: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

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
      {/* Mobile Backdrop overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`topic-sidebar ${isExpanded ? 'is-expanded' : 'is-collapsed'} ${isOpen ? 'sidebar-open' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Top Navigation Items */}
        <div className="sidebar-top-section">
          {/* Dashboard */}
          <button
            className={`sidebar-item-btn ${location.pathname === '/dashboard' ? 'active' : ''}`}
            onClick={() => { navigate('/dashboard'); if (onClose) onClose(); }}
            title="Dashboard"
          >
            <div className="sidebar-item-icon">
              <LayoutDashboard size={20} />
            </div>
            {isExpanded && <span className="sidebar-item-label">Dashboard</span>}
          </button>

          {/* Analytics / Modules */}
          <button
            className={`sidebar-item-btn ${location.pathname.includes('/dashboard/dsa') ? 'active' : ''}`}
            onClick={() => { navigate('/dashboard/dsa'); if (onClose) onClose(); }}
            title="Analytics"
          >
            <div className="sidebar-item-icon">
              <BarChart3 size={20} />
            </div>
            {isExpanded && <span className="sidebar-item-label">Analytics</span>}
          </button>

          {/* Messages */}
          <button
            className="sidebar-item-btn"
            onClick={() => { navigate('/dashboard#reviews'); if (onClose) onClose(); }}
            title="Messages"
          >
            <div className="sidebar-item-icon">
              <Mail size={20} />
            </div>
            {isExpanded && <span className="sidebar-item-label">Messages</span>}
          </button>

          {/* Notifications */}
          <button
            className="sidebar-item-btn"
            onClick={() => { navigate('/dashboard#faqs'); if (onClose) onClose(); }}
            title="Notifications"
          >
            <div className="sidebar-item-icon">
              <Bell size={20} />
            </div>
            {isExpanded && <span className="sidebar-item-label">Notifications</span>}
          </button>
        </div>

        {/* Separator Line */}
        <div className="sidebar-divider" />

        {/* Scrollable Middle Content */}
        <div className="sidebar-scroll-content">
          {/* Group 1: Content */}
          <div className="sidebar-group">
            <button
              className={`sidebar-group-header ${openGroups.content ? 'open' : ''}`}
              onClick={() => toggleGroup('content')}
              title="Content"
            >
              <div className="sidebar-item-icon">
                <Folder size={20} />
              </div>
              {isExpanded && (
                <>
                  <span className="sidebar-group-title">Content</span>
                  <span className="sidebar-chevron">
                    {openGroups.content ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </>
              )}
            </button>

            {(openGroups.content || !isExpanded) && (
              <div className="sidebar-sub-items">
                <button
                  className="sidebar-sub-item-btn"
                  onClick={() => { navigate('/dashboard/dsa'); if (onClose) onClose(); }}
                  title="Documents"
                >
                  <div className="sidebar-item-icon">
                    <FileText size={18} />
                  </div>
                  {isExpanded && <span className="sidebar-sub-label">Documents</span>}
                </button>

                <button
                  className="sidebar-sub-item-btn"
                  onClick={() => { navigate('/dashboard/sorting'); if (onClose) onClose(); }}
                  title="Database"
                >
                  <div className="sidebar-item-icon">
                    <Database size={18} />
                  </div>
                  {isExpanded && <span className="sidebar-sub-label">Database</span>}
                </button>
              </div>
            )}
          </div>

          {/* Group 2: Team / Curriculum Categories */}
          <div className="sidebar-group">
            <button
              className={`sidebar-group-header ${openGroups.team ? 'open' : ''}`}
              onClick={() => toggleGroup('team')}
              title="Team & DSA Categories"
            >
              <div className="sidebar-item-icon">
                <Users size={20} />
              </div>
              {isExpanded && (
                <>
                  <span className="sidebar-group-title">Team</span>
                  <span className="sidebar-chevron">
                    {openGroups.team ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </>
              )}
            </button>

            {(openGroups.team || !isExpanded) && (
              <div className="sidebar-sub-items">
                {DSA_CATEGORIES.slice(0, 5).map((cat) => {
                  const Icon = CATEGORY_ICON_MAP[cat.iconName] ?? Activity;
                  const isActive = activeCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      className={`sidebar-sub-item-btn ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        navigate(`/dashboard/${cat.id}`);
                        if (onClose) onClose();
                      }}
                      title={cat.name}
                    >
                      <div className="sidebar-item-icon">
                        <Icon size={18} />
                      </div>
                      {isExpanded && <span className="sidebar-sub-label">{cat.name}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Group 3: Settings */}
          <div className="sidebar-group">
            <button
              className={`sidebar-group-header ${openGroups.settings ? 'open' : ''}`}
              onClick={() => toggleGroup('settings')}
              title="Settings"
            >
              <div className="sidebar-item-icon">
                <Settings size={20} />
              </div>
              {isExpanded && (
                <>
                  <span className="sidebar-group-title">Settings</span>
                  <span className="sidebar-chevron">
                    {openGroups.settings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </span>
                </>
              )}
            </button>

            {(openGroups.settings || !isExpanded) && (
              <div className="sidebar-sub-items">
                <button
                  className="sidebar-sub-item-btn"
                  onClick={() => setShowSettingsModal(true)}
                  title="General"
                >
                  <div className="sidebar-item-icon">
                    <Settings size={18} />
                  </div>
                  {isExpanded && <span className="sidebar-sub-label">General</span>}
                </button>

                <button
                  className="sidebar-sub-item-btn"
                  onClick={() => setShowSettingsModal(true)}
                  title="Security"
                >
                  <div className="sidebar-item-icon">
                    <Shield size={18} />
                  </div>
                  {isExpanded && <span className="sidebar-sub-label">Security</span>}
                </button>

                <button
                  className="sidebar-sub-item-btn"
                  onClick={() => setShowSettingsModal(true)}
                  title="API Keys"
                >
                  <div className="sidebar-item-icon">
                    <Key size={18} />
                  </div>
                  {isExpanded && <span className="sidebar-sub-label">API Keys</span>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Profile User Section */}
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
      </aside>

      {/* Settings Modal */}
      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </>
  );
};
