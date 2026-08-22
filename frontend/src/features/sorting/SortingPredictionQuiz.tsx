import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, ArrowRight, Lightbulb, ArrowUpDown } from 'lucide-react';
import '../bst/BST.css';

interface SortingPredictionQuizProps {
  val1: number;
  val2: number;
  idx1: number;
  idx2: number;
  onCorrectAnswer: () => void;
}

export const SortingPredictionQuiz: React.FC<SortingPredictionQuizProps> = ({
  val1,
  val2,
  idx1,
  idx2,
  onCorrectAnswer,
}) => {
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const shouldSwap = val1 > val2;

  const handleChoice = (choice: 'swap' | 'keep') => {
    setIsAnswered(true);
    const correct = (choice === 'swap' && shouldSwap) || (choice === 'keep' && !shouldSwap);
    setIsCorrect(correct);
  };

  const handleContinue = () => {
    setIsAnswered(false);
    onCorrectAnswer();
  };

  return (
    <div className="prediction-quiz-card animate-fade-in mb-4">
      <div className="quiz-header">
        <div className="quiz-header-badge">
          <HelpCircle size={14} className="text-amber-400" />
          <span>SORTING PREDICTIVE QUIZ</span>
        </div>
        <span className="quiz-step-tag">Step Comparison</span>
      </div>

      <div className="quiz-question">
        <div className="comparison-metric">
          <span className="metric-box target-box">
            Element [{idx1}]: <strong>{val1}</strong>
          </span>
          <span className="metric-vs">vs</span>
          <span className="metric-box current-box">
            Element [{idx2}]: <strong>{val2}</strong>
          </span>
        </div>

        <p className="question-prompt-text">
          Predict: Should elements <strong>{val1}</strong> and <strong>{val2}</strong> be swapped for ascending order?
        </p>
      </div>

      {!isAnswered ? (
        <div className="quiz-buttons">
          <button
            className="quiz-btn left-btn"
            onClick={() => handleChoice('swap')}
          >
            <ArrowUpDown size={16} />
            <span>SWAP ({val1} &gt; {val2})</span>
          </button>
          <button
            className="quiz-btn right-btn"
            onClick={() => handleChoice('keep')}
          >
            <span>KEEP ORDER ({val1} &le; {val2})</span>
            <CheckCircle2 size={16} />
          </button>
        </div>
      ) : (
        <div className={`quiz-feedback-box ${isCorrect ? 'feedback-correct' : 'feedback-wrong'} animate-fade-in`}>
          <div className="feedback-status">
            {isCorrect ? (
              <>
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span className="feedback-title correct-title">PREDICTION CORRECT!</span>
              </>
            ) : (
              <>
                <XCircle size={18} className="text-rose-400" />
                <span className="feedback-title wrong-title">INCORRECT PREDICTION</span>
              </>
            )}
          </div>

          <div className="explanation-wrapper">
            <Lightbulb size={16} className="text-amber-400 flex-shrink-0" />
            <p className="feedback-explanation">
              {shouldSwap
                ? `${val1} is greater than ${val2}, so a swap is required for ascending order.`
                : `${val1} is less than or equal to ${val2}, so no swap is needed.`}
            </p>
          </div>

          <button className="quiz-continue-btn" onClick={handleContinue}>
            <span>Continue Execution</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
