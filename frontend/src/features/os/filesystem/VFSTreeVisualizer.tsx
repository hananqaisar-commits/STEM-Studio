import React, { useMemo, useState } from 'react';
import {
  ChevronDown, ChevronRight, FileText, Filter, Folder, FolderOpen,
  FolderTree, HardDrive, Search, ShieldCheck, Sliders, Terminal,
} from 'lucide-react';
import { type VFSNode, type VFSSnapshot, getAbsolutePath } from './vfs';

interface VFSTreeVisualizerProps {
  snapshot: VFSSnapshot;
  activeNodeId?: string;
  animatedPathIds?: string[];
  onSelectNode?: (nodeId: string) => void;
  isFullscreen?: boolean;
}

type FHSCategoryGroup = 'all' | 'binaries' | 'config' | 'user' | 'runtime';

const GROUPS: { id: FHSCategoryGroup; label: string }[] = [
  { id: 'all', label: 'All paths' },
  { id: 'binaries', label: 'Programs & libraries' },
  { id: 'config', label: 'Configuration' },
  { id: 'user', label: 'Home & storage' },
  { id: 'runtime', label: 'Runtime & system' },
];

function groupForTopLevel(name: string): FHSCategoryGroup {
  if (['bin', 'sbin', 'lib', 'lib64', 'usr'].includes(name)) return 'binaries';
  if (['etc', 'opt'].includes(name)) return 'config';
  if (['home', 'root', 'mnt', 'media', 'srv'].includes(name)) return 'user';
  return 'runtime';
}

function nodeKind(node: VFSNode): 'directory' | 'mount' | 'config' | 'script' | 'file' {
  if (node.type === 'directory') return 'directory';
  if (node.type === 'mount-point') return 'mount';
  const name = node.name.toLowerCase();
  if (name.endsWith('.conf') || name.endsWith('.json') || name.endsWith('.yaml') || name.endsWith('.rc') ||
      ['passwd', 'group', 'shadow', 'hosts', 'fstab', 'sudoers', '.bashrc'].includes(name)) return 'config';
  if (name.endsWith('.sh') || name.endsWith('.py') || name.endsWith('.js') || name.endsWith('.bin')) return 'script';
  return 'file';
}

const isDirectory = (node: VFSNode) => node.type === 'directory' || node.type === 'mount-point';
const directChildIds = (node: VFSNode, nodes: Record<string, VFSNode>) =>
  [...new Set(node.childrenIds || [])].filter(childId => nodes[childId]?.parentId === node.id);

