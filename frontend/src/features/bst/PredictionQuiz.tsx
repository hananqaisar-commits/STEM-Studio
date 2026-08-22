import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';
import type { PredictionPoint } from './bstEngine';
import './BST.css';

interface PredictionQuizProps {
  predictionPoint: PredictionPoint;
  onCorrectAnswer: () => void;
}

export const PredictionQuiz: React.FC<PredictionQuizProps> = ({
  predictionPoint,
  onCorrectAnswer,
}) => {
  const [, setSelectedChoice] = useState<'left' | 'right' | 'here' | 'found' | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const { targetValue, currentNodeValue, correctDirection, explanation } = predictionPoint;

  const handleChoice = (choice: 'left' | 'right' | 'here' | 'found') => {
    setSelectedChoice(choice);
    setIsAnswered(true);
    const correct = choice === correctDirection || (correctDirection === 'here' && (choice === 'left' || choice === 'right'));
    setIsCorrect(correct);
  };

  const handleContinue = () => {
    setIsAnswered(false);
    setSelectedChoice(null);
    onCorrectAnswer();
  };

  return (
    <div className="prediction-quiz-card animate-fade-in">
      <div className="quiz-header">
        <div className="quiz-header-badge">
          <HelpCircle size={14} className="text-amber-400" />
          <span>PREDICTIVE ALGORITHM QUIZ</span>
        </div>
        <span className="quiz-step-tag">Step Evaluation</span>
      </div>

      <div className="quiz-question">
        <div className="comparison-metric">
          <span className="metric-box target-box">
            Target Value: <strong>{targetValue}</strong>
          </span>
          <span className="metric-vs">vs</span>
          <span className="metric-box current-box">
            Current Node: <strong>{currentNodeValue}</strong>
          </span>
        </div>

        <p className="question-prompt-text">
          Select the correct BST subtree direction for value <strong>{targetValue}</strong>:
        </p>
      </div>

      {!isAnswered ? (
        <div className="quiz-buttons">
          <button
            className="quiz-btn left-btn"
            onClick={() => handleChoice('left')}
          >
            <ArrowLeft size={16} />
            <span>MOVE LEFT SUBTREE ({targetValue} &lt; {currentNodeValue})</span>
          </button>
          <button
            className="quiz-btn right-btn"
            onClick={() => handleChoice('right')}
          >
            <span>MOVE RIGHT SUBTREE ({targetValue} &gt; {currentNodeValue})</span>
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className={`quiz-feedback-box ${isCorrect ? 'feedback-correct' : 'feedback-wrong'} animate-fade-in`}>
          <div className="feedback-status">
            {isCorrect ? (
              <>
                <CheckCircle2 size={18} className="text-emerald-400" />
                <span className="feedback-title correct-title">PREDICTION CORRECT</span>
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
            <p className="feedback-explanation">{explanation}</p>
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
