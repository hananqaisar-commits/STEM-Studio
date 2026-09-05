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
import { VisualizerActions } from '../../../components/layout/VisualizerActions';
import { TheoryPanel } from '../../../components/layout/TheoryPanel';
import { CATEGORY_TOPICS } from '../../../data/categoryTopics';
import '../../../features/complexity/Complexity.css';

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
  const [activeGroupId, setActiveGroupId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Track expanded command card IDs (accordion state)
  const [expandedCmdIds, setExpandedCmdIds] = useState<Set<string>>(() => {
    // Default expand first command of each group
    const initial = new Set<string>();
    LINUX_COMMAND_GROUPS.forEach(g => {
      if (g.commands[0]) initial.add(g.commands[0].id);
    });
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
    <div className="bst-page-container animate-fade-in space-y-6">
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
      <div className="bst-toolbar animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[var(--color-surface)] dark:bg-slate-900/80 rounded-2xl border border-[var(--color-border)] dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[var(--color-text)] dark:text-slate-200 font-semibold text-sm">
            <BookOpen size={16} className="text-[var(--color-primary)] dark:text-cyan-400" />
            <span>Interactive Command Reference Catalog</span>
          </div>

          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={expandAll}
              type="button"
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--color-surface-elevated)] dark:bg-slate-800 text-[var(--color-primary)] dark:text-cyan-300 border border-[var(--color-border)] dark:border-slate-700/60 hover:bg-[var(--color-primary)]/10"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              type="button"
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--color-surface-elevated)] dark:bg-slate-800 text-[var(--color-text-secondary)] dark:text-slate-400 border border-[var(--color-border)] dark:border-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Collapse All
            </button>
          </div>
        </div>

        <div className="relative min-w-[320px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] dark:text-slate-400" />
          <input
            type="text"
            placeholder="Filter by command name, syntax, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--color-surface-elevated)] dark:bg-slate-950 border border-[var(--color-border)] dark:border-slate-700/60 text-[var(--color-text)] dark:text-slate-200 placeholder:text-[var(--color-text-muted)] dark:placeholder:text-slate-400 text-sm focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-all"
          />
        </div>
      </div>

      {/* Main Catalog Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
        {/* Group Selection Sidebar */}
        <div className="lg:col-span-1 space-y-1.5 bg-[var(--color-surface)] dark:bg-slate-900/60 p-3.5 rounded-2xl border border-[var(--color-border)] dark:border-slate-800/90 h-fit backdrop-blur-sm shadow-sm">
          <div className="px-3 py-2 text-xs font-bold text-[var(--color-text-muted)] dark:text-slate-400 uppercase tracking-wider">
            Command Groups ({LINUX_COMMAND_GROUPS.length})
          </div>
          <button
            onClick={() => setActiveGroupId('all')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeGroupId === 'all'
                ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] dark:bg-cyan-500/20 dark:text-cyan-300 border border-[var(--color-primary)]/30 dark:border-cyan-500/30 shadow-sm'
                : 'text-[var(--color-text-secondary)] dark:text-slate-400 hover:text-[var(--color-text)] dark:hover:text-slate-200 hover:bg-[var(--color-surface-elevated)] dark:hover:bg-slate-800/60'
            }`}
          >
            <span className="flex items-center gap-2">
              <BookOpen size={16} /> All Groups
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--color-surface-elevated)] dark:bg-slate-800 text-[var(--color-text-muted)] dark:text-slate-300 border border-[var(--color-border)] dark:border-slate-700/50">
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] dark:bg-cyan-500/20 dark:text-cyan-300 border border-[var(--color-primary)]/30 dark:border-cyan-500/30 font-semibold shadow-sm'
                    : 'text-[var(--color-text-secondary)] dark:text-slate-400 hover:text-[var(--color-text)] dark:hover:text-slate-200 hover:bg-[var(--color-surface-elevated)] dark:hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <GroupIcon size={15} className={isActive ? 'text-[var(--color-primary)] dark:text-cyan-400' : 'text-[var(--color-text-muted)] dark:text-slate-400'} />
                  <span className="truncate">{group.title}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--color-surface-elevated)] dark:bg-slate-800/80 text-[var(--color-text-muted)] dark:text-slate-400 border border-[var(--color-border)] dark:border-slate-700/50">
                  {group.commands.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Command Reference Cards Catalog */}
        <div className="lg:col-span-3 space-y-8">
          {filteredGroups.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[var(--color-surface)] dark:bg-slate-900/40 border border-[var(--color-border)] dark:border-slate-800 shadow-sm">
              <HelpCircle size={40} className="mx-auto text-[var(--color-text-muted)] dark:text-slate-500 mb-3" />
              <h3 className="text-lg font-semibold text-[var(--color-text)] dark:text-slate-200 mb-1">No matching commands found</h3>
              <p className="text-[var(--color-text-secondary)] dark:text-slate-400 text-sm">Try searching for a different command name or syntax keyword.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveGroupId('all'); }}
                className="mt-4 px-4 py-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] dark:bg-cyan-500/20 dark:text-cyan-300 text-xs font-semibold border border-[var(--color-primary)]/30 dark:border-cyan-500/30 hover:bg-[var(--color-primary)]/20"
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
                  <div className="flex items-center gap-3 pb-2 border-b border-[var(--color-border)] dark:border-slate-800/80">
                    <div className="p-2.5 rounded-xl bg-[var(--color-primary)]/10 dark:bg-slate-800/80 text-[var(--color-primary)] dark:text-cyan-400">
                      <GroupIcon size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text)] dark:text-slate-100">{group.title}</h2>
                      <p className="text-xs text-[var(--color-text-secondary)] dark:text-slate-400">{group.description}</p>
                    </div>
                  </div>

                  {/* Command Accordion Cards Grid */}
                  <div className="space-y-3.5">
                    {group.commands.map(cmd => {
                      const isExpanded = expandedCmdIds.has(cmd.id);

                      return (
                        <div
                          key={cmd.id}
                          className="rounded-2xl bg-[var(--color-surface)] dark:bg-slate-900/60 border border-[var(--color-border)] dark:border-slate-800/90 shadow-sm transition-all overflow-hidden"
                        >
                          {/* Accordion Card Header */}
                          <div
                            onClick={() => toggleCommandExpanded(cmd.id)}
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--color-surface-elevated)] dark:hover:bg-slate-800/50 transition-colors select-none"
                          >
                            <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-4">
                              <span className="font-mono text-base font-bold text-[var(--color-primary)] dark:text-cyan-400 bg-[var(--color-primary)]/10 dark:bg-cyan-500/10 px-3.5 py-1.5 rounded-xl border border-[var(--color-primary)]/20 dark:border-cyan-500/20 shrink-0">
                                {cmd.name}
                              </span>

                              <div className="truncate">
                                <p className="text-xs text-[var(--color-text-secondary)] dark:text-slate-300 font-medium truncate">
                                  {cmd.shortDesc}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {cmd.badge && (
                                <span className="hidden sm:flex text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold items-center gap-1">
                                  <Sparkles size={12} /> {cmd.badge}
                                </span>
                              )}
                              {cmd.type === 'concept' && (
                                <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
                                  Core Concept
                                </span>
                              )}

                              <div className="p-1 rounded-lg text-[var(--color-text-muted)] dark:text-slate-400">
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </div>
                            </div>
                          </div>

                          {/* Accordion Card Body */}
                          {isExpanded && (
                            <div className="p-5 pt-1 border-t border-[var(--color-border)] dark:border-slate-800/80 space-y-4 bg-[var(--color-surface-elevated)]/40 dark:bg-slate-950/20 animate-fade-in">
                              {/* Theory Block */}
                              <div className="text-sm text-[var(--color-text)] dark:text-slate-300 leading-relaxed bg-[var(--color-surface-elevated)] dark:bg-slate-950/40 p-4 rounded-xl border border-[var(--color-border)] dark:border-slate-800/60">
                                <div className="text-xs font-bold text-[var(--color-text-muted)] dark:text-slate-400 mb-1.5 flex items-center gap-1.5 uppercase tracking-wider">
                                  <Info size={14} className="text-[var(--color-primary)] dark:text-cyan-400" /> Theory & Purpose
                                </div>
                                {cmd.theory}
                              </div>

                              {/* Syntax Block with One-Click Copy */}
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-bold text-[var(--color-text-muted)] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText size={14} className="text-emerald-600 dark:text-emerald-400" /> Syntax
                                  </div>
                                  <button
                                    onClick={() => copyToClipboard(cmd.syntax, `syntax-${cmd.id}`)}
                                    type="button"
                                    className="px-2 py-1 rounded-lg text-[11px] font-mono text-[var(--color-primary)] dark:text-cyan-300 bg-[var(--color-primary)]/10 dark:bg-cyan-500/15 border border-[var(--color-primary)]/20 dark:border-cyan-500/30 hover:bg-[var(--color-primary)]/20 flex items-center gap-1"
                                  >
                                    {copiedId === `syntax-${cmd.id}` ? (
                                      <>
                                        <Check size={12} className="text-emerald-500" /> Copied!
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} /> Copy
                                      </>
                                    )}
                                  </button>
                                </div>
                                <div className="font-mono text-xs bg-slate-900 dark:bg-slate-950 text-emerald-400 p-3.5 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                                  {cmd.syntax}
                                </div>
                              </div>

                              {/* Special Vim Modes Section */}
                              {cmd.vimModes && (
                                <div className="mt-4 p-4 rounded-xl bg-[var(--color-surface-elevated)] dark:bg-slate-950/80 border border-[var(--color-primary)]/30 dark:border-cyan-500/30 space-y-3">
                                  <div className="flex items-center gap-2 text-[var(--color-primary)] dark:text-cyan-300 font-bold text-sm">
                                    <Key size={16} /> Vim Modal Architecture & 3 Core Modes
                                  </div>
                                  <p className="text-xs text-[var(--color-text-secondary)] dark:text-slate-400 leading-relaxed">
                                    Vim&apos;s modal design is built around 3 distinct operation modes to enable keyboard-only editing without taking your hands off the touch-typing home row.
                                  </p>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                                    {cmd.vimModes.map((mode, idx) => (
                                      <div key={idx} className="p-3.5 rounded-xl bg-[var(--color-surface)] dark:bg-slate-900 border border-[var(--color-border)] dark:border-slate-800 space-y-2">
                                        <div className="text-xs font-bold text-[var(--color-primary)] dark:text-cyan-400">{mode.name}</div>
                                        <p className="text-[11px] text-[var(--color-text-secondary)] dark:text-slate-300 leading-tight">{mode.description}</p>
                                        <div className="space-y-1 pt-2 border-t border-[var(--color-border)] dark:border-slate-800">
                                          {mode.keybindings.map((kb, kidx) => (
                                            <div key={kidx} className="font-mono text-[10px] text-amber-700 dark:text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 truncate">
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
                                <div className="text-xs font-bold text-[var(--color-text-muted)] dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <CheckCircle2 size={14} className="text-[var(--color-primary)] dark:text-cyan-400" /> Real-Life Examples
                                </div>
                                <div className="space-y-2">
                                  {cmd.examples.map((ex, idx) => (
                                    <div
                                      key={idx}
                                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-[var(--color-surface-elevated)] dark:bg-slate-950/70 border border-[var(--color-border)] dark:border-slate-800/80 gap-2"
                                    >
                                      <div className="flex items-center gap-2 shrink-0">
                                        <code className="font-mono text-xs text-[var(--color-primary)] dark:text-cyan-300 bg-[var(--color-primary)]/10 dark:bg-cyan-950/40 px-3 py-1 rounded-lg border border-[var(--color-primary)]/20 dark:border-cyan-800/50">
                                          $ {ex.cmd}
                                        </code>
                                        <button
                                          onClick={() => copyToClipboard(ex.cmd, `ex-${cmd.id}-${idx}`)}
                                          type="button"
                                          className="p-1 rounded text-slate-400 hover:text-purple-600 dark:hover:text-cyan-400 transition-colors"
                                          title="Copy command"
                                        >
                                          {copiedId === `ex-${cmd.id}-${idx}` ? (
                                            <Check size={13} className="text-emerald-500" />
                                          ) : (
                                            <Copy size={13} />
                                          )}
                                        </button>
                                      </div>
                                      <span className="text-xs text-[var(--color-text-secondary)] dark:text-slate-400 font-sans flex items-center gap-1.5">
                                        <ChevronRight size={13} className="text-[var(--color-text-muted)] dark:text-slate-500 shrink-0" />
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
