import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal, Search, ArrowLeft, FolderGit2, Compass, FolderPlus,
  Edit3, UserCheck, Users, ShieldCheck, Cpu, Package, Globe, Server, Clock,
  ChevronRight, ChevronDown, ChevronUp, Sparkles, BookOpen, Key, Info, HelpCircle, FileText, CheckCircle2,
  Copy, Check
} from 'lucide-react';
import { LINUX_COMMAND_GROUPS, type CommandGroup, type CommandItem } from '../../../data/linuxCommandsData';
import { VisualizerHeader } from '../../../components/layout/VisualizerHeader';
import { SEOHead } from '../../../components/common/SEOHead';
import { getSEOForRoute } from '../../../data/seoMetadata';
import { VisualizerActions } from '../../../components/layout/VisualizerActions';
import { TheoryPanel } from '../../../components/layout/TheoryPanel';
import { CATEGORY_TOPICS } from '../../../data/categoryTopics';
import '../../../features/complexity/Complexity.css';
import './LinuxCommandsPage.css';

const GROUP_ICON_MAP: Record<string, React.FC<{ size?: number; className?: string }>> = {
  FolderGit2,
  Compass,
  FolderPlus,
  Search,
  Edit3,
  UserCheck,
  Users,
  ShieldCheck,
  Cpu,
  Package,
  Globe,
  Server,
  Clock,
};

