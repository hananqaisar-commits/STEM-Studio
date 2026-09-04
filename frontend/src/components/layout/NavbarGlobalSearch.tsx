import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Search, X, Sparkles, ArrowRight } from 'lucide-react';
import { CATEGORY_TOPICS } from '../../data/categoryTopics';

interface SearchResultItem {
  id: string;
  name: string;
  group?: string;
  categoryId: string;
  categoryName: string;
}

export const NavbarGlobalSearch: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Auto focus input when expanding
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isExpanded]);

  // Collapse search when clicking outside if query is empty
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        if (!query.trim()) {
          setIsExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [query]);

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

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    setIsExpanded(false);
  };

  return (
    <div ref={searchRef} className="relative flex items-center">
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        onClick={() => {
          if (!isExpanded) setIsExpanded(true);
        }}
        className={`flex items-center cursor-pointer transition-colors duration-200 rounded-full border ${
          isExpanded
            ? 'w-60 sm:w-72 md:w-80 h-9 px-3 bg-white text-slate-900 border-purple-500/60 dark:bg-neutral-950 dark:text-neutral-100 shadow-lg dark:shadow-[0_0_20px_rgba(147,51,234,0.25)] backdrop-blur-xl ring-2 ring-purple-500/20'
            : 'w-[38px] h-[38px] justify-center bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700/60 text-slate-700 dark:text-neutral-200 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white dark:hover:bg-neutral-900 shadow-sm'
        }`}
      >
        <Search size={18} className={`shrink-0 transition-colors ${isExpanded ? 'text-purple-600 dark:text-purple-400' : ''}`} />

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '100%' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="flex items-center flex-1 min-w-0 ml-2 overflow-hidden"
            >
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
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
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Global Search Results Dropdown */}
      {isExpanded && query.trim().length > 0 && (
        <div className="absolute top-full left-0 mt-2 z-50 max-h-80 overflow-y-auto rounded-2xl border border-purple-500/40 bg-white text-slate-900 dark:bg-neutral-950 dark:text-neutral-100 p-2 shadow-2xl backdrop-blur-xl animate-fade-in w-72 sm:w-80 md:w-96">
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
            searchResults.slice(0, 10).map((item) => (
              <button
                key={`${item.categoryId}-${item.id}`}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl hover:bg-purple-500/10 dark:hover:bg-purple-500/20 text-left transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-neutral-100 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">
                    {item.name}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 font-medium">
                      {item.categoryName}
                    </span>
                    {item.group && <span className="opacity-75">{item.group}</span>}
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted-foreground group-hover:text-purple-500 dark:group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
