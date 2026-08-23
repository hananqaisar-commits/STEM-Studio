import React from 'react';
import { BarChart2, Layers, GitCommit, GitPullRequest, Search, Share2, X } from 'lucide-react';
import './Layout.css';

interface TopicItem {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
}

const TOPICS: TopicItem[] = [
  { id: 'sorting', name: 'Sorting Algorithms', category: 'Arrays & Sorting', icon: <BarChart2 size={18} /> },
  { id: 'stackQueue', name: 'Stack & Queue', category: 'Linear Structures', icon: <Layers size={18} /> },
  { id: 'linkedList', name: 'Linked List', category: 'Linear Structures', icon: <GitCommit size={18} /> },
  { id: 'bst', name: 'Binary Search Tree', category: 'Trees & Hierarchies', icon: <GitPullRequest size={18} /> },
  { id: 'binarySearch', name: 'Binary Search', category: 'Searching', icon: <Search size={18} /> },
  { id: 'graph', name: 'Graph Algorithms', category: 'Graphs & Networks', icon: <Share2 size={18} /> },
];

interface TopicMenuProps {
  activeTopic: string;
  onSelectTopic: (topicId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const TopicMenu: React.FC<TopicMenuProps> = ({
  activeTopic,
  onSelectTopic,
  isOpen = false,
  onClose,
}) => {
  const handleTopicClick = (topicId: string) => {
    onSelectTopic(topicId);
    // Auto-close drawer on mobile after selection
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
        <div className="sidebar-header">
          <span className="sidebar-title">ALGORITHM MODULES</span>
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="topic-list">
          {TOPICS.map((topic) => (
            <button
              key={topic.id}
              className={`topic-card ${activeTopic === topic.id ? 'active' : ''}`}
              onClick={() => handleTopicClick(topic.id)}
            >
              <div className="topic-icon">{topic.icon}</div>
              <div className="topic-info">
                <span className="topic-name">{topic.name}</span>
                <span className="topic-category">{topic.category}</span>
              </div>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
};
