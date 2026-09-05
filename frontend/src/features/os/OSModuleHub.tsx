import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal, LayoutGrid, Laptop, ArrowLeft, Monitor, ChevronRight, Sparkles
} from 'lucide-react';
import { OS_DISTROS, type OSModuleDef } from '../../data/categories';
import '../hub/DSAHub.css';

const OS_ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Terminal,
  LayoutGrid,
  Laptop,
};

export const OSModuleHub: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="dsa-hub">
      <div className="module-page-header">
        <button className="module-back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div className="flex items-center gap-3 mt-2">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Monitor size={28} />
          </div>
          <div>
            <h2 className="module-page-title">Operating System Module</h2>
            <p className="module-page-desc">Select an operating system platform to explore terminal commands, file systems, and system architecture.</p>
          </div>
        </div>
        <div className="module-page-stats mt-4">
          <span className="hub-stat-badge">3 Platforms</span>
          <span className="hub-stat-badge">Linux Active</span>
          <span className="hub-stat-badge">2 Interactive Visualizers</span>
        </div>
      </div>

      {/* Grid of 3 OS Cards */}
      <div className="hub-grid mt-6">
        {OS_DISTROS.map((os: OSModuleDef) => {
          const IconComponent = OS_ICON_MAP[os.iconName] ?? Terminal;
          return (
            <div
              key={os.id}
              className={`hub-card ${!os.available ? 'hub-card-disabled' : ''}`}
              onClick={() => os.available && navigate(`/dashboard/os/${os.id}`)}
              style={{ cursor: os.available ? 'pointer' : 'not-allowed' }}
            >
              <div className="hub-card-icon">
                <IconComponent size={24} />
              </div>
              <div className="hub-card-body">
                <div className="flex items-center justify-between mb-1">
                  <h3>{os.name}</h3>
                  {os.badge && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                      {os.badge}
                    </span>
                  )}
                </div>
                <p>{os.description}</p>
              </div>
              <div className="hub-card-footer flex items-center justify-between">
                <span className="hub-card-topics">
                  {os.available ? `${os.categoryCount} Categories` : 'In Development'}
                </span>
                {os.available ? (
                  <span className="flex items-center gap-1 text-cyan-400 text-xs font-semibold">
                    Explore <ChevronRight size={14} />
                  </span>
                ) : (
                  <span className="hub-card-soon">Coming Soon</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
