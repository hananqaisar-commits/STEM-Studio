import React from 'react';
import { Code, Info, Clock, HardDrive } from 'lucide-react';
import './Layout.css';

interface TimeComplexity {
  best: string;
  average: string;
  worst: string;
}

interface ExplanationPanelProps {
  description?: string;
  explanation?: string;
  stepNumber?: number;
  totalSteps?: number;
  codeLine?: number;
  pseudocode?: string[];
  timeComplexity?: TimeComplexity;
  spaceComplexity?: string;
}

export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  description,
  explanation,
  stepNumber,
  totalSteps,
  codeLine,
  pseudocode = [],
  timeComplexity,
  spaceComplexity,
}) => {
  const textToShow = explanation || description || 'Select an algorithm and click Play to start visualization.';
  const headerText =
    stepNumber !== undefined && totalSteps !== undefined
      ? `STEP ${stepNumber} OF ${totalSteps}`
      : 'CURRENT STEP EXPLANATION';

  return (
    <div className="explanation-panel">
      {/* Step Explanation Header */}
      <div className="panel-section step-explanation">
        <div className="section-title">
          <Info size={16} />
          <span>{headerText}</span>
        </div>
        <p className="explanation-text">{textToShow}</p>
      </div>

      {/* Complexity Cards */}
      {(timeComplexity || spaceComplexity) && (
        <div className="panel-section complexity-section">
          <div className="complexity-grid">
            {timeComplexity && (
              <div className="complexity-card">
                <div className="complexity-header">
                  <Clock size={14} />
                  <span>Time Complexity</span>
                </div>
                <div className="complexity-body">
                  <span>Best: <strong>{timeComplexity.best}</strong></span>
                  <span>Avg: <strong>{timeComplexity.average}</strong></span>
                  <span>Worst: <strong>{timeComplexity.worst}</strong></span>
                </div>
              </div>
            )}

            {spaceComplexity && (
              <div className="complexity-card">
                <div className="complexity-header">
                  <HardDrive size={14} />
                  <span>Space Complexity</span>
                </div>
                <div className="complexity-body">
                  <span>Space: <strong>{spaceComplexity}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pseudocode Tracker */}
      {pseudocode.length > 0 && (
        <div className="panel-section pseudocode-section">
          <div className="section-title">
            <Code size={16} />
            <span>PSEUDOCODE TRACKER</span>
          </div>
          <pre className="pseudocode-container">
            {pseudocode.map((line, idx) => (
              <div
                key={idx}
                className={`code-line ${codeLine === idx + 1 ? 'active-line' : ''}`}
              >
                <span className="line-num">{idx + 1}</span>
                <span className="line-code">{line}</span>
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
};
