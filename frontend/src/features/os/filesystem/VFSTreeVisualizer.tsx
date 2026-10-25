import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, ChevronRight, FileText, Folder, FolderOpen, FolderTree,
  HardDrive, Search, ShieldCheck, Terminal,
} from 'lucide-react';
import { type VFSNode, type VFSSnapshot, getAbsolutePath } from './vfs';

interface VFSTreeVisualizerProps {
  snapshot: VFSSnapshot;
  activeNodeId?: string;
  animatedPathIds?: string[];
  onSelectNode?: (nodeId: string) => void;
  isFullscreen?: boolean;
}

type NodeKind = 'directory' | 'mount' | 'config' | 'script' | 'file';

const isDirectory = (node: VFSNode) => node.type === 'directory' || node.type === 'mount-point';
const directChildIds = (node: VFSNode, nodes: Record<string, VFSNode>) =>
  [...new Set(node.childrenIds || [])].filter((childId) => nodes[childId]?.parentId === node.id);

function getNodeKind(node: VFSNode): NodeKind {
  if (node.type === 'directory') return 'directory';
  if (node.type === 'mount-point') return 'mount';
  const name = node.name.toLowerCase();
  if (name.endsWith('.conf') || name.endsWith('.json') || name.endsWith('.yaml') || name.endsWith('.rc') ||
      ['passwd', 'group', 'shadow', 'hosts', 'fstab', 'sudoers', '.bashrc'].includes(name)) return 'config';
  if (name.endsWith('.sh') || name.endsWith('.py') || name.endsWith('.js') || name.endsWith('.bin')) return 'script';
  return 'file';
}

function initialCollapsedNodes(snapshot: VFSSnapshot): Set<string> {
  const expanded = new Set<string>([snapshot.rootId]);
  let current: VFSNode | undefined = snapshot.nodes[snapshot.currentDirId];
  // Reveal the path to the current working directory, while leaving that
  // directory's own contents folded so the first frame stays readable.
  while (current?.parentId) {
    if (current.id !== snapshot.currentDirId) expanded.add(current.id);
    current = snapshot.nodes[current.parentId];
  }
  return new Set(Object.values(snapshot.nodes)
    .filter((node) => isDirectory(node) && !expanded.has(node.id))
    .map((node) => node.id));
}

