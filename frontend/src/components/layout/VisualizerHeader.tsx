import React from 'react';
import { FileCode2 } from 'lucide-react';
import type { CategoryTopics } from '../../data/categoryTopics';
import { hasCustomStub } from '../../data/customCode';

export interface VisualizerSearchItem { id: string; name: string; description?: string; group?: string; }
interface VisualizerHeaderProps {
  icon: React.ReactNode; title: string; subtitle: string; items?: VisualizerSearchItem[];
  activeId?: string; onSelect?: (id: string) => void; placeholder?: string; actions?: React.ReactNode;
  categories?: CategoryTopics[]; activeCategoryId?: string; onSelectCategory?: (categoryId: string) => void; categorySelectorOnly?: boolean;
  isCustomCodeRunning?: boolean;
}

/** Shared compact page header. The topic strip remains in the page controls;
 * this row only provides identity, search, and the universal mode actions. */
export const VisualizerHeader: React.FC<VisualizerHeaderProps> = ({ icon, title, subtitle, actions, isCustomCodeRunning, activeId }) => {
  const categoryByTitle: Record<string, string> = {
    'Sorting Algorithms Studio': 'sorting',
    'Linked List Visualizer': 'linkedList',
    'Stack & Queue Studio': 'stackQueue',
    'Tree Structures Studio': 'bst',
    'Graph Algorithms Studio': 'graph',
    'Binary Search Studio': 'binarySearch',
    'Hash Map Algorithms Studio': 'hashMaps',
    'Array Algorithms Studio': 'arrays',
    'String Algorithms Studio': 'strings',
    'Recursion Studio': 'recursion',
    'Backtracking Algorithms Studio': 'backtracking',
    'Greedy Algorithms Studio': 'greedy',
    'Dynamic Programming Studio': 'dp',
    'Trie (Prefix Tree) Studio': 'trie',
  };
  const topicCategoryId = categoryByTitle[title];
  const codeSupported = topicCategoryId && activeId ? hasCustomStub(topicCategoryId, activeId) : null;
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
          {codeSupported !== null && (
            <span className={`custom-code-coverage ${codeSupported ? 'is-supported' : 'is-coming'}`}>
              Custom code: {codeSupported ? 'supported' : 'coming soon'}
            </span>
          )}
        </div>
      </div>
      {actions}
    </header>
  );
};
