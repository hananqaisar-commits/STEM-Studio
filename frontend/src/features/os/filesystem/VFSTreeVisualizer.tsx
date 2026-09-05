import React, { useState, useRef } from 'react';
import {
  Folder, FolderOpen, FileText, HardDrive, Link2, ChevronRight, ChevronDown,
  User, Shield, Sparkles, Circle, Network, LayoutList, Move, ArrowLeftRight,
  Maximize2
} from 'lucide-react';
import { type VFSNode, type VFSSnapshot } from './vfs';

interface VFSTreeVisualizerProps {
  snapshot: VFSSnapshot;
  activeNodeId?: string;
  animatedPathIds?: string[];
  onSelectNode?: (nodeId: string) => void;
  isFullscreen?: boolean;
}

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
    if (node.type === 'directory') return isCollapsed ? Folder : FolderOpen;
    if (node.type === 'mount-point') return HardDrive;
    if (node.type === 'symlink') return Link2;
    return FileText;
  };

  // Light/Dark theme adaptive node color classes
  const getNodeColorClasses = (node: VFSNode, isCurrentDir: boolean, isTargetActive: boolean, isPathHighlighted: boolean) => {
    if (isCurrentDir) {
      return 'bg-cyan-500/20 dark:bg-cyan-500/25 text-cyan-800 dark:text-cyan-200 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-2 ring-cyan-500/50 font-bold';
    }
    if (isTargetActive) {
      return 'bg-emerald-500/20 dark:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/50 font-semibold';
    }
    if (isPathHighlighted) {
      return 'bg-amber-500/20 dark:bg-amber-500/25 text-amber-800 dark:text-amber-200 border-amber-500 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.3)]';
    }

    if (node.id === 'root') {
      return 'bg-amber-100 dark:bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-400 dark:border-amber-500/40 hover:bg-amber-200 dark:hover:bg-amber-500/25';
    }
    if (node.type === 'mount-point') {
      return 'bg-purple-100 dark:bg-purple-500/15 text-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-500/30 hover:bg-purple-200 dark:hover:bg-purple-500/25';
    }
    if (node.type === 'directory') {
      return 'bg-[var(--color-surface)] dark:bg-slate-900/90 text-purple-900 dark:text-cyan-300 border-[var(--color-border)] dark:border-slate-700/80 hover:border-purple-400 dark:hover:border-cyan-500/50 hover:bg-purple-50 dark:hover:bg-slate-800/80';
    }
    return 'bg-[var(--color-surface-elevated)] dark:bg-slate-950/80 text-slate-800 dark:text-emerald-300/90 border-[var(--color-border)] dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500/40';
  };

  // Track expanded branches in hierarchy view (interactive branch expansion)
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

  // ── GRAPHICAL HIERARCHY TREE RENDER WITH INTERACTIVE BRANCHES ─────────────────────
  const renderGraphicalHierarchy = () => {
    const rootNode = nodes['root'];
    if (!rootNode) return null;

    // Filter top-level FHS directories
    const topLevelChildren = (rootNode.childrenIds || [])
      .map(id => nodes[id])
      .filter(Boolean);

    return (
      <div className="w-full min-w-[1400px] p-8 flex flex-col items-center gap-10 select-none transition-colors">
        {/* ROOT NODE (LEVEL 0) */}
        <div className="flex flex-col items-center relative group">
          <div
            onClick={() => onSelectNode && onSelectNode('root')}
            className={`px-8 py-4 rounded-2xl border flex items-center gap-3.5 cursor-pointer transition-all shadow-xl backdrop-blur-md ${getNodeColorClasses(
              rootNode,
              rootId === currentDirId,
              rootId === activeNodeId,
              animatedPathIds.includes('root')
            )}`}
          >
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
              <FolderOpen size={24} />
            </div>
            <div>
              <div className="font-mono text-base font-extrabold flex items-center gap-2">
                <span>/ (Root Directory)</span>
                {currentDirId === 'root' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/30 text-cyan-900 dark:text-cyan-200 font-bold border border-cyan-400/40">
                    PWD
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs font-mono opacity-90 mt-1">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  {rootNode.octalPermissions} ({rootNode.permissions})
                </span>
                <span className="text-slate-500 dark:text-slate-400">{rootNode.owner}:{rootNode.group}</span>
              </div>
            </div>
          </div>

          {/* Trunk Vertical Line */}
          <div className="w-0.5 h-10 bg-gradient-to-b from-amber-500 to-purple-500/80" />
        </div>

        {/* LEVEL 1: FHS DIRECTORIES ROW & SVG CONNECTORS */}
        <div className="w-full relative pt-6 border-t-2 border-purple-500/40 dark:border-purple-500/30 rounded-t-3xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4 items-start">
            {topLevelChildren.map(child => {
              const isChildDir = child.type === 'directory' || child.type === 'mount-point';
              const childSubItems = (child.childrenIds || []).map(cid => nodes[cid]).filter(Boolean);
              const isCurrent = child.id === currentDirId;
              const isActive = child.id === activeNodeId;
              const isPath = animatedPathIds.includes(child.id);
              const isBranchExpanded = expandedBranchIds.has(child.id);
              const Icon = getNodeIcon(child, !isBranchExpanded);

              return (
                <div key={child.id} className="flex flex-col items-center space-y-3 relative group">
                  {/* Top Connector stub */}
                  <div className={`w-0.5 h-6 -mt-6 transition-colors ${
                    isPath ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]' : 'bg-purple-500/40 dark:bg-purple-500/30'
                  }`} />

                  {/* Level 1 Node Card */}
                  <div
                    onClick={() => {
                      if (onSelectNode) onSelectNode(child.id);
                      if (isChildDir && childSubItems.length > 0) {
                        toggleBranchExpanded(child.id);
                      }
                    }}
                    className={`w-full p-3 rounded-2xl border flex flex-col items-center text-center cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-md backdrop-blur-sm ${getNodeColorClasses(
                      child,
                      isCurrent,
                      isActive,
                      isPath
                    )}`}
                  >
                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold truncate max-w-full">
                      <Icon size={16} className="shrink-0 text-purple-600 dark:text-cyan-400" />
                      <span className="truncate">/{child.name}</span>
                    </div>

                    {isCurrent && (
                      <span className="mt-1 text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/30 text-cyan-900 dark:text-cyan-200 font-bold border border-cyan-400/30">
                        PWD
                      </span>
                    )}

                    <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-mono">
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
                        {child.octalPermissions}
                      </span>
                      {isChildDir && childSubItems.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => toggleBranchExpanded(child.id, e)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-sans font-semibold transition-all ${
                            isBranchExpanded
                              ? 'bg-purple-500/20 text-purple-700 dark:text-cyan-300 border border-purple-500/30'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-purple-100'
                          }`}
                        >
                          {isBranchExpanded ? 'Hide' : `+${childSubItems.length}`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* LEVEL 2 SUB-BRANCHES - SHOWN UPON BRANCH EXPANSION */}
                  {isChildDir && childSubItems.length > 0 && isBranchExpanded && (
                    <div className="w-full flex flex-col items-center pt-1 space-y-1.5 relative animate-fade-in">
                      <div className={`w-0.5 h-3 ${isPath ? 'bg-amber-500' : 'bg-purple-500/40 dark:bg-slate-800'}`} />
                      <div className="w-full space-y-1.5 bg-[var(--color-surface-elevated)] dark:bg-slate-950/90 p-2 rounded-2xl border border-[var(--color-border)] dark:border-slate-800/90 shadow-md max-h-[220px] overflow-y-auto scrollbar-thin">
                        {childSubItems.map(sub => {
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
                              className={`p-1.5 rounded-xl border text-[11px] font-mono flex items-center justify-between cursor-pointer transition-all hover:scale-[1.02] ${getNodeColorClasses(
                                sub,
                                isSubCurrent,
                                isSubActive,
                                isSubPath
                              )}`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <SubIcon size={13} className="shrink-0 text-slate-500 dark:text-slate-400" />
                                <span className="truncate font-semibold">{sub.name}</span>
                              </div>
                              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-mono px-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                {sub.octalPermissions}
                              </span>
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
          className={`flex items-center justify-between py-1.5 pr-3 rounded-xl text-xs font-mono transition-all cursor-pointer group ${getNodeColorClasses(
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
                className="p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            ) : (
              <span className="w-3.5" />
            )}

            <NodeIcon size={16} className="shrink-0 text-purple-600 dark:text-cyan-400" />
            <span className="truncate font-semibold">{node.name}</span>

            {isCurrentDir && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-900 dark:text-cyan-200 font-sans font-medium">
                PWD
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-emerald-700 dark:text-emerald-400 border border-slate-300 dark:border-slate-800">
              {node.octalPermissions}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-800 hidden sm:inline">
              {node.permissions}
            </span>
          </div>
        </div>

        {isDirectory && !isCollapsed && children.length > 0 && (
          <div className="relative pl-2 border-l border-slate-300 dark:border-slate-800/70 ml-3">
            {children.map(child => renderOutlineNode(child.id, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col bg-[var(--color-surface)] dark:bg-slate-950/90 text-[var(--color-text)] dark:text-slate-100 rounded-2xl border border-[var(--color-border)] dark:border-slate-800 shadow-inner overflow-hidden transition-colors">
      {/* Top Controls Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--color-surface-elevated)] dark:bg-slate-900/90 border-b border-[var(--color-border)] dark:border-slate-800 text-xs font-sans">
        <div className="flex items-center gap-2 font-bold">
          <Circle size={10} className="fill-purple-600 dark:fill-cyan-400 text-purple-600 dark:text-cyan-400 animate-ping" />
          <span>Linux Virtual File System (VFS) Hierarchy</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Branch Expand/Collapse Controls */}
          {viewMode === 'hierarchy' && (
            <div className="flex items-center gap-1.5 mr-2">
              <button
                type="button"
                onClick={expandAllBranches}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-cyan-300 border border-purple-500/20 hover:bg-purple-500/20"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAllBranches}
                className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-200"
              >
                Collapse All
              </button>
            </div>
          )}

          {/* Dual Scroll Indicator Badge */}
          <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-800 hidden md:flex items-center gap-1.5">
            <ArrowLeftRight size={13} className="text-purple-600 dark:text-cyan-400" />
            <span>Dual-Axis Scroll</span>
          </span>

          {/* View Mode Toggle Button */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-300 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('hierarchy')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'hierarchy'
                  ? 'bg-purple-600 dark:bg-cyan-500/20 text-white dark:text-cyan-300 border border-purple-500 dark:border-cyan-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Graphical Tree Hierarchy Diagram"
            >
              <Network size={13} /> Hierarchy View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('outline')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                viewMode === 'outline'
                  ? 'bg-purple-600 dark:bg-cyan-500/20 text-white dark:text-cyan-300 border border-purple-500 dark:border-cyan-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Expandable Tree Outline List"
            >
              <LayoutList size={13} /> Outline View
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        ref={scrollContainerRef}
        className={`w-full overflow-auto scrollbar-thin transition-all ${
          isFullscreen ? 'h-[75vh] min-h-[550px]' : 'h-[420px]'
        }`}
      >
        {viewMode === 'hierarchy' ? (
          renderGraphicalHierarchy()
        ) : (
          <div className="p-4">
            {renderOutlineNode('root')}
          </div>
        )}
      </div>
    </div>
  );
};
