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

export interface VFSSnapshot {
  nodes: Record<string, VFSNode>;
  rootId: string;
  currentDirId: string;
  currentUser: string;
  currentGroup: string;
  envVars: Record<string, string>;
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
      content: 'root:x:0:0:root:/root:/bin/bash\nstudent:x:1000:1000:STEM Student:/home/student:/bin/bash',
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
      content: 'root:x:0:\nsudo:x:27:student\nstudent:x:1000:',
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
      childrenIds: ['student-home'],
      owner: 'root',
      group: 'root',
      permissions: 'rwxr-xr-x',
      octalPermissions: '755',
      createdAt: now,
      modifiedAt: now,
    },
    'student-home': {
      id: 'student-home',
      name: 'student',
      type: 'directory',
      parentId: 'home',
      childrenIds: ['projects-dir', 'bashrc-file', 'welcome-txt'],
      owner: 'student',
      group: 'student',
      permissions: 'rwxr-xr-x',
      octalPermissions: '755',
      createdAt: now,
      modifiedAt: now,
    },
    'projects-dir': {
      id: 'projects-dir',
      name: 'projects',
      type: 'directory',
      parentId: 'student-home',
      childrenIds: ['app-js'],
      owner: 'student',
      group: 'student',
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
      owner: 'student',
      group: 'student',
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
      parentId: 'student-home',
      owner: 'student',
      group: 'student',
      permissions: 'rw-r--r--',
      octalPermissions: '644',
      content: '# STEM Studio Bash Configuration\nexport PS1="\\u@stem-studio:\\w\\$ "\nalias ll="ls -la"',
      createdAt: now,
      modifiedAt: now,
    },
    'welcome-txt': {
      id: 'welcome-txt',
      name: 'welcome.txt',
      type: 'file',
      parentId: 'student-home',
      owner: 'student',
      group: 'student',
      permissions: 'rw-r--r--',
      octalPermissions: '644',
      content: 'Welcome to the STEM Studio Interactive Virtual File System!\nTry running bash commands like ls, pwd, cd, useradd, chmod, or vim.',
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
    'sess-file': { id: 'sess-file', name: 'sess_temp', type: 'file', parentId: 'tmp', owner: 'student', group: 'student', permissions: 'rw-------', octalPermissions: '600', content: 'temporary session token', createdAt: now, modifiedAt: now },

    'usr': { id: 'usr', name: 'usr', type: 'directory', parentId: 'root', childrenIds: [], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'var': { id: 'var', name: 'var', type: 'directory', parentId: 'root', childrenIds: ['log-dir'], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'log-dir': { id: 'log-dir', name: 'log', type: 'directory', parentId: 'var', childrenIds: ['syslog-file'], owner: 'root', group: 'root', permissions: 'rwxr-xr-x', octalPermissions: '755', createdAt: now, modifiedAt: now },
    'syslog-file': { id: 'syslog-file', name: 'syslog', type: 'file', parentId: 'log-dir', owner: 'syslog', group: 'adm', permissions: 'rw-r-----', octalPermissions: '640', content: 'systemd[1]: Started Network Service.\nsystemd[1]: Reached target Network.', createdAt: now, modifiedAt: now },
  };

  return {
    nodes,
    rootId: 'root',
    currentDirId: 'student-home',
    currentUser: 'student',
    currentGroup: 'student',
    envVars: {
      USER: 'student',
      HOME: '/home/student',
      SHELL: '/bin/bash',
      PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      PWD: '/home/student',
    },
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

  while (current && current.id !== 'root') {
    parts.unshift(current.name);
    current = current.parentId ? nodes[current.parentId] : undefined;
  }

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
    const homeNode = Object.values(nodes).find(n => n.name === 'student' && n.parentId === 'home');
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
    if (!currNode || currNode.type !== 'directory') return null;

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
  if (mode.length === 3) {
    const map: Record<string, string> = {
      '0': '---', '1': '--x', '2': '-w-', '3': '-wx',
      '4': 'r--', '5': 'r-x', '6': 'rw-', '7': 'rwx'
    };
    const symbolic = (map[mode[0]] || 'rwx') + (map[mode[1]] || 'r-x') + (map[mode[2]] || 'r-x');
    return { symbolic, octal: mode };
  }
  return { symbolic: mode, octal: '755' };
}