export const VFSTreeVisualizer: React.FC<VFSTreeVisualizerProps> = ({
  snapshot,
  activeNodeId,
  animatedPathIds = [],
  onSelectNode,
  isFullscreen = false,
}) => {
  const { nodes, rootId, currentDirId } = snapshot;
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(() => new Set());
  const [selectedGroup, setSelectedGroup] = useState<FHSCategoryGroup>('all');
  const [search, setSearch] = useState('');
  const root = nodes[rootId];
  const query = search.trim().toLocaleLowerCase();
  const selectedNode = activeNodeId && nodes[activeNodeId]
    ? nodes[activeNodeId]
    : nodes[currentDirId] || root;

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
      const hasMatchingChild = directChildIds(node, nodes).some(childId => visit(childId));
      const result = ownMatch || hasMatchingChild;
      visiting.delete(nodeId);
      cache.set(nodeId, result);
      return result;
    };
    if (root) visit(root.id);
    return cache;
  }, [nodes, query, root]);

  const isCollapsed = (nodeId: string) => !query && collapsedNodes.has(nodeId);

  const visibleChildIds = (node: VFSNode) => directChildIds(node, nodes).filter(childId => {
    const child = nodes[childId];
    if (!child || !matchingDescendant.get(childId)) return false;
    if (node.id === rootId && selectedGroup !== 'all' && groupForTopLevel(child.name) !== selectedGroup) return false;
    return true;
  });

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
      visibleChildIds(node).forEach(visit);
    };
    if (root) visit(root.id);
    return { directories, files, total: directories + files };
  // visibleChildIds is derived from the stable state above.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, matchingDescendant, selectedGroup, root, rootId]);

  const directoryIds = useMemo(() => Object.values(nodes).filter(isDirectory).map(node => node.id), [nodes]);
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
  const collapseAll = () => setCollapsedNodes(new Set(directoryIds.filter(id => id !== rootId)));

  const toggleCollapsed = (nodeId: string) => {
    setCollapsedNodes(previous => {
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
    const hasVisibleChildren = children.length > 0;
    const collapsed = isCollapsed(nodeId);
    const kind = nodeKind(node);
    const active = node.id === activeNodeId;
    const workingDirectory = node.id === currentDirId;
    const inOperationPath = animatedPathIds.includes(nodeId);
    const nextAncestors = new Set(ancestors).add(nodeId);
    const Icon = kind === 'directory'
      ? (collapsed ? Folder : FolderOpen)
      : kind === 'mount' ? HardDrive
      : kind === 'config' ? Sliders
      : kind === 'script' ? Terminal
      : FileText;

    return (
      <li
        key={nodeId}
        className={`linux-tree__branch ${isLast ? 'is-last' : ''} ${inOperationPath ? 'is-path' : ''}`}
      >
        {node.id !== rootId && (
          <span className="linux-tree__branch-symbol" aria-hidden="true">{isLast ? '└─' : '├─'}</span>
        )}
        <div className={`linux-tree__row-wrap ${workingDirectory || active ? 'has-path-hint' : ''}`}>
          <div className="linux-tree__entry">
            {isDirectory(node) && hasVisibleChildren ? (
              <button
                type="button"
                aria-label={collapsed ? `Expand ${node.name}` : `Collapse ${node.name}`}
                aria-expanded={!collapsed}
                className="linux-tree__toggle"
                onClick={event => { event.stopPropagation(); toggleCollapsed(node.id); }}
              >
                {collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
              </button>
            ) : <span className="linux-tree__toggle-placeholder" aria-hidden="true" />}
            <button
              type="button"
              onClick={() => onSelectNode?.(node.id)}
              aria-label={`Select ${getAbsolutePath(nodes, node.id)}`}
              aria-current={workingDirectory ? 'location' : undefined}
              aria-pressed={active || workingDirectory}
              className={`linux-tree__node ${inOperationPath ? 'is-operation-node' : ''} linux-node--${workingDirectory ? 'current' : active ? 'active' : inOperationPath ? 'path' : 'default'}`}
            >
              <span className={`linux-tree__icon kind-${kind}`}><Icon size={16} /></span>
              <span className="linux-tree__name" title={node.name}>{node.name}</span>
              <span className="linux-tree__type">{kind === 'directory' ? 'DIR' : kind === 'mount' ? 'MOUNT' : kind.toUpperCase()}</span>
              {isDirectory(node) && (
                <span className="linux-tree__children-count">{(node.childrenIds || []).length}</span>
              )}
              <span className="linux-tree__permissions" title={`${node.octalPermissions} · ${node.permissions}`} aria-label={`Permissions ${node.octalPermissions}, ${node.permissions}`}>{node.octalPermissions}</span>
              {workingDirectory && <span className="linux-tree__state is-pwd">PWD</span>}
              {!workingDirectory && active && <span className="linux-tree__state is-selected">FOCUS</span>}
              {inOperationPath && !active && !workingDirectory && <span className="linux-tree__state is-traversed">PATH</span>}
            </button>
          </div>
          <div className="linux-tree__path-hint">{getAbsolutePath(nodes, node.id)}</div>
        </div>

        {hasVisibleChildren && !collapsed && (
          <ul className="linux-tree__list">
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
          <span className="linux-vfs__heading-icon"><FolderTree size={19} /></span>
          <div>
            <h2>Filesystem tree</h2>
            <p>Each connector follows a real parent → child relationship in the current snapshot.</p>
          </div>
        </div>
        <div className="linux-vfs__summary" aria-live="polite">
          <span><strong>{visibleStats.total}</strong> nodes</span>
          <span><strong>{visibleStats.directories}</strong> folders</span>
          <span><strong>{visibleStats.files}</strong> files</span>
        </div>
      </header>

      <div className="linux-vfs__controls">
        <label className="linux-vfs__search">
          <Search size={15} aria-hidden="true" />
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Find a file or path" aria-label="Find a file or path" />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search">Clear</button>}
        </label>
        <label className="linux-vfs__filter">
          <Filter size={14} aria-hidden="true" />
          <span className="sr-only">Filter top-level directories</span>
          <select value={selectedGroup} onChange={event => setSelectedGroup(event.target.value as FHSCategoryGroup)}>
            {GROUPS.map(group => <option value={group.id} key={group.id}>{group.label}</option>)}
          </select>
        </label>
        <div className="linux-vfs__tree-actions">
          <button type="button" onClick={expandAll}>Expand all</button>
          <button type="button" onClick={collapseAll}>Collapse all</button>
        </div>
      </div>

      <div className={`linux-vfs__canvas ${isFullscreen ? 'is-fullscreen' : ''}`}>
        <div className="linux-vfs__context">
          <span className="linux-vfs__context-label">Working directory</span>
          <code>{getAbsolutePath(nodes, currentDirId)}</code>
          <span className="linux-vfs__legend"><i className="legend-parent" /> Parent/child link</span>
          <span className="linux-vfs__legend"><i className="legend-operation" /> Current operation path</span>
        </div>
        {unreachableCount > 0 && (
          <div className="linux-vfs__integrity-warning" role="status">
            {unreachableCount} disconnected {unreachableCount === 1 ? 'entry is' : 'entries are'} not drawn because its parent link does not point back to it.
          </div>
        )}
        {visibleStats.total === 0 ? (
          <div className="linux-vfs__no-results">No paths match “{search}”. Clear the search to see the tree.</div>
        ) : (
          <ul className="linux-tree__root-list">{renderNode(rootId, true)}</ul>
        )}
      </div>

      {selectedNode && (
        <footer className="linux-vfs__inspector" aria-live="polite">
          <span className="linux-vfs__inspector-icon"><ShieldCheck size={17} /></span>
          <div className="linux-vfs__inspector-main">
            <div className="linux-vfs__inspector-title">
              <strong>{getAbsolutePath(nodes, selectedNode.id)}</strong>
              <span className="linux-vfs__permissions">{selectedNode.octalPermissions} · {selectedNode.permissions}</span>
            </div>
            <div className="linux-vfs__inspector-meta">
              <span>{selectedNode.type}</span>
              <span>Owner {selectedNode.owner}:{selectedNode.group}</span>
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
