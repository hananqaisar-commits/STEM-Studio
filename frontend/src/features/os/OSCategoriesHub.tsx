import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, FolderTree, ArrowLeft, ChevronRight, BookOpen } from 'lucide-react';
import { OS_CATEGORIES, type CategoryDef } from '../../data/categories';
import '../hub/DSAHub.css';

const OS_CAT_ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Terminal,
  FolderTree,
};

export const OSCategoriesHub: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="dsa-hub">
      <div className="module-page-header">
        <button className="module-back-btn" onClick={() => navigate('/dashboard/os')}>
          <ArrowLeft size={16} /> Back to Operating System Module
        </button>
        <div className="flex items-center gap-3 mt-2">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Terminal size={28} />
          </div>
          <div>
            <h2 className="module-page-title">Linux Operating System</h2>
            <p className="module-page-desc">Master Linux terminal commands and interact with a live virtual filesystem visualizer.</p>
          </div>
        </div>
        <div className="module-page-stats mt-4">
          <span className="hub-stat-badge">2 Categories</span>
          <span className="hub-stat-badge">50+ Commands</span>
          <span className="hub-stat-badge">Live VFS Terminal</span>
        </div>
      </div>

      {/* Category Grid */}
      <div className="hub-grid mt-6">
        {OS_CATEGORIES.map((cat: CategoryDef) => {
          const IconComponent = OS_CAT_ICON_MAP[cat.iconName] ?? Terminal;
          return (
            <div
              key={cat.id}
              className={`hub-card ${!cat.available ? 'hub-card-disabled' : ''}`}
              onClick={() => cat.available && navigate(`/dashboard/os/${cat.id}`)}
              style={{ cursor: cat.available ? 'pointer' : 'not-allowed' }}
            >
              <div className="hub-card-icon">
                <IconComponent size={24} />
              </div>
              <div className="hub-card-body">
                <h3>{cat.name}</h3>
                <p>{cat.description}</p>
              </div>
              <div className="hub-card-footer flex items-center justify-between">
                <span className="hub-card-topics">{cat.topicCount} Topics / Views</span>
                <span className="flex items-center gap-1 text-cyan-400 text-xs font-semibold">
                  Open Category <ChevronRight size={14} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
