import { useMemo, useState } from 'react';
import { BookOpenCheck, Printer } from 'lucide-react';
import { DSA_CATEGORIES } from '../../data/categories';
import { THEORY_CONTENT } from '../../data/theoryContent';
import { CATEGORY_TOPICS } from '../../data/categoryTopics';
import './CheatSheetPrinter.css';

export function CheatSheetPrinter() {
  const [categoryId, setCategoryId] = useState('sorting');
  const [open, setOpen] = useState(false);
  const category = useMemo(() => DSA_CATEGORIES.find((item) => item.id === categoryId), [categoryId]);
  const theory = THEORY_CONTENT[categoryId];
  const topics = CATEGORY_TOPICS.find((item) => item.categoryId === categoryId)?.topics ?? [];
  const printTopics = topics.map((topic) => ({
    ...topic,
    theory: theory?.topics.find((candidate) => candidate.id === topic.id),
  }));

  return (
    <>
      <button type="button" className="cheat-sheet-trigger" onClick={() => setOpen(true)}><BookOpenCheck size={16} />Print a cheat sheet</button>
      {open && <div className="cheat-sheet-dialog-backdrop" onClick={() => setOpen(false)}>
        <section className="cheat-sheet-dialog" role="dialog" aria-modal="true" aria-labelledby="cheat-sheet-heading" onClick={(event) => event.stopPropagation()}>
          <div className="cheat-sheet-dialog-actions"><label htmlFor="cheat-sheet-category">Category<select id="cheat-sheet-category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{DSA_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" onClick={() => window.print()}><Printer size={15} />Print / Save as PDF</button><button type="button" className="cheat-sheet-close" onClick={() => setOpen(false)}>Close</button></div>
          <article className="cheat-sheet-print">
            <p className="cheat-sheet-brand">STEM STUDIO · QUICK REFERENCE</p>
            <h1 id="cheat-sheet-heading">{category?.name ?? 'DSA'} cheat sheet</h1>
            <p className="cheat-sheet-overview">{theory?.overview ?? category?.description}</p>
            <div className="cheat-sheet-topics">{printTopics.map(({ id, name, group, theory: item }) => <section key={id}>
              <div className="cheat-sheet-topic-heading"><h2>{name}</h2>{item?.complexity && <code>{item.complexity}</code>}</div>
              {item?.description && <p>{item.description}</p>}
              {item?.keyPoints?.length ? <ul>{item.keyPoints.slice(0, 4).map((point) => <li key={point}>{point}</li>)}</ul> : group && <p className="cheat-sheet-group">Topic group: {group}</p>}
              {item?.example && <pre>{item.example}</pre>}
            </section>)}</div>
            <footer>STEM Studio · Printable learning reference · Verify implementation details against the lesson visualizer.</footer>
          </article>
        </section>
      </div>}
    </>
  );
}
