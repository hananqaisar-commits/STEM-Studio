import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import type { CategoryTopics } from '../../data/categoryTopics';

export interface VisualizerSearchItem {
  /** Stable key, and the value handed back to `onSelect`. */
  id: string;
  name: string;
  description?: string;
  /** Optional right-hand pill — e.g. a complexity class or algorithm group. */
  group?: string;
}

interface VisualizerHeaderProps {
  /** Lucide icon element rendered in the gradient tile. */
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  items: VisualizerSearchItem[];
  activeId?: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  /** Enable two-level dropdown mode (category + topic) instead of search bar */
  categories?: CategoryTopics[];
  /** Currently selected category ID in dropdown mode */
  activeCategoryId?: string;
  /** Callback when a category is selected in dropdown mode */
  onSelectCategory?: (categoryId: string) => void;
  /** When true and categories are provided, render only the category dropdown (no topic dropdown). */
  categorySelectorOnly?: boolean;
}

/**
 * Shared page header + ⌘K command palette for all six visualizer pages.
 *
 * Linked List, Graph and Binary Search each carried a byte-identical copy of
 * this markup and its keyboard/click-outside effect; BST and Sorting had no
 * header at all. This is the single implementation all six now use.
 */
export const VisualizerHeader: React.FC<VisualizerHeaderProps> = ({
  icon,
  title,
  subtitle,
  items,
  activeId,
  onSelect,
  placeholder = 'Search algorithms...',
  categories,
  activeCategoryId,
  onSelectCategory,
  categorySelectorOnly = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false) ||
        (item.group?.toLowerCase().includes(q) ?? false)
    );
  }, [items, query]);

  const handlePick = (id: string) => {
    onSelect(id);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <header className="viz-header animate-fade-in">
      <div className="viz-title-group">
        <div className="viz-title-icon">{icon}</div>
        <div className="viz-title-text">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>

      {/* Dropdown mode: two-level category + topic selector */}
      {categories && categories.length > 0 ? (
        <div className="viz-dropdown-group">
          {/* Category dropdown */}
          <div className="viz-dropdown-wrapper">
            <select
              className="viz-dropdown-select"
              value={activeCategoryId || ''}
              onChange={(e) => {
                const catId = e.target.value;
                onSelectCategory?.(catId);
                if (!categorySelectorOnly) {
                  // Auto-select first topic of new category
                  const cat = categories.find((c) => c.categoryId === catId);
                  if (cat && cat.topics.length > 0) {
                    onSelect(cat.topics[0].id);
                  }
                }
              }}
            >
              {categories.map((cat) => (
                <option key={cat.categoryId} value={cat.categoryId}>
                  {cat.categoryName}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="viz-dropdown-chevron" />
          </div>

          {/* Topic dropdown — hidden when categorySelectorOnly is enabled */}
          {!categorySelectorOnly && (
            <div className="viz-dropdown-wrapper">
              <select
                className="viz-dropdown-select"
                value={activeId || ''}
                onChange={(e) => onSelect(e.target.value)}
              >
                {(() => {
                  const activeCat = categories.find((c) => c.categoryId === activeCategoryId);
                  const topics = activeCat ? activeCat.topics : [];
                  return topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.group ? `[${t.group}] ` : ''}{t.name}
                    </option>
                  ));
                })()}
              </select>
              <ChevronDown size={14} className="viz-dropdown-chevron" />
            </div>
          )}
        </div>
      ) : (
        /* Search mode: existing command palette */
        <>
          <div className="viz-search-wrapper" ref={containerRef}>
            <div className="viz-search-input-box" onClick={() => setIsOpen(true)}>
              <Search size={15} />
              <input
                ref={inputRef}
                type="text"
                className="viz-search-input"
                placeholder={placeholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsOpen(true)}
              />
              <kbd className="viz-shortcut-badge">⌘K</kbd>
            </div>
    
            {isOpen && (
              <div className="viz-search-dropdown">
                {filtered.length === 0 ? (
                  <div className="viz-search-empty">No algorithm matches "{query}"</div>
                ) : (
                  filtered.map((item) => (
                    <div
                      key={item.id}
                      className={`viz-search-item ${activeId === item.id ? 'active' : ''}`}
                      onClick={() => handlePick(item.id)}
                    >
                      <div className="viz-item-body">
                        <div className="viz-item-name">{item.name}</div>
                        {item.description && <div className="viz-item-desc">{item.description}</div>}
                      </div>
                      {item.group && <span className="viz-shortcut-badge">{item.group}</span>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </header>
  );
};
