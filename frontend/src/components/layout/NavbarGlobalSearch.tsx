import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search, Sparkles, X } from 'lucide-react';
import { CATEGORY_TOPICS } from '../../data/categoryTopics';

type SearchResult = {
  id: string;
  name: string;
  description: string;
  group?: string;
  categoryId: string;
  categoryName: string;
  difficulty: string;
  minutes: number;
};

const DEFAULT_DIFFICULTY: Record<string, string> = {
  complexity: 'Beginner', sorting: 'Intermediate', arrays: 'Beginner', strings: 'Intermediate',
  linkedList: 'Intermediate', stackQueue: 'Intermediate', binarySearch: 'Intermediate', hashMaps: 'Intermediate',
  bst: 'Advanced', graph: 'Advanced', recursion: 'Intermediate', backtracking: 'Advanced', greedy: 'Intermediate', dp: 'Advanced', trie: 'Advanced',
};

function estimateMinutes(group = '') {
  if (/foundation|reference/i.test(group)) return 6;
  if (/o\(n²\)|o\(n\^2\)|o\(n\)/i.test(group)) return 8;
  if (/shortest path|pathfinding|balanced|advanced|classic|o\(n!|o\(2\^n/i.test(group)) return 18;
  if (/traversal|mst|ordering|heap|string/i.test(group)) return 12;
  return 10;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index < 0) return <>{text}</>;
  return <>{text.slice(0, index)}<mark className="global-search-highlight">{text.slice(index, index + needle.length)}</mark>{text.slice(index + needle.length)}</>;
}

export const NavbarGlobalSearch: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [settledQuery, setSettledQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [position, setPosition] = useState<React.CSSProperties>({});
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const catalog = useMemo<SearchResult[]>(() => CATEGORY_TOPICS.flatMap((category) => category.topics.map((topic) => ({
    id: topic.id,
    name: topic.name,
    description: topic.description || (topic.group ? `${topic.group} · Interactive lesson and visualization` : 'Interactive lesson and visualization'),
    group: topic.group,
    categoryId: category.categoryId,
    categoryName: category.categoryName,
    difficulty: topic.difficulty || DEFAULT_DIFFICULTY[category.categoryId] || 'Intermediate',
    minutes: topic.estimatedMinutes || estimateMinutes(topic.group),
  }))), []);

  useEffect(() => {
    const value = query.trim();
    setSearchError(false);
    if (!value) {
      setSettledQuery('');
      setResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = window.setTimeout(() => {
      try {
        const needle = value.toLocaleLowerCase();
        const nextResults = catalog.filter((item) => `${item.name} ${item.description} ${item.group || ''} ${item.categoryName} ${item.categoryId}`.toLocaleLowerCase().includes(needle)).slice(0, 12);
        setSettledQuery(value);
        setResults(nextResults);
        setSearchError(false);
      } catch {
        setSearchError(true);
      } finally {
        setIsSearching(false);
      }
    }, 100);
    return () => window.clearTimeout(timer);
  }, [catalog, query, retryToken]);

  const positionResults = useCallback(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const width = Math.min(440, Math.max(280, window.innerWidth - 24));
    const left = Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12));
    const below = window.innerHeight - anchor.bottom;
    const placeAbove = below < 310 && anchor.top > below;
    const maxHeight = Math.max(180, Math.min(460, placeAbove ? anchor.top - 16 : below - 16));
    setPosition({ position: 'fixed', left, width, maxHeight, zIndex: 1600, ...(placeAbove ? { bottom: window.innerHeight - anchor.top + 8 } : { top: anchor.bottom + 8 }) });
  }, []);

  useLayoutEffect(() => {
    if (!isExpanded || !query.trim()) return;
    positionResults();
    window.addEventListener('resize', positionResults);
    window.addEventListener('scroll', positionResults, true);
    return () => {
      window.removeEventListener('resize', positionResults);
      window.removeEventListener('scroll', positionResults, true);
    };
  }, [isExpanded, positionResults, query]);

  useLayoutEffect(() => { if (isExpanded) inputRef.current?.focus(); }, [isExpanded]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !resultsRef.current?.contains(target)) closeSearch();
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  });

  const closeSearch = useCallback(() => {
    setIsExpanded(false);
    setQuery('');
    setSettledQuery('');
  }, []);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        if (window.matchMedia('(max-width: 768px)').matches !== compact) return;
        event.preventDefault();
        setIsExpanded(true);
      } else if (event.key === 'Escape' && isExpanded) closeSearch();
    };
    window.addEventListener('keydown', onShortcut);
    return () => window.removeEventListener('keydown', onShortcut);
  }, [closeSearch, compact, isExpanded]);

  const select = (item: SearchResult) => {
    closeSearch();
    navigate(`/dashboard/${item.categoryId}?topic=${encodeURIComponent(item.id)}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault(); setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault(); setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault(); select(results[activeIndex]);
    }
  };

  const status = searchError ? 'error' : isSearching ? 'loading' : results.length ? 'results' : 'empty';

  return (
    <div ref={anchorRef} className={`global-topic-search${isExpanded ? ' is-expanded' : ''}`}>
      {isExpanded ? (
        <div className="global-search-input-shell">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-label="Search learning topics"
            aria-autocomplete="list"
            aria-expanded={Boolean(query.trim())}
            aria-controls="global-topic-search-results"
            aria-activedescendant={results[activeIndex] ? `topic-search-option-${activeIndex}` : undefined}
            placeholder="Search topics, algorithms, concepts…"
          />
          <button type="button" onClick={closeSearch} className="global-search-close" aria-label="Close search"><X size={16} /></button>
        </div>
      ) : (
        <button type="button" className="global-search-trigger" onClick={() => setIsExpanded(true)} aria-label="Search all learning topics" title="Search topics · Ctrl+K / ⌘K"><Search size={18} /></button>
      )}

      {isExpanded && query.trim() && createPortal(
        <div ref={resultsRef} id="global-topic-search-results" className="global-topic-search-results" role="listbox" aria-label="Learning topic search results" style={position}>
          <div className="global-search-results-heading"><span><Sparkles size={15} aria-hidden="true" /> Learning topics</span><kbd>↑ ↓ Enter</kbd></div>
          {status === 'loading' && <div className="global-search-state" role="status"><span className="global-search-spinner" /> Searching the topic library…</div>}
          {status === 'error' && <div className="global-search-state" role="alert"><span>Search couldn’t be completed.</span><button type="button" onClick={() => { setIsSearching(true); setSearchError(false); setRetryToken((token) => token + 1); }}>Try again</button></div>}
          {status === 'empty' && !isSearching && <div className="global-search-state"><strong>No matching topics</strong><span>Try a broader term or search for an algorithm name.</span></div>}
          {status === 'results' && <div className="global-search-result-list">
            {results.map((item, index) => (
              <button type="button" key={`${item.categoryId}-${item.id}`} id={`topic-search-option-${index}`} role="option" aria-selected={index === activeIndex} className={`global-search-result${index === activeIndex ? ' is-active' : ''}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => select(item)}>
                <span className="global-search-result-copy">
                  <strong><Highlight text={item.name} query={settledQuery} /></strong>
                  <span className="global-search-description"><Highlight text={item.description} query={settledQuery} /></span>
                  <span className="global-search-meta"><span className="global-search-category"><Highlight text={item.categoryName} query={settledQuery} /></span><span>{item.difficulty} · {item.minutes} min</span></span>
                </span>
                <ArrowRight size={17} aria-hidden="true" />
              </button>
            ))}
          </div>}
          {status === 'results' && <div className="global-search-footer">Showing {results.length} {results.length === 1 ? 'topic' : 'topics'}</div>}
        </div>, document.body,
      )}
    </div>
  );
};
