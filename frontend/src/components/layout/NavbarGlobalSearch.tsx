import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setIsOpen(false);
    setIsFocused(false);
    navigate(`/dashboard/${item.categoryId}?topic=${item.id}`);
  };

  return (
    <div ref={searchRef} className="relative flex items-center">
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-200 ${
          isFocused
            ? 'w-44 sm:w-60 md:w-72 bg-surface-elevated/95 dark:bg-neutral-900/95 border-purple-500/60 shadow-lg ring-2 ring-purple-500/20'
            : 'w-36 sm:w-48 md:w-56 bg-surface/80 dark:bg-neutral-900/80 border-border/60 hover:border-purple-500/40'
        }`}
      >
        <Search size={15} className="text-purple-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            setIsOpen(true);
          }}
          placeholder="Search algorithms..."
          className="w-full bg-transparent text-xs font-semibold text-foreground outline-none placeholder:text-muted-foreground/70"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded-full"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Global Search Results Dropdown */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 max-h-80 overflow-y-auto rounded-2xl border border-purple-500/30 bg-surface/95 dark:bg-neutral-900/95 p-2 shadow-2xl backdrop-blur-xl animate-fade-in min-w-[280px]">
          <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-purple-400 uppercase tracking-wider border-b border-border/40 mb-1">
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} />
              Algorithm Results ({searchResults.length})
            </span>
          </div>

          {searchResults.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
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
                  <div className="text-xs font-bold text-foreground group-hover:text-purple-400 transition-colors truncate">
                    {item.name}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/10 dark:bg-purple-500/20 text-purple-300 font-medium">
                      {item.categoryName}
                    </span>
                    {item.group && <span className="opacity-75">{item.group}</span>}
                  </div>
                </div>
                <ArrowRight size={14} className="text-muted-foreground group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
