import React from 'react';
import { BookOpen, Lightbulb, Eye, Target, ArrowRight } from 'lucide-react';
import type { QuizRevisionData } from '../../engine/types/Quiz';

/* ── QuizRevision ──────────────────────────────────────────────────────
   A revision card shown BEFORE quiz questions start. Gives the student
   a quick refresher on the algorithm's key idea, complexity, and what
   to watch for during the quiz. Dismissed with "Begin Quiz".
   ─────────────────────────────────────────────────────────────────── */

export interface QuizRevisionProps {
  algorithmName: string;
  revisionData: QuizRevisionData;
  onBegin: () => void;
}

export const QuizRevision: React.FC<QuizRevisionProps> = ({
  algorithmName,
  revisionData,
  onBegin,
}) => {
  const { description, complexity, keyIdea, watchFor, quickTip } = revisionData;

  return (
    <section className="quiz-panel quiz-revision" aria-label="Revision card">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="quiz-head">
        <div className="quiz-head-text">
          <span className="quiz-eyebrow">
            <Target size={13} />
            Revision
          </span>
          <h3 className="quiz-title quiz-revision-title">{algorithmName}</h3>
          <p className="quiz-revision-desc">{description}</p>
        </div>
        <span className="quiz-revision-complexity">{complexity}</span>
      </header>

      {/* ── Key Idea ───────────────────────────────────────────────── */}
      <div className="quiz-revision-section quiz-revision-key-idea">
        <div className="quiz-revision-section-head">
          <BookOpen size={15} />
          <span className="quiz-revision-section-title">Key Idea</span>
        </div>
        <p className="quiz-revision-section-body quiz-revision-key-idea-text">
          {keyIdea}
        </p>
      </div>

      {/* ── Watch For ──────────────────────────────────────────────── */}
      {watchFor.length > 0 && (
        <div className="quiz-revision-section">
          <div className="quiz-revision-section-head">
            <Eye size={15} />
            <span className="quiz-revision-section-title">Watch For</span>
          </div>
          <ul className="quiz-revision-list">
            {watchFor.map((item, i) => (
              <li key={i} className="quiz-revision-list-item">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Quick Tip ──────────────────────────────────────────────── */}
      <div className="quiz-revision-section">
        <div className="quiz-revision-section-head">
          <Lightbulb size={15} />
          <span className="quiz-revision-section-title">Quick Tip</span>
        </div>
        <p className="quiz-revision-section-body">{quickTip}</p>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="quiz-foot">
        <span className="quiz-score">Review the key concepts, then begin.</span>
        <button type="button" className="quiz-action" onClick={onBegin}>
          Begin Quiz
          <ArrowRight size={14} />
        </button>
      </footer>
    </section>
  );
};
