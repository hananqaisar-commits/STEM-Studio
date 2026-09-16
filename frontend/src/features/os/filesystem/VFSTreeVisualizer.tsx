import React, { useState, useRef } from 'react';
import {
  Folder, FolderOpen, FileText, HardDrive, ChevronRight, ChevronDown,
  Sparkles, Sliders, Terminal, CheckCircle2, FolderTree, Eye,
  Layers, Filter, ShieldCheck, Box, Server, Database, Code2
} from 'lucide-react';
import { type VFSNode, type VFSSnapshot, getAbsolutePath } from './vfs';

interface VFSTreeVisualizerProps {
  snapshot: VFSSnapshot;
  activeNodeId?: string;
  animatedPathIds?: string[];
  onSelectNode?: (nodeId: string) => void;
  isFullscreen?: boolean;
}

// Category filter type for FHS groups
type FHSCategoryGroup = 'all' | 'binaries' | 'config' | 'user' | 'virtual';

// Helper to classify file node category for shape styling
const getNodeCategory = (node: VFSNode): 'root' | 'mount' | 'directory' | 'config' | 'script' | 'file' => {
  if (node.id === 'root') return 'root';
  if (node.type === 'mount-point' || ['dev', 'proc', 'sys', 'mnt'].includes(node.name)) return 'mount';
  if (node.type === 'directory') return 'directory';

  const name = node.name.toLowerCase();
  if (
    name.endsWith('.conf') ||
    name.endsWith('.json') ||
    name.endsWith('.yaml') ||
    name.endsWith('.rc') ||
    ['passwd', 'group', 'shadow', 'hosts', 'fstab', 'sudoers', 'bashrc', '.bashrc'].includes(name)
  ) {
    return 'config';
  }
  if (name.endsWith('.sh') || name.endsWith('.py') || name.endsWith('.js') || name.endsWith('.bin')) {
    return 'script';
  }
  return 'file';
};

// Helper to group FHS top-level directories
const getFHSTypeGroup = (name: string): FHSCategoryGroup => {
  if (['bin', 'sbin', 'lib', 'lib64', 'usr'].includes(name)) return 'binaries';
  if (['etc', 'opt'].includes(name)) return 'config';
  if (['home', 'root', 'mnt', 'media', 'srv'].includes(name)) return 'user';
  if (['proc', 'sys', 'dev', 'var', 'tmp', 'run'].includes(name)) return 'virtual';
  return 'all';
};

