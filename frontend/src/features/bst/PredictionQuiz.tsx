import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
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
        <HelpCircle size={18} className="text-amber-400" />
        <span>PREDICT THE NEXT MOVE (LEARNING QUIZ)</span>
      </div>

      <div className="quiz-question">
        Value to insert: <strong>{targetValue}</strong> vs Current Node: <strong>{currentNodeValue}</strong>
        <div className="question-prompt">Which direction should {targetValue} move next?</div>
      </div>

      {!isAnswered ? (
        <div className="quiz-buttons">
          <button
            className="quiz-btn left-btn"
            onClick={() => handleChoice('left')}
          >
            ⬅️ MOVE LEFT ({targetValue} &lt; {currentNodeValue})
          </button>
          <button
            className="quiz-btn right-btn"
            onClick={() => handleChoice('right')}
          >
            ➡️ MOVE RIGHT ({targetValue} &gt; {currentNodeValue})
          </button>
        </div>
      ) : (
        <div className={`quiz-feedback-box ${isCorrect ? 'feedback-correct' : 'feedback-wrong'} animate-fade-in`}>
          <div className="feedback-status">
            {isCorrect ? (
              <>
                <CheckCircle2 size={20} className="text-emerald-400" />
                <span className="feedback-title correct-title">EXCELLENT! CORRECT PREDICTION 🎉</span>
              </>
            ) : (
              <>
                <XCircle size={20} className="text-rose-400" />
                <span className="feedback-title wrong-title">NOT QUITE! LET'S LEARN WHY 💡</span>
              </>
            )}
          </div>

          <p className="feedback-explanation">{explanation}</p>

          <button className="quiz-continue-btn" onClick={handleContinue}>
            <span>Continue Step Execution</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
