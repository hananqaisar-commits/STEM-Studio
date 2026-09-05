import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Terminal, Search, ArrowLeft, FolderGit2, Compass, FolderPlus,
  Edit3, UserCheck, Users, ShieldCheck, Cpu, Package, Globe, Server, Clock,
  ChevronRight, Sparkles, BookOpen, Key, Info, HelpCircle
} from 'lucide-react';
import { LINUX_COMMAND_GROUPS, type CommandGroup, type CommandItem } from '../../../data/linuxCommandsData';
import { VisualizerHeader } from '../../../components/layout/VisualizerHeader';
import { VisualizerActions } from '../../../components/layout/VisualizerActions';
import { TheoryPanel } from '../../../components/layout/TheoryPanel';
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
    <div className="complexity-container animate-fade-in space-y-6">
      {/* Universal DSA Visualizer Header */}
      <VisualizerHeader
        icon={<Terminal size={22} />}
        title="Commands of Linux"
        subtitle="Comprehensive reference catalog for 50+ Linux terminal commands across 13 core functional groups"
        actions={
          <div className="flex items-center gap-3">
            <button className="module-back-btn" onClick={() => navigate('/dashboard/os')}>
              <ArrowLeft size={14} /> Back to OS
            </button>
            <VisualizerActions />
          </div>
        }
      />

      {/* Global Command Search Toolbar */}
      <div className="bst-toolbar animate-fade-in flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900/80 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
          <BookOpen size={16} className="text-cyan-400" />
          <span>Interactive Linux Command Reference</span>
        </div>
        <div className="relative min-w-[300px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search commands, syntax, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-700/60 text-slate-200 placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
          />
        </div>
      </div>

      {/* Main Content Layout: Group Selection Sidebar/Tabs + Cards Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
        {/* Left Sidebar: Command Group Filter Navigation */}
        <div className="lg:col-span-1 space-y-1.5 bg-slate-900/50 p-3 rounded-2xl border border-slate-800/80 h-fit backdrop-blur-sm">
          <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Command Groups ({LINUX_COMMAND_GROUPS.length})
          </div>
          <button
            onClick={() => setActiveGroupId('all')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              activeGroupId === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span className="flex items-center gap-2">
              <BookOpen size={16} /> All Groups
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
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
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <GroupIcon size={15} className={isActive ? 'text-cyan-400' : 'text-slate-400'} />
                  <span className="truncate">{group.title}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800/80 text-slate-400">
                  {group.commands.length}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Section: Command Reference Cards Catalog */}
        <div className="lg:col-span-3 space-y-8">
          {filteredGroups.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800">
              <HelpCircle size={40} className="mx-auto text-slate-500 mb-3" />
              <h3 className="text-lg font-semibold text-slate-200 mb-1">No matching commands found</h3>
              <p className="text-slate-400 text-sm">Try searching for a different command name or syntax keyword.</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveGroupId('all'); }}
                className="mt-4 px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30 hover:bg-cyan-500/30"
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
                  <div className="flex items-center gap-3 pb-2 border-b border-slate-800/80">
                    <div className="p-2 rounded-lg bg-slate-800/80 text-cyan-400">
                      <GroupIcon size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-100">{group.title}</h2>
                      <p className="text-xs text-slate-400">{group.description}</p>
                    </div>
                  </div>

                  {/* Command Cards Grid */}
                  <div className="space-y-4">
                    {group.commands.map(cmd => (
                      <div
                        key={cmd.id}
                        className="rounded-2xl bg-slate-900/60 border border-slate-800/90 p-5 shadow-lg space-y-4 transition-all hover:border-slate-700/80"
                      >
                        {/* Command Card Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-base font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/20">
                              {cmd.name}
                            </span>
                            {cmd.badge && (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                                <Sparkles size={12} /> {cmd.badge}
                              </span>
                            )}
                          </div>
                          {cmd.type === 'concept' && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                              Core Concept
                            </span>
                          )}
                        </div>

                        {/* Theory Block (2-3 lines) */}
                        <div className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/60">
                          <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                            <Info size={14} className="text-cyan-400" /> Theory & Purpose
                          </div>
                          {cmd.theory}
                        </div>

                        {/* Syntax Block */}
                        <div className="space-y-1.5">
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Syntax
                          </div>
                          <div className="font-mono text-xs bg-slate-950 text-emerald-400 p-3 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                            {cmd.syntax}
                          </div>
                        </div>

                        {/* Special Vim 3-Mode Extra Depth Section */}
                        {cmd.vimModes && (
                          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-3">
                            <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                              <Key size={16} /> Vim Modal Architecture & 3 Core Modes
                            </div>
                            <p className="text-xs text-slate-400">
                              Vim&apos;s modal design is built around 3 distinct operation modes to enable keyboard-only editing without taking your hands off the touch-typing home row.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                              {cmd.vimModes.map((mode, idx) => (
                                <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                                  <div className="text-xs font-bold text-cyan-400">{mode.name}</div>
                                  <p className="text-[11px] text-slate-300 leading-tight">{mode.description}</p>
                                  <div className="space-y-1 pt-1 border-t border-slate-800">
                                    {mode.keybindings.map((kb, kidx) => (
                                      <div key={kidx} className="font-mono text-[10px] text-amber-300/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 truncate">
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
                          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Real-Life Examples
                          </div>
                          <div className="space-y-2">
                            {cmd.examples.map((ex, idx) => (
                              <div
                                key={idx}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 gap-2"
                              >
                                <code className="font-mono text-xs text-cyan-300 bg-cyan-950/40 px-2.5 py-1 rounded border border-cyan-800/50 shrink-0">
                                  $ {ex.cmd}
                                </code>
                                <span className="text-xs text-slate-400 font-sans flex items-center gap-1.5">
                                  <ChevronRight size={13} className="text-slate-500 shrink-0" />
                                  {ex.desc}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
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
