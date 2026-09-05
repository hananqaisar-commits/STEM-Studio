import React from 'react';
import { FileCode2 } from 'lucide-react';
import type { CategoryTopics } from '../../data/categoryTopics';

export interface VisualizerSearchItem { id: string; name: string; description?: string; group?: string; }
interface VisualizerHeaderProps {
  icon: React.ReactNode; title: string; subtitle: string; items?: VisualizerSearchItem[];
  activeId?: string; onSelect?: (id: string) => void; placeholder?: string; actions?: React.ReactNode;
  categories?: CategoryTopics[]; activeCategoryId?: string; onSelectCategory?: (categoryId: string) => void; categorySelectorOnly?: boolean;
  isCustomCodeRunning?: boolean;
}

/** Shared compact page header. The topic strip remains in the page controls;
 * this row only provides identity, search, and the universal mode actions. */
export const VisualizerHeader: React.FC<VisualizerHeaderProps> = ({ icon, title, subtitle, actions, isCustomCodeRunning }) => {
  return (
    <header className="viz-header animate-fade-in">
      <div className="viz-title-group">
        <div className="viz-title-icon">{icon}</div>
        <div className="viz-title-text">
          <div className="viz-title-row">
            <h1>{title}</h1>
            {isCustomCodeRunning && (
              <span className="pasted-code-running-badge" title="Executing user-pasted custom code from debugger">
                <FileCode2 size={13} />
                <span>Pasted code is running</span>
              </span>
            )}
          </div>
          <p>{subtitle}</p>
        </div>
      </div>
      {actions}
    </header>
  );
};
