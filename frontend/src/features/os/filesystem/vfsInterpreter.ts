import {
  type VFSSnapshot, type VFSNode, type VFSProcess, getAbsolutePath, resolveNodeId,
  modeToSymbolic, applySymbolicMode, applyUmask, findTraversalPermissionFailure,
  getPermissionClass, hasVfsPermission, type VFSPermission,
} from './vfs';


export interface CommandExecutionResult {
  output: string;
  newSnapshot: VFSSnapshot;
  stepRecord: {
    command: string;
    diff: string;
    explanation: string;
    targetNodeId?: string;
    animatedPathIds?: string[];
    mutationType?: 'create' | 'delete' | 'move' | 'permission' | 'editor';
  };
  editorTrigger?: {
    type: 'nano' | 'vim';
    fileNodeId: string;
    filePath: string;
    initialContent: string;
    readOnly?: boolean;
  };
}

const isDirectoryNode = (node?: VFSNode) => node?.type === 'directory' || node?.type === 'mount-point';

function userBelongsToGroup(snapshot: VFSSnapshot, groupName: string): boolean {
  if (snapshot.currentGroup === groupName || snapshot.currentUser === 'root') return true;
  const groupFile = Object.values(snapshot.nodes).find((node) => node.name === 'group' && node.parentId === 'etc');
  const members = (groupFile?.content || '').split('\n')
    .find((entry) => entry.startsWith(`${groupName}:`))?.split(':')[3]?.split(',') || [];
  return members.includes(snapshot.currentUser);
}

function permissionDetail(snapshot: VFSSnapshot, node: VFSNode, permission: VFSPermission): string {
  const permissionClass = getPermissionClass(snapshot, node);
  const classStart = permissionClass === 'owner' ? 0 : permissionClass === 'group' ? 3 : 6;
  const triplet = node.permissions.slice(classStart, classStart + 3);
  const label = permission === 'execute' ? 'execute/search' : permission;
  return `${snapshot.currentUser} lacks ${label} access through the ${permissionClass} bits (${triplet}, mode ${node.octalPermissions}) on ${getAbsolutePath(snapshot.nodes, node.id)}`;
}

function permissionDenied(
  snapshot: VFSSnapshot,
  command: string,
  node: VFSNode,
  permission: VFSPermission,
  explanationPrefix = '',
): CommandExecutionResult {
  const detail = permissionDetail(snapshot, node, permission);
  const executable = command.trim().match(/^[^\s]+/)?.[0] || 'bash';
  return {
    output: `${executable}: ${getAbsolutePath(snapshot.nodes, node.id)}: Permission denied`,
    newSnapshot: snapshot,
    stepRecord: {
      command,
      diff: 'Permission denied',
      explanation: `${explanationPrefix}${detail}. Linux selects exactly one permission class for this user; it does not combine owner, group, and other bits.`,
      targetNodeId: node.id,
    },
  };
}

function pathTraversalFailure(snapshot: VFSSnapshot, nodeId: string, includeTarget = false): VFSNode | undefined {
  return findTraversalPermissionFailure(snapshot, nodeId, includeTarget);
}

function directoryWriteFailure(snapshot: VFSSnapshot, directory: VFSNode): VFSNode | undefined {
  const traversalFailure = pathTraversalFailure(snapshot, directory.id, true);
  if (traversalFailure) return traversalFailure;
  return hasVfsPermission(snapshot, directory, 'write') ? undefined : directory;
}

function findSubtreeAccessFailure(
  snapshot: VFSSnapshot,
  nodeId: string,
  readFiles: boolean,
  visited = new Set<string>(),
): { node: VFSNode; permission: VFSPermission } | undefined {
  if (visited.has(nodeId)) return undefined;
  visited.add(nodeId);
  const node = snapshot.nodes[nodeId];
  if (!node) return undefined;
  if (isDirectoryNode(node)) {
    if (!hasVfsPermission(snapshot, node, 'read')) return { node, permission: 'read' };
    if (!hasVfsPermission(snapshot, node, 'execute')) return { node, permission: 'execute' };
    for (const childId of node.childrenIds || []) {
      const failure = findSubtreeAccessFailure(snapshot, childId, readFiles, visited);
      if (failure) return failure;
    }
  } else if (readFiles && !hasVfsPermission(snapshot, node, 'read')) {
    return { node, permission: 'read' };
  }
  return undefined;
}

function findSubtreeRemovalFailure(
  snapshot: VFSSnapshot,
  nodeId: string,
  visited = new Set<string>(),
): { node: VFSNode; permission: VFSPermission } | undefined {
  if (visited.has(nodeId)) return undefined;
  visited.add(nodeId);
  const node = snapshot.nodes[nodeId];
  if (!node || !isDirectoryNode(node)) return undefined;
  for (const permission of ['read', 'execute', 'write'] as VFSPermission[]) {
    if (!hasVfsPermission(snapshot, node, permission)) return { node, permission };
  }
  for (const childId of node.childrenIds || []) {
    const child = snapshot.nodes[childId];
    if (node.stickyBit && child && snapshot.currentUser !== 'root' && child.owner !== snapshot.currentUser && node.owner !== snapshot.currentUser) {
      return { node: child, permission: 'write' };
    }
    const failure = findSubtreeRemovalFailure(snapshot, childId, visited);
    if (failure) return failure;
  }
  return undefined;
}

function makeNewFilePermissions(snapshot: VFSSnapshot) {
  return applyUmask('666', snapshot.umask);
}

function makeNewDirectoryPermissions(snapshot: VFSSnapshot) {
  return applyUmask('777', snapshot.umask);
}

function simulateLiteralEchoScript(content = ''): { output: string; skipped: string[] } {
  const output: string[] = [];
  const skipped: string[] = [];
  content.split('\n').forEach((rawLine, index) => {
    const scriptLine = rawLine.trim();
    if (!scriptLine || scriptLine.startsWith('#')) return;
    const echo = scriptLine.match(/^echo\s+(?:"([^"]*)"|'([^']*)'|(.*))$/);
    if (echo) output.push(echo[1] ?? echo[2] ?? echo[3] ?? '');
    else skipped.push(`line ${index + 1}`);
  });
  return { output: output.join('\n'), skipped };
}

function uniqueNodeId(prefix: string, nodes: Record<string, VFSNode>): string {
  let id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  while (nodes[id]) id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return id;
}

function resolveParentAndName(
  nodes: Record<string, VFSNode>,
  currentDirId: string,
  rawPath: string,
): { parentId: string; name: string } | null {
  const path = rawPath.replace(/\/+$/, '') || (rawPath.startsWith('/') ? '/' : '');
  if (!path || path === '/' || path === '.' || path === '..') return null;
  const slash = path.lastIndexOf('/');
  const name = path.slice(slash + 1);
  if (!name || name === '.' || name === '..') return null;
  const parentPath = slash < 0 ? '.' : path.startsWith('/') ? (slash === 0 ? '/' : path.slice(0, slash)) : (path.slice(0, slash) || '.');
  const parentId = resolveNodeId(nodes, currentDirId, parentPath);
  if (!parentId || !isDirectoryNode(nodes[parentId])) return null;
  return { parentId, name };
}

function expandHomePath(nodes: Record<string, VFSNode>, currentDirId: string, path: string): string {
  if (!path.startsWith('~')) return path;
  const homeId = resolveNodeId(nodes, currentDirId, '~');
  if (!homeId) return path;
  return `${getAbsolutePath(nodes, homeId)}${path.slice(1)}`;
}

function isDescendantOrSelf(nodes: Record<string, VFSNode>, ancestorId: string, nodeId: string): boolean {
  let node: VFSNode | undefined = nodes[nodeId];
  while (node) {
    if (node.id === ancestorId) return true;
    node = node.parentId ? nodes[node.parentId] : undefined;
  }
  return false;
}

function hasConsistentSubtree(nodes: Record<string, VFSNode>, nodeId: string, visited = new Set<string>()): boolean {
  if (visited.has(nodeId)) return false;
  const node = nodes[nodeId];
  if (!node) return false;
  visited.add(nodeId);
  for (const childId of node.childrenIds || []) {
    if (nodes[childId]?.parentId !== nodeId || !hasConsistentSubtree(nodes, childId, visited)) return false;
  }
  return true;
}

function removeSubtree(nodes: Record<string, VFSNode>, nodeId: string, visited = new Set<string>()): void {
  if (visited.has(nodeId)) return;
  visited.add(nodeId);
  const node = nodes[nodeId];
  if (!node) return;
  for (const childId of [...(node.childrenIds || [])]) removeSubtree(nodes, childId, visited);
  delete nodes[nodeId];
}

function parseShellWords(line: string): { words: string[]; error?: string } {
  const words: string[] = [];
  let word = '';
  let quote: "'" | '"' | null = null;
  let escaped = false;
  let started = false;

  for (const char of line) {
    if (escaped) {
      word += char;
      escaped = false;
      started = true;
      continue;
    }
    if (char === '\\' && quote !== "'") {
      escaped = true;
      started = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else word += char;
      started = true;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      started = true;
    } else if (/\s/.test(char)) {
      if (started) words.push(word);
      word = '';
      started = false;
    } else {
      word += char;
      started = true;
    }
  }

  if (escaped) word += '\\';
  if (quote) return { words: [], error: 'unexpected end of command while looking for a matching quote' };
  if (started) words.push(word);
  return { words };
}

function processTable(processes: VFSProcess[], columns?: string[]): string {
  const rows = processes.map((process) => ({
    pid: String(process.pid),
    ppid: String(process.ppid),
    user: process.user,
    ni: String(process.nice),
    stat: process.state,
    comm: process.command,
    args: process.args,
  }));
  const selected = columns?.length ? columns : ['pid', 'user', 'ni', 'stat', 'comm'];
  const widths = selected.map((column) => Math.max(column.toUpperCase().length, ...rows.map((row) => row[column as keyof typeof row].length)));
  const header = selected.map((column, index) => column.toUpperCase().padEnd(widths[index])).join('  ');
  const separator = widths.map((width) => '-'.repeat(width)).join('  ');
  const body = rows.map((row) => selected.map((column, index) => row[column as keyof typeof row].padEnd(widths[index])).join('  '));
  return [header, separator, ...body].join('\n');
}

/**
 * Main VFS Command Interpreter Engine
 */
