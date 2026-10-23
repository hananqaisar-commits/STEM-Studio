export type VFSNodeType = 'directory' | 'file' | 'mount-point' | 'symlink';

export interface VFSNode {
  id: string;
  name: string;
  type: VFSNodeType;
  parentId: string | null;
  childrenIds?: string[];
  content?: string;
  owner: string;
  group: string;
  permissions: string; // e.g. "rwxr-xr-x"
  octalPermissions: string; // e.g. "755"
  stickyBit?: boolean;
  createdAt: string;
  modifiedAt: string;
}

export interface VFSProcess {
  pid: number;
  ppid: number;
  user: string;
  nice: number;
  state: 'R' | 'S' | 'T';
  command: string;
  args: string;
}

export interface VFSSnapshot {
  nodes: Record<string, VFSNode>;
  rootId: string;
  currentDirId: string;
  currentUser: string;
  currentGroup: string;
  /** Default permission mask used when the virtual shell creates files/folders. */
  umask?: string;
  envVars: Record<string, string>;
  /** Simulated process table. These are teaching fixtures, never host processes. */
  processes?: VFSProcess[];
  nextPid?: number;
}

/**
 * Generate default Linux FHS (Filesystem Hierarchy Standard) structure
 */
export function createInitialVFS(): VFSSnapshot {
  const now = new Date().toISOString().split('T')[0];

  const nodes: Record<string, VFSNode> = {
    'root': {
      id: 'root',
      name: '/',
      type: 'directory',
      parentId: null,
      childrenIds: [
        'bin', 'boot', 'dev', 'etc', 'home', 'lib', 'lib64',
        'media', 'mnt', 'opt', 'proc', 'root-home', 'run',
        'sbin', 'srv', 'sys', 'tmp', 'usr', 'var'
      ],
      owner: 'root',
      group: 'root',
      permissions: 'rwxr-xr-x',
      octalPermissions: '755',
      createdAt: now,
      modifiedAt: now,
    },

    // Standard FHS Top-Level Directories
    'bin': {
      id: 'bin',
      name: 'bin',
      type: 'directory',
      parentId: 'root',
      childrenIds: ['bash-bin', 'ls-bin', 'cat-bin', 'grep-bin'],
      owner: 'root',
      group: 'root',
      permissions: 'rwxr-xr-x',
      octalPermissions: '755',
      createdAt: now,
      modifiedAt: now,
    },
    'bash-bin': { id: 'bash-bin', name: 'bash', type: 'file', parentId: 'bin', owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', content: 'ELF 64-bit LSB executable, x86-64, GNU/Linux', createdAt: now, modifiedAt: now },
    'ls-bin': { id: 'ls-bin', name: 'ls', type: 'file', parentId: 'bin', owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', content: 'ELF 64-bit LSB executable', createdAt: now, modifiedAt: now },
    'cat-bin': { id: 'cat-bin', name: 'cat', type: 'file', parentId: 'bin', owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', content: 'ELF 64-bit LSB executable', createdAt: now, modifiedAt: now },
    'grep-bin': { id: 'grep-bin', name: 'grep', type: 'file', parentId: 'bin', owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', content: 'ELF 64-bit LSB executable', createdAt: now, modifiedAt: now },

    'boot': { id: 'boot', name: 'boot', type: 'directory', parentId: 'root', childrenIds: ['vmlinuz'], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'vmlinuz': { id: 'vmlinuz', name: 'vmlinuz-5.15.0-generic', type: 'file', parentId: 'boot', owner: 'root', group: 'root', permissions: 'rw-r--r--', octalPermissions: '644', content: 'Linux Kernel Image v5.15.0', createdAt: now, modifiedAt: now },

    'dev': { id: 'dev', name: 'dev', type: 'directory', parentId: 'root', childrenIds: ['null-dev', 'sda-dev'], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'null-dev': { id: 'null-dev', name: 'null', type: 'file', parentId: 'dev', owner: 'root', group: 'root', permissions: 'rw-rw-rw-', octalPermissions: '666', content: '', createdAt: now, modifiedAt: now },
    'sda-dev': { id: 'sda-dev', name: 'sda1', type: 'file', parentId: 'dev', owner: 'root', group: 'disk', permissions: 'rw-rw----', octalPermissions: '660', content: 'Block Device Main Disk', createdAt: now, modifiedAt: now },

    'etc': {
      id: 'etc',
      name: 'etc',
      type: 'directory',
      parentId: 'root',
      childrenIds: ['passwd-file', 'group-file', 'hosts-file'],
      owner: 'root',
      group: 'root',
      permissions: 'rwxr-xr-x',
      octalPermissions: '755',
      createdAt: now,
      modifiedAt: now,
    },
    'passwd-file': {
      id: 'passwd-file',
      name: 'passwd',
      type: 'file',
      parentId: 'etc',
      owner: 'root',
      group: 'root',
      permissions: 'rw-r--r--',
      octalPermissions: '644',
      content: 'root:x:0:0:root:/root:/bin/bash\nocta:x:1000:1000:Octa AI:/home/octa:/bin/bash',
      createdAt: now,
      modifiedAt: now,
    },
    'group-file': {
      id: 'group-file',
      name: 'group',
      type: 'file',
      parentId: 'etc',
      owner: 'root',
      group: 'root',
      permissions: 'rw-r--r--',
      octalPermissions: '644',
      content: 'root:x:0:\nsudo:x:27:octa\nocta:x:1000:',
      createdAt: now,
      modifiedAt: now,
    },
    'hosts-file': {
      id: 'hosts-file',
      name: 'hosts',
      type: 'file',
      parentId: 'etc',
      owner: 'root',
      group: 'root',
      permissions: 'rw-r--r--',
      octalPermissions: '644',
      content: '127.0.0.1 localhost\n127.0.1.1 stem-studio',
      createdAt: now,
      modifiedAt: now,
    },

    'home': {
      id: 'home',
      name: 'home',
      type: 'directory',
      parentId: 'root',
      childrenIds: ['octa-home'],
      owner: 'root',
      group: 'root',
      permissions: 'rwxr-xr-x',
      octalPermissions: '755',
      createdAt: now,
      modifiedAt: now,
    },
    'octa-home': {
      id: 'octa-home',
      name: 'octa',
      type: 'directory',
      parentId: 'home',
      childrenIds: ['projects-dir', 'bashrc-file', 'welcome-txt', 'permissions-lab-file', 'permission-demo-script', 'private-lab-dir'],
      owner: 'octa',
      group: 'octa',
      permissions: 'rwxr-xr-x',
      octalPermissions: '755',
      createdAt: now,
      modifiedAt: now,
    },
    'projects-dir': {
      id: 'projects-dir',
      name: 'projects',
      type: 'directory',
      parentId: 'octa-home',
      childrenIds: ['app-js'],
      owner: 'octa',
      group: 'octa',
      permissions: 'rwxr-xr-x',
      octalPermissions: '755',
      createdAt: now,
      modifiedAt: now,
    },
    'app-js': {
      id: 'app-js',
      name: 'app.js',
      type: 'file',
      parentId: 'projects-dir',
      owner: 'octa',
      group: 'octa',
      permissions: 'rw-r--r--',
      octalPermissions: '644',
      content: 'console.log("Hello from Linux STEM Studio!");',
      createdAt: now,
      modifiedAt: now,
    },
    'bashrc-file': {
      id: 'bashrc-file',
      name: '.bashrc',
      type: 'file',
      parentId: 'octa-home',
      owner: 'octa',
      group: 'octa',
      permissions: 'rw-r--r--',
      octalPermissions: '644',
      content: '# STEM Studio Premium Zsh/Bash Configuration\nexport PS1="┌──(octa㊀stem-studio)-[\\w]\\n└─\\$ "\nalias ll="ls -la"',
      createdAt: now,
      modifiedAt: now,
    },
    'welcome-txt': {
      id: 'welcome-txt',
      name: 'welcome.txt',
      type: 'file',
      parentId: 'octa-home',
      owner: 'octa',
      group: 'octa',
      permissions: 'rw-r--r--',
      octalPermissions: '644',
      content: 'Welcome to Octa STEM Studio Interactive Virtual File System!\nTry running bash commands like ls, pwd, cd, useradd, chmod, or vim.',
      createdAt: now,
      modifiedAt: now,
    },
    'permissions-lab-file': {
      id: 'permissions-lab-file',
      name: 'permissions-lab.txt',
      type: 'file',
      parentId: 'octa-home',
      owner: 'octa',
      group: 'octa',
      permissions: 'rw-r--r--',
      octalPermissions: '644',
      content: 'This file is a safe practice target for chmod, stat, cat, and editor permission checks.\n',
      createdAt: now,
      modifiedAt: now,
    },
    'permission-demo-script': {
      id: 'permission-demo-script',
      name: 'permission-demo.sh',
      type: 'file',
      parentId: 'octa-home',
      owner: 'octa',
      group: 'octa',
      permissions: 'rw-r--r--',
      octalPermissions: '644',
      content: '#!/bin/sh\necho "The execute bit allows this script to be launched."\n',
      createdAt: now,
      modifiedAt: now,
    },
    'private-lab-dir': {
      id: 'private-lab-dir',
      name: 'private-lab',
      type: 'directory',
      parentId: 'octa-home',
      childrenIds: ['private-lab-note'],
      owner: 'octa',
      group: 'octa',
      permissions: 'rwx------',
      octalPermissions: '700',
      createdAt: now,
      modifiedAt: now,
    },
    'private-lab-note': {
      id: 'private-lab-note',
      name: 'note.txt',
      type: 'file',
      parentId: 'private-lab-dir',
      owner: 'octa',
      group: 'octa',
      permissions: 'rw-------',
      octalPermissions: '600',
      content: 'Private directory practice file.\n',
      createdAt: now,
      modifiedAt: now,
    },

    'lib': { id: 'lib', name: 'lib', type: 'directory', parentId: 'root', childrenIds: [], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'lib64': { id: 'lib64', name: 'lib64', type: 'directory', parentId: 'root', childrenIds: [], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'media': { id: 'media', name: 'media', type: 'directory', parentId: 'root', childrenIds: [], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'mnt': { id: 'mnt', name: 'mnt', type: 'mount-point', parentId: 'root', childrenIds: [], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'opt': { id: 'opt', name: 'opt', type: 'directory', parentId: 'root', childrenIds: [], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'proc': { id: 'proc', name: 'proc', type: 'directory', parentId: 'root', childrenIds: [], owner: 'root', group: 'root', permissions: 'r-xr-xr-x', octalPermissions: '555', createdAt: now, modifiedAt: now },
    'root-home': { id: 'root-home', name: 'root', type: 'directory', parentId: 'root', childrenIds: [], owner: 'root', group: 'root', permissions: 'rwx------', octalPermissions: '700', createdAt: now, modifiedAt: now },
    'run': { id: 'run', name: 'run', type: 'directory', parentId: 'root', childrenIds: [], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'sbin': { id: 'sbin', name: 'sbin', type: 'directory', parentId: 'root', childrenIds: [], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'srv': { id: 'srv', name: 'srv', type: 'directory', parentId: 'root', childrenIds: [], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'sys': { id: 'sys', name: 'sys', type: 'directory', parentId: 'root', childrenIds: [], owner: 'root', group: 'root', permissions: 'r-xr-xr-x', octalPermissions: '555', createdAt: now, modifiedAt: now },

    'tmp': {
      id: 'tmp',
      name: 'tmp',
      type: 'directory',
      parentId: 'root',
      childrenIds: ['sess-file'],
      owner: 'root',
      group: 'root',
      permissions: 'rwxrwxrwt',
      octalPermissions: '1777',
      stickyBit: true,
      createdAt: now,
      modifiedAt: now,
    },
    'sess-file': { id: 'sess-file', name: 'sess_temp', type: 'file', parentId: 'tmp', owner: 'octa', group: 'octa', permissions: 'rw-------', octalPermissions: '600', content: 'temporary session token', createdAt: now, modifiedAt: now },

    'usr': { id: 'usr', name: 'usr', type: 'directory', parentId: 'root', childrenIds: [], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'var': { id: 'var', name: 'var', type: 'directory', parentId: 'root', childrenIds: ['log-dir'], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'log-dir': { id: 'log-dir', name: 'log', type: 'directory', parentId: 'var', childrenIds: ['syslog-file'], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'syslog-file': { id: 'syslog-file', name: 'syslog', type: 'file', parentId: 'log-dir', owner: 'syslog', group: 'adm', permissions: 'rw-r-----', octalPermissions: '640', content: 'systemd[1]: Started Network Service.\nsystemd[1]: Reached target Network.', createdAt: now, modifiedAt: now },
  };

  return {
    nodes,
    rootId: 'root',
    currentDirId: 'octa-home',
    currentUser: 'octa',
    currentGroup: 'octa',
    umask: '0022',
    envVars: {
      USER: 'octa',
      HOME: '/home/octa',
      SHELL: '/bin/bash',
      PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      PWD: '/home/octa',
    },
    processes: [
      { pid: 1, ppid: 0, user: 'root', nice: 0, state: 'S', command: 'systemd', args: '/sbin/init' },
      { pid: 624, ppid: 1, user: 'root', nice: 0, state: 'S', command: 'systemd-journald', args: '/lib/systemd/systemd-journald' },
      { pid: 1082, ppid: 1, user: 'octa', nice: 0, state: 'S', command: 'bash', args: '-bash' },
      { pid: 1116, ppid: 1082, user: 'octa', nice: 0, state: 'R', command: 'octa-shell', args: 'virtual terminal session' },
      { pid: 1140, ppid: 1082, user: 'octa', nice: 5, state: 'S', command: 'learning-demo', args: 'background process fixture' },
    ],
    nextPid: 1200,
  };
}


/**
 * Get full absolute path string for a VFS node
 */
export function getAbsolutePath(nodes: Record<string, VFSNode>, nodeId: string): string {
  const node = nodes[nodeId];
  if (!node) return '/';
  if (node.id === 'root') return '/';

  const parts: string[] = [];
  let current: VFSNode | undefined = node;
  const seen = new Set<string>();

  while (current && current.id !== 'root' && !seen.has(current.id)) {
    seen.add(current.id);
    parts.unshift(current.name);
    current = current.parentId ? nodes[current.parentId] : undefined;
  }

  if (current && current.id !== 'root') parts.unshift('[invalid-parent-cycle]');
  else if (!current) parts.unshift('[orphan]');

  return '/' + parts.join('/');
}

/**
 * Resolve node ID from absolute or relative path string
 */
export function resolveNodeId(
  nodes: Record<string, VFSNode>,
  currentDirId: string,
  targetPath: string
): string | null {
  let cleaned = targetPath.trim();
  if (!cleaned) return currentDirId;

  // Replace ~ with home directory path
  if (cleaned.startsWith('~')) {
    const homeNode = Object.values(nodes).find(n => n.name === 'octa' && n.parentId === 'home');
    if (homeNode) {
      if (cleaned === '~' || cleaned === '~/') return homeNode.id;
      cleaned = getAbsolutePath(nodes, homeNode.id) + cleaned.substring(1);
    }
  }


  let startNodeId = currentDirId;
  if (cleaned.startsWith('/')) {
    startNodeId = 'root';
    cleaned = cleaned.substring(1);
  }

  const segments = cleaned.split('/').filter(Boolean);
  let currId: string = startNodeId;

  for (const seg of segments) {
    if (seg === '.') continue;
    if (seg === '..') {
      const parentId = nodes[currId]?.parentId;
      if (parentId) currId = parentId;
      continue;
    }

    const currNode = nodes[currId];
    if (!currNode || (currNode.type !== 'directory' && currNode.type !== 'mount-point')) return null;

    const childId = currNode.childrenIds?.find(cid => nodes[cid]?.name === seg);
    if (!childId) return null;
    currId = childId;
  }

  return currId;
}

/**
 * Format permissions from mode string (e.g. 755 -> rwxr-xr-x)
 */
export function modeToSymbolic(mode: string): { symbolic: string; octal: string } {
  if (!/^[0-7]{3,4}$/.test(mode)) return { symbolic: '---------', octal: '000' };
  const special = mode.length === 4 ? Number(mode[0]) : 0;
  const digits = mode.slice(-3);
  const map: Record<string, string> = {
    '0': '---', '1': '--x', '2': '-w-', '3': '-wx',
    '4': 'r--', '5': 'r-x', '6': 'rw-', '7': 'rwx',
  };
  const chars = [...(map[digits[0]] || '---') + (map[digits[1]] || '---') + (map[digits[2]] || '---')];
  if (special & 4) chars[2] = chars[2] === 'x' ? 's' : 'S';
  if (special & 2) chars[5] = chars[5] === 'x' ? 's' : 'S';
  if (special & 1) chars[8] = chars[8] === 'x' ? 't' : 'T';
  return { symbolic: chars.join(''), octal: special ? `${special}${digits}` : digits };
}

export type VFSPermission = 'read' | 'write' | 'execute';
export type VFSPermissionClass = 'owner' | 'group' | 'other';

export function getPermissionClass(snapshot: VFSSnapshot, node: VFSNode): VFSPermissionClass {
  if (snapshot.currentUser === node.owner) return 'owner';
  const groupFile = Object.values(snapshot.nodes).find((entry) => entry.name === 'group' && entry.parentId === 'etc');
  const groupMembers = (groupFile?.content || '').split('\n').find((line) => line.startsWith(`${node.group}:`))?.split(':')[3]?.split(',') || [];
  if (snapshot.currentGroup === node.group || groupMembers.includes(snapshot.currentUser)) return 'group';
  return 'other';
}

export function hasVfsPermission(snapshot: VFSSnapshot, node: VFSNode, permission: VFSPermission): boolean {
  if (snapshot.currentUser === 'root') return true;
  const permissionClass = getPermissionClass(snapshot, node);
  const start = permissionClass === 'owner' ? 0 : permissionClass === 'group' ? 3 : 6;
  const charIndex = start + (permission === 'read' ? 0 : permission === 'write' ? 1 : 2);
  const bit = node.permissions[charIndex] || '-';
  if (permission === 'read') return bit === 'r';
  if (permission === 'write') return bit === 'w';
  return bit.toLowerCase() === 'x' || bit === 's' || bit === 't';
}

/** Returns the first directory on a resolved path that lacks search/execute access. */
export function findTraversalPermissionFailure(
  snapshot: VFSSnapshot,
  nodeId: string,
  includeTarget = false,
): VFSNode | undefined {
  const chain: VFSNode[] = [];
  let node: VFSNode | undefined = snapshot.nodes[nodeId];
  while (node) {
    chain.push(node);
    node = node.parentId ? snapshot.nodes[node.parentId] : undefined;
  }
  chain.reverse();
  const directories = chain.filter((entry, index) => {
    const isDirectory = entry.type === 'directory' || entry.type === 'mount-point';
    return isDirectory && (includeTarget || index < chain.length - 1);
  });
  return directories.find((directory) => !hasVfsPermission(snapshot, directory, 'execute'));
}

export function applyUmask(mode: '666' | '777', umask = '0022'): { symbolic: string; octal: string } {
  const safeMask = /^[0-7]{3,4}$/.test(umask) ? Number.parseInt(umask.slice(-3), 8) : 0o022;
  const permissions = Number.parseInt(mode, 8) & ~safeMask;
  return modeToSymbolic(permissions.toString(8).padStart(3, '0'));
}

/** Apply chmod's common symbolic grammar (for example u+x, go-w, or a=rw). */
export function applySymbolicMode(current: VFSNode, expression: string): { symbolic: string; octal: string } | null {
  if (!/^(?:[ugoa]*[+=-][rwx]+)(?:,[ugoa]*[+=-][rwx]+)*$/.test(expression)) return null;
  const permissions = [...current.permissions.slice(0, 9)];
  const octal = current.octalPermissions;
  let special = octal.length === 4 ? Number(octal[0]) : current.stickyBit ? 1 : 0;
  const classOffsets: Record<string, number> = { u: 0, g: 3, o: 6 };

  for (const clause of expression.split(',')) {
    const match = clause.match(/^([ugoa]*)([+=-])([rwx]+)$/);
    if (!match) return null;
    const [, classText, operator, requested] = match;
    const classes = classText.includes('a') || !classText ? ['u', 'g', 'o'] : [...new Set(classText.split(''))];
    for (const className of classes) {
      const offset = classOffsets[className];
      if (offset === undefined) return null;
      const positions = [offset, offset + 1, offset + 2];
      const symbols = ['r', 'w', 'x'];
      if (operator === '=') positions.forEach((position, index) => { permissions[position] = '-'; });
      symbols.forEach((symbol, index) => {
        if (!requested.includes(symbol)) return;
        const position = positions[index];
        if (operator === '-') permissions[position] = '-';
        else permissions[position] = symbol;
      });
    }
  }

  // Symbolic permission clauses preserve existing special bits, just as chmod u+x does.
  const digitFor = (start: number) => (permissions[start] === 'r' ? 4 : 0)
    + (permissions[start + 1] === 'w' ? 2 : 0)
    + (['x', 's', 't'].includes(permissions[start + 2]) ? 1 : 0);
  const digits = `${digitFor(0)}${digitFor(3)}${digitFor(6)}`;
  const result = modeToSymbolic(`${special ? special : ''}${digits}`);
  return { ...result, symbolic: result.symbolic };
}
