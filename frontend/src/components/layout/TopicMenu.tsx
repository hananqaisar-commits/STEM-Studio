import React from 'react';
import { BarChart2, Layers, GitCommit, GitPullRequest, Search, Share2 } from 'lucide-react';
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
}

export const TopicMenu: React.FC<TopicMenuProps> = ({
  activeTopic,
  onSelectTopic,
}) => {
  return (
    <aside className="topic-sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">ALGORITHM MODULES</span>
      </div>

      <nav className="topic-list">
        {TOPICS.map((topic) => (
          <button
            key={topic.id}
            className={`topic-card ${activeTopic === topic.id ? 'active' : ''}`}
            onClick={() => onSelectTopic(topic.id)}
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
  );
};
