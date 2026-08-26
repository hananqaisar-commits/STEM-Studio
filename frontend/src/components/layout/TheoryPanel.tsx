import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, Lightbulb } from 'lucide-react';
import { THEORY_CONTENT, type TheoryTopic } from '../../data/theoryContent';
import './Layout.css';

interface TheoryPanelProps {
  /** Which category this panel describes (e.g. 'sorting', 'graph'). */
  categoryId: string;
  /** If supplied, the topic that should be highlighted/expanded first. */
  activeTopic?: string;
  /** Optional extra class name. */
  className?: string;
}

export const TheoryPanel: React.FC<TheoryPanelProps> = ({
  categoryId,
  activeTopic,
  className = '',
}) => {
  const category = THEORY_CONTENT[categoryId];
  const [openTopics, setOpenTopics] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (activeTopic) initial.add(activeTopic);
    return initial;
  });

  useEffect(() => {
    if (activeTopic) {
      setOpenTopics((prev) => new Set([...prev, activeTopic]));
    }
  }, [activeTopic]);

  if (!category) return null;

  const toggleTopic = (id: string) => {
    setOpenTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenTopics(new Set(category.topics.map((t) => t.id)));
  const collapseAll = () => setOpenTopics(new Set<string>());

  return (
    <div className={`theory-panel ${className}`}>
      <div className="theory-panel-header">
        <div className="theory-panel-title">
          <BookOpen size={18} />
          <span>Theory & Concepts</span>
        </div>
        <p className="theory-panel-subtitle">{category.overview}</p>
        <div className="theory-panel-actions">
          <button className="theory-action-btn" onClick={expandAll} type="button">
            Expand all
          </button>
          <button className="theory-action-btn" onClick={collapseAll} type="button">
            Collapse all
          </button>
        </div>
      </div>

      <div className="theory-topics">
        {category.topics.map((topic) => (
          <TheoryTopicItem
            key={topic.id}
            topic={topic}
            isOpen={openTopics.has(topic.id)}
            isActive={topic.id === activeTopic}
            onToggle={() => toggleTopic(topic.id)}
          />
        ))}
      </div>
    </div>
  );
};

interface TheoryTopicItemProps {
  topic: TheoryTopic;
  isOpen: boolean;
  isActive: boolean;
  onToggle: () => void;
}

const TheoryTopicItem: React.FC<TheoryTopicItemProps> = ({
  topic,
  isOpen,
  isActive,
  onToggle,
}) => {
  return (
    <div className={`theory-topic ${isActive ? 'is-active' : ''}`}>
      <button
        className={`theory-topic-header ${isOpen ? 'open' : ''}`}
        onClick={onToggle}
        type="button"
        aria-expanded={isOpen}
      >
        <span className="theory-topic-name">{topic.name}</span>
        <span className="theory-topic-meta">
          {topic.complexity && <span className="theory-topic-complexity">{topic.complexity}</span>}
          <ChevronDown size={16} className="theory-topic-chevron" />
        </span>
      </button>

      <div className={`theory-topic-body ${isOpen ? 'open' : ''}`}>
        <div className="theory-topic-inner">
          {topic.description && (
            <p className="theory-topic-description">{topic.description}</p>
          )}

          {topic.keyPoints && topic.keyPoints.length > 0 && (
            <div className="theory-key-points">
              <div className="theory-subhead">
                <Lightbulb size={14} />
                <span>Key Points</span>
              </div>
              <ul>
                {topic.keyPoints.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {topic.steps && topic.steps.length > 0 && (
            <div className="theory-steps">
              <div className="theory-subhead">
                <span>Algorithm Steps</span>
              </div>
              <ol>
                {topic.steps.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ol>
            </div>
          )}

          {topic.example && (
            <div className="theory-example">
              <div className="theory-subhead">
                <span>Example Walkthrough</span>
              </div>
              <pre>{topic.example}</pre>
            </div>
          )}

          {topic.codeSnippet && (
            <div className="theory-code">
              <div className="theory-subhead">
                <span>Reference Implementation</span>
              </div>
              <pre>{topic.codeSnippet}</pre>
            </div>
          )}

          {topic.applications && topic.applications.length > 0 && (
            <div className="theory-applications">
              <div className="theory-subhead">
                <span>Real-World Applications</span>
              </div>
              <ul>
                {topic.applications.map((app, idx) => (
                  <li key={idx}>{app}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TheoryPanel;
