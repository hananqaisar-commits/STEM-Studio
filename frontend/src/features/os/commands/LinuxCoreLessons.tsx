import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Copy, LockKeyhole, Network, Server, Shield, Terminal, Wifi } from 'lucide-react';
import { LINUX_CORE_LESSONS, type LinuxCoreLesson } from '../../../data/linuxCoreLessons';

const LESSON_ICONS = {
  ufw: Shield,
  'wifi-sharing': Wifi,
  permissions: LockKeyhole,
  'processes-services': Server,
} as const;

interface LinuxCoreLessonsProps {
  onStepChange?: (lesson: LinuxCoreLesson, stepIndex: number) => void;
}

export const LinuxCoreLessons: React.FC<LinuxCoreLessonsProps> = ({ onStepChange }) => {
  const [lessonId, setLessonId] = useState(LINUX_CORE_LESSONS[0].id);
  const [stepIndex, setStepIndex] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState('');
  const lesson = LINUX_CORE_LESSONS.find((item) => item.id === lessonId) ?? LINUX_CORE_LESSONS[0];
  const step = lesson.steps[stepIndex];

  useEffect(() => {
    onStepChange?.(lesson, stepIndex);
  }, [lesson, onStepChange, stepIndex]);

  const chooseLesson = (nextId: string) => {
    setLessonId(nextId);
    setStepIndex(0);
    setCopyMessage('');
  };

  const copyCommand = async (command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedId(command);
      setCopyMessage('Command copied. Review it before running in your terminal.');
      window.setTimeout(() => setCopiedId((current) => current === command ? null : current), 1500);
    } catch {
      setCopyMessage('Clipboard access is unavailable. Select and copy the command manually.');
    }
  };

  const activeFlowIndex = Math.min(lesson.flow.length - 1, Math.floor((stepIndex / lesson.steps.length) * lesson.flow.length));

  return (
    <section className="linux-core" aria-labelledby="linux-core-title">
      <div className="linux-core__intro">
        <div className="linux-core__intro-icon"><BookOpen size={20} aria-hidden="true" /></div>
        <div>
          <p className="linux-core__eyebrow">Linux Core · guided concepts</p>
          <h2 id="linux-core-title">Learn what the commands do</h2>
          <p>Follow the flow, move through short lessons, and copy commands when you are ready to try them.</p>
        </div>
      </div>

      <div className="linux-core__lesson-tabs" role="tablist" aria-label="Linux Core lessons">
        {LINUX_CORE_LESSONS.map((item) => {
          const Icon = LESSON_ICONS[item.id as keyof typeof LESSON_ICONS] ?? Terminal;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={lesson.id === item.id}
              className={`linux-core__lesson-tab${lesson.id === item.id ? ' is-active' : ''}`}
              onClick={() => chooseLesson(item.id)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{item.title}</span>
            </button>
          );
        })}
      </div>

      <article className="linux-core__lesson" key={lesson.id}>
        <header className="linux-core__lesson-header">
          <div>
            <p className="linux-core__eyebrow">Core idea</p>
            <h3>{lesson.title}</h3>
            <p>{lesson.summary}</p>
          </div>
          <span className="linux-core__lesson-count">{lesson.steps.length} short steps</span>
        </header>

        <div className="linux-core__flow" aria-label={`${lesson.title} flow`}>
          {lesson.flow.map((item, index) => (
            <React.Fragment key={item}>
              <div className={`linux-core__flow-node${index === activeFlowIndex ? ' is-active' : ''}`} aria-current={index === activeFlowIndex ? 'step' : undefined}>
                {item}
              </div>
              {index < lesson.flow.length - 1 && <span className="linux-core__flow-arrow" aria-hidden="true">→</span>}
            </React.Fragment>
          ))}
        </div>

        <div className="linux-core__step-card" aria-live="polite">
          <div className="linux-core__step-heading">
            <span className="linux-core__step-number">{String(stepIndex + 1).padStart(2, '0')}</span>
            <div>
              <p className="linux-core__eyebrow">Step {stepIndex + 1} of {lesson.steps.length}</p>
              <h4>{step.title}</h4>
            </div>
          </div>
          <p className="linux-core__step-copy">{step.explanation}</p>

          <div className="linux-core__commands" aria-label="Commands for this step">
            {step.commands.map((command, index) => {
              const id = `${lesson.id}-${stepIndex}-${index}`;
              return (
                <div className="linux-core__command" key={id}>
                  <code><span aria-hidden="true">$ </span>{command}</code>
                  <button type="button" onClick={() => void copyCommand(command)} aria-label={`Copy command ${command}`}>
                    {copiedId === command ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedId === command ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              );
            })}
          </div>
          {copyMessage && <p className="linux-core__copy-status" role="status">{copyMessage}</p>}
        </div>

        <div className="linux-core__step-controls">
          <div className="linux-core__progress" role="progressbar" aria-label="Lesson progress" aria-valuemin={1} aria-valuemax={lesson.steps.length} aria-valuenow={stepIndex + 1}>
            {lesson.steps.map((item, index) => (
              <span key={item.title} className={index <= stepIndex ? 'is-complete' : ''} />
            ))}
          </div>
          <div className="linux-core__step-buttons">
            <button type="button" className="bst-btn" onClick={() => setStepIndex((value) => Math.max(0, value - 1))} disabled={stepIndex === 0}>
              <ArrowLeft size={15} /> Previous
            </button>
            <button type="button" className="bst-btn bst-btn-primary" onClick={() => setStepIndex((value) => Math.min(lesson.steps.length - 1, value + 1))} disabled={stepIndex === lesson.steps.length - 1}>
              Next step <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {lesson.caution && (
          <aside className="linux-core__caution" aria-label="Safety note">
            <Network size={16} aria-hidden="true" />
            <p>{lesson.caution}</p>
          </aside>
        )}
      </article>
    </section>
  );
};