export const LinuxCommandsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeGroupId, setActiveGroupId] = useState<string>('path-concepts');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Track expanded command card IDs (accordion state)
  const [expandedCmdIds, setExpandedCmdIds] = useState<Set<string>>(() => {
    // Start focused: displaying a full expanded command from every group made
    // the reference feel like an overwhelming wall of text on first visit.
    const initial = new Set<string>();
    const firstGroup = LINUX_COMMAND_GROUPS.find(g => g.id === 'path-concepts');
    if (firstGroup?.commands[0]) initial.add(firstGroup.commands[0].id);
    return initial;
  });

  // Track copied feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleCommandExpanded = (id: string) => {
    setExpandedCmdIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const all = new Set<string>();
    LINUX_COMMAND_GROUPS.forEach(g => g.commands.forEach(c => all.add(c.id)));
    setExpandedCmdIds(all);
  };

  const collapseAll = () => {
    setExpandedCmdIds(new Set<string>());
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Items for VisualizerHeader dropdown search
  const headerSearchItems = useMemo(() => {
    return LINUX_COMMAND_GROUPS.map(g => ({
      id: g.id,
      name: g.title,
      description: g.description,
    }));
  }, []);

  // Filter groups and commands based on active group tab and search query
  const filteredGroups = useMemo(() => {
    let result = LINUX_COMMAND_GROUPS;
    if (activeGroupId !== 'all') {
      result = result.filter(g => g.id === activeGroupId);
    }

    if (!searchQuery.trim()) return result;

    const query = searchQuery.toLowerCase();
    return result.map(g => {
      const matchingCommands = g.commands.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.shortDesc.toLowerCase().includes(query) ||
        c.theory.toLowerCase().includes(query) ||
        c.syntax.toLowerCase().includes(query) ||
        c.examples.some(e => e.cmd.toLowerCase().includes(query) || e.desc.toLowerCase().includes(query))
      );
      return { ...g, commands: matchingCommands };
    }).filter(g => g.commands.length > 0);
  }, [activeGroupId, searchQuery]);

  return (
    <div className="bst-page-container linux-commands-page animate-fade-in space-y-6">
      <SEOHead {...getSEOForRoute('/dashboard/os/commands')} />
      {/* Universal Visualizer Header matching Complexity & DSA Studio */}
      <VisualizerHeader
        icon={<Terminal size={22} />}
        title="Commands of Linux"
        subtitle="Comprehensive reference catalog & interactive Linux terminal commands engine across 13 core functional groups"
        items={headerSearchItems}
        activeId={activeGroupId !== 'all' ? activeGroupId : undefined}
        onSelect={(id) => setActiveGroupId(id)}
        placeholder="Search Linux commands or groups..."
        categories={CATEGORY_TOPICS}
        activeCategoryId="commands"
        onSelectCategory={(catId) => catId !== 'commands' && navigate(`/dashboard/${catId}`)}
        actions={
          <div className="flex items-center gap-3">
            <button className="module-back-btn" onClick={() => navigate('/dashboard/os')}>
              <ArrowLeft size={14} /> Back to OS
            </button>
            <VisualizerActions />
          </div>
        }
      />

      {/* Global Command Search & Accordion Controls Toolbar */}
      <div className="linux-commands-toolbar animate-fade-in">
        <div className="linux-commands-toolbar__intro">
          <div className="flex items-center gap-2 text-[var(--color-text)] font-bold text-sm">
            <BookOpen size={16} className="text-purple-600 dark:text-purple-400" />
            <span>Interactive Command Reference Catalog</span>
          </div>

          <div className="linux-commands-toolbar__actions">
            <button
              onClick={expandAll}
              type="button"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all flex items-center gap-1"
            >
              <ChevronDown size={14} /> Expand All
            </button>
            <button
              onClick={collapseAll}
              type="button"
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-purple-500/10 hover:text-purple-600 transition-all flex items-center gap-1"
            >
              <ChevronUp size={14} /> Collapse All
            </button>
          </div>
        </div>

        <div className="linux-commands-search">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
          <input
            type="text"
            placeholder="Filter by command name, syntax, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] text-sm focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Main Catalog Layout */}
      <div className="linux-commands-catalog">
        {/* Group Selection Sidebar */}
        <aside className="linux-commands-groups">
          <div className="px-3 py-2 text-[11px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
            Command Groups ({LINUX_COMMAND_GROUPS.length})
          </div>
          <button
            onClick={() => setActiveGroupId('all')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
              activeGroupId === 'all'
                ? 'bg-gradient-to-r from-purple-500/15 to-indigo-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30 shadow-sm'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] font-medium'
            }`}
          >
            <span className="flex items-center gap-2">
              <BookOpen size={16} className={activeGroupId === 'all' ? 'text-purple-600 dark:text-purple-400' : ''} />
              <span>All Groups</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
              {LINUX_COMMAND_GROUPS.reduce((acc, g) => acc + g.commands.length, 0)}
            </span>
          </button>

          {LINUX_COMMAND_GROUPS.map(group => {
            const GroupIcon = GROUP_ICON_MAP[group.iconName] ?? Terminal;
            const isActive = activeGroupId === group.id;
            return (
              <button
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-500/15 to-indigo-500/15 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30 shadow-sm'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-elevated)] font-medium'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <GroupIcon size={15} className={isActive ? 'text-purple-600 dark:text-purple-400 shrink-0' : 'text-[var(--color-text-muted)] shrink-0'} />
                  <span className="truncate">{group.title}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] border border-[var(--color-border)] shrink-0">
                  {group.commands.length}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Command Reference Cards Catalog */}
        <div className="linux-commands-results">
          {filteredGroups.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm">
              <HelpCircle size={40} className="mx-auto text-[var(--color-text-muted)] mb-3" />
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-1">No matching commands found</h3>
              <p className="text-[var(--color-text-secondary)] text-sm">Try searching for a different command name or syntax keyword.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveGroupId('all'); }}
                className="mt-4 px-4 py-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 text-xs font-semibold border border-purple-500/30 hover:bg-purple-500/20 transition-all"
              >
                Clear Search & Filters
              </button>
            </div>
          ) : (
            filteredGroups.map(group => {
              const GroupIcon = GROUP_ICON_MAP[group.iconName] ?? Terminal;
              return (
                <div key={group.id} className="space-y-4">
                  {/* Group Section Header */}
                  <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border)]">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      <GroupIcon size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text)]">{group.title}</h2>
                      <p className="text-xs text-[var(--color-text-secondary)]">{group.description}</p>
                    </div>
                  </div>

                  {/* Command Accordion Cards Grid */}
                  <div className="space-y-3.5">
                    {group.commands.map(cmd => {
                      const isExpanded = expandedCmdIds.has(cmd.id);

                      return (
                        <div
                          key={cmd.id}
                          className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-sm hover:shadow-md transition-all overflow-hidden"
                        >
                          {/* Accordion Card Header */}
                          <div
                            onClick={() => toggleCommandExpanded(cmd.id)}
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--color-surface-elevated)] transition-colors select-none"
                          >
                            <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                              <span className="font-mono text-sm font-bold text-purple-600 dark:text-purple-300 bg-purple-500/10 px-3.5 py-1.5 rounded-xl border border-purple-500/20 shrink-0">
                                {cmd.name}
                              </span>

                              <div className="truncate">
                                <p className="text-xs text-[var(--color-text-secondary)] font-medium truncate">
                                  {cmd.shortDesc}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {cmd.badge && (
                                <span className="hidden sm:flex text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold items-center gap-1">
                                  <Sparkles size={12} /> {cmd.badge}
                                </span>
                              )}
                              {cmd.type === 'concept' && (
                                <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20 font-medium">
                                  Core Concept
                                </span>
                              )}

                              <div className="p-1 rounded-lg text-[var(--color-text-muted)]">
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </div>
                            </div>
                          </div>

                          {/* Accordion Card Body */}
                          {isExpanded && (
                            <div className="p-5 pt-3 border-t border-[var(--color-border)] space-y-4 bg-[var(--color-surface-elevated)]/50 animate-fade-in">
                              {/* Theory Block */}
                              <div className="text-sm text-[var(--color-text)] leading-relaxed bg-purple-500/5 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-500/20">
                                <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                                  <Info size={14} className="text-purple-500" /> Theory & Purpose
                                </div>
                                {cmd.theory}
                              </div>

                              {/* Syntax Block with One-Click Copy */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText size={14} className="text-emerald-500" /> Syntax
                                  </div>
                                  <button
                                    onClick={() => copyToClipboard(cmd.syntax, `syntax-${cmd.id}`)}
                                    type="button"
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-purple-600 dark:text-purple-300 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 flex items-center gap-1 transition-all"
                                  >
                                    {copiedId === `syntax-${cmd.id}` ? (
                                      <>
                                        <Check size={12} className="text-emerald-500" /> Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} /> Copy Syntax
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="font-mono text-xs bg-slate-900 text-emerald-400 p-3.5 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap shadow-inner">
                                  {cmd.syntax}
                                </div>
                              </div>

                              {/* Special Vim Modes Section */}
                              {cmd.vimModes && (
                                <div className="mt-4 p-4 rounded-xl bg-[var(--color-surface)] border border-purple-500/30 space-y-3">
                                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-300 font-bold text-sm">
                                    <Key size={16} /> Vim Modal Architecture & 3 Core Modes
                                  </div>
                                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                                    Vim&apos;s modal design is built around 3 distinct operation modes to enable keyboard-only editing without taking your hands off the touch-typing home row.
                                  </p>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                    {cmd.vimModes.map((mode, idx) => (
                                      <div key={idx} className="p-3.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] space-y-2">
                                        <div className="text-xs font-bold text-purple-600 dark:text-purple-400">{mode.name}</div>
                                        <p className="text-[11px] text-[var(--color-text-secondary)] leading-tight">{mode.description}</p>
                                        <div className="space-y-1 pt-2 border-t border-[var(--color-border)]">
                                          {mode.keybindings.map((kb, kidx) => (
                                            <div key={kidx} className="font-mono text-[10px] text-amber-600 dark:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 truncate">
                                              {kb}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Real-Life Examples Block */}
                              <div className="space-y-2">
                                <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                                  <CheckCircle2 size={14} className="text-purple-500" /> Real-Life Examples
                                </div>
                                <div className="space-y-2">
                                  {cmd.examples.map((ex, idx) => (
                                    <div
                                      key={idx}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] gap-2"
                                    >
                                      <div className="flex items-center gap-2 shrink-0">
                                        <code className="font-mono text-xs text-purple-600 dark:text-purple-300 bg-purple-500/10 px-3 py-1 rounded-lg border border-purple-500/20">
                                          $ {ex.cmd}
                                        </code>
                                        <button
                                          onClick={() => copyToClipboard(ex.cmd, `ex-${cmd.id}-${idx}`)}
                                          type="button"
                                          className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-purple-600 hover:bg-purple-500/10 transition-colors"
                                          title="Copy command"
                                        >
                                          {copiedId === `ex-${cmd.id}-${idx}` ? (
                                            <Check size={13} className="text-emerald-500" />
                                          ) : (
                                            <Copy size={13} />
                                          )}
                                        </button>
                                      </div>
                                      <span className="text-xs text-[var(--color-text-secondary)] font-sans flex items-center gap-1.5">
                                        <ChevronRight size={13} className="text-[var(--color-text-muted)] shrink-0" />
                                        {ex.desc}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Theory & Concepts Panel matching DSA module */}
      <TheoryPanel categoryId="commands" activeTopic={activeGroupId !== 'all' ? activeGroupId : undefined} />
    </div>
  );
};
