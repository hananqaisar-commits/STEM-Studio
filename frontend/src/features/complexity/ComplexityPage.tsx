import React, { useState } from 'react';
import { Activity, BookOpen, CheckCircle2 } from 'lucide-react';
import { VisualizerHeader } from '../../components/layout/VisualizerHeader';
import { COMPLEXITY_TOPICS } from '../../data/complexityContent';
import './Complexity.css';

/**
 * Map the complexity learning topics to the shape VisualizerHeader expects
 * for a single category selector dropdown.
 */
const COMPLEXITY_SELECTOR_CATEGORIES = COMPLEXITY_TOPICS.map((topic) => ({
  categoryId: topic.id,
  categoryName: topic.name,
  topics: [],
}));

export const ComplexityPage: React.FC = () => {
  const [selectedTopicId, setSelectedTopicId] = useState('general');
  const topic = COMPLEXITY_TOPICS.find((t) => t.id === selectedTopicId) ?? COMPLEXITY_TOPICS[0];

  return (
    <div className="complexity-page">
      <VisualizerHeader
        icon={<Activity size={22} />}
        title="Complexity Analysis"
        subtitle="Learn how algorithms and data structures scale with input size"
        items={[]}
        activeId={undefined}
        onSelect={() => {}}
        placeholder="Search complexity topics..."
        categories={COMPLEXITY_SELECTOR_CATEGORIES}
        activeCategoryId={selectedTopicId}
        onSelectCategory={setSelectedTopicId}
        categorySelectorOnly
      />

      {/* Topic hero */}
      <div className="complexity-topic-hero">
        <div className="complexity-topic-badge">
          <BookOpen size={14} />
          <span>Learning Topic</span>
        </div>
        <h2 className="complexity-topic-title">{topic.headline}</h2>
        <p className="complexity-topic-intro">{topic.intro}</p>
      </div>

      {/* Topic content */}
      <div className="complexity-content">
        {topic.sections.map((section, index) => (
          <article key={section.title} className="complexity-section">
            <h2>
              <span className="complexity-section-number">{index + 1}</span>
              {section.title}
            </h2>

            {section.body && <p className="section-intro">{section.body}</p>}

            {section.list && (
              <ul className="complexity-list">
                {section.list.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            )}

            {section.table && (
              <div className="complexity-table-wrapper">
                <table className="complexity-table">
                  <thead>
                    <tr>
                      {section.table.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {section.code && (
              <div className="complexity-code-block">
                <pre>{section.code}</pre>
              </div>
            )}

            {section.takeaway && (
              <div className="complexity-takeaway">
                <CheckCircle2 size={18} />
                <p>{section.takeaway}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
};
