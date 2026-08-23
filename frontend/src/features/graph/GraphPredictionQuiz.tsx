import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, ArrowRight, Lightbulb } from 'lucide-react';
import type { GraphQuizData } from './graphEngine';
import './Graph.css';

interface GraphPredictionQuizProps {
  quizData: GraphQuizData;
  onCorrectAnswer: () => void;
}

export const GraphPredictionQuiz: React.FC<GraphPredictionQuizProps> = ({
  quizData,
  onCorrectAnswer,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);

  const isCorrect = selectedIndex === quizData.correctIndex;

  const handleSelect = (idx: number) => {
    setSelectedIndex(idx);
    setIsAnswered(true);
  };

  const handleContinue = () => {
    setIsAnswered(false);
    setSelectedIndex(null);
    onCorrectAnswer();
  };

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '1.25rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#c084fc',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          <HelpCircle size={15} />
          <span>GRAPH ALGORITHM PREDICTION QUIZ</span>
        </div>
        <span
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-secondary)',
            background: 'rgba(255,255,255,0.05)',
            padding: '0.15rem 0.5rem',
            borderRadius: '6px',
          }}
        >
          Interactive Traversal Check
        </span>
      </div>

      <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)' }}>
        {quizData.prompt}
      </p>

      {!isAnswered ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {quizData.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{option}</span>
              <ArrowRight size={14} style={{ opacity: 0.5 }} />
            </button>
          ))}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            padding: '0.85rem',
            borderRadius: '10px',
            background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isCorrect ? (
              <>
                <CheckCircle2 size={18} color="#34d399" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>
                  CORRECT PREDICTION
                </span>
              </>
            ) : (
              <>
                <XCircle size={18} color="#f87171" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171' }}>
                  INCORRECT
                </span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <Lightbulb size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {quizData.explanation}
            </p>
          </div>

          <button
            onClick={handleContinue}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              background: '#c084fc',
              color: '#0f172a',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: '0.25rem',
            }}
          >
            <span>Resume Traversal</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};