export const VFSTreeVisualizer: React.FC<VFSTreeVisualizerProps> = ({
  snapshot,
  activeNodeId,
  animatedPathIds = [],
  onSelectNode,
  isFullscreen = false,
}) => {
  const { nodes, rootId, currentDirId } = snapshot;
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(() => initialCollapsedNodes(snapshot));
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const root = nodes[rootId];
  const currentPath = getAbsolutePath(nodes, currentDirId);
  const activePath = activeNodeId && nodes[activeNodeId]
    ? getAbsolutePath(nodes, activeNodeId)
    : '';
  const selectedNode = activeNodeId && nodes[activeNodeId]
    ? nodes[activeNodeId]
    : nodes[currentDirId] || root;

  // When `cd` changes the working directory, reveal its path in the tree but
  // keep that directory's children folded until the learner opens it.
  useEffect(() => {
    setCollapsedNodes((previous) => {
      const next = new Set(previous);
      let current: VFSNode | undefined = nodes[currentDirId];
      if (current && isDirectory(current)) next.add(current.id);
      while (current?.parentId) {
        next.delete(current.parentId);
        current = nodes[current.parentId];
      }
      next.delete(rootId);
      return next;
    });
  // Re-run when the current directory's actual parent path changes, not for
  // every snapshot clone produced by an ordinary file edit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDirId, currentPath, rootId]);

  // A command target (such as a newly installed /usr/bin program) must be
  // brought into view by expanding its actual parent chain in the tree.
  useEffect(() => {
    if (!activeNodeId || !nodes[activeNodeId]) return;
    setCollapsedNodes((previous) => {
      const next = new Set(previous);
      let current: VFSNode | undefined = nodes[activeNodeId];
      while (current?.parentId) {
        next.delete(current.parentId);
        current = nodes[current.parentId];
      }
      next.delete(rootId);
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNodeId, activePath, rootId]);

  const matchingDescendant = useMemo(() => {
    const cache = new Map<string, boolean>();
    const visiting = new Set<string>();
    const visit = (nodeId: string): boolean => {
      if (cache.has(nodeId)) return cache.get(nodeId)!;
      if (visiting.has(nodeId)) return false;
      const node = nodes[nodeId];
      if (!node) return false;
      visiting.add(nodeId);
      const ownMatch = !query || `${node.name} ${getAbsolutePath(nodes, nodeId)}`.toLocaleLowerCase().includes(query);
      const hasMatchingChild = directChildIds(node, nodes).some((childId) => visit(childId));
      const result = ownMatch || hasMatchingChild;
      visiting.delete(nodeId);
      cache.set(nodeId, result);
      return result;
    };
    if (root) visit(root.id);
    return cache;
  }, [nodes, query, root]);

  const visibleChildIds = (node: VFSNode) => directChildIds(node, nodes)
    .filter((childId) => matchingDescendant.get(childId));
  const isCollapsed = (nodeId: string) => !query && collapsedNodes.has(nodeId);

  const directoryIds = useMemo(() => Object.values(nodes).filter(isDirectory).map((node) => node.id), [nodes]);
  const visibleStats = useMemo(() => {
    let directories = 0;
    let files = 0;
    const visited = new Set<string>();
    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      const node = nodes[nodeId];
      if (!node || !matchingDescendant.get(nodeId)) return;
      if (isDirectory(node)) directories += 1;
      else files += 1;
      if (!isCollapsed(nodeId)) visibleChildIds(node).forEach(visit);
    };
    if (root) visit(root.id);
    return { directories, files, total: directories + files };
  // The tree is small and this memo keeps the initial filesystem frame tidy.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, matchingDescendant, collapsedNodes, query, root]);

  const unreachableCount = useMemo(() => {
    const reached = new Set<string>();
    const visit = (nodeId: string) => {
      if (reached.has(nodeId) || !nodes[nodeId]) return;
      reached.add(nodeId);
      directChildIds(nodes[nodeId], nodes).forEach(visit);
    };
    if (root) visit(root.id);
    return Math.max(0, Object.keys(nodes).length - reached.size);
  }, [nodes, root]);

  const expandAll = () => setCollapsedNodes(new Set());
  const collapseAll = () => setCollapsedNodes(new Set(directoryIds.filter((id) => id !== rootId)));

  const toggleCollapsed = (nodeId: string) => {
    setCollapsedNodes((previous) => {
      const next = new Set(previous);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const renderNode = (nodeId: string, isLast = false, ancestors: Set<string> = new Set()): React.ReactNode => {
    if (ancestors.has(nodeId)) {
      return <li key={`cycle-${nodeId}`} className="linux-tree__integrity-error">Cycle detected: {nodeId}</li>;
    }
    const node = nodes[nodeId];
    if (!node || !matchingDescendant.get(nodeId)) return null;
    const children = visibleChildIds(node);
    const hasChildren = children.length > 0;
    const collapsed = isCollapsed(nodeId);
    const kind = getNodeKind(node);
    const active = node.id === activeNodeId;
    const workingDirectory = node.id === currentDirId;
    const inOperationPath = animatedPathIds.includes(nodeId);
    const nextAncestors = new Set(ancestors).add(nodeId);
    const Icon = kind === 'directory'
      ? (collapsed ? Folder : FolderOpen)
      : kind === 'mount' ? HardDrive
      : kind === 'script' ? Terminal
      : FileText;
    const visibleName = node.id === rootId ? '/' : node.name;
    const absolutePath = getAbsolutePath(nodes, node.id);

    return (
      <li
        key={nodeId}
        className={`linux-tree__branch ${isLast ? 'is-last' : ''} ${inOperationPath ? 'is-path' : ''}`}
      >
        <div className={`linux-tree__row-wrap ${workingDirectory || active ? 'has-path-hint' : ''}`}>
          <div className="linux-tree__entry">
            {isDirectory(node) && hasChildren ? (
              <button
                type="button"
                aria-label={collapsed ? `Expand ${absolutePath}` : `Collapse ${absolutePath}`}
                aria-expanded={!collapsed}
                className="linux-tree__toggle"
                onClick={(event) => { event.stopPropagation(); toggleCollapsed(node.id); }}
              >
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            ) : <span className="linux-tree__toggle-placeholder" aria-hidden="true" />}
            <button
              type="button"
              onClick={() => onSelectNode?.(node.id)}
              aria-label={`Select ${absolutePath}, ${kind}, owned by ${node.owner}:${node.group}, permissions ${node.octalPermissions} ${node.permissions}`}
              aria-current={workingDirectory ? 'location' : undefined}
              aria-pressed={active || workingDirectory}
              title={`${absolutePath}\n${node.owner}:${node.group} · ${node.octalPermissions} ${node.permissions}`}
              className={`linux-tree__node kind-${kind} ${inOperationPath ? 'is-operation-node' : ''} ${workingDirectory ? 'is-current' : active ? 'is-active' : ''}`}
            >
              <span className={`linux-tree__icon kind-${kind}`}><Icon size={15} aria-hidden="true" /></span>
              <span className="linux-tree__name">{visibleName}</span>
              <span className="linux-tree__permissions" aria-hidden="true">{node.octalPermissions}</span>
              {isDirectory(node) && hasChildren && (
                <span className="linux-tree__children-count" aria-hidden="true">{directChildIds(node, nodes).length}</span>
              )}
              {workingDirectory && <span className="linux-tree__state is-pwd">PWD</span>}
              {!workingDirectory && active && <span className="linux-tree__state is-selected">FOCUS</span>}
            </button>
          </div>
          {(workingDirectory || active) && <div className="linux-tree__path-hint">{absolutePath}</div>}
        </div>

        {hasChildren && !collapsed && (
          <ul className="linux-tree__list" aria-label={`Children of ${absolutePath}`}>
            {children.map((childId, index) => renderNode(childId, index === children.length - 1, nextAncestors))}
          </ul>
        )}
      </li>
    );
  };

  if (!root) return <div className="linux-vfs linux-vfs__empty">Filesystem root is missing from this snapshot.</div>;

  return (
    <section className="linux-vfs" aria-label="Linux virtual filesystem tree">
      <header className="linux-vfs__toolbar">
        <div className="linux-vfs__heading">
          <span className="linux-vfs__heading-icon"><FolderTree size={18} aria-hidden="true" /></span>
          <div>
            <h2>Filesystem</h2>
            <p>Live view of the virtual files and folders changed by terminal commands.</p>
          </div>
        </div>
        <div className="linux-vfs__summary" aria-live="polite">
          <span><strong>{visibleStats.total}</strong> visible</span>
          <span><strong>{visibleStats.directories}</strong> folders</span>
          <span><strong>{visibleStats.files}</strong> files</span>
        </div>
      </header>

      <div className="linux-vfs__controls">
        <label className="linux-vfs__search">
          <Search size={15} aria-hidden="true" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a file or path" aria-label="Find a file or path" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search">Clear</button>}
        </label>
        <div className="linux-vfs__tree-actions">
          <button type="button" onClick={expandAll}>Expand all</button>
          <button type="button" onClick={collapseAll}>Collapse all</button>
        </div>
      </div>

      <div className={`linux-vfs__canvas ${isFullscreen ? 'is-fullscreen' : ''}`}>
        <div className="linux-vfs__context">
          <span className="linux-vfs__context-label">PWD</span>
          <code>{currentPath}</code>
          <span className="linux-vfs__legend"><i className="legend-parent" /> Parent / child</span>
          {animatedPathIds.length > 0 && <span className="linux-vfs__legend"><i className="legend-operation" /> Command path</span>}
        </div>
        {unreachableCount > 0 && (
          <div className="linux-vfs__integrity-warning" role="status">
            {unreachableCount} {unreachableCount === 1 ? 'entry is' : 'entries are'} disconnected from `/` because its parent-child links do not agree.
          </div>
        )}
        {visibleStats.total === 0 ? (
          <div className="linux-vfs__no-results">No paths match “{search}”. Clear the search to see the filesystem.</div>
        ) : (
          <ul className="linux-tree__root-list" aria-label="Filesystem hierarchy">
            {renderNode(rootId, true)}
          </ul>
        )}
      </div>

      {selectedNode && (
        <footer className="linux-vfs__inspector" aria-live="polite">
          <span className="linux-vfs__inspector-icon"><ShieldCheck size={16} aria-hidden="true" /></span>
          <div className="linux-vfs__inspector-main">
            <div className="linux-vfs__inspector-title">
              <strong>{getAbsolutePath(nodes, selectedNode.id)}</strong>
              <span className="linux-vfs__permissions">{selectedNode.octalPermissions} · {selectedNode.permissions}</span>
            </div>
            <div className="linux-vfs__inspector-meta">
              <span>{selectedNode.type}</span>
              <span>{selectedNode.owner}:{selectedNode.group}</span>
              <span>Modified {selectedNode.modifiedAt}</span>
              {selectedNode.content !== undefined && <span>{selectedNode.content.length} bytes</span>}
            </div>
          </div>
          {selectedNode.content !== undefined && (
            <code className="linux-vfs__preview" title={selectedNode.content}>
              {selectedNode.content.slice(0, 90) || '(empty file)'}{selectedNode.content.length > 90 ? '…' : ''}
            </code>
          )}
        </footer>
      )}
    </section>
  );
};
