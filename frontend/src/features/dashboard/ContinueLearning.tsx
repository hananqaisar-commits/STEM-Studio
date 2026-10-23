import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, CalendarClock, PlayCircle } from 'lucide-react';
import { apiClient } from '../../api/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { DSA_CATEGORIES } from '../../data/categories';
import { CATEGORY_TOPICS } from '../../data/categoryTopics';
import './ContinueLearning.css';

interface ModuleProgress { module_name: string; completed_algorithms: string[]; updated_at: string; completion_percentage: number; }
interface StatsResponse { modules: ModuleProgress[]; }
interface SavedSession { session_id: number; title: string; module_name: string; algorithm_id: string; created_at: string; }
interface DueTopic { module_name: string; algorithm_id: string; accuracy_percentage: number; interval_days: number; due_at: string; }

const routeForModule: Record<string, string> = {
  ...Object.fromEntries(DSA_CATEGORIES.map((category) => [category.id, category.id])),
  'os-commands': 'os/commands',
  commands: 'os/commands',
  'os-filesystem': 'os/filesystem',
  filesystem: 'os/filesystem',
};
const topicName = (module: string, id: string) => CATEGORY_TOPICS.find((category) => category.categoryId === module)?.topics.find((topic) => topic.id === id)?.name ?? id;
const topicPath = (module: string, id: string) => `/dashboard/${routeForModule[module] ?? module}?topic=${encodeURIComponent(id)}`;
const savedSessionPath = (session: SavedSession) => {
  const path = topicPath(session.module_name, session.algorithm_id);
  return ['sorting', 'arrays'].includes(session.module_name)
    ? `${path}&resumeSession=${encodeURIComponent(String(session.session_id))}`
    : path;
};

export function ContinueLearning() {
  const { isAuthenticated } = useAuth();
  const [modules, setModules] = useState<ModuleProgress[]>([]);
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [dueTopics, setDueTopics] = useState<DueTopic[]>([]);
  const [dueCount, setDueCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) { setModules([]); setSessions([]); setDueTopics([]); setDueCount(0); setLoaded(true); return; }
    setLoaded(false);
    Promise.allSettled([
      apiClient<StatsResponse>('/api/progress/stats', { requiresAuth: true }),
      apiClient<SavedSession[]>('/api/progress/sessions', { requiresAuth: true }),
      apiClient<{ due_count: number; due_topics: DueTopic[] }>('/api/progress/review-schedule', { requiresAuth: true }),
    ]).then((results) => {
      if (!active) return;
      if (results[0].status === 'fulfilled') setModules(results[0].value.modules ?? []);
      if (results[1].status === 'fulfilled') setSessions(results[1].value ?? []);
      if (results[2].status === 'fulfilled') {
        setDueTopics(results[2].value.due_topics ?? []);
        setDueCount(results[2].value.due_count ?? 0);
      }
      setLoaded(true);
    });
    return () => { active = false; };
  }, [isAuthenticated]);

  const lastProgress = useMemo(() => modules
    .filter((item) => item.completed_algorithms.length > 0)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0], [modules]);
  const prioritizedDueTopics = useMemo(() => [...dueTopics]
    .sort((a, b) => a.accuracy_percentage - b.accuracy_percentage || new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
    .slice(0, 5), [dueTopics]);

  if (!isAuthenticated || !loaded || (!lastProgress && !sessions.length && !dueCount)) return null;

  return (
    <section className="continue-learning" aria-labelledby="continue-learning-title">
      <div className="continue-learning-header"><div><p className="dashboard-home-eyebrow">Your activity</p><h2 id="continue-learning-title">Continue where you left off</h2></div></div>
      <div className="continue-learning-grid">
        {lastProgress && (
          <Link className="continue-learning-card continue-learning-primary" to={topicPath(lastProgress.module_name, lastProgress.completed_algorithms.at(-1)!)}>
            <span className="continue-learning-card-icon"><PlayCircle size={19} /></span>
            <span className="continue-learning-card-copy"><small>Recently studied · {lastProgress.completion_percentage}% complete in this category</small><strong>{topicName(lastProgress.module_name, lastProgress.completed_algorithms.at(-1)!)}</strong><span>Resume this visualizer</span></span>
            <ArrowRight size={18} />
          </Link>
        )}
        {dueCount > 0 && (
          <article className="continue-learning-card review-queue-card">
            <span className="continue-learning-card-icon"><CalendarClock size={19} /></span>
            <div className="continue-learning-card-copy review-queue-copy">
              <small>Spaced review · lowest recent accuracy first</small>
              <strong>{dueCount} {dueCount === 1 ? 'topic' : 'topics'} ready to revisit</strong>
              <ol className="review-queue-list">
                {prioritizedDueTopics.map((topic) => (
                  <li key={`${topic.module_name}:${topic.algorithm_id}`}>
                    <Link to={topicPath(topic.module_name, topic.algorithm_id)}>
                      <span><b>{topicName(topic.module_name, topic.algorithm_id)}</b><small>{topic.accuracy_percentage}% recent accuracy · {topic.interval_days}-day review interval</small></span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ol>
              {dueCount > prioritizedDueTopics.length && <span className="review-queue-more">Showing 5 of {dueCount} due topics</span>}
            </div>
          </article>
        )}
        {sessions.slice(0, 2).map((session) => (
          <Link className="continue-learning-card" key={session.session_id} to={savedSessionPath(session)}>
            <span className="continue-learning-card-icon"><Bookmark size={18} /></span>
            <span className="continue-learning-card-copy"><small>Saved visualization</small><strong>{session.title}</strong><span>{topicName(session.module_name, session.algorithm_id)} · {['sorting', 'arrays'].includes(session.module_name) ? 'restore its input and step' : 'open the topic'}</span></span>
            <ArrowRight size={18} />
          </Link>
        ))}
      </div>
    </section>
  );
}