export const VFSTreeVisualizer: React.FC<VFSTreeVisualizerProps> = ({
  snapshot,
  activeNodeId,
  animatedPathIds = [],
  onSelectNode,
  isFullscreen = false,
}) => {
  const { nodes, rootId, currentDirId } = snapshot;

  // View Mode: 'hierarchy' (Graphical Cards Canvas) vs 'outline' (Folder Tree List)
  const [viewMode, setViewMode] = useState<'hierarchy' | 'outline'>('hierarchy');

  // Active FHS Filter Category
  const [selectedGroup, setSelectedGroup] = useState<FHSCategoryGroup>('all');

  // Track collapsed/expanded directory nodes for outline view
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // Track expanded sub-branches in hierarchy view
  const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(() => {
    const initial = new Set<string>(['home', 'etc', 'bin']);
    if (currentDirId && currentDirId !== 'root') initial.add(currentDirId);
    return initial;
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const toggleBranchExpanded = (nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedBranchIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const expandAllBranches = () => {
    const rootNode = snapshot.nodes['root'];
    if (!rootNode || !rootNode.childrenIds) return;
    setExpandedBranchIds(new Set(rootNode.childrenIds));
  };

  const collapseAllBranches = () => {
    setExpandedBranchIds(new Set<string>());
  };

  // Helper to resolve icon
  const getNodeIcon = (node: VFSNode, isCollapsed = false) => {
    const cat = getNodeCategory(node);
    if (cat === 'root') return FolderOpen;
    if (cat === 'mount') return HardDrive;
    if (cat === 'directory') return isCollapsed ? Folder : FolderOpen;
    if (cat === 'config') return Sliders;
    if (cat === 'script') return Terminal;
    return FileText;
  };

  // Light & Dark theme adaptive node card styling
  const getNodeCardStyles = (node: VFSNode, isCurrentDir: boolean, isTargetActive: boolean, isPathHighlighted: boolean) => {
    if (isCurrentDir) {
      return 'bg-purple-50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 border-purple-500 shadow-lg shadow-purple-500/20 ring-2 ring-purple-500/50';
    }
    if (isTargetActive) {
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-100 border-emerald-500 shadow-lg shadow-emerald-500/20 ring-2 ring-emerald-500/50';
    }
    if (isPathHighlighted) {
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border-amber-500 animate-pulse shadow-md';
    }

    const cat = getNodeCategory(node);
    if (cat === 'root') {
      return 'bg-gradient-to-br from-purple-900/10 via-purple-500/10 to-indigo-500/10 text-slate-900 dark:text-white border-purple-500/40 hover:border-purple-500 shadow-md';
    }
    if (cat === 'mount') {
      return 'bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-950 dark:text-indigo-200 border-indigo-300 dark:border-indigo-800/60 hover:border-indigo-500 shadow-sm';
    }
    if (cat === 'config') {
      return 'bg-amber-50/50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800/60 hover:border-amber-500 shadow-sm';
    }
    if (cat === 'script') {
      return 'bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800/60 hover:border-emerald-500 shadow-sm';
    }

    return 'bg-[var(--color-surface-elevated)] text-[var(--color-text)] border-[var(--color-border)] hover:border-purple-400 dark:hover:border-purple-500 shadow-sm hover:shadow-md';
  };

  // ── GRAPHICAL HIERARCHY TREE RENDER ─────────────────────
  const renderGraphicalHierarchy = () => {
    const rootNode = nodes['root'];
    if (!rootNode) return null;

    // Filter top-level FHS directories based on category pill selection
    let topLevelChildren = (rootNode.childrenIds || [])
      .map(id => nodes[id])
      .filter(Boolean);

    if (selectedGroup !== 'all') {
      topLevelChildren = topLevelChildren.filter(child => getFHSTypeGroup(child.name) === selectedGroup);
    }

    return (
      <div className="w-full max-w-7xl mx-auto p-4 md:p-6 flex flex-col items-center gap-6 select-none transition-all">
        {/* ROOT NODE CARD */}
        <div className="flex flex-col items-center relative group">
          <div className="px-3.5 py-1 rounded-t-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-mono text-[10px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1.5 z-10 border border-purple-400/40">
            <Sparkles size={11} className="animate-spin text-amber-300" />
            <span>Linux Root Hierarchy (FHS 3.0)</span>
          </div>

          <div
            onClick={() => onSelectNode && onSelectNode('root')}
            className={`z-10 px-6 py-3.5 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all shadow-xl backdrop-blur-xl ${getNodeCardStyles(
              rootNode,
              rootId === currentDirId,
              rootId === activeNodeId,
              animatedPathIds.includes('root')
            )}`}
          >
            <div className="p-3 rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-500/30 border border-purple-400/30 shrink-0">
              <FolderOpen size={24} />
            </div>
            <div>
              <div className="font-mono text-base font-extrabold flex items-center gap-2">
                <span>/ (Root)</span>
                {currentDirId === 'root' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold shadow-sm flex items-center gap-1">
                    <CheckCircle2 size={10} /> PWD
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono mt-1 flex-wrap">
                <span className="text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  {rootNode.octalPermissions} ({rootNode.permissions})
                </span>
                <span className="text-[var(--color-text-muted)] font-semibold">{rootNode.owner}:{rootNode.group}</span>
              </div>
            </div>
          </div>

          {/* Clean Stem Connector */}
          <div className="w-0.5 h-6 bg-gradient-to-b from-purple-600 to-purple-400 dark:to-purple-500" />
        </div>

        {/* FHS FILTER CATEGORY PILLS */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center bg-[var(--color-surface)] p-1.5 rounded-2xl border border-[var(--color-border)] shadow-sm">
          <span className="text-xs font-bold text-[var(--color-text-muted)] px-2 flex items-center gap-1">
            <Filter size={12} /> Filter:
          </span>
          {[
            { id: 'all', label: 'All FHS', icon: Layers },
            { id: 'binaries', label: 'Binaries (/bin, /lib)', icon: Terminal },
            { id: 'config', label: 'Config (/etc)', icon: Sliders },
            { id: 'user', label: 'User & Storage (/home, /mnt)', icon: Server },
            { id: 'virtual', label: 'System & Proc (/proc, /var)', icon: Database },
          ].map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedGroup === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedGroup(cat.id as FHSCategoryGroup)}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text)]'
                }`}
              >
                <Icon size={12} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* LEVEL 1: FHS DIRECTORY CARDS GRID */}
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
            {topLevelChildren.map(child => {
              const cat = getNodeCategory(child);
              const isChildDir = child.type === 'directory' || child.type === 'mount-point';
              const childSubItems = (child.childrenIds || []).map(cid => nodes[cid]).filter(Boolean);
              const isCurrent = child.id === currentDirId;
              const isActive = child.id === activeNodeId;
              const isPath = animatedPathIds.includes(child.id);
              const isBranchExpanded = expandedBranchIds.has(child.id);
              const Icon = getNodeIcon(child, !isBranchExpanded);

              return (
                <div
                  key={child.id}
                  className="flex flex-col items-center w-full transition-all"
                >
                  {/* Top Connector Stem */}
                  <div className={`w-0.5 h-3 mb-1 ${isPath ? 'bg-amber-500' : 'bg-purple-500/40'}`} />

                  {/* FHS Directory Node Card */}
                  <div
                    onClick={() => onSelectNode && onSelectNode(child.id)}
                    className={`w-full p-4 rounded-2xl border flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] shadow-sm backdrop-blur-md relative overflow-hidden ${getNodeCardStyles(
                      child,
                      isCurrent,
                      isActive,
                      isPath
                    )}`}
                  >
                    {/* Header: Category Badge & Item Count */}
                    <div className="flex items-center justify-between text-xs font-mono mb-3">
                      <span className={`px-2 py-0.5 rounded-md font-extrabold uppercase tracking-wider text-[10px] ${
                        cat === 'mount' ? 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 border border-indigo-400/30' :
                        cat === 'config' ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/30' :
                        'bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-400/30'
                      }`}>
                        {cat}
                      </span>
                      <span className="font-bold text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface)] px-2 py-0.5 rounded-full border border-[var(--color-border)]">
                        {child.childrenIds?.length || 0} items
                      </span>
                    </div>

                    {/* Main Content: Folder Icon & Name */}
                    <div className="flex items-center gap-3 my-1">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        isCurrent ? 'bg-purple-600 text-white shadow-md' :
                        isActive ? 'bg-emerald-600 text-white shadow-md' :
                        'bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20'
                      }`}>
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-base font-extrabold truncate tracking-tight text-[var(--color-text)]">
                          {child.name}
                        </div>
                        <div className="text-[11px] text-[var(--color-text-muted)] font-mono truncate">
                          /{child.name}
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold shadow-sm">
                          PWD
                        </span>
                      )}
                    </div>

                    {/* Footer: Permission & Expand Trigger */}
                    <div className="mt-3 flex items-center justify-between w-full text-xs font-mono pt-2 border-t border-[var(--color-border)]">
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-[11px]">
                        {child.octalPermissions} ({child.permissions})
                      </span>
                      {isChildDir && childSubItems.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => toggleBranchExpanded(child.id, e)}
                          aria-label={isBranchExpanded ? 'Hide branch' : `Expand branch (${childSubItems.length} items)`}
                          className={`px-2.5 py-1 rounded-lg text-xs font-sans font-bold transition-all shadow-sm flex items-center gap-1 ${
                            isBranchExpanded
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-purple-500/15 border border-[var(--color-border)]'
                          }`}
                        >
                          {isBranchExpanded ? (
                            <><span>Hide</span><ChevronDown size={12} /></>
                          ) : (
                            <><span>+{childSubItems.length} Items</span><ChevronRight size={12} /></>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SUB-BRANCH CONTENTS DRAWER */}
                  {isChildDir && childSubItems.length > 0 && isBranchExpanded && (
                    <div className="w-full flex flex-col items-center pt-2 space-y-2 animate-fade-in z-10">
                      <div className={`w-0.5 h-3 ${isPath ? 'bg-amber-500' : 'bg-purple-500/40'}`} />
                      <div className="w-full space-y-1.5 bg-[var(--color-surface)] p-3 rounded-2xl border border-[var(--color-border)] shadow-lg max-h-[260px] overflow-y-auto scrollbar-thin">
                        <div className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Contents of /{child.name}</span>
                          <span>{childSubItems.length} files</span>
                        </div>
                        {childSubItems.map(sub => {
                          const subCat = getNodeCategory(sub);
                          const isSubCurrent = sub.id === currentDirId;
                          const isSubActive = sub.id === activeNodeId;
                          const isSubPath = animatedPathIds.includes(sub.id);
                          const SubIcon = getNodeIcon(sub);

                          return (
                            <div
                              key={sub.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectNode && onSelectNode(sub.id);
                              }}
                              className={`p-2 rounded-xl border text-xs font-mono flex items-center justify-between cursor-pointer transition-all hover:scale-[1.01] shadow-sm ${getNodeCardStyles(
                                sub,
                                isSubCurrent,
                                isSubActive,
                                isSubPath
                              )}`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <SubIcon size={15} className={`shrink-0 ${
                                  subCat === 'config' ? 'text-amber-500' :
                                  subCat === 'script' ? 'text-emerald-500' :
                                  subCat === 'directory' ? 'text-purple-500' : 'text-blue-500'
                                }`} />
                                <span className="truncate font-bold text-[var(--color-text)]">{sub.name}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                {subCat === 'config' && (
                                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold border border-amber-400/30">
                                    CFG
                                  </span>
                                )}
                                {subCat === 'script' && (
                                  <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-400/30">
                                    SH
                                  </span>
                                )}
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-elevated)] border border-[var(--color-border)] font-bold">
                                  {sub.octalPermissions}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── OUTLINE LIST TREE RENDER ─────────────────────────────────────────────
  const renderOutlineNode = (nodeId: string, depth = 0): React.ReactNode => {
    const node = nodes[nodeId];
    if (!node) return null;

    const isDirectory = node.type === 'directory' || node.type === 'mount-point';
    const isCollapsed = collapsedNodes.has(nodeId);
    const isCurrentDir = nodeId === currentDirId;
    const isTargetActive = nodeId === activeNodeId;
    const isHighlightedInPath = animatedPathIds.includes(nodeId);

    const children = node.childrenIds?.map(childId => nodes[childId]).filter(Boolean) || [];
    const NodeIcon = getNodeIcon(node, isCollapsed);

    return (
      <div key={nodeId} className="select-none space-y-1">
        <div
          onClick={() => onSelectNode && onSelectNode(nodeId)}
          style={{ paddingLeft: `${depth * 22 + 10}px` }}
          className={`flex items-center justify-between py-2.5 pr-3 rounded-xl text-xs font-mono transition-all cursor-pointer shadow-sm group ${getNodeCardStyles(
            node,
            isCurrentDir,
            isTargetActive,
            isHighlightedInPath
          )}`}
        >
          <div className="flex items-center gap-2 truncate">
            {isDirectory && children.length > 0 ? (
              <button
                type="button"
                onClick={(e) => toggleCollapse(nodeId, e)}
                aria-label={isCollapsed ? 'Expand directory' : 'Collapse directory'}
                className="p-1 rounded hover:bg-purple-500/20 transition-all text-[var(--color-text-muted)]"
              >
                {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              </button>
            ) : (
              <span className="w-4" />
            )}

            <NodeIcon size={16} className="shrink-0 text-purple-600 dark:text-purple-400" />
            <span className="truncate font-bold text-[var(--color-text)]">{node.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] text-emerald-700 dark:text-emerald-400 border border-[var(--color-border)] font-bold">
              {node.octalPermissions}
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)] hidden sm:inline">
              {node.permissions}
            </span>
          </div>
        </div>

        {isDirectory && !isCollapsed && children.length > 0 && (
          <div className="relative pl-2 border-l-2 border-purple-500/30 ml-4 space-y-1">
            {children.map(child => renderOutlineNode(child.id, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col bg-[var(--color-surface)] text-[var(--color-text)] rounded-2xl border border-[var(--color-border)] shadow-xl overflow-hidden transition-all">
      {/* Top Controls Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] text-xs font-sans">
        <div className="flex items-center gap-2.5 font-bold text-[var(--color-text)]">
          <FolderTree size={20} className="text-purple-500" />
          <span className="font-extrabold text-sm tracking-tight">Linux Virtual File System (VFS) Renderer</span>
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-bold hidden sm:inline-block">
            FHS Tree Canvas
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Branch Expand/Collapse Controls */}
          {viewMode === 'hierarchy' && (
            <div className="flex items-center gap-1.5 mr-1">
              <button
                type="button"
                onClick={expandAllBranches}
                className="bst-btn bst-btn-primary"
              >
                <Eye size={13} /> Expand All
              </button>
              <button
                type="button"
                onClick={collapseAllBranches}
                className="bst-btn"
              >
                Collapse All
              </button>
            </div>
          )}

          {/* View Mode Toggle Button */}
          <div className="flex items-center bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)] shadow-sm gap-1">
            <button
              type="button"
              onClick={() => setViewMode('hierarchy')}
              className={`bst-btn ${
                viewMode === 'hierarchy'
                  ? 'bst-btn-primary'
                  : ''
              }`}
              title="Graphical Tree Hierarchy Cards"
            >
              <Box size={14} /> Hierarchy View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('outline')}
              className={`bst-btn ${
                viewMode === 'outline'
                  ? 'bst-btn-primary'
                  : ''
              }`}
              title="Expandable Tree Outline List"
            >
              <Layers size={14} /> Outline View
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={scrollContainerRef}
        className={`w-full overflow-auto scrollbar-thin transition-all relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-500/5 via-[var(--color-surface)] to-[var(--color-surface)] ${
          isFullscreen ? 'h-[75vh] min-h-[550px]' : 'h-[480px]'
        }`}
      >
        {viewMode === 'hierarchy' ? (
          renderGraphicalHierarchy()
        ) : (
          <div className="p-4 space-y-1.5 max-w-4xl mx-auto">
            {renderOutlineNode('root')}
          </div>
        )}
      </div>

      {/* Active Node Detail Inspector Drawer */}
      {(() => {
        const selNode = activeNodeId ? nodes[activeNodeId] : nodes[currentDirId] || nodes['root'];
        if (!selNode) return null;
        return (
          <div className="px-4 py-3 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-3 text-xs font-sans animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 font-bold shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-extrabold text-sm text-[var(--color-text)]">
                    {getAbsolutePath(nodes, selNode.id)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-500/30 text-[10px]">
                    {selNode.octalPermissions} ({selNode.permissions})
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)] mt-0.5 font-mono flex-wrap">
                  <span>Owner: <strong className="text-[var(--color-text)]">{selNode.owner}:{selNode.group}</strong></span>
                  <span>Modified: <strong className="text-[var(--color-text)]">{selNode.modifiedAt}</strong></span>
                  <span>Type: <strong className="text-[var(--color-text)]">{selNode.type}</strong></span>
                </div>
              </div>
            </div>

            {selNode.content && (
              <div className="max-w-md hidden lg:block p-2 px-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs border border-slate-800 truncate shadow-inner">
                <span className="text-purple-400 font-bold">$ cat {selNode.name}: </span>
                <span>{selNode.content.length > 50 ? `${selNode.content.slice(0, 50)}...` : selNode.content}</span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
