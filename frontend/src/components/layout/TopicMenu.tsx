import React from 'react';
import { BookOpen, Cpu, Monitor, X } from 'lucide-react';
import { MODULES } from '../../data/categories';
import './Layout.css';

interface TopicMenuProps {
  activeModule: string;
  onSelectModule: (moduleId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const MODULE_ICONS: Record<string, React.ReactNode> = {
  dsa: <BookOpen size={18} />,
  dld: <Cpu size={18} />,
  os: <Monitor size={18} />,
};

export const TopicMenu: React.FC<TopicMenuProps> = ({
  activeModule: _activeModule,
  onSelectModule,
  isOpen = false,
  onClose,
}) => {
  const handleClick = (moduleId: string, available: boolean) => {
    if (!available) return;
    onSelectModule(moduleId);
    if (onClose) onClose();
  };

  // DSA module is always active when viewing any category page
  const isDsaActive = true; // DSA module is always active when dashboard is open

  return (
    <>
      {/* Overlay backdrop — only visible on mobile/tablet when sidebar is open */}
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`topic-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">MODULES</span>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="topic-list">
          {MODULES.map((mod) => {
            const isActive = mod.id === 'dsa' && isDsaActive;
            return (
              <button
                key={mod.id}
                className={`topic-card module-card ${isActive ? 'active' : ''} ${!mod.available ? 'module-card-disabled' : ''}`}
                onClick={() => handleClick(mod.id, mod.available)}
                disabled={!mod.available}
              >
                <div className="topic-icon">{MODULE_ICONS[mod.id]}</div>
                <div className="topic-info">
                  <span className="topic-name">{mod.name}</span>
                  <span className="topic-category">{mod.description}</span>
                </div>
                {!mod.available && (
                  <span className="module-soon-badge">Soon</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
};
