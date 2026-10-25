import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import './OnboardingTour.css';

const TOUR_KEY = 'stemstudio-dashboard-tour-v1';
const steps = [
  { eyebrow: '1 of 4 · Find a lesson', title: 'Jump directly to a topic', body: 'Use the topic search in the navbar or press Ctrl+K / ⌘K. Search by algorithm, category, or concept, then open its visualizer.' },
  { eyebrow: '2 of 4 · Watch the algorithm', title: 'Use Step mode to learn the trace', body: 'A visualizer shows the current data state and explains each operation. Use Step Forward, Step Back, and the timeline to inspect the exact moment you want.' },
  { eyebrow: '3 of 4 · Check understanding', title: 'Quiz checkpoints follow the trace', body: 'Open the Quiz card beside the visualizer. Concept mode focuses on core ideas; Guided samples checkpoints; Challenge asks every checkpoint with a question-adjusted timer.' },
  { eyebrow: '4 of 4 · Ask Octa', title: 'Ask about the lesson you are viewing', body: 'Octa receives the active topic and current step on visualizer pages. You can ask a concept question or ask it to navigate, change theme, and control supported page actions.' },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (localStorage.getItem(TOUR_KEY)) return;
    const timer = window.setTimeout(() => setOpen(true), 650);
    return () => window.clearTimeout(timer);
  }, []);
  const finish = () => { localStorage.setItem(TOUR_KEY, 'done'); setOpen(false); };
  useDialogFocus(open, finish, dialogRef);
  if (!open) return null;
  const current = steps[step];
  return (
    <div className="onboarding-backdrop" role="presentation" onClick={finish}>
      <section ref={dialogRef} className="onboarding-card" role="dialog" aria-modal="true" aria-labelledby="onboarding-title" tabIndex={-1} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="onboarding-close" onClick={finish} aria-label="Skip tour"><X size={17} /></button>
        <p className="onboarding-eyebrow">{current.eyebrow}</p>
        <h2 id="onboarding-title">{current.title}</h2>
        <p className="onboarding-body">{current.body}</p>
        <div className="onboarding-progress" aria-label={`Step ${step + 1} of ${steps.length}`}>{steps.map((item, index) => <span key={item.title} className={index <= step ? 'is-active' : ''} />)}</div>
        <footer><button type="button" className="onboarding-skip" onClick={finish}>Skip tour</button><div>{step > 0 && <button type="button" className="onboarding-secondary" onClick={() => setStep((index) => index - 1)}><ArrowLeft size={15} />Back</button>}<button type="button" className="onboarding-primary" onClick={() => step === steps.length - 1 ? finish() : setStep((index) => index + 1)}>{step === steps.length - 1 ? 'Finish' : 'Next'}{step < steps.length - 1 && <ArrowRight size={15} />}</button></div></footer>
      </section>
    </div>
  );
}
