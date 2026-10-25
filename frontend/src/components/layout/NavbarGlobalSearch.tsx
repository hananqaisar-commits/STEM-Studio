import React, { useState, useRef, useEffect, useMemo, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, Sparkles, ArrowRight } from 'lucide-react';
import { CATEGORY_TOPICS } from '../../data/categoryTopics';

interface SearchResultItem {
  id: string;
  name: string;
  group?: string;
  categoryId: string;
  categoryName: string;
  difficulty: string;
  estimatedMinutes: number;
}

const CATEGORY_DIFFICULTY: Record<string, string> = {
  complexity: 'Beginner', sorting: 'Intermediate', arrays: 'Beginner', strings: 'Intermediate',
  linkedList: 'Intermediate', stackQueue: 'Intermediate', binarySearch: 'Intermediate', hashMaps: 'Intermediate',
  bst: 'Advanced', graph: 'Advanced', recursion: 'Intermediate', backtracking: 'Advanced', greedy: 'Intermediate', dp: 'Advanced', trie: 'Advanced',
};

function estimateTopicMinutes(group = ''): number {
  if (/Foundations|Reference/i.test(group)) return 6;
  if (/O\(n²\)|O\(n\^2\)|O\(n\)/i.test(group)) return 8;
  if (/O\(n log n\)|O\(n·k\)|O\(m·n\)/i.test(group)) return 14;
  if (/Shortest Path|Pathfinding|Balanced|Advanced|Classic Problems|O\(n!|O\(2\^n\)/i.test(group)) return 18;
  if (/Traversals|MST|Ordering|Heaps|Strings/i.test(group)) return 12;
  return 10;
}

export const NavbarGlobalSearch: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [resultsPosition, setResultsPosition] = useState<React.CSSProperties>({});
  const navigate = useNavigate();

  // Focus before paint so the keyboard shortcut is ready for immediate typing.
  useLayoutEffect(() => {
    if (isExpanded) inputRef.current?.focus();
  }, [isExpanded]);

  const positionResults = useCallback(() => {
    const anchor = searchRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const width = Math.min(384, Math.max(1, window.innerWidth - 24));
    const left = Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12));
    const top = Math.min(anchor.bottom + 8, Math.max(12, window.innerHeight - 180));
    setResultsPosition({ position: 'fixed', top, left, width, maxHeight: Math.max(160, window.innerHeight - top - 12), zIndex: 1600 });
  }, []);

  useLayoutEffect(() => {
    if (!isExpanded || !query.trim()) return;
    positionResults();
    const reposition = () => positionResults();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [isExpanded, positionResults, query]);

  // Render results in the document layer so the navbar's mobile scroll region cannot clip them.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!searchRef.current?.contains(target) && !resultsRef.current?.contains(target)) {
        setIsExpanded(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsExpanded(true);
      } else if (event.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [isExpanded]);

  // Search across ALL category topics
  const searchResults = useMemo<SearchResultItem[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    const results: SearchResultItem[] = [];
    for (const cat of CATEGORY_TOPICS) {
      for (const topic of cat.topics) {
        const text = `${topic.name} ${topic.group ?? ''} ${cat.categoryName} ${cat.categoryId}`.toLowerCase();
        if (text.includes(needle)) {
          results.push({
            id: topic.id,
            name: topic.name,
            group: topic.group,
            categoryId: cat.categoryId,
            categoryName: cat.categoryName,
            difficulty: topic.difficulty ?? CATEGORY_DIFFICULTY[cat.categoryId] ?? 'Intermediate',
            estimatedMinutes: topic.estimatedMinutes ?? estimateTopicMinutes(topic.group),
          });
        }
      }
    }
    return results;
  }, [query]);

  const handleSelect = (item: SearchResultItem) => {
    setQuery('');
    setIsExpanded(false);
    navigate(`/dashboard/${item.categoryId}?topic=${item.id}`);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && searchResults.length) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % Math.min(searchResults.length, 10));
    } else if (event.key === 'ArrowUp' && searchResults.length) {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + Math.min(searchResults.length, 10)) % Math.min(searchResults.length, 10));
    } else if (event.key === 'Enter' && searchResults[activeIndex]) {
      event.preventDefault();
      handleSelect(searchResults[activeIndex]);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    setIsExpanded(false);
  };

  return (
    <div ref={searchRef} className="relative flex items-center">
      <div
        onClick={() => {
          if (!isExpanded) setIsExpanded(true);
        }}
        role={isExpanded ? undefined : 'button'}
        tabIndex={isExpanded ? -1 : 0}
        aria-label="Search all topics. Press Control K or Command K."
        aria-expanded={isExpanded}
        aria-controls="global-topic-search-results"
        title="Search topics · Ctrl+K / ⌘K"
        onKeyDown={(event) => {
          if (!isExpanded && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            setIsExpanded(true);
          }
        }}
        className={`flex items-center cursor-pointer rounded-full border ${isExpanded ? 'absolute right-0 z-[1700] max-w-[calc(100vw-24px)]' : ''} ${
          isExpanded
            ? 'w-60 sm:w-72 md:w-80 h-9 px-3 bg-white text-slate-900 border-purple-500/60 dark:bg-neutral-950 dark:text-neutral-100 shadow-lg dark:shadow-[0_0_20px_rgba(147,51,234,0.25)] backdrop-blur-xl ring-2 ring-purple-500/20'
            : 'w-[38px] h-[38px] justify-center bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700/60 text-slate-700 dark:text-neutral-200 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white dark:hover:bg-neutral-900 shadow-sm'
        }`}
      >
        <Search size={18} className={`shrink-0 transition-colors ${isExpanded ? 'text-purple-600 dark:text-purple-400' : ''}`} />

        {isExpanded && (
            <div className="flex items-center flex-1 min-w-0 ml-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={handleInputKeyDown}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={Boolean(query.trim())}
                aria-controls="global-topic-search-results"
                aria-activedescendant={searchResults[activeIndex] ? `topic-search-option-${activeIndex}` : undefined}
                placeholder="Search algorithms..."
                className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-neutral-100 outline-none border-none placeholder:text-slate-400 dark:placeholder:text-neutral-500"
              />

              <button
                type="button"
                onClick={handleClose}
                className="ml-1 text-slate-400 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 shrink-0 p-1 rounded-full hover:bg-purple-500/10 transition-colors"
                title="Close Search"
              >
                <X size={14} />
              </button>
            </div>
        )}
      </div>

      {/* Global Search Results Dropdown */}
      {isExpanded && query.trim().length > 0 && createPortal(
        <div ref={resultsRef} id="global-topic-search-results" role="listbox" aria-label="Topic search results" style={resultsPosition} className="global-topic-search-results max-h-80 overflow-y-auto rounded-2xl border border-purple-500/40 bg-white text-slate-900 dark:bg-neutral-950 dark:text-neutral-100 p-2 shadow-2xl backdrop-blur-xl animate-fade-in">
          <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider border-b border-slate-100 dark:border-neutral-800 mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} />
              Algorithm Results ({searchResults.length})
            </span>
          </div>

          {searchResults.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-neutral-400">
              No algorithm found for &quot;{query}&quot;
            </div>
          ) : (
            searchResults.slice(0, 10).map((item, index) => (
              <button
                key={`${item.categoryId}-${item.id}`}
                type="button"
                id={`topic-search-option-${index}`}
                onClick={() => handleSelect(item)}
                role="option"
                aria-selected={index === activeIndex}
                aria-current={index === activeIndex ? 'true' : undefined}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-colors group ${index === activeIndex ? 'bg-purple-500/10 dark:bg-purple-500/20' : 'hover:bg-purple-500/10 dark:hover:bg-purple-500/20'}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-neutral-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                    {item.name}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 font-medium">
                      {item.categoryName}
                    </span>
                    {item.group && <span className="opacity-75">{item.group}</span>}
                    <span className="opacity-75">{item.difficulty} · ~{item.estimatedMinutes} min</span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted-foreground group-hover:text-purple-500 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))
          )}
        </div>,
        document.body,
      )}
    </div>
  );
};
