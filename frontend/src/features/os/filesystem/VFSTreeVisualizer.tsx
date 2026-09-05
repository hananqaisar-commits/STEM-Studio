import React, { useState } from 'react';
import {
  Folder, FolderOpen, FileText, HardDrive, Link2, ChevronRight, ChevronDown,
  User, Shield, Sparkles, Circle
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

  // Track collapsed/expanded directory nodes
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

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

  const renderNode = (nodeId: string, depth = 0): React.ReactNode => {
    const node = nodes[nodeId];
    if (!node) return null;

    const isDirectory = node.type === 'directory' || node.type === 'mount-point';
    const isCollapsed = collapsedNodes.has(nodeId);
    const isCurrentDir = nodeId === currentDirId;
    const isTargetActive = nodeId === activeNodeId;
    const isHighlightedInPath = animatedPathIds.includes(nodeId);

    const children = node.childrenIds?.map(childId => nodes[childId]).filter(Boolean) || [];

    // Choose Node Icon
    let NodeIcon = FileText;
    if (node.type === 'directory') {
      NodeIcon = isCollapsed ? Folder : FolderOpen;
    } else if (node.type === 'mount-point') {
      NodeIcon = HardDrive;
    } else if (node.type === 'symlink') {
      NodeIcon = Link2;
    }

    return (
      <div key={nodeId} className="select-none space-y-1">
        {/* Node Row */}
        <div
          onClick={() => onSelectNode && onSelectNode(nodeId)}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          className={`flex items-center justify-between py-1.5 pr-3 rounded-lg text-xs font-mono transition-all cursor-pointer group ${
            isCurrentDir
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm font-bold'
              : isTargetActive
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
              : isHighlightedInPath
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
              : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
          }`}
        >
          {/* Node Left: Expand Arrow + Icon + Name */}
          <div className="flex items-center gap-2 truncate">
            {isDirectory && children.length > 0 ? (
              <button
                onClick={(e) => toggleCollapse(nodeId, e)}
                className="p-0.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            ) : (
              <span className="w-3.5" />
            )}

            <NodeIcon
              size={16}
              className={`shrink-0 ${
                isCurrentDir
                  ? 'text-cyan-400'
                  : node.type === 'directory'
                  ? 'text-amber-400'
                  : node.type === 'mount-point'
                  ? 'text-purple-400'
                  : 'text-slate-400'
              }`}
            />

            <span className="truncate">
              {node.name}
              {node.name === '/' && <span className="text-[10px] text-slate-400 font-normal ml-1">(root)</span>}
            </span>

            {isCurrentDir && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/30 text-cyan-200 border border-cyan-400/30 font-sans font-medium">
                PWD
              </span>
            )}
          </div>

          {/* Node Right Metadata Badges: Permissions & Owner */}
          <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 shrink-0 ml-3">
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-emerald-400/90 border border-slate-800">
              {node.octalPermissions}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 hidden sm:inline">
              {node.permissions}
            </span>
            <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 hidden md:inline">
              {node.owner}:{node.group}
            </span>
          </div>
        </div>

        {/* Children Render */}
        {isDirectory && !isCollapsed && children.length > 0 && (
          <div className="relative pl-2 border-l border-slate-800/70 ml-3">
            {children.map(child => renderNode(child.id, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={`w-full bg-slate-950/90 rounded-2xl border border-slate-800 p-4 font-mono shadow-inner overflow-auto transition-all ${
        isFullscreen ? 'h-[80vh] min-h-[600px]' : 'h-[360px] min-h-[300px]'
      }`}
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80 text-xs font-sans">
        <div className="flex items-center gap-2 text-slate-300 font-bold">
          <Circle size={10} className="fill-cyan-400 text-cyan-400 animate-ping" />
          <span>Virtual File System (VFS) Hierarchy Tree</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> PWD Directory
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Directory Node
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" /> File Node
          </span>
        </div>
      </div>

      {/* Render Tree recursively starting from root */}
      <div className="space-y-1 min-w-[500px]">
        {renderNode(rootId)}
      </div>
    </div>
  );
};