export function executeVFSCommand(
  snapshot: VFSSnapshot,
  rawCommandLine: string
): CommandExecutionResult {
  const line = rawCommandLine.trim();
  if (!line) {
    return {
      output: '',
      newSnapshot: snapshot,
      stepRecord: {
        command: line,
        diff: 'No operation',
        explanation: 'Empty command entered.',
      },
    };
  }

  // Parse shell quoting and escaped spaces without evaluating substitutions,
  // pipelines, or host commands. This is a deterministic virtual shell.
  const parsed = parseShellWords(line);
  if (parsed.error) {
    return {
      output: `bash: ${parsed.error}`,
      newSnapshot: snapshot,
      stepRecord: { command: line, diff: 'Command syntax error', explanation: parsed.error },
    };
  }
  const [cmd, ...args] = parsed.words;

  if (cmd === 'sudo') {
    const nestedArgs = args.filter((arg) => arg !== '--');
    const nestedCommand = nestedArgs[0];
    if (!nestedCommand) {
      return { output: 'usage: sudo <chmod|chown|chgrp|stat|ls|cat> ...', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: 'In this learning simulator, sudo elevates one supported permissions or inspection command for the current command only.' } };
    }
    if (!userBelongsToGroup(snapshot, 'sudo')) {
      return { output: `sudo: ${snapshot.currentUser} is not allowed to run commands as root`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Permission denied', explanation: 'The virtual account is not in the sudo group, so the simulator refuses privilege elevation.' } };
    }
    if (!['chmod', 'chown', 'chgrp', 'stat', 'ls', 'cat'].includes(nestedCommand)) {
      return { output: `sudo: command '${nestedCommand}' is outside the simulator's limited elevation set`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Unsupported sudo command', explanation: 'For safety, this virtual environment allows sudo only for chmod, chown, chgrp, stat, ls, and cat.' } };
    }
    const quote = (word: string) => /\s|["'\\]/.test(word) ? `'${word.replace(/'/g, "'\\''")}'` : word;
    const elevatedSnapshot: VFSSnapshot = { ...snapshot, currentUser: 'root', currentGroup: 'root' };
    const nestedResult = executeVFSCommand(elevatedSnapshot, nestedArgs.map(quote).join(' '));
    const restoredSnapshot = { ...nestedResult.newSnapshot, currentUser: snapshot.currentUser, currentGroup: snapshot.currentGroup };
    return {
      ...nestedResult,
      newSnapshot: restoredSnapshot,
      stepRecord: {
        ...nestedResult.stepRecord,
        command: line,
        diff: `sudo elevation: ${nestedResult.stepRecord.diff}`,
        explanation: `The sudo group allowed one command to run with simulated root privileges. The effective identity is restored to ${snapshot.currentUser} immediately afterward. ${nestedResult.stepRecord.explanation}`,
      },
    };
  }

  // Deep clone current snapshot for mutation safety
  const nextSnapshot: VFSSnapshot = JSON.parse(JSON.stringify(snapshot));
  const nodes = nextSnapshot.nodes;

  const currentDir = nodes[nextSnapshot.currentDirId];
  const currentPath = getAbsolutePath(nodes, nextSnapshot.currentDirId);

  // --- 1. pwd ---
  if (cmd === 'pwd') {
    return {
      output: currentPath,
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: 'Read-only path query',
        explanation: `Print Working Directory printed the absolute path "${currentPath}".`,
        targetNodeId: nextSnapshot.currentDirId,
      },
    };
  }

  // --- 2. cd ---
  if (cmd === 'cd') {
    const cdArgs = args[0] === '--' ? args.slice(1) : args.filter((arg) => arg !== '-L' && arg !== '-P');
    const targetArg = cdArgs[0] || '~';
    let targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, targetArg);

    if (targetArg === '-') {
      // Toggle previous directory if env set
      const prev = nextSnapshot.envVars.OLDPWD;
      if (prev) {
        targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, prev);
      }
    }

    if (!targetId || !nodes[targetId]) {
      return {
        output: `bash: cd: ${targetArg}: No such file or directory`,
        newSnapshot: snapshot,
        stepRecord: {
          command: line,
          diff: 'Failed directory change',
          explanation: `Directory "${targetArg}" does not exist.`,
        },
      };
    }

    const targetNode = nodes[targetId];
    if (targetNode.type !== 'directory' && targetNode.type !== 'mount-point') {
      return {
        output: `bash: cd: ${targetArg}: Not a directory`,
        newSnapshot: snapshot,
        stepRecord: {
          command: line,
          diff: 'Failed directory change',
          explanation: `"${targetArg}" is a file, not a directory.`,
        },
      };
    }

    const blockedDirectory = pathTraversalFailure(nextSnapshot, targetId, true);
    if (blockedDirectory) {
      return permissionDenied(snapshot, line, blockedDirectory, 'execute', 'A directory needs execute permission to be entered; execute here means search/traverse the directory entries. ');
    }

    // Trace the actual route: walk from the current directory to the lowest
    // common ancestor, then down the destination branch.
    const currentAncestors: string[] = [];
    let currentCursor: VFSNode | undefined = currentDir;
    while (currentCursor) {
      currentAncestors.push(currentCursor.id);
      currentCursor = currentCursor.parentId ? nodes[currentCursor.parentId] : undefined;
    }
    const targetAncestors: string[] = [];
    let targetCursor: VFSNode | undefined = targetNode;
    while (targetCursor) {
      targetAncestors.push(targetCursor.id);
      targetCursor = targetCursor.parentId ? nodes[targetCursor.parentId] : undefined;
    }
    const commonAncestor = currentAncestors.find(id => targetAncestors.includes(id));
    const traceIds = commonAncestor
      ? [
          ...currentAncestors.slice(0, currentAncestors.indexOf(commonAncestor) + 1),
          ...targetAncestors.slice(0, targetAncestors.indexOf(commonAncestor)).reverse(),
        ]
      : [targetNode.id];

    nextSnapshot.envVars.OLDPWD = currentPath;
    nextSnapshot.currentDirId = targetId;
    const newPath = getAbsolutePath(nodes, targetId);
    nextSnapshot.envVars.PWD = newPath;

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `PWD changed: ${currentPath} -> ${newPath}`,
        explanation: `Changed active working directory to "${newPath}". The highlighted route follows real parent links from the previous directory to the destination.`,
        targetNodeId: targetId,
        animatedPathIds: traceIds,
      },
    };
  }

  // --- 3. ls ---
  if (cmd === 'ls') {
    const flags = new Set<string>();
    const pathArgs: string[] = [];
    let optionsEnded = false;
    for (const arg of args) {
      if (!optionsEnded && arg === '--') { optionsEnded = true; continue; }
      if (!optionsEnded && arg.startsWith('--')) {
        const longFlag: Record<string, string> = {
          '--all': 'a', '--almost-all': 'A', '--human-readable': 'h', '--recursive': 'R', '--directory': 'd', '--long': 'l',
        };
        if (!longFlag[arg]) {
          return { output: `ls: unrecognized option '${arg}'`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Unsupported ls option', explanation: `The virtual ls supports -a/--all, -A/--almost-all, -l/--long, -h/--human-readable, -R/--recursive, and -d/--directory.` } };
        }
        flags.add(longFlag[arg]);
      } else if (!optionsEnded && arg.startsWith('-') && arg.length > 1) {
        const shortFlags = arg.slice(1);
        if ([...shortFlags].some((flag) => !'laAhRd'.includes(flag))) {
          const invalid = [...shortFlags].find((flag) => !'laAhRd'.includes(flag));
          return { output: `ls: invalid option -- '${invalid}'`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Unsupported ls option', explanation: `The virtual ls supports -a, -A, -l, -h, -R, and -d.` } };
        }
        [...shortFlags].forEach((flag) => flags.add(flag));
      } else {
        pathArgs.push(arg);
      }
    }
    const showLong = flags.has('l');
    const showAll = flags.has('a') || flags.has('A');
    const humanReadable = flags.has('h');
    const recursive = flags.has('R');
    const listDirectory = flags.has('d');
    const pathArg = pathArgs[0] || '.';
    if (pathArgs.length > 1) {
      return { output: 'ls: this learning shell accepts one path at a time', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Unsupported ls operands', explanation: 'List each path with a separate command in this virtual terminal.' } };
    }

    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, pathArg);
    if (!targetId || !nodes[targetId]) {
      return {
        output: `ls: cannot access '${pathArg}': No such file or directory`,
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'Failed listing', explanation: `Path "${pathArg}" not found.` },
      };
    }

    const targetNode = nodes[targetId];
    const blockedPath = pathTraversalFailure(nextSnapshot, targetId, isDirectoryNode(targetNode) && !listDirectory);
    if (blockedPath) {
      return permissionDenied(snapshot, line, blockedPath, 'execute', 'Linux must traverse every directory in the path before ls can reach the requested entry. ');
    }
    if (isDirectoryNode(targetNode) && !listDirectory && !hasVfsPermission(nextSnapshot, targetNode, 'read')) {
      return permissionDenied(snapshot, line, targetNode, 'read', 'Listing a directory requires read permission to enumerate its names. Execute permission is separately needed to traverse to known entries. ');
    }
    if (recursive && isDirectoryNode(targetNode) && !listDirectory) {
      const inaccessible = findSubtreeAccessFailure(nextSnapshot, targetId, false);
      if (inaccessible) return permissionDenied(snapshot, line, inaccessible.node, inaccessible.permission, 'Recursive listing reached a directory that the current user cannot enumerate or traverse. ');
    }
    const childIds = isDirectoryNode(targetNode) && !listDirectory ? (targetNode.childrenIds || []) : [targetNode.id];
    let childNodes = childIds.map(id => nodes[id]).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));

    if (!showAll) {
      childNodes = childNodes.filter(n => !n.name.startsWith('.'));
    }

    const formatNode = (node: VFSNode) => {
      if (!showLong) return node.name;
      const typeChar = node.type === 'directory' ? 'd' : node.type === 'symlink' ? 'l' : '-';
      const size = node.type === 'directory' ? 4096 : (node.content?.length || 0);
      const displaySize = humanReadable && size >= 1024 ? `${(size / 1024).toFixed(1)}K` : String(size);
      return `${typeChar}${node.permissions} 1 ${node.owner} ${node.group} ${displaySize.padStart(6, ' ')} ${node.modifiedAt} ${node.name}${node.type === 'directory' ? '/' : ''}`;
    };
    const lines: string[] = [];
    const visit = (directory: VFSNode, depth = 0, isRoot = false) => {
      const entries = isRoot ? childNodes : (directory.childrenIds || []).map((id) => nodes[id]).filter((node): node is VFSNode => Boolean(node)).sort((a, b) => a.name.localeCompare(b.name)).filter((node) => showAll || !node.name.startsWith('.'));
      if (recursive) lines.push(`${directory === targetNode ? pathArg : getAbsolutePath(nodes, directory.id)}:`);
      if (showLong && isDirectoryNode(directory) && !listDirectory) lines.push(`total ${entries.length * 4}`);
      lines.push(...entries.map((node) => `${recursive && !showLong ? '  '.repeat(depth) : ''}${formatNode(node)}`));
      if (recursive) entries.filter(isDirectoryNode).forEach((child) => visit(child, depth + 1));
    };
    if (recursive && isDirectoryNode(targetNode) && !listDirectory) visit(targetNode, 0, true);
    else {
      if (showLong && isDirectoryNode(targetNode) && !listDirectory) lines.push(`total ${childNodes.length * 4}`);
      lines.push(...childNodes.map(formatNode));
    }
    const outputStr = lines.join('\n');

    return {
      output: outputStr,
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Listed ${childNodes.length} entries`,
        explanation: `Listed "${targetNode.name}"${showAll ? ' including hidden entries' : ''}${showLong ? ' in long format' : ''}${recursive ? ' recursively' : ''}${humanReadable ? ' with human-readable sizes' : ''}.`,
        targetNodeId: targetId,
      },
    };
  }

  if (cmd === 'rmdir') {
    const directoryArg = args.find((arg) => !arg.startsWith('-'));
    if (!directoryArg) return { output: 'rmdir: missing operand', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: 'rmdir removes an empty directory. Supply one directory path.' } };
    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, directoryArg);
    if (!targetId || !nodes[targetId]) return { output: `rmdir: failed to remove '${directoryArg}': No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Directory not found', explanation: `No entry exists at ${directoryArg}.` } };
    const target = nodes[targetId];
    if (!isDirectoryNode(target)) return { output: `rmdir: failed to remove '${directoryArg}': Not a directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Not a directory', explanation: 'rmdir only removes directories.' } };
    if (targetId === nextSnapshot.rootId || targetId === nextSnapshot.currentDirId) return { output: `rmdir: failed to remove '${directoryArg}': Operation not permitted`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Protected directory', explanation: 'The root and current working directories cannot be removed.' } };
    if ((target.childrenIds || []).length) return { output: `rmdir: failed to remove '${directoryArg}': Directory not empty`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Directory not empty', explanation: 'rmdir only removes an empty directory; use rm -r for a non-empty subtree.' } };
    const parentId = target.parentId;
    const parent = parentId ? nodes[parentId] : undefined;
    const blockedParent = parent && directoryWriteFailure(nextSnapshot, parent);
    if (blockedParent) {
      const missing: VFSPermission = hasVfsPermission(nextSnapshot, blockedParent, 'execute') ? 'write' : 'execute';
      return permissionDenied(snapshot, line, blockedParent, missing, 'Removing a directory entry requires write and execute access on its parent. ');
    }
    if (parent?.stickyBit && nextSnapshot.currentUser !== 'root' && target.owner !== nextSnapshot.currentUser && parent.owner !== nextSnapshot.currentUser) {
      return { output: `rmdir: failed to remove '${directoryArg}': Operation not permitted`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Sticky-bit protection', explanation: `The parent directory has the sticky bit. Only ${target.owner}, ${parent.owner}, or root may remove this entry. The sticky bit protects each user's files in shared directories such as /tmp.`, targetNodeId: targetId } };
    }
    if (parentId && nodes[parentId]) nodes[parentId].childrenIds = (nodes[parentId].childrenIds || []).filter((id) => id !== targetId);
    const removedPath = getAbsolutePath(nodes, targetId);
    delete nodes[targetId];
    return { output: '', newSnapshot: nextSnapshot, stepRecord: { command: line, diff: `- Removed empty directory ${removedPath}`, explanation: `Detached the empty directory from its parent and removed it from the virtual filesystem.`, targetNodeId: parentId || undefined, mutationType: 'delete' } };
  }

  // --- 4. mkdir ---
  if (cmd === 'mkdir') {
    const createParents = args.some(arg => arg === '-p' || arg === '--parents');
    const dirPath = args.find(a => !a.startsWith('-'));
    if (!dirPath) {
      return {
        output: 'mkdir: missing operand',
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'Syntax error', explanation: 'mkdir requires a directory name argument.' },
      };
    }
    const now = new Date().toISOString().split('T')[0];
    const expandedDirPath = expandHomePath(nodes, nextSnapshot.currentDirId, dirPath);
    const segments = expandedDirPath.split('/').filter(Boolean);
    let parentId = expandedDirPath.startsWith('/') ? nextSnapshot.rootId : nextSnapshot.currentDirId;
    let lastCreatedId: string | undefined;
    let existingFinalId: string | undefined;
    const createdIds: string[] = [];

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      if (segment === '.') continue;
      if (segment === '..') {
        parentId = nodes[parentId]?.parentId || parentId;
        continue;
      }
      const parent = nodes[parentId];
      if (!isDirectoryNode(parent)) {
        return { output: `mkdir: cannot create directory '${dirPath}': parent is not a directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Invalid parent directory', explanation: `Cannot create ${dirPath}: ${getAbsolutePath(nodes, parentId)} is not a directory.` } };
      }
      const existingId = parent.childrenIds?.find(id => nodes[id]?.name === segment);
      if (existingId) {
        if (!isDirectoryNode(nodes[existingId])) {
          return { output: `mkdir: cannot create directory '${dirPath}': Not a directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Path component is not a directory', explanation: `The existing path component "${segment}" is not a directory.` } };
        }
        if (index === segments.length - 1 && !createParents) {
          return { output: `mkdir: cannot create directory '${dirPath}': File exists`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Directory already exists', explanation: `The directory entry "${segment}" already exists under ${getAbsolutePath(nodes, parentId)}.` } };
        }
        parentId = existingId;
        if (index === segments.length - 1) existingFinalId = existingId;
        continue;
      }
      if (!createParents && index < segments.length - 1) {
        return { output: `mkdir: cannot create directory '${dirPath}': No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Missing parent directory', explanation: `Use mkdir -p to create the missing parent directories in "${dirPath}".` } };
      }
      const failedParent = directoryWriteFailure(nextSnapshot, parent);
      if (failedParent) {
        const missing: VFSPermission = hasVfsPermission(nextSnapshot, failedParent, 'execute') ? 'write' : 'execute';
        return permissionDenied(snapshot, line, failedParent, missing, 'Creating a directory entry needs write and execute permission on its parent. ');
      }
      const newId = uniqueNodeId('dir', nodes);
      const newMode = makeNewDirectoryPermissions(nextSnapshot);
      nodes[newId] = {
        id: newId,
        name: segment,
        type: 'directory',
        parentId,
        childrenIds: [],
        owner: nextSnapshot.currentUser,
        group: nextSnapshot.currentGroup,
        permissions: newMode.symbolic,
        octalPermissions: newMode.octal,
        createdAt: now,
        modifiedAt: now,
      };
      parent.childrenIds = [...(parent.childrenIds || []), newId];
      parent.modifiedAt = now;
      parentId = newId;
      lastCreatedId = newId;
      createdIds.push(newId);
    }

    if (!lastCreatedId) {
      if (createParents && existingFinalId) {
        return { output: '', newSnapshot: nextSnapshot, stepRecord: { command: line, diff: `Directory already exists: ${getAbsolutePath(nodes, existingFinalId)}`, explanation: `mkdir -p leaves the existing directory and its contents unchanged.`, targetNodeId: existingFinalId } };
      }
      return { output: `mkdir: cannot create directory '${dirPath}': File exists`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Directory already exists', explanation: `The requested directory path "${dirPath}" already exists.` } };
    }
    const createdPath = getAbsolutePath(nodes, lastCreatedId);

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `+ Created ${createdIds.length} director${createdIds.length === 1 ? 'y' : 'ies'}: ${createdPath}`,
        explanation: `${createParents ? 'Created each missing path component' : 'Created the directory'} and linked every new node beneath its actual parent. Final path: ${createdPath}.`,
        targetNodeId: lastCreatedId,
        animatedPathIds: [nodes[lastCreatedId].parentId, ...createdIds].filter((id): id is string => Boolean(id)),
        mutationType: 'create',
      },
    };
  }

  // --- 5. touch ---
  if (cmd === 'touch') {
    const filePath = args.find(a => !a.startsWith('-'));
    if (!filePath) {
      return {
        output: 'touch: missing file operand',
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'Syntax error', explanation: 'touch requires a file name.' },
      };
    }
    const now = new Date().toISOString().split('T')[0];

    const existingId = resolveNodeId(nodes, nextSnapshot.currentDirId, filePath);
    if (existingId && nodes[existingId]) {
      const target = nodes[existingId];
      const blockedPath = pathTraversalFailure(nextSnapshot, existingId);
      if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'Path traversal requires execute/search permission on each parent directory. ');
      if (target.owner !== nextSnapshot.currentUser && !hasVfsPermission(nextSnapshot, target, 'write')) {
        return permissionDenied(snapshot, line, target, 'write', 'Updating an existing file timestamp requires ownership or write access in this simulator. ');
      }
      target.modifiedAt = now;
      return {
        output: '',
        newSnapshot: nextSnapshot,
        stepRecord: {
          command: line,
          diff: `Updated timestamp for ${filePath}`,
          explanation: `Updated the modification time of the existing entry at ${getAbsolutePath(nodes, existingId)}.`,
          targetNodeId: existingId,
        },
      };
    }
    const destination = resolveParentAndName(nodes, nextSnapshot.currentDirId, filePath);
    if (!destination) {
      return { output: `touch: cannot touch '${filePath}': No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Parent directory not found', explanation: `The parent directory for "${filePath}" does not exist. Create it first, then touch the file.` } };
    }
    const parent = nodes[destination.parentId];
    const failedParent = directoryWriteFailure(nextSnapshot, parent);
    if (failedParent) {
      const missing: VFSPermission = hasVfsPermission(nextSnapshot, failedParent, 'execute') ? 'write' : 'execute';
      return permissionDenied(snapshot, line, failedParent, missing, 'Creating a file needs write and execute permission on its parent directory. ');
    }
    const newId = uniqueNodeId('file', nodes);
    const newMode = makeNewFilePermissions(nextSnapshot);
    const newFileNode: VFSNode = {
      id: newId,
      name: destination.name,
      type: 'file',
      parentId: destination.parentId,
      owner: nextSnapshot.currentUser,
      group: nextSnapshot.currentGroup,
      permissions: newMode.symbolic,
      octalPermissions: newMode.octal,
      content: '',
      createdAt: now,
      modifiedAt: now,
    };

    nodes[newId] = newFileNode;
    parent.childrenIds = [...(parent.childrenIds || []), newId];
    parent.modifiedAt = now;
    const fileAbsolutePath = getAbsolutePath(nodes, newId);

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
          command: line,
          diff: `+ Created empty file: ${fileAbsolutePath} (${newMode.octal})`,
          explanation: `Created a new empty file with mode ${newMode.octal} after applying umask ${nextSnapshot.umask || '0022'}, then linked it to ${getAbsolutePath(nodes, destination.parentId)}.`,
          targetNodeId: newId,
          animatedPathIds: [destination.parentId, newId],
          mutationType: 'create',
        },
    };
  }

  // --- 6. cat ---
  if (cmd === 'cat') {
    const fileName = args[0];
    if (!fileName) {
      return { output: 'cat: missing operand', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: 'cat requires a file path.' } };
    }

    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, fileName);
    if (!targetId || !nodes[targetId]) {
      return { output: `cat: ${fileName}: No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'File not found', explanation: `File "${fileName}" does not exist.` } };
    }

    const targetNode = nodes[targetId];
    if (targetNode.type === 'directory') {
      return { output: `cat: ${fileName}: Is a directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Type error', explanation: `Cannot cat a directory.` } };
    }
    const blockedPath = pathTraversalFailure(nextSnapshot, targetId);
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'Linux must search each parent directory before it can read this file. ');
    if (!hasVfsPermission(nextSnapshot, targetNode, 'read')) {
      return permissionDenied(snapshot, line, targetNode, 'read', 'cat reads file contents, so the selected user class must include r. ');
    }

    return {
      output: targetNode.content || '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Read file content (${targetNode.content?.length || 0} bytes)`,
        explanation: `Printed contents of file "${fileName}".`,
        targetNodeId: targetId,
      },
    };
  }

  // --- 7. nano & vim ---
  if (cmd === 'nano' || cmd === 'vim') {
    const fileName = args[0];
    if (!fileName) {
      return { output: `${cmd}: missing filename argument`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: `${cmd} requires a filename.` } };
    }

    let targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, fileName);
    let initialContent = '';
    let readOnly = false;

    if (!targetId || !nodes[targetId]) {
      const destination = resolveParentAndName(nodes, nextSnapshot.currentDirId, fileName);
      if (!destination) {
        return { output: `${cmd}: ${fileName}: No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Editor path not found', explanation: `The parent directory for "${fileName}" does not exist. Create it first, then open the file.` } };
      }
      const parent = nodes[destination.parentId];
      const failedParent = directoryWriteFailure(nextSnapshot, parent);
      if (failedParent) {
        const missing: VFSPermission = hasVfsPermission(nextSnapshot, failedParent, 'execute') ? 'write' : 'execute';
        return permissionDenied(snapshot, line, failedParent, missing, 'Creating a new editor file needs write and execute permission on its parent directory. ');
      }
      const now = new Date().toISOString().split('T')[0];
      targetId = uniqueNodeId('file', nodes);
      const newMode = makeNewFilePermissions(nextSnapshot);
      const newFileNode: VFSNode = {
        id: targetId,
        name: destination.name,
        type: 'file',
        parentId: destination.parentId,
        owner: nextSnapshot.currentUser,
        group: nextSnapshot.currentGroup,
        permissions: newMode.symbolic,
        octalPermissions: newMode.octal,
        content: '',
        createdAt: now,
        modifiedAt: now,
      };
      nodes[targetId] = newFileNode;
      nodes[destination.parentId].childrenIds = [...(nodes[destination.parentId].childrenIds || []), targetId];
    } else {
      if (isDirectoryNode(nodes[targetId])) {
        return { output: `${cmd}: ${fileName}: Is a directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Editor target is a directory', explanation: 'Text editors open files; choose a file path instead of a directory.' } };
      }
      const blockedPath = pathTraversalFailure(nextSnapshot, targetId);
      if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'Linux must search every parent directory before opening this path. ');
      if (!hasVfsPermission(nextSnapshot, nodes[targetId], 'read')) return permissionDenied(snapshot, line, nodes[targetId], 'read', 'An editor needs read permission to load this file into its buffer. ');
      readOnly = !hasVfsPermission(nextSnapshot, nodes[targetId], 'write');
      initialContent = nodes[targetId].content || '';
    }

    return {
      output: `[Opened ${cmd.toUpperCase()} Editor for ${fileName}${readOnly ? ' in read-only mode; saving requires write permission' : ''}]`,
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Opened ${cmd} editor for ${fileName}${readOnly ? ' (read-only)' : ''}`,
        explanation: readOnly
          ? `Opened the readable file ${getAbsolutePath(nodes, targetId)} in a read-only save state. Linux editors can show the buffer without file write permission; edits cannot be committed until the owner/root grants w. The mode is ${nodes[targetId].octalPermissions} (${nodes[targetId].permissions}).`
          : `Launched interactive ${cmd} text editor modal. Written edits will mutate VFS node state.`,
        targetNodeId: targetId,
        mutationType: 'editor',
      },
      editorTrigger: {
        type: cmd as 'nano' | 'vim',
        fileNodeId: targetId,
        filePath: fileName,
        initialContent,
        readOnly,
      },
    };
  }

  // --- 8. useradd & adduser ---
  if (cmd === 'useradd' || cmd === 'adduser') {
    const username = args.find(a => !a.startsWith('-'));
    if (!username) {
      return { output: `${cmd}: missing username argument`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: 'useradd requires a username.' } };
    }

    const homeDirNode = nodes['home'];
    const now = new Date().toISOString().split('T')[0];
    const userHomeId = `userhome-${username}`;

    if (!nodes[userHomeId] && homeDirNode) {
      const newUserHome: VFSNode = {
        id: userHomeId,
        name: username,
        type: 'directory',
        parentId: 'home',
        childrenIds: [],
        owner: username,
        group: username,
        permissions: 'rwxr-xr-x',
        octalPermissions: '755',
        createdAt: now,
        modifiedAt: now,
      };
      nodes[userHomeId] = newUserHome;
      homeDirNode.childrenIds = [...(homeDirNode.childrenIds || []), userHomeId];
    }

    // Append to /etc/passwd
    const passwdNode = nodes['passwd-file'];
    if (passwdNode) {
      const uid = 1000 + Object.keys(nodes).length;
      passwdNode.content = (passwdNode.content || '') + `\n${username}:x:${uid}:${uid}:${username}:/home/${username}:/bin/bash`;
    }

    return {
      output: `User account '${username}' created and home directory '/home/${username}' initialized.`,
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `+ Created user ${username} & /home/${username}`,
        explanation: `Created new user account "${username}", created /home/${username} node, and appended record to /etc/passwd.`,
        targetNodeId: userHomeId,
        mutationType: 'create',
      },
    };
  }

  // --- 9. chmod ---
  if (cmd === 'chmod') {
    const modeArg = args[0];
    const fileArg = args[1];

    if (!modeArg || !fileArg) {
      return { output: 'chmod: missing operand', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: 'chmod mode file required.' } };
    }

    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, fileArg);
    if (!targetId || !nodes[targetId]) {
      return { output: `chmod: cannot access '${fileArg}': No such file`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'File not found', explanation: `File ${fileArg} not found.` } };
    }

    const targetNode = nodes[targetId];
    const blockedPath = pathTraversalFailure(nextSnapshot, targetId);
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'Linux must be able to traverse the path before chmod can reach its target. ');
    if (nextSnapshot.currentUser !== 'root' && nextSnapshot.currentUser !== targetNode.owner) {
      return { output: `chmod: changing permissions of '${fileArg}': Operation not permitted`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Permission denied', explanation: `chmod is governed by ownership: ${nextSnapshot.currentUser} is neither root nor the owner (${targetNode.owner}) of ${getAbsolutePath(nodes, targetId)}. File read/write bits do not grant permission to change its mode.`, targetNodeId: targetId } };
    }
    const perms = /^[0-7]{3,4}$/.test(modeArg) ? modeToSymbolic(modeArg) : applySymbolicMode(targetNode, modeArg);
    if (!perms) {
      return { output: `chmod: invalid mode: '${modeArg}'`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Invalid chmod mode', explanation: 'Use three or four octal digits (for example 640 or 4755) or common symbolic clauses such as u+x, go-w, or a=rw.' } };
    }
    const beforeMode = targetNode.octalPermissions;
    const beforeSymbolic = targetNode.permissions;
    targetNode.permissions = perms.symbolic;
    targetNode.octalPermissions = perms.octal;
    targetNode.stickyBit = perms.octal.length === 4 && (Number(perms.octal[0]) & 1) === 1;

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Permissions updated: ${fileArg} ${beforeMode} (${beforeSymbolic}) -> ${perms.octal} (${perms.symbolic})`,
        explanation: `chmod changed ${getAbsolutePath(nodes, targetId)} from ${beforeMode} (${beforeSymbolic}) to ${perms.octal} (${perms.symbolic}). The three octal digits map to owner, group, and other; each digit adds read=4, write=2, and execute=1. The operation changes access bits, not file ownership.`,
        targetNodeId: targetId,
        mutationType: 'permission',
      },
    };
  }

  // --- 10. chown & chgrp ---
  if (cmd === 'chown' || cmd === 'chgrp') {
    const ownerArg = args[0];
    const fileArg = args[1];

    if (!ownerArg || !fileArg) {
      return { output: `${cmd}: missing operand`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: `${cmd} requires owner and file arguments.` } };
    }

    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, fileArg);
    if (!targetId || !nodes[targetId]) {
      return { output: `${cmd}: cannot access '${fileArg}': No such file`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'File not found', explanation: `File ${fileArg} not found.` } };
    }

    const targetNode = nodes[targetId];
    const blockedPath = pathTraversalFailure(nextSnapshot, targetId);
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'Linux must traverse the path before an ownership command can reach its target. ');
    if (cmd === 'chown' && nextSnapshot.currentUser !== 'root') {
      return { output: `chown: changing ownership of '${fileArg}': Operation not permitted`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Permission denied', explanation: 'Changing a file owner requires root privileges in this simulator. Being the file owner or having write permission is not enough; use the restricted sudo chown command in this lab.', targetNodeId: targetId } };
    }
    if (cmd === 'chgrp' && nextSnapshot.currentUser !== 'root' && nextSnapshot.currentUser !== targetNode.owner) {
      return { output: `chgrp: changing group of '${fileArg}': Operation not permitted`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Permission denied', explanation: `A regular user can change a file's group only when they own it and belong to the destination group. ${nextSnapshot.currentUser} does not own ${getAbsolutePath(nodes, targetId)}.`, targetNodeId: targetId } };
    }
    const beforeOwnership = `${targetNode.owner}:${targetNode.group}`;
    if (cmd === 'chown') {
      if (ownerArg.includes(':')) {
        const [u, g] = ownerArg.split(':');
        const passwdFile = Object.values(nodes).find((node) => node.name === 'passwd' && node.parentId === 'etc');
        const groupFile = Object.values(nodes).find((node) => node.name === 'group' && node.parentId === 'etc');
        const knownUsers = (passwdFile?.content || '').split('\n').map((entry) => entry.split(':')[0]);
        const knownGroups = (groupFile?.content || '').split('\n').map((entry) => entry.split(':')[0]);
        if ((u && !knownUsers.includes(u)) || (g && !knownGroups.includes(g))) {
          return { output: `chown: invalid user or group: '${ownerArg}'`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Unknown owner or group', explanation: 'The virtual account or group must exist in /etc/passwd or /etc/group before ownership can be assigned.' } };
        }
        if (u) targetNode.owner = u;
        if (g) targetNode.group = g;
      } else {
        const passwdFile = Object.values(nodes).find((node) => node.name === 'passwd' && node.parentId === 'etc');
        const knownUsers = (passwdFile?.content || '').split('\n').map((entry) => entry.split(':')[0]);
        if (!knownUsers.includes(ownerArg)) return { output: `chown: invalid user: '${ownerArg}'`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Unknown owner', explanation: 'The user must exist in /etc/passwd before chown can assign the file to them.' } };
        targetNode.owner = ownerArg;
      }
    } else {
      const groupFile = Object.values(nodes).find((node) => node.name === 'group' && node.parentId === 'etc');
      const knownGroups = (groupFile?.content || '').split('\n').map((entry) => entry.split(':')[0]);
      if (!knownGroups.includes(ownerArg)) return { output: `chgrp: invalid group: '${ownerArg}'`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Unknown group', explanation: 'The destination group must exist in /etc/group before chgrp can assign it.' } };
      if (nextSnapshot.currentUser !== 'root' && !userBelongsToGroup(nextSnapshot, ownerArg)) {
        return { output: `chgrp: invalid group: '${ownerArg}'`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Permission denied', explanation: `The file owner must also belong to destination group ${ownerArg}. Inspect group membership with id or /etc/group.`, targetNodeId: targetId } };
      }
      targetNode.group = ownerArg;
    }

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Ownership updated: ${fileArg} ${beforeOwnership} -> ${targetNode.owner}:${targetNode.group}`,
        explanation: `Changed ownership of ${getAbsolutePath(nodes, targetId)} from ${beforeOwnership} to ${targetNode.owner}:${targetNode.group}. The permission string and mode remain ${targetNode.octalPermissions} (${targetNode.permissions}); changing ownership changes which permission class applies to a user.`,
        targetNodeId: targetId,
        mutationType: 'permission',
      },
    };
  }

  // --- 11. rm ---
  if (cmd === 'rm') {
    const recursive = args.some(arg => arg.startsWith('-') && arg.includes('r'));
    const force = args.some((arg) => arg.startsWith('-') && arg.includes('f'));
    const fileArg = args.find(a => !a.startsWith('-'));
    if (!fileArg) {
      return { output: 'rm: missing operand', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: 'rm requires a file path.' } };
    }

    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, fileArg);
    if (!targetId || !nodes[targetId]) {
      if (force) return { output: '', newSnapshot: nextSnapshot, stepRecord: { command: line, diff: 'Ignored missing path (-f)', explanation: `rm -f suppresses the missing-path error for "${fileArg}".` } };
      return { output: `rm: cannot remove '${fileArg}': No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'File not found', explanation: `File ${fileArg} not found.` } };
    }

    const targetNode = nodes[targetId];
    const parentId = targetNode.parentId;

    if (targetId === nextSnapshot.rootId) {
      return { output: `rm: cannot remove '${fileArg}': Operation not permitted`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Protected filesystem root', explanation: 'The root directory is the top of the virtual filesystem and cannot be removed.' } };
    }
    if (isDescendantOrSelf(nodes, targetId, nextSnapshot.currentDirId)) {
      return { output: `rm: cannot remove '${fileArg}': current working directory is inside this path`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Cannot remove current working directory', explanation: 'Change to a directory outside this subtree before removing it.' } };
    }
    if (isDirectoryNode(targetNode) && (targetNode.childrenIds?.length || 0) > 0 && !recursive) {
      return { output: `rm: cannot remove '${fileArg}': Is a directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Recursive flag required', explanation: `"${getAbsolutePath(nodes, targetId)}" contains children. Use rm -r to remove the directory and its descendants.` } };
    }

    const blockedPath = pathTraversalFailure(nextSnapshot, targetId);
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'Linux must traverse the target path before rm can reach the entry. ');
    const parent = parentId ? nodes[parentId] : undefined;
    const blockedParent = parent && directoryWriteFailure(nextSnapshot, parent);
    if (blockedParent) {
      const missing: VFSPermission = hasVfsPermission(nextSnapshot, blockedParent, 'execute') ? 'write' : 'execute';
      return permissionDenied(snapshot, line, blockedParent, missing, 'Removing a name from a directory requires write and execute access on its parent; write permission on the file alone does not control unlinking. ');
    }
    if (parent?.stickyBit && nextSnapshot.currentUser !== 'root' && targetNode.owner !== nextSnapshot.currentUser && parent.owner !== nextSnapshot.currentUser) {
      return { output: `rm: cannot remove '${fileArg}': Operation not permitted`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Sticky-bit protection', explanation: `The parent directory has the sticky bit. Only ${targetNode.owner}, ${parent.owner}, or root may remove this entry, even though the directory is writable.`, targetNodeId: targetId } };
    }
    if (recursive && isDirectoryNode(targetNode)) {
      const blockedDescendant = findSubtreeRemovalFailure(nextSnapshot, targetId);
      if (blockedDescendant) {
        const blockedParent = blockedDescendant.node.parentId ? nodes[blockedDescendant.node.parentId] : undefined;
        if (blockedParent?.stickyBit && nextSnapshot.currentUser !== 'root' && blockedDescendant.node.owner !== nextSnapshot.currentUser && blockedParent.owner !== nextSnapshot.currentUser) {
          return { output: `rm: cannot remove '${getAbsolutePath(nodes, blockedDescendant.node.id)}': Operation not permitted`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Sticky-bit protection', explanation: `A nested entry is protected by the sticky bit on ${getAbsolutePath(nodes, blockedParent.id)}. Only its owner, the directory owner, or root may remove it.`, targetNodeId: blockedDescendant.node.id } };
        }
        return permissionDenied(snapshot, line, blockedDescendant.node, blockedDescendant.permission, 'Recursive removal must enumerate each directory and remove its child entries; inspect the first inaccessible directory and grant only the required bit. ');
      }
    }

    if (parentId && nodes[parentId]) {
      nodes[parentId].childrenIds = nodes[parentId].childrenIds?.filter(id => id !== targetId);
      nodes[parentId].modifiedAt = new Date().toISOString().split('T')[0];
    }
    const removedPath = getAbsolutePath(nodes, targetId);
    removeSubtree(nodes, targetId);

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `- Removed subtree: ${removedPath}`,
        explanation: `Detached ${removedPath} from its parent and removed every descendant from the snapshot${recursive ? ' recursively' : ''}.`,
        targetNodeId: parentId || undefined,
        animatedPathIds: parentId ? [parentId] : [],
        mutationType: 'delete',
      },
    };
  }

  // --- 12. cp ---
  if (cmd === 'cp') {
    const isRecursive = args.includes('-r') || args.includes('-R');
    const pathArgs = args.filter(a => !a.startsWith('-'));

    if (pathArgs.length < 2) {
      return { output: 'cp: missing destination file operand', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: 'cp requires source and destination arguments.' } };
    }

    const [srcPath, dstPath] = pathArgs;
    const srcId = resolveNodeId(nodes, nextSnapshot.currentDirId, srcPath);

    if (!srcId || !nodes[srcId]) {
      return { output: `cp: cannot stat '${srcPath}': No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Source not found', explanation: `Source file ${srcPath} not found.` } };
    }

    const srcNode = nodes[srcId];
    const blockedSourcePath = pathTraversalFailure(nextSnapshot, srcId);
    if (blockedSourcePath) return permissionDenied(snapshot, line, blockedSourcePath, 'execute', 'Linux must traverse source parents before cp can reach the file. ');
    if (isDirectoryNode(srcNode)) {
      const inaccessible = findSubtreeAccessFailure(nextSnapshot, srcId, true);
      if (inaccessible) return permissionDenied(snapshot, line, inaccessible.node, inaccessible.permission, 'Recursive directory copying needs read and execute on each directory plus read permission on every copied file. ');
    } else if (!hasVfsPermission(nextSnapshot, srcNode, 'read')) {
      return permissionDenied(snapshot, line, srcNode, 'read', 'Copying a regular file requires reading its contents. ');
    }
    if (!hasConsistentSubtree(nodes, srcId)) {
      return { output: `cp: cannot copy '${srcPath}': inconsistent directory entries`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Source tree is inconsistent', explanation: 'A child link does not point back to its directory, so copying was stopped without changing the filesystem.' } };
    }
    if (srcNode.type === 'directory' && !isRecursive) {
      return { output: `cp: -r not specified; omitting directory '${srcPath}'`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Directory copy omitted', explanation: 'Use cp -r to recursively copy directories.' } };
    }

    const existingDestinationId = resolveNodeId(nodes, nextSnapshot.currentDirId, dstPath);
    let destinationParentId: string;
    let destinationName: string;
    if (existingDestinationId && isDirectoryNode(nodes[existingDestinationId])) {
      destinationParentId = existingDestinationId;
      destinationName = srcNode.name;
    } else {
      const destination = resolveParentAndName(nodes, nextSnapshot.currentDirId, dstPath);
      if (!destination) {
        return { output: `cp: cannot create '${dstPath}': No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Destination parent not found', explanation: `The destination parent for "${dstPath}" does not exist or is not a directory.` } };
      }
      destinationParentId = destination.parentId;
      destinationName = destination.name;
    }
    if (existingDestinationId === srcId || isDescendantOrSelf(nodes, srcId, destinationParentId)) {
      return { output: `cp: cannot copy '${srcPath}' into itself`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Invalid recursive destination', explanation: 'A directory cannot be copied into itself or one of its descendants.' } };
    }
    const destinationParent = nodes[destinationParentId];
    if (!destinationParent) {
      return { output: `cp: cannot create '${dstPath}': No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Destination parent not found', explanation: `Parent directory for "${dstPath}" no longer exists.` } };
    }
    const blockedDestination = directoryWriteFailure(nextSnapshot, destinationParent);
    if (blockedDestination) {
      const missing: VFSPermission = hasVfsPermission(nextSnapshot, blockedDestination, 'execute') ? 'write' : 'execute';
      return permissionDenied(snapshot, line, blockedDestination, missing, 'Copying creates a directory entry, which needs write and execute access on the destination parent. ');
    }
    const collisionId = destinationParent.childrenIds?.find(id => nodes[id]?.name === destinationName);
    if (collisionId) {
      return { output: `cp: cannot create '${dstPath}': File exists`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Destination already exists', explanation: `An entry named "${destinationName}" already exists in ${getAbsolutePath(nodes, destinationParentId)}.` } };
    }

    const now = new Date().toISOString().split('T')[0];
    const copySubtree = (sourceId: string, parentId: string, name: string): string => {
      const source = nodes[sourceId];
      const newId = uniqueNodeId(source.type === 'directory' ? 'dir' : 'file', nodes);
      const childIds: string[] = [];
      nodes[newId] = { ...JSON.parse(JSON.stringify(source)), id: newId, name, parentId, childrenIds: source.childrenIds ? childIds : undefined, createdAt: now, modifiedAt: now };
      for (const childId of source.childrenIds || []) {
        if (nodes[childId]) childIds.push(copySubtree(childId, newId, nodes[childId].name));
      }
      return newId;
    };
    const newId = copySubtree(srcId, destinationParentId, destinationName);
    destinationParent.childrenIds = [...(destinationParent.childrenIds || []), newId];
    destinationParent.modifiedAt = now;
    const copiedPath = getAbsolutePath(nodes, newId);

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `+ Copied ${srcPath} -> ${copiedPath}`,
        explanation: `Copied ${srcPath} to ${copiedPath}. Every copied descendant received a new node ID and a parent link inside the copied subtree.`,
        targetNodeId: newId,
        animatedPathIds: [destinationParentId, newId],
        mutationType: 'create',
      },
    };
  }

  // --- 13. mv ---
  if (cmd === 'mv') {
    if (args.length < 2) {
      return { output: 'mv: missing destination file operand', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: 'mv requires source and destination.' } };
    }

    const [srcPath, dstPath] = args;
    const srcId = resolveNodeId(nodes, nextSnapshot.currentDirId, srcPath);

    if (!srcId || !nodes[srcId]) {
      return { output: `mv: cannot stat '${srcPath}': No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Source not found', explanation: `Source ${srcPath} not found.` } };
    }

    const srcNode = nodes[srcId];
    const blockedSourcePath = pathTraversalFailure(nextSnapshot, srcId);
    if (blockedSourcePath) return permissionDenied(snapshot, line, blockedSourcePath, 'execute', 'Linux must traverse source parents before mv can reach the entry. ');
    if (!hasConsistentSubtree(nodes, srcId)) {
      return { output: `mv: cannot move '${srcPath}': inconsistent directory entries`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Source tree is inconsistent', explanation: 'A child link does not point back to its directory, so moving was stopped without changing the filesystem.' } };
    }
    const oldPath = getAbsolutePath(nodes, srcId);
    const destinationId = resolveNodeId(nodes, nextSnapshot.currentDirId, dstPath);
    let destinationParentId: string;
    let newName: string;
    if (destinationId && isDirectoryNode(nodes[destinationId])) {
      destinationParentId = destinationId;
      newName = srcNode.name;
    } else {
      const destination = resolveParentAndName(nodes, nextSnapshot.currentDirId, dstPath);
      if (!destination) {
        return { output: `mv: cannot move '${srcPath}' to '${dstPath}': No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Destination parent not found', explanation: `The destination parent for "${dstPath}" does not exist or is not a directory.` } };
      }
      destinationParentId = destination.parentId;
      newName = destination.name;
    }
    if (srcId === nextSnapshot.rootId || isDescendantOrSelf(nodes, srcId, destinationParentId)) {
      return { output: `mv: cannot move '${srcPath}' into itself`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Invalid move destination', explanation: 'The filesystem root cannot be moved, and a directory cannot be moved into itself or its descendants.' } };
    }
    const oldParentId = srcNode.parentId;
    const destinationParent = nodes[destinationParentId];
    const sourceParent = srcNode.parentId ? nodes[srcNode.parentId] : undefined;
    const blockedSourceParent = sourceParent ? directoryWriteFailure(nextSnapshot, sourceParent) : undefined;
    const blockedDestinationParent = destinationParent ? directoryWriteFailure(nextSnapshot, destinationParent) : undefined;
    const blockedMoveParent = blockedSourceParent || blockedDestinationParent;
    if (blockedMoveParent) {
      const missing: VFSPermission = hasVfsPermission(nextSnapshot, blockedMoveParent, 'execute') ? 'write' : 'execute';
      return permissionDenied(snapshot, line, blockedMoveParent, missing, 'Moving an entry needs write and execute access on both its old and new parent directories. ');
    }
    if (sourceParent?.stickyBit && nextSnapshot.currentUser !== 'root' && srcNode.owner !== nextSnapshot.currentUser && sourceParent.owner !== nextSnapshot.currentUser) {
      return { output: `mv: cannot move '${srcPath}': Operation not permitted`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Sticky-bit protection', explanation: `The source parent has the sticky bit. Only ${srcNode.owner}, ${sourceParent.owner}, or root may move this entry.`, targetNodeId: srcId } };
    }
    if (destinationParent?.stickyBit && nextSnapshot.currentUser !== 'root' && srcNode.owner !== nextSnapshot.currentUser && destinationParent.owner !== nextSnapshot.currentUser) {
      return { output: `mv: cannot move '${srcPath}': Operation not permitted`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Sticky-bit protection', explanation: `The destination parent has the sticky bit. Only ${srcNode.owner}, ${destinationParent.owner}, or root may create this entry there.`, targetNodeId: srcId } };
    }
    const collisionId = destinationParent?.childrenIds?.find(id => id !== srcId && nodes[id]?.name === newName);
    if (collisionId) {
      return { output: `mv: cannot move '${srcPath}' to '${dstPath}': File exists`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Destination already exists', explanation: `An entry named "${newName}" already exists in ${getAbsolutePath(nodes, destinationParentId)}.` } };
    }
    if (oldParentId && oldParentId !== destinationParentId) {
      nodes[oldParentId].childrenIds = nodes[oldParentId].childrenIds?.filter(id => id !== srcId);
      nodes[destinationParentId].childrenIds = [...(nodes[destinationParentId].childrenIds || []), srcId];
      nodes[oldParentId].modifiedAt = new Date().toISOString().split('T')[0];
      nodes[destinationParentId].modifiedAt = new Date().toISOString().split('T')[0];
    }
    srcNode.parentId = destinationParentId;
    srcNode.name = newName;
    srcNode.modifiedAt = new Date().toISOString().split('T')[0];
    const newPath = getAbsolutePath(nodes, srcId);

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Moved: ${oldPath} -> ${newPath}`,
        explanation: `Updated the entry name and parent-child links. The node now belongs to ${getAbsolutePath(nodes, destinationParentId)} at ${newPath}.`,
        targetNodeId: srcId,
        animatedPathIds: [oldParentId, destinationParentId, srcId].filter((id): id is string => Boolean(id)),
        mutationType: 'move',
      },
    };
  }

  // --- 14. echo ---
  if (cmd === 'echo') {
    const rawArgs = args.join(' ');
    // Check for redirection > or >>
    if (rawArgs.includes('>') || rawArgs.includes('>>')) {
      const isAppend = rawArgs.includes('>>');
      const partsSplit = rawArgs.split(isAppend ? '>>' : '>');
      const textToWrite = partsSplit[0].replace(/["']/g, '').trim();
      const targetFileName = partsSplit[1].trim();

      const existingId = currentDir.childrenIds?.find(id => nodes[id]?.name === targetFileName);
      const now = new Date().toISOString().split('T')[0];
      let targetId = existingId;

      if (!existingId || !nodes[existingId]) {
        const failedParent = directoryWriteFailure(nextSnapshot, currentDir);
        if (failedParent) {
          const missing: VFSPermission = hasVfsPermission(nextSnapshot, failedParent, 'execute') ? 'write' : 'execute';
          return permissionDenied(snapshot, line, failedParent, missing, 'Creating a file with redirection needs write and execute permission on the current directory. ');
        }
        targetId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const newMode = makeNewFilePermissions(nextSnapshot);
        const newFileNode: VFSNode = {
          id: targetId,
          name: targetFileName,
          type: 'file',
          parentId: currentDir.id,
          owner: nextSnapshot.currentUser,
          group: nextSnapshot.currentGroup,
          permissions: newMode.symbolic,
          octalPermissions: newMode.octal,
          content: textToWrite,
          createdAt: now,
          modifiedAt: now,
        };
        nodes[targetId] = newFileNode;
        currentDir.childrenIds = [...(currentDir.childrenIds || []), targetId];
      } else {
        const fileNode = nodes[existingId];
        if (!hasVfsPermission(nextSnapshot, fileNode, 'write')) {
          return permissionDenied(snapshot, line, fileNode, 'write', 'Shell redirection opens an existing file for writing; the selected user class must include w. ');
        }
        fileNode.content = isAppend ? `${fileNode.content || ''}\n${textToWrite}` : textToWrite;
        fileNode.modifiedAt = now;
      }

      return {
        output: '',
        newSnapshot: nextSnapshot,
        stepRecord: {
          command: line,
          diff: `${isAppend ? 'Appended' : 'Wrote'} text to ${targetFileName}`,
          explanation: `Stream redirection (${isAppend ? '>>' : '>'}) wrote "${textToWrite}" into file node "${targetFileName}".`,
          targetNodeId: targetId,
          mutationType: 'editor',
        },
      };
    }

    // Standard echo output
    let echoOutput = rawArgs.replace(/["']/g, '');
    if (echoOutput.startsWith('$')) {
      const varName = echoOutput.substring(1);
      echoOutput = nextSnapshot.envVars[varName] || '';
    }

    return {
      output: echoOutput,
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Echoed string to stdout`,
        explanation: `Printed string "${echoOutput}" to standard output stream.`,
        targetNodeId: nextSnapshot.currentDirId,
      },
    };
  }

  // --- 15. export ---
  if (cmd === 'export') {
    const expArg = args[0];
    if (!expArg) {
      const envLines = Object.entries(nextSnapshot.envVars).map(([k, v]) => `declare -x ${k}="${v}"`);
      return { output: envLines.join('\n'), newSnapshot: nextSnapshot, stepRecord: { command: line, diff: 'Exported env vars', explanation: 'Printed environment variables.' } };
    }

    if (expArg.includes('=')) {
      const [k, v] = expArg.split('=');
      const val = v.replace(/["']/g, '');
      nextSnapshot.envVars[k] = val;

      // Update ~/.bashrc content
      const bashrcNode = nodes['bashrc-file'];
      if (bashrcNode) {
        const blockedPath = pathTraversalFailure(nextSnapshot, bashrcNode.id);
        if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'Persisting a shell environment value must traverse the user home path. ');
        if (!hasVfsPermission(nextSnapshot, bashrcNode, 'write')) return permissionDenied(snapshot, line, bashrcNode, 'write', 'This simulator persists export values in ~/.bashrc, so it needs write permission on that file. ');
        bashrcNode.content = (bashrcNode.content || '') + `\nexport ${k}="${val}"`;
      }

      return {
        output: '',
        newSnapshot: nextSnapshot,
        stepRecord: {
          command: line,
          diff: `Environment variable set: ${k}=${val}`,
          explanation: `Exported environment variable ${k}="${val}" and appended export statement into ~/.bashrc file node.`,
          targetNodeId: 'bashrc-file',
          mutationType: 'editor',
        },
      };
    }
  }

  // --- 16. userdel & groupadd & groupdel & usermod ---
  if (cmd === 'userdel') {
    const targetUser = args.find(a => !a.startsWith('-'));
    if (targetUser) {
      if (targetUser === nextSnapshot.currentUser) {
        return { output: `userdel: user ${targetUser} is currently in use`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Active user cannot be deleted', explanation: 'This shell is running as the requested user, so the account cannot be removed during this session.' } };
      }
      const passwdNode = nodes['passwd-file'];
      if (passwdNode?.content) {
        passwdNode.content = passwdNode.content.split('\n').filter(entry => entry.split(':', 1)[0] !== targetUser).join('\n');
      }
      const groupNode = nodes['group-file'];
      if (groupNode?.content) {
        groupNode.content = groupNode.content.split('\n').map(entry => {
          const fields = entry.split(':');
          if (fields.length > 3) fields[3] = fields[3].split(',').filter(member => member !== targetUser).join(',');
          return fields.join(':');
        }).join('\n');
      }
      const userHomeNode = Object.values(nodes).find(n => n.name === targetUser && n.parentId === 'home');
      if (userHomeNode) {
        if (isDescendantOrSelf(nodes, userHomeNode.id, nextSnapshot.currentDirId)) {
          return { output: `userdel: user ${targetUser} is currently in use`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'User is active in this shell', explanation: 'The active user or current working directory cannot be removed from this simulated session.' } };
        }
        const homeNode = nodes['home'];
        if (homeNode) {
          homeNode.childrenIds = homeNode.childrenIds?.filter(id => id !== userHomeNode.id);
          homeNode.modifiedAt = new Date().toISOString().split('T')[0];
        }
        removeSubtree(nodes, userHomeNode.id);
        return {
          output: '',
          newSnapshot: nextSnapshot,
          stepRecord: {
            command: line,
            diff: `- Deleted user account ${targetUser} and /home/${targetUser}`,
            explanation: `Removed the home directory entry from /home and deleted its full descendant tree.`,
            targetNodeId: 'home',
            animatedPathIds: ['home'],
            mutationType: 'delete',
          },
        };
      }
      return {
        output: '',
        newSnapshot: nextSnapshot,
        stepRecord: {
          command: line,
          diff: `- Deleted user account ${targetUser}`,
          explanation: `Deleted user account "${targetUser}". No matching home-directory node existed in the VFS.`,
          mutationType: 'delete',
        },
      };
    }
  }

  if (cmd === 'groupadd') {
    const groupName = args[0];
    if (groupName) {
      const groupFile = nodes['group-file'];
      if (groupFile) {
        const gid = 1000 + Object.keys(nodes).length;
        groupFile.content = (groupFile.content || '') + `\n${groupName}:x:${gid}:`;
      }
      return {
        output: '',
        newSnapshot: nextSnapshot,
        stepRecord: {
          command: line,
          diff: `+ Added group ${groupName}`,
          explanation: `Created system group "${groupName}" and appended entry to /etc/group file node.`,
          targetNodeId: 'group-file',
          mutationType: 'editor',
        },
      };
    }
  }

  if (cmd === 'usermod' && args.includes('-aG')) {
    const grpIdx = args.indexOf('-aG') + 1;
    const group = args[grpIdx];
    const user = args[grpIdx + 1];
    if (group && user) {
      const groupFile = nodes['group-file'];
      if (groupFile && groupFile.content) {
        groupFile.content = groupFile.content.replace(
          new RegExp(`(${group}:x:\\d+:.*)`),
          `$1${user},`
        );
      }
      return {
        output: '',
        newSnapshot: nextSnapshot,
        stepRecord: {
          command: line,
          diff: `Added user ${user} to group ${group}`,
          explanation: `Appended user "${user}" to group "${group}" record in /etc/group.`,
          targetNodeId: 'group-file',
          mutationType: 'permission',
        },
      };
    }
  }

  // --- 17. whoami & who & id ---
  if (cmd === 'umask') {
    const requestedMask = args.find((arg) => !arg.startsWith('-'));
    if (requestedMask && !/^[0-7]{3,4}$/.test(requestedMask)) {
      return { output: `umask: '${requestedMask}' is not a valid octal mask`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Invalid umask', explanation: 'A umask is three or four octal digits from 000 to 7777. For example, 027 removes group write and all permissions for others from newly created entries.' } };
    }
    const previousMask = nextSnapshot.umask || '0022';
    if (requestedMask) nextSnapshot.umask = requestedMask.padStart(4, '0');
    const currentMask = nextSnapshot.umask || '0022';
    if (args.includes('-S')) {
      const mask = Number.parseInt(currentMask.slice(-3), 8);
      const allowed = 0o777 & ~mask;
      const triplet = (shift: number) => {
        const bits = (allowed >> shift) & 7;
        return `${bits & 4 ? 'r' : '-'}${bits & 2 ? 'w' : '-'}${bits & 1 ? 'x' : '-'}`;
      };
      return { output: `u=${triplet(6)},g=${triplet(3)},o=${triplet(0)}`, newSnapshot: nextSnapshot, stepRecord: { command: line, diff: `Displayed symbolic umask ${currentMask}`, explanation: `The symbolic umask view shows which permissions remain allowed on a new directory after the mask is applied. For regular files, Linux starts from 666 (no execute bit by default); for directories, it starts from 777. Current mask: ${currentMask}.` } };
    }
    return {
      output: currentMask,
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: requestedMask ? `Default creation mask: ${previousMask} -> ${currentMask}` : `Read default creation mask: ${previousMask}`,
        explanation: requestedMask
          ? `Set the shell's umask from ${previousMask} to ${currentMask}. The mask removes bits from future creations; it does not change existing entries. With ${currentMask}, a new regular file starts at 666 masked to ${makeNewFilePermissions(nextSnapshot).octal}, and a directory starts at 777 masked to ${makeNewDirectoryPermissions(nextSnapshot).octal}.`
          : `Displayed the current mask ${previousMask}. A mask removes permissions from creation defaults: files start from 666 and directories from 777. Inspect it with umask, then create a fresh practice file to see the effect.`,
      },
    };
  }

  if (cmd === 'stat') {
    const pathArg = args.find((arg) => !arg.startsWith('-'));
    if (!pathArg) return { output: 'stat: missing operand', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: 'stat requires a path. In this simulator, stat prints file type, mode, owner, group, and timestamps.' } };
    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, pathArg);
    if (!targetId || !nodes[targetId]) return { output: `stat: cannot stat '${pathArg}': No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'File not found', explanation: `No filesystem entry exists at ${pathArg}.` } };
    const blockedPath = pathTraversalFailure(nextSnapshot, targetId);
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'Metadata inspection still needs search permission on each parent directory. ');
    const target = nodes[targetId];
    const size = target.type === 'directory' ? 4096 : (target.content || '').length;
    return {
      output: `  File: ${getAbsolutePath(nodes, targetId)}\n  Type: ${target.type}\n  Size: ${size} bytes\n  Access: (${target.octalPermissions}/${target.permissions})\n  Owner: ${target.owner}\n  Group: ${target.group}\n  Modified: ${target.modifiedAt}`,
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: `Inspected ${target.owner}:${target.group} ${target.octalPermissions} (${target.permissions})`, explanation: `stat reports metadata without reading file contents. Read the mode as three permission classes in owner/group/other order; its numeric digits add r=4, w=2, x=1.`, targetNodeId: targetId },
    };
  }

  if (cmd === 'bash' || cmd === 'sh') {
    const fileArg = args.find((arg) => !arg.startsWith('-'));
    if (!fileArg) return { output: `${cmd}: missing script operand`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: `${cmd} needs a script path. The shell reads a script, so the file needs read permission; it does not need its own execute bit for this form.` } };
    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, fileArg);
    if (!targetId || !nodes[targetId]) return { output: `${cmd}: ${fileArg}: No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Script not found', explanation: `No file exists at ${fileArg}.` } };
    const target = nodes[targetId];
    if (isDirectoryNode(target)) return { output: `${cmd}: ${fileArg}: Is a directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Not a script file', explanation: `${cmd} expects a readable script file.` } };
    const blockedPath = pathTraversalFailure(nextSnapshot, targetId);
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'The shell must traverse parent directories to open the script path. ');
    if (!hasVfsPermission(nextSnapshot, target, 'read')) return permissionDenied(snapshot, line, target, 'read', `With ${cmd} script.sh, the shell interpreter reads the file as data; the script's own execute bit is not required. `);
    const simulated = simulateLiteralEchoScript(target.content);
    return {
      output: [simulated.output, simulated.skipped.length ? `Skipped unsupported script statements (${simulated.skipped.join(', ')}); only literal echo lines run in this learning simulator.` : ''].filter(Boolean).join('\n'),
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: `Read script via ${cmd} without requiring its execute bit`, explanation: `${cmd} reads ${getAbsolutePath(nodes, targetId)} using the shell's own execute permission. This differs from ./script.sh, where the kernel checks the file's execute bit before launching its interpreter. Only literal echo statements are simulated; arbitrary script commands never run on the host.`, targetNodeId: targetId },
    };
  }

  if (cmd === 'whoami') {
    return {
      output: nextSnapshot.currentUser,
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: 'Identity query', explanation: `Prints effective user name: ${nextSnapshot.currentUser}.` },
    };
  }

  if (cmd === 'id') {
    const groups = new Set([nextSnapshot.currentGroup]);
    const groupFile = nodes['group-file'];
    (groupFile?.content || '').split('\n').forEach((entry) => {
      const [name, , , memberList = ''] = entry.split(':');
      if (memberList.split(',').includes(nextSnapshot.currentUser)) groups.add(name);
    });
    return {
      output: `uid=1000(${nextSnapshot.currentUser}) gid=1000(${nextSnapshot.currentGroup}) groups=${[...groups].map((group, index) => `${index ? 27 : 1000}(${group})`).join(',')}`,
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: 'ID query', explanation: `Prints the active UID, primary GID, and supplementary groups. Group membership matters because Linux checks group permission bits when the file's group is one of these groups.` },
    };
  }

  if (cmd === 'who') {
    return {
      output: `${nextSnapshot.currentUser}  tty7         2026-09-05 07:30 (:0)`,
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: 'Session query', explanation: 'Displays active shell user sessions.' },
    };
  }

  // --- 18. find ---
  if (cmd === 'find') {
    let startPath = '.';
    let namePattern: string | null = null;
    let typeFilter: 'f' | 'd' | null = null;

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-name' && args[i + 1]) {
        namePattern = args[i + 1].replace(/['"]/g, '');
        i++;
      } else if (args[i] === '-type' && args[i + 1]) {
        const t = args[i + 1].toLowerCase();
        if (t === 'f' || t === 'file') typeFilter = 'f';
        if (t === 'd' || t === 'directory') typeFilter = 'd';
        i++;
      } else if (!args[i].startsWith('-') && i === 0) {
        startPath = args[i];
      }
    }

    const startId = resolveNodeId(nodes, nextSnapshot.currentDirId, startPath);
    if (!startId || !nodes[startId]) {
      return {
        output: `find: '${startPath}': No such file or directory`,
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'Find failed', explanation: `Path "${startPath}" does not exist in VFS.` },
      };
    }
    const blockedPath = pathTraversalFailure(nextSnapshot, startId, isDirectoryNode(nodes[startId]));
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'find must search through each directory on the requested path. ');
    if (isDirectoryNode(nodes[startId])) {
      const inaccessible = findSubtreeAccessFailure(nextSnapshot, startId, false);
      if (inaccessible) return permissionDenied(snapshot, line, inaccessible.node, inaccessible.permission, 'find cannot enumerate this part of the tree without directory read and execute/search access. ');
    }

    // Helper to collect paths recursively
    const collectPaths = (nodeId: string, currentRelPath: string): string[] => {
      const node = nodes[nodeId];
      if (!node) return [];
      const results: string[] = [];

      let matchesName = true;
      if (namePattern) {
        const regexStr = '^' + namePattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.') + '$';
        matchesName = new RegExp(regexStr, 'i').test(node.name);
      }

      let matchesType = true;
      if (typeFilter === 'f' && node.type === 'directory') matchesType = false;
      if (typeFilter === 'd' && node.type !== 'directory') matchesType = false;

      if (matchesName && matchesType) {
        results.push(currentRelPath);
      }

      if (node.type === 'directory' && node.childrenIds) {
        for (const childId of node.childrenIds) {
          const child = nodes[childId];
          if (child) {
            const childRel = currentRelPath === '.' ? `./${child.name}` : `${currentRelPath}/${child.name}`;
            results.push(...collectPaths(childId, childRel));
          }
        }
      }
      return results;
    };

    const matches = collectPaths(startId, startPath);
    return {
      output: matches.join('\n') || '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Find matched ${matches.length} VFS items`,
        explanation: `Traversed tree starting at "${startPath}" filtering by ${namePattern ? `name "${namePattern}"` : 'all names'} ${typeFilter ? `type ${typeFilter}` : ''}.`,
        targetNodeId: startId,
      },
    };
  }

  // --- 19. grep ---
  if (cmd === 'grep') {
    const isIgnoreCase = args.includes('-i');
    const showLineNums = args.includes('-n');
    const countOnly = args.includes('-c');

    const cleanArgs = args.filter(a => !a.startsWith('-'));
    const pattern = cleanArgs[0] || '';
    const fileArg = cleanArgs[1] || 'welcome.txt';

    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, fileArg);
    const targetNode = targetId ? nodes[targetId] : undefined;

    if (!targetNode || targetNode.type === 'directory') {
      return {
        output: `grep: ${fileArg}: ${!targetNode ? 'No such file' : 'Is a directory'}`,
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'Grep error', explanation: `Cannot grep "${fileArg}".` },
      };
    }
    const blockedPath = pathTraversalFailure(nextSnapshot, targetId!);
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'grep must traverse parent directories before opening the file. ');
    if (!hasVfsPermission(nextSnapshot, targetNode, 'read')) return permissionDenied(snapshot, line, targetNode, 'read', 'grep reads file contents, so the selected class needs r. ');

    const fileLines = (targetNode.content || '').split('\n');
    const matched: string[] = [];

    fileLines.forEach((l, idx) => {
      const lineToTest = isIgnoreCase ? l.toLowerCase() : l;
      const patternToTest = isIgnoreCase ? pattern.toLowerCase() : pattern;
      if (lineToTest.includes(patternToTest)) {
        const prefix = showLineNums ? `${idx + 1}:` : '';
        matched.push(`${prefix}${l}`);
      }
    });

    const outputText = countOnly ? String(matched.length) : matched.join('\n');

    return {
      output: outputText,
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Grep matched ${matched.length} lines`,
        explanation: `Searched file "${fileArg}" for string "${pattern}" (${isIgnoreCase ? 'ignore case, ' : ''}${showLineNums ? 'line numbers, ' : ''}${countOnly ? 'count only' : ''}).`,
        targetNodeId: targetId || undefined,
      },
    };
  }

  // --- 20. sed ---
  if (cmd === 'sed') {
    const isInPlace = args.includes('-i');
    const cleanArgs = args.filter(a => a !== '-i');
    const expr = cleanArgs[0] || '';
    const fileArg = cleanArgs[1];

    if (!expr || !fileArg) {
      return {
        output: 'sed: missing expression or filename operand',
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'Syntax error', explanation: 'sed syntax: sed [-i] \'s/old/new/g\' filename' },
      };
    }

    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, fileArg);
    const targetNode = targetId ? nodes[targetId] : undefined;

    if (!targetNode || targetNode.type === 'directory') {
      return {
        output: `sed: can't read ${fileArg}: No such file or directory`,
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'File error', explanation: `File ${fileArg} not found.` },
      };
    }
    const blockedPath = pathTraversalFailure(nextSnapshot, targetId!);
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'sed must traverse parent directories before opening the file. ');
    if (!hasVfsPermission(nextSnapshot, targetNode, 'read')) return permissionDenied(snapshot, line, targetNode, 'read', 'sed reads the source stream, so the selected class needs r. ');
    if (isInPlace && !hasVfsPermission(nextSnapshot, targetNode, 'write')) return permissionDenied(snapshot, line, targetNode, 'write', 'sed -i writes the transformed contents back to the file; the selected class needs w. ');

    let modifiedContent = targetNode.content || '';
    const match = expr.match(/^s\/(.*?)\/(.*?)\/([g]?)$/);

    if (match) {
      const [, findStr, replaceStr, flags] = match;
      const regex = new RegExp(findStr, flags.includes('g') ? 'g' : '');
      modifiedContent = modifiedContent.replace(regex, replaceStr);
    } else {
      // Fallback simple string replace
      modifiedContent = modifiedContent.replace(new RegExp(expr, 'g'), '');
    }

    if (isInPlace) {
      targetNode.content = modifiedContent;
      targetNode.modifiedAt = new Date().toISOString().split('T')[0];
    }

    return {
      output: isInPlace ? '' : modifiedContent,
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `${isInPlace ? 'Updated file in place' : 'Transformed stream output'}: ${fileArg}`,
        explanation: `Applied sed stream editor expression "${expr}" to "${fileArg}". ${isInPlace ? 'Saved directly to VFS node.' : ''}`,
        targetNodeId: targetId || undefined,
        mutationType: isInPlace ? 'editor' : undefined,
      },
    };
  }

  // --- 21. awk ---
  if (cmd === 'awk') {
    const exprArg = args.find(a => a.startsWith('{') || a.startsWith("'") || a.startsWith('"')) || '{print $0}';
    const fileArg = args.find(a => !a.startsWith('-') && a !== exprArg && !a.startsWith('{')) || 'welcome.txt';

    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, fileArg);
    const targetNode = targetId ? nodes[targetId] : undefined;

    if (!targetNode || targetNode.type === 'directory') {
      return {
        output: `awk: cannot open ${fileArg} (No such file or directory)`,
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'File error', explanation: `File ${fileArg} not found.` },
      };
    }
    const blockedPath = pathTraversalFailure(nextSnapshot, targetId!);
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'awk must traverse parent directories before opening the file. ');
    if (!hasVfsPermission(nextSnapshot, targetNode, 'read')) return permissionDenied(snapshot, line, targetNode, 'read', 'awk reads file records, so the selected class needs r. ');

    const lines = (targetNode.content || '').split('\n');
    const resultLines: string[] = [];

    // Parse column print like {print $1} or {print $2} or {print $0}
    const colMatch = exprArg.match(/\$([0-9]+)/);
    const colIndex = colMatch ? parseInt(colMatch[1], 10) : null;

    lines.forEach(l => {
      if (!l.trim()) return;
      const cols = l.trim().split(/\s+/);
      if (colIndex === 0) {
        resultLines.push(l);
      } else if (colIndex !== null && colIndex > 0) {
        resultLines.push(cols[colIndex - 1] || '');
      } else {
        resultLines.push(l);
      }
    });

    return {
      output: resultLines.join('\n'),
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Processed ${lines.length} lines with AWK`,
        explanation: `Executed AWK expression "${exprArg}" over column data in "${fileArg}".`,
        targetNodeId: targetId || undefined,
      },
    };
  }

  // --- 22. wc ---
  if (cmd === 'wc') {
    const countLines = args.includes('-l');
    const countWords = args.includes('-w');
    const countChars = args.includes('-c') || args.includes('-m');

    const cleanArgs = args.filter(a => !a.startsWith('-'));
    const fileArg = cleanArgs[0];

    if (!fileArg) {
      return {
        output: '0 0 0',
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'Word count', explanation: 'Counted empty input.' },
      };
    }

    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, fileArg);
    const targetNode = targetId ? nodes[targetId] : undefined;

    if (!targetNode || targetNode.type === 'directory') {
      return {
        output: `wc: ${fileArg}: ${!targetNode ? 'No such file or directory' : 'Is a directory'}`,
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'File error', explanation: `File ${fileArg} not found.` },
      };
    }

    const blockedPath = pathTraversalFailure(nextSnapshot, targetId!);
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'wc must traverse parent directories before opening the file. ');
    if (!hasVfsPermission(nextSnapshot, targetNode, 'read')) return permissionDenied(snapshot, line, targetNode, 'read', 'wc reads file contents to count lines, words, or bytes. ');

    const text = targetNode.content || '';
    const linesCount = text ? text.split('\n').length : 0;
    const wordsCount = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const charsCount = text.length;

    let outParts: string[] = [];
    if (countLines) outParts.push(String(linesCount));
    if (countWords) outParts.push(String(wordsCount));
    if (countChars) outParts.push(String(charsCount));

    if (outParts.length === 0) {
      outParts = [String(linesCount), String(wordsCount), String(charsCount)];
    }

    return {
      output: `  ${outParts.join('  ')} ${fileArg}`,
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Counted ${linesCount} lines, ${wordsCount} words, ${charsCount} bytes`,
        explanation: `Ran wc (word count) on file "${fileArg}".`,
        targetNodeId: targetId || undefined,
      },
    };
  }

  // --- 23. head & tail ---
  if (cmd === 'head' || cmd === 'tail') {
    let numLines = 10;
    const nIdx = args.indexOf('-n');
    if (nIdx !== -1 && args[nIdx + 1]) {
      numLines = parseInt(args[nIdx + 1], 10) || 10;
    }

    const cleanArgs = args.filter((a, idx) => !a.startsWith('-') && (idx === 0 || args[idx - 1] !== '-n'));
    const fileArg = cleanArgs[0] || 'welcome.txt';

    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, fileArg);
    const targetNode = targetId ? nodes[targetId] : undefined;

    if (!targetNode || targetNode.type === 'directory') {
      return {
        output: `${cmd}: cannot open '${fileArg}' for reading: No such file or directory`,
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'File error', explanation: `File ${fileArg} not found.` },
      };
    }

    const blockedPath = pathTraversalFailure(nextSnapshot, targetId!);
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', `${cmd} must traverse parent directories before opening the file. `);
    if (!hasVfsPermission(nextSnapshot, targetNode, 'read')) return permissionDenied(snapshot, line, targetNode, 'read', `${cmd} reads file contents, so the selected class needs r. `);

    const lines = (targetNode.content || '').split('\n');
    const sliced = cmd === 'head' ? lines.slice(0, numLines) : lines.slice(-numLines);

    return {
      output: sliced.join('\n'),
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Printed ${sliced.length} lines`,
        explanation: `Printed ${cmd} ${numLines} lines of file "${fileArg}".`,
        targetNodeId: targetId || undefined,
      },
    };
  }

  // --- 24. apt & apt-get (Package Manager) ---
  if (cmd === 'apt' || cmd === 'apt-get') {
    const subCmd = args[0] || 'help';
    const pkgName = args[1] || '';

    if (subCmd === 'update') {
      return {
        output: `Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease\nGet:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [119 kB]\nGet:3 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]\nFetched 229 kB in 1s (230 kB/s)\nReading package lists... Done\nBuilding dependency tree... Done\nAll packages are up to date.`,
        newSnapshot: nextSnapshot,
        stepRecord: { command: line, diff: 'Package index updated', explanation: 'Updated package lists from simulated Ubuntu repositories.' },
      };
    }

    if (subCmd === 'install') {
      if (!pkgName) {
        return {
          output: `${cmd}: missing package name argument`,
          newSnapshot: snapshot,
          stepRecord: { command: line, diff: 'Syntax error', explanation: 'apt install requires a package name.' },
        };
      }
      return {
        output: `Reading package lists... Done\nBuilding dependency tree... Done\nThe following NEW packages will be installed: ${pkgName}\n0 upgraded, 1 newly installed, 0 to remove.\nNeed to get 1,420 kB of archives.\nUnpacking ${pkgName}...\nSetting up ${pkgName} (1.2.0-1)... Done.`,
        newSnapshot: nextSnapshot,
        stepRecord: {
          command: line,
          diff: `+ Installed package: ${pkgName}`,
          explanation: `Simulated installation of system package "${pkgName}".`,
        },
      };
    }

    if (subCmd === 'list' || subCmd === 'search') {
      return {
        output: `vim/jammy,now 2:8.2.3995-1ubuntu2.1 amd64 [installed]\nnano/jammy,now 6.2-1 amd64 [installed]\ntree/jammy 2.0.2-1 amd64\nhtop/jammy 3.0.5-1 amd64\npython3/jammy,now 3.10.6-1 amd64 [installed]\ngcc/jammy,now 4:11.2.0-1ubuntu1 amd64 [installed]\ncurl/jammy,now 7.81.0-1ubuntu1 amd64 [installed]`,
        newSnapshot: nextSnapshot,
        stepRecord: { command: line, diff: 'Package list queried', explanation: 'Queried APT package repository database.' },
      };
    }

    return {
      output: `apt 2.4.8 (amd64)\nUsage: apt [options] command\nCommands: update, install, remove, list, search`,
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: 'APT Help', explanation: 'Displayed APT package manager usage.' },
    };
  }

  // --- 25. ssh (Secure Shell) ---
  if (cmd === 'ssh') {
    const hostArg = args.find(a => !a.startsWith('-')) || 'student@localhost';
    return {
      output: `Connecting to ${hostArg}...\nThe authenticity of host '${hostArg} (192.168.1.105)' can't be established.\nED25519 key fingerprint is SHA256:7uK+X9s39JmP91kLKw0vR2u... \nConnected to ${hostArg} (Ubuntu 22.04.3 LTS Linux 5.15.0-generic).\nLast login: Sat Sep 5 09:10:00 2026 from 10.0.0.1\n[${hostArg} ~]$ `,
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `SSH connected to ${hostArg}`,
        explanation: `Established simulated secure shell (SSH) terminal session to ${hostArg}.`,
      },
    };
  }

  // --- 26. tree ---
  if (cmd === 'tree') {
    const blockedPath = pathTraversalFailure(nextSnapshot, nextSnapshot.currentDirId, true);
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'tree must traverse the current directory before listing descendants. ');
    const inaccessible = findSubtreeAccessFailure(nextSnapshot, nextSnapshot.currentDirId, false);
    if (inaccessible) return permissionDenied(snapshot, line, inaccessible.node, inaccessible.permission, 'tree needs directory read and execute/search access to enumerate this branch. ');
    const renderTreeAscii = (nodeId: string, indent: string = ''): string[] => {
      const node = nodes[nodeId];
      if (!node) return [];
      const lines: string[] = [];
      const children = (node.childrenIds || []).map(id => nodes[id]).filter(Boolean);

      children.forEach((child, idx) => {
        const isLast = idx === children.length - 1;
        const pointer = isLast ? '└── ' : '├── ';
        lines.push(`${indent}${pointer}${child.name}${child.type === 'directory' ? '/' : ''}`);
        if (child.type === 'directory') {
          const nextIndent = indent + (isLast ? '    ' : '│   ');
          lines.push(...renderTreeAscii(child.id, nextIndent));
        }
      });

      return lines;
    };

    const treeLines = ['.', ...renderTreeAscii(nextSnapshot.currentDirId)];
    return {
      output: treeLines.join('\n'),
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: 'Rendered tree graph',
        explanation: `Rendered recursive directory tree structure for active working location.`,
        targetNodeId: nextSnapshot.currentDirId,
      },
    };
  }

  // --- 27. curl & ping ---
  if (cmd === 'curl') {
    const url = args.find(a => !a.startsWith('-')) || 'http://example.com';
    return {
      output: `<!doctype html>\n<html>\n<head><title>Example Domain</title></head>\n<body>\n<h1>Example Domain</h1>\n<p>This domain is for use in illustrative examples in documents.</p>\n</body>\n</html>`,
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: `Fetched URL ${url}`, explanation: `Simulated HTTP GET request to ${url}.` },
    };
  }

  if (cmd === 'ping') {
    const host = args.find(a => !a.startsWith('-')) || 'google.com';
    return {
      output: `PING ${host} (142.250.190.46) 56(84) bytes of data.\n64 bytes from ${host}: icmp_seq=1 ttl=117 time=14.2 ms\n64 bytes from ${host}: icmp_seq=2 ttl=117 time=13.8 ms\n64 bytes from ${host}: icmp_seq=3 ttl=117 time=15.1 ms\n--- ${host} ping statistics ---\n3 packets transmitted, 3 received, 0% packet loss, time 2003ms\nrtt min/avg/max/mdev = 13.841/14.380/15.120/0.542 ms`,
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: `Pinged host ${host}`, explanation: `Sent ICMP ECHO_REQUEST to network host "${host}".` },
    };
  }

  // --- 28. diff ---
  if (cmd === 'diff') {
    const f1 = args[0];
    const f2 = args[1];
    if (!f1 || !f2) {
      return { output: 'diff: missing operand after f1', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: 'diff file1 file2' } };
    }
    const n1 = nodes[resolveNodeId(nodes, nextSnapshot.currentDirId, f1) || ''];
    const n2 = nodes[resolveNodeId(nodes, nextSnapshot.currentDirId, f2) || ''];

    if (!n1 || !n2) {
      return { output: `diff: ${!n1 ? f1 : f2}: No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'File error', explanation: 'File not found.' } };
    }

    for (const fileNode of [n1, n2]) {
      const blockedPath = pathTraversalFailure(nextSnapshot, fileNode.id);
      if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'diff must traverse each file path before opening its inputs. ');
      if (!hasVfsPermission(nextSnapshot, fileNode, 'read')) return permissionDenied(snapshot, line, fileNode, 'read', 'diff reads both files to compare their contents. ');
    }

    if (n1.content === n2.content) {
      return { output: '', newSnapshot: nextSnapshot, stepRecord: { command: line, diff: 'Files identical', explanation: `Files ${f1} and ${f2} are identical.` } };
    }

    return {
      output: `< ${n1.content || ''}\n---\n> ${n2.content || ''}`,
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: `Diff ${f1} vs ${f2}`, explanation: `Compared contents of "${f1}" and "${f2}".` },
    };
  }

  if (cmd === 'uname') {
    return {
      output: 'Linux stem-studio 5.15.0-88-generic #98-Ubuntu SMP x86_64 x86_64 x86_64 GNU/Linux',
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: 'Kernel query', explanation: 'Printed Linux kernel release details.' },
    };
  }

  // --- Virtual process and scheduler controls ---
  if (cmd === 'ps' || cmd === 'top' || cmd === 'htop' || cmd === 'jobs') {
    const processes = nextSnapshot.processes || [];
    if (cmd === 'jobs') {
      const jobs = processes.filter((process) => process.ppid === 1082 && process.command !== 'octa-shell');
      return {
        output: jobs.length
          ? jobs.map((process, index) => `[${index + 1}]  ${process.state === 'T' ? 'Stopped' : 'Running'}                 ${process.command} ${process.args}`).join('\n')
          : 'No jobs',
        newSnapshot: nextSnapshot,
        stepRecord: { command: line, diff: `Listed ${jobs.length} virtual jobs`, explanation: 'jobs shows the processes started by this simulated shell. They are teaching fixtures and do not run on your computer.' },
      };
    }

    let columns: string[] | undefined;
    if (args.some((arg) => ['-ef', '-eF', '-f', '-A', '--all'].includes(arg))) {
      columns = ['pid', 'ppid', 'user', 'stat', 'args'];
    } else if (args.some((arg) => ['aux', '-aux', '-au', '-u'].includes(arg))) {
      columns = ['user', 'pid', 'ni', 'stat', 'comm', 'args'];
    }
    const outputIndex = args.findIndex((arg) => arg === '-o' || arg === '--format');
    const outputInline = args.find((arg) => arg.startsWith('-o') && arg.length > 2);
    if (outputIndex >= 0 || outputInline) {
      const rawColumns = outputInline?.slice(2) || args[outputIndex + 1] || '';
      columns = rawColumns.split(',').map((column) => column.trim().toLowerCase()).filter((column) => ['pid', 'ppid', 'user', 'ni', 'stat', 'comm', 'args'].includes(column));
      if (!columns.length) {
        return { output: 'ps: unsupported output format; try -o pid,ppid,user,ni,stat,comm,args', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Unsupported ps format', explanation: 'The simulator supports these ps columns: pid, ppid, user, ni, stat, comm, args.' } };
      }
    }
    if (cmd === 'top' || cmd === 'htop') {
      const rows = processes.map((process) => `${String(process.pid).padStart(5)} ${process.user.padEnd(8)} ${String(process.nice).padStart(3)} ${process.state} ${process.pid === 1116 ? '2.4' : process.state === 'R' ? '0.8' : '0.0'} ${process.command} ${process.args}`);
      return {
        output: `top - virtual process view · no host processes\nTasks: ${processes.length} total, ${processes.filter((process) => process.state === 'R').length} running, ${processes.filter((process) => process.state === 'S').length} sleeping, ${processes.filter((process) => process.state === 'T').length} stopped\n  PID USER      NI S  %CPU COMMAND ARGS\n${rows.join('\n')}`,
        newSnapshot: nextSnapshot,
        stepRecord: { command: line, diff: `Viewed ${processes.length} simulated processes`, explanation: 'top/htop display a stable educational process table. CPU values are illustrative; nothing is read from the host operating system.' },
      };
    }
    if (args.some((arg) => ['aux', '-aux', '-au', '-u'].includes(arg))) {
      const rows = processes.map((process) => `${process.user.padEnd(8)} ${String(process.pid).padStart(5)} ${(process.pid === 1116 ? '2.4' : process.state === 'R' ? '0.8' : '0.0').padStart(5)} ${(process.pid === 1116 ? '0.2' : '0.0').padStart(5)} ${String(process.nice).padStart(3)} ${process.state.padEnd(4)} 00:00 ${process.command} ${process.args}`);
      return {
        output: `USER     PID  %CPU %MEM  NI STAT TIME COMMAND\n${rows.join('\n')}`,
        newSnapshot: nextSnapshot,
        stepRecord: { command: line, diff: `Listed ${processes.length} simulated processes`, explanation: 'ps aux uses the common BSD-style process listing. CPU and memory readings are illustrative values from the virtual process table, not measurements from the host.' },
      };
    }
    return {
      output: processTable(processes, columns),
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: `Listed ${processes.length} simulated processes`, explanation: 'ps reads the virtual process table. Use ps -ef or ps aux, and ps -o pid,ppid,user,ni,stat,comm,args for selected columns.' },
    };
  }

  if (cmd === 'nice') {
    let nice = 10;
    let commandIndex = 0;
    if (args[0] === '-n' || args[0] === '--adjustment') {
      nice = Number(args[1]);
      commandIndex = 2;
    } else if (args[0]?.startsWith('--adjustment=')) {
      nice = Number(args[0].split('=')[1]);
      commandIndex = 1;
    } else if (/^-[0-9]+$/.test(args[0] || '')) {
      nice = Number(args[0].slice(1));
      commandIndex = 1;
    }
    nice = Number.isFinite(nice) ? Math.trunc(nice) : NaN;
    const commandArgs = args.slice(commandIndex);
    if (!commandArgs.length || !Number.isFinite(nice)) {
      return { output: 'usage: nice [-n adjustment] command [argument ...]\nnice: adjustment must be an integer from -20 to 19', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Invalid nice syntax', explanation: 'nice starts a simulated process with a priority adjustment from -20 (highest priority) to 19 (lowest). This simulator never launches a real process.' } };
    }
    if (nice < -20 || nice > 19) {
      return { output: `nice: invalid adjustment '${nice}': expected a value from -20 to 19`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Invalid nice adjustment', explanation: 'Linux niceness values range from -20 (highest priority) to 19 (lowest priority).' } };
    }
    const pid = nextSnapshot.nextPid || 1200;
    const process: VFSProcess = { pid, ppid: 1082, user: nextSnapshot.currentUser, nice, state: 'S', command: commandArgs[0], args: commandArgs.slice(1).join(' ') };
    nextSnapshot.processes = [...(nextSnapshot.processes || []), process];
    nextSnapshot.nextPid = pid + 1;
    return {
      output: `${commandArgs.join(' ')}: simulated process started with PID ${pid} and nice value ${nice}. No host process was executed.`,
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: `Started virtual PID ${pid} with nice ${nice}`, explanation: `Added ${commandArgs[0]} to the virtual process table with niceness ${nice}. Linux uses -20 for the highest scheduling priority and 19 for the lowest.`, targetNodeId: nextSnapshot.currentDirId },
    };
  }

  if (cmd === 'renice') {
    const processFlagIndex = args.indexOf('-p');
    const niceIndex = args.indexOf('-n');
    const priorityToken = niceIndex >= 0
      ? args[niceIndex + 1]
      : args.slice(0, processFlagIndex >= 0 ? processFlagIndex : undefined).find((arg) => /^[+-]?\d+$/.test(arg));
    const priority = Number(priorityToken);
    const pidArg = processFlagIndex >= 0
      ? args[processFlagIndex + 1]
      : args.find((arg) => /^\d+$/.test(arg) && arg !== priorityToken);
    const pid = Number(pidArg);
    if (!Number.isInteger(priority) || priority < -20 || priority > 19 || !Number.isInteger(pid)) {
      return { output: 'usage: renice [-n] priority -p pid\npriority must be an integer from -20 to 19', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Invalid renice syntax', explanation: 'renice updates the priority of a simulated process by PID.' } };
    }
    const process = (nextSnapshot.processes || []).find((entry) => entry.pid === pid);
    if (!process) return { output: `renice: ${pid}: no such process`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Process not found', explanation: `PID ${pid} is not present in the virtual process table.` } };
    if (process.user !== nextSnapshot.currentUser && nextSnapshot.currentUser !== 'root') {
      return { output: `renice: failed to set priority for ${pid} (permission denied)`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Permission denied', explanation: 'A simulated user may only change the priority of their own processes; root may change any process.' } };
    }
    const previousNice = process.nice;
    process.nice = priority;
    return { output: `${pid} (process ID) old priority ${previousNice}, new priority ${priority}`, newSnapshot: nextSnapshot, stepRecord: { command: line, diff: `PID ${pid}: nice ${previousNice} -> ${priority}`, explanation: `Changed the virtual process scheduling priority from ${previousNice} to ${priority}. Lower nice values mean higher priority.` } };
  }

  if (cmd === 'kill') {
    const signalIndex = args.findIndex((arg) => arg === '-s' || arg === '--signal');
    const signalArg = signalIndex >= 0 ? args[signalIndex + 1] : (args.find((arg) => arg.startsWith('-')) || '-TERM');
    if (signalArg === '-l' || signalArg === '--list') {
      return { output: 'HUP INT QUIT ILL ABRT FPE KILL SEGV PIPE ALRM TERM STOP TSTP CONT', newSnapshot: nextSnapshot, stepRecord: { command: line, diff: 'Listed supported simulated signals', explanation: 'The virtual process table supports TERM/KILL to end a process and STOP/CONT to pause or resume one.' } };
    }
    const signal = signalArg.replace(/^-/, '').toUpperCase();
    const signalNames: Record<string, string> = { '9': 'KILL', '15': 'TERM', '19': 'STOP', '18': 'CONT', 'SIGTERM': 'TERM', 'SIGKILL': 'KILL', 'SIGSTOP': 'STOP', 'SIGCONT': 'CONT' };
    const normalizedSignal = signalNames[signal] || signal;
    const pidArgs = args.filter((arg, index) => !arg.startsWith('-') && !(signalIndex >= 0 && index === signalIndex + 1));
    if (!['TERM', 'KILL', 'STOP', 'CONT'].includes(normalizedSignal) || !pidArgs.length || pidArgs.some((pid) => !/^\d+$/.test(pid))) {
      return { output: 'usage: kill [-s TERM|KILL|STOP|CONT] pid\n       kill -9 pid', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Invalid kill syntax', explanation: 'kill operates only on virtual PIDs. Supported signals are TERM, KILL, STOP, and CONT.' } };
    }
    const updated: string[] = [];
    for (const rawPid of pidArgs) {
      const pid = Number(rawPid);
      const index = (nextSnapshot.processes || []).findIndex((entry) => entry.pid === pid);
      if (index < 0) return { output: `bash: kill: (${pid}) - No such process`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Process not found', explanation: `PID ${pid} does not exist in the simulated process table.` } };
      const process = nextSnapshot.processes![index];
      if (pid === 1 || (process.user !== nextSnapshot.currentUser && nextSnapshot.currentUser !== 'root')) {
        return { output: `bash: kill: (${pid}) - Operation not permitted`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Permission denied', explanation: 'The virtual init process is protected, and users may only signal processes they own unless running as root.' } };
      }
      if (normalizedSignal === 'STOP') process.state = 'T';
      else if (normalizedSignal === 'CONT') process.state = 'S';
      else nextSnapshot.processes!.splice(index, 1);
      updated.push(`${pid} ${normalizedSignal === 'STOP' ? 'stopped' : normalizedSignal === 'CONT' ? 'continued' : 'terminated'}`);
    }
    return { output: updated.join('\n'), newSnapshot: nextSnapshot, stepRecord: { command: line, diff: updated.join('; '), explanation: `Applied ${normalizedSignal} to the matching virtual process${pidArgs.length === 1 ? '' : 'es'}. The simulator does not send signals to operating-system processes.` } };
  }

  if (cmd === 'help') {
    return {
      output: [
        'Octa Linux virtual shell · supported command families',
        'Navigation: pwd, cd [-L|-P] [path], ls [-lahARd] [path], tree [-L depth] [path], rmdir empty-dir',
        'Files: mkdir [-p] path, touch path, cat path, cp [-r] source destination, mv source destination, rm [-rf] path',
        'Editors: nano file, vim file (changes save into the virtual filesystem); bash script.sh reads a virtual script',
        'Text & search: echo, grep, find, sed, awk, wc, head, tail, diff',
        'Permissions & users: ls -l, stat, chmod, chown, chgrp, umask, sudo (limited), useradd, userdel, groupadd, usermod, whoami, id, who',
        'Processes: ps [-ef|aux|-o columns], top, htop, jobs, nice -n value command, renice value -p PID, kill [-TERM|-9|-STOP|-CONT] PID',
        'System/network demos: uname, apt, ssh, curl, ping',
        'Input: ↑/↓ history · Tab completion · Ctrl+L clear',
        'Scope: this is an isolated teaching simulator; unsupported commands do not execute on your device or a server.',
      ].join('\n'),
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: 'Displayed virtual-shell help', explanation: 'The help output lists the implemented command families and their common flags. This is a simulator, not a full Linux distribution.' },
    };
  }

  if (cmd.startsWith('./') || cmd.startsWith('../') || cmd.startsWith('/')) {
    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, cmd);
    if (!targetId || !nodes[targetId]) {
      return { output: `bash: ${cmd}: No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Executable not found', explanation: `No filesystem entry exists at ${cmd}.` } };
    }
    const target = nodes[targetId];
    if (isDirectoryNode(target)) return { output: `bash: ${cmd}: Is a directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Not an executable file', explanation: 'A directory is entered with cd; it is not launched as a program.' } };
    const blockedPath = pathTraversalFailure(nextSnapshot, targetId);
    if (blockedPath) return permissionDenied(snapshot, line, blockedPath, 'execute', 'Linux needs execute/search permission on each parent directory before reaching a program. ');
    if (!hasVfsPermission(nextSnapshot, target, 'execute')) {
      return permissionDenied(snapshot, line, target, 'execute', 'Launching ./file asks the operating system to execute this file. For a shell script, use chmod u+x only when you intend to grant that permission. ');
    }
    const simulated = simulateLiteralEchoScript(target.content);
    const isScript = (target.content || '').startsWith('#!');
    return {
      output: [simulated.output, simulated.skipped.length ? `Skipped unsupported script statements (${simulated.skipped.join(', ')}); only literal echo lines run in this learning simulator.` : '', !isScript ? 'Execute permission check passed; binary contents are not run by this simulator.' : ''].filter(Boolean).join('\n'),
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: `Execute permission granted by ${target.permissions} (${target.octalPermissions})`, explanation: `The current user passed the execute-bit check for ${getAbsolutePath(nodes, targetId)}. For a script, Linux also uses its shebang to choose an interpreter. This virtual shell simulates only literal echo lines and never executes arbitrary host code.`, targetNodeId: targetId },
    };
  }

  // --- Fallback / Unsupported Command Notice ---
  return {
    output: `bash: ${cmd}: command not supported in this VFS simulator (see Commands of Linux reference section for theoretical usage)`,
    newSnapshot: snapshot,
    stepRecord: {
      command: line,
      diff: 'Unsupported command execution',
      explanation: `Command "${cmd}" is not implemented in this interactive Virtual File System subset interpreter.`,
    },
  };
}
