import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { CategoryTopics } from '../../data/categoryTopics';

export interface VisualizerSearchItem { id: string; name: string; description?: string; group?: string; }
interface VisualizerHeaderProps {
  icon: React.ReactNode; title: string; subtitle: string; items: VisualizerSearchItem[];
  activeId?: string; onSelect: (id: string) => void; placeholder?: string; actions?: React.ReactNode;
  categories?: CategoryTopics[]; activeCategoryId?: string; onSelectCategory?: (categoryId: string) => void; categorySelectorOnly?: boolean;
}

/** Shared compact page header. The topic strip remains in the page controls;
 * this row only provides identity, search, and the universal mode actions. */
export const VisualizerHeader: React.FC<VisualizerHeaderProps> = ({ icon, title, subtitle, items, activeId, onSelect, placeholder = 'Search algorithms...', actions }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? items.filter(item => `${item.name} ${item.description ?? ''} ${item.group ?? ''}`.toLowerCase().includes(needle)) : items;
  }, [items, query]);
  const choose = (id: string) => { onSelect(id); setQuery(''); setOpen(false); };
  return <header className="viz-header animate-fade-in">
    <div className="viz-title-group"><div className="viz-title-icon">{icon}</div><div className="viz-title-text"><h1>{title}</h1><p>{subtitle}</p></div></div>
    <div className="viz-search-wrapper">
      <div className="viz-search-input-box"><Search size={15} /><input className="viz-search-input" value={query} placeholder={placeholder} onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); setOpen(true); }} /></div>
      {open && <div className="viz-search-dropdown">{results.slice(0, 8).map(item => <button type="button" key={item.id} className={`viz-search-item ${item.id === activeId ? 'active' : ''}`} onMouseDown={() => choose(item.id)}><span className="viz-item-body"><span className="viz-item-name">{item.name}</span>{item.description && <span className="viz-item-desc">{item.description}</span>}</span>{item.group && <span className="viz-shortcut-badge">{item.group}</span>}</button>)}</div>}
    </div>
    {actions}
  </header>;
};
