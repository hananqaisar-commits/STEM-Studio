import React, { useState, useRef } from 'react';
import {
  Folder, FolderOpen, FileText, HardDrive, ChevronRight, ChevronDown,
  Sparkles, Circle, Network, LayoutList, Sliders, Terminal, Cpu, CheckCircle2,
  FolderTree, Eye
} from 'lucide-react';
import { type VFSNode, type VFSSnapshot, getAbsolutePath } from './vfs';

interface VFSTreeVisualizerProps {
  snapshot: VFSSnapshot;
  activeNodeId?: string;
  animatedPathIds?: string[];
  onSelectNode?: (nodeId: string) => void;
  isFullscreen?: boolean;
}

// Helper to classify file node category for realistic shape styling
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

export const VFSTreeVisualizer: React.FC<VFSTreeVisualizerProps> = ({
  snapshot,
  activeNodeId,
  animatedPathIds = [],
  onSelectNode,
  isFullscreen = false,
}) => {
  const { nodes, rootId, currentDirId } = snapshot;

  // View Mode: 'hierarchy' (Graphical Tree Diagram) vs 'outline' (Folder Tree List)
  const [viewMode, setViewMode] = useState<'hierarchy' | 'outline'>('hierarchy');

  // Track collapsed/expanded directory nodes for outline view
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  // Scroll Container Ref for pan / auto-scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
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

  // Light/Dark theme adaptive node color & shape border classes
  const getNodeColorClasses = (node: VFSNode, isCurrentDir: boolean, isTargetActive: boolean, isPathHighlighted: boolean) => {
    if (isCurrentDir) {
      return 'bg-purple-500/20 text-purple-900 dark:text-purple-200 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.4)] ring-2 ring-purple-500/60 font-bold';
    }
    if (isTargetActive) {
      return 'bg-emerald-500/20 text-emerald-900 dark:text-emerald-200 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] ring-2 ring-emerald-500/60 font-semibold';
    }
    if (isPathHighlighted) {
      return 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500 animate-pulse shadow-[0_0_16px_rgba(245,158,11,0.4)] font-semibold';
    }

    const cat = getNodeCategory(node);
    if (cat === 'root') {
      return 'bg-gradient-to-br from-purple-500/15 to-indigo-500/15 text-purple-900 dark:text-purple-200 border-purple-500/50 hover:border-purple-500 shadow-md';
    }
    if (cat === 'mount') {
      return 'bg-gradient-to-br from-indigo-500/10 to-blue-500/10 text-indigo-900 dark:text-indigo-200 border-indigo-500/40 hover:border-indigo-500 shadow-sm';
    }
    if (cat === 'config') {
      return 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-900 dark:text-amber-200 border-amber-500/40 hover:border-amber-500 shadow-sm';
    }
    if (cat === 'script') {
      return 'bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-900 dark:text-emerald-200 border-emerald-500/40 hover:border-emerald-500 shadow-sm';
    }
    if (cat === 'directory') {
      return 'bg-[var(--color-surface)] text-[var(--color-text)] border-[var(--color-border)] hover:border-purple-500 hover:shadow-lg hover:scale-[1.02] shadow-sm';
    }
    return 'bg-[var(--color-surface-elevated)] text-[var(--color-text)] border-[var(--color-border)] hover:border-purple-400 shadow-sm';
  };

  // Track expanded branches in hierarchy view
  const [expandedBranchIds, setExpandedBranchIds] = useState<Set<string>>(() => {
    const initial = new Set<string>(['home', 'etc', 'var', 'bin']);
    if (currentDirId && currentDirId !== 'root') initial.add(currentDirId);
    return initial;
  });

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

  // ── GRAPHICAL HIERARCHY TREE RENDER ─────────────────────
  const renderGraphicalHierarchy = () => {
    const rootNode = nodes['root'];
    if (!rootNode) return null;

    // Filter top-level FHS directories
    const topLevelChildren = (rootNode.childrenIds || [])
      .map(id => nodes[id])
      .filter(Boolean);

    return (
      <div className="w-full min-w-[1300px] p-6 flex flex-col items-center gap-8 select-none transition-all">
        {/* ROOT NODE CARD */}
        <div className="flex flex-col items-center relative group">
          <div className="px-3 py-1 rounded-t-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-mono text-[10px] font-bold tracking-wider uppercase shadow-md flex items-center gap-1.5 z-10 border border-purple-400/40">
            <Sparkles size={11} className="animate-spin text-amber-300" />
            <span>Linux Root Hierarchy (FHS 3.0)</span>
          </div>

          <div
            onClick={() => onSelectNode && onSelectNode('root')}
            className={`z-10 px-7 py-3.5 rounded-2xl border flex items-center gap-4 cursor-pointer transition-all shadow-xl backdrop-blur-xl ${getNodeColorClasses(
              rootNode,
              rootId === currentDirId,
              rootId === activeNodeId,
              animatedPathIds.includes('root')
            )}`}
          >
            <div className="p-3 rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-500/30 border border-purple-400/30">
              <FolderOpen size={24} />
            </div>
            <div>
              <div className="font-mono text-base font-extrabold flex items-center gap-2">
                <span>/ (Root)</span>
                {currentDirId === 'root' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold shadow-sm flex items-center gap-1">
                    <CheckCircle2 size={10} /> PWD
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono mt-1">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  {rootNode.octalPermissions} ({rootNode.permissions})
                </span>
                <span className="text-[var(--color-text-muted)] font-semibold">{rootNode.owner}:{rootNode.group}</span>
              </div>
            </div>
          </div>

          {/* Trunk Connector Line */}
          <div className="w-1 h-8 bg-gradient-to-b from-purple-600 via-indigo-500 to-purple-400/80 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
        </div>

        {/* LEVEL 1: FHS DIRECTORIES ROW & CONNECTORS */}
        <div className="w-full relative pt-5 border-t-2 border-purple-500/30 rounded-t-3xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3.5 items-start">
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
                  className="flex flex-col items-center relative transition-all"
                >
                  {/* Vertical Connector Stem */}
                  <div className={`w-0.5 h-3 ${isPath ? 'bg-amber-500' : 'bg-purple-500/40 dark:bg-purple-500/30'}`} />

                  {/* FHS Directory Node Card */}
                  <div
                    onClick={() => onSelectNode && onSelectNode(child.id)}
                    className={`w-full p-3.5 rounded-2xl border flex flex-col items-center justify-between min-h-[110px] cursor-pointer transition-all hover:scale-[1.03] shadow-md backdrop-blur-md relative overflow-hidden ${getNodeColorClasses(
                      child,
                      isCurrent,
                      isActive,
                      isPath
                    )}`}
                  >
                    {/* Folder Accent Pill */}
                    <div className="w-full flex items-center justify-between text-[10px] font-mono mb-2">
                      <span className={`px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-[9px] ${
                        cat === 'mount' ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30' :
                        cat === 'config' ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/30' :
                        'bg-purple-500/20 text-purple-800 dark:text-purple-300 border border-purple-400/30'
                      }`}>
                        {cat}
                      </span>
                      <span className="font-bold text-[10px] text-[var(--color-text-muted)]">
                        {child.childrenIds?.length || 0} items
                      </span>
                    </div>

                    <div className="flex items-center gap-2 my-1">
                      <div className={`p-2 rounded-xl ${
                        isCurrent ? 'bg-purple-600 text-white shadow-md' :
                        isActive ? 'bg-emerald-600 text-white shadow-md' :
                        'bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <span className="font-mono text-sm font-bold truncate tracking-tight">{child.name}</span>
                    </div>

                    {isCurrent && (
                      <span className="mt-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-600 text-white font-bold shadow-sm">
                        PWD
                      </span>
                    )}

                    <div className="mt-2 flex items-center justify-between w-full text-[10px] font-mono pt-1.5 border-t border-[var(--color-border)]/60">
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border)]">
                        {child.octalPermissions}
                      </span>
                      {isChildDir && childSubItems.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => toggleBranchExpanded(child.id, e)}
                          aria-label={isBranchExpanded ? 'Hide branch' : `Expand branch (${childSubItems.length} items)`}
                          className={`px-2 py-0.5 rounded text-[9px] font-sans font-bold transition-all shadow-sm ${
                            isBranchExpanded
                              ? 'bg-purple-600 text-white hover:bg-purple-700'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-purple-500/20'
                          }`}
                        >
                          {isBranchExpanded ? 'Hide' : `+${childSubItems.length}`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* LEVEL 2 SUB-BRANCHES */}
                  {isChildDir && childSubItems.length > 0 && isBranchExpanded && (
                    <div className="w-full flex flex-col items-center pt-2 space-y-1.5 relative animate-fade-in">
                      <div className={`w-0.5 h-3 ${isPath ? 'bg-amber-500' : 'bg-purple-500/40'}`} />
                      <div className="w-full space-y-1.5 bg-[var(--color-surface)]/90 backdrop-blur-md p-2 rounded-2xl border border-[var(--color-border)] shadow-xl max-h-[240px] overflow-y-auto scrollbar-thin">
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
                              className={`p-2 rounded-xl border text-[11px] font-mono flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] shadow-sm ${getNodeColorClasses(
                                sub,
                                isSubCurrent,
                                isSubActive,
                                isSubPath
                              )}`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <SubIcon size={14} className={`shrink-0 ${
                                  subCat === 'config' ? 'text-amber-500' :
                                  subCat === 'script' ? 'text-emerald-500' :
                                  subCat === 'directory' ? 'text-purple-500' : 'text-blue-500'
                                }`} />
                                <span className="truncate font-bold">{sub.name}</span>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                {subCat === 'config' && (
                                  <span className="text-[8px] uppercase tracking-wider px-1 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold border border-amber-400/30">
                                    CFG
                                  </span>
                                )}
                                {subCat === 'script' && (
                                  <span className="text-[8px] uppercase tracking-wider px-1 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-400/30">
                                    SH
                                  </span>
                                )}
                                <span className="text-[9px] text-emerald-700 dark:text-emerald-400 font-mono px-1 rounded bg-[var(--color-surface-muted)] border border-[var(--color-border)] font-bold">
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
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          className={`flex items-center justify-between py-2 pr-3 rounded-xl text-xs font-mono transition-all cursor-pointer shadow-sm group ${getNodeColorClasses(
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
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            ) : (
              <span className="w-4" />
            )}

            <NodeIcon size={16} className="shrink-0 text-purple-600 dark:text-purple-400" />
            <span className="truncate font-bold">{node.name}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] text-emerald-700 dark:text-emerald-400 border border-[var(--color-border)] font-bold">
              {node.octalPermissions}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border border-[var(--color-border)] hidden sm:inline">
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
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] text-xs font-sans">
        <div className="flex items-center gap-2.5 font-bold text-[var(--color-text)]">
          <FolderTree size={18} className="text-purple-500" />
          <span className="font-extrabold text-sm">Linux Virtual File System (VFS) Renderer</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-bold hidden sm:inline-block">
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
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition-all flex items-center gap-1"
              >
                <Eye size={12} /> Expand All
              </button>
              <button
                type="button"
                onClick={collapseAllBranches}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:bg-purple-500/10 transition-all"
              >
                Collapse All
              </button>
            </div>
          )}

          {/* View Mode Toggle Button */}
          <div className="flex items-center bg-[var(--color-surface)] p-1 rounded-xl border border-[var(--color-border)] shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('hierarchy')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'hierarchy'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
              title="Graphical Tree Hierarchy Diagram"
            >
              <Network size={13} /> Hierarchy View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('outline')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'outline'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              }`}
              title="Expandable Tree Outline List"
            >
              <LayoutList size={13} /> Outline View
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area with subtle Dot Matrix Pattern */}
      <div
        ref={scrollContainerRef}
        className={`w-full overflow-auto scrollbar-thin transition-all relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/5 via-[var(--color-surface-elevated)] to-[var(--color-surface-elevated)] ${
          isFullscreen ? 'h-[75vh] min-h-[550px]' : 'h-[440px]'
        }`}
      >
        {viewMode === 'hierarchy' ? (
          renderGraphicalHierarchy()
        ) : (
          <div className="p-4 space-y-1.5">
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
              <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 font-bold">
                <FolderTree size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-extrabold text-sm text-[var(--color-text)]">
                    {getAbsolutePath(nodes, selNode.id)}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
                    {selNode.octalPermissions} ({selNode.permissions})
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)] mt-0.5 font-mono">
                  <span>Owner: {selNode.owner}:{selNode.group}</span>
                  <span>Modified: {selNode.modifiedAt}</span>
                  <span>Type: {selNode.type}</span>
                </div>
              </div>
            </div>

            {selNode.content && (
              <div className="max-w-md hidden lg:block p-2 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] border border-slate-800 truncate">
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
