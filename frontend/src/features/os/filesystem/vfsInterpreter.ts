import { type VFSSnapshot, type VFSNode, getAbsolutePath, resolveNodeId, modeToSymbolic } from './vfs';


export interface CommandExecutionResult {
  output: string;
  newSnapshot: VFSSnapshot;
  stepRecord: {
    command: string;
    diff: string;
    explanation: string;
    targetNodeId?: string;
    animatedPathIds?: string[];
    mutationType?: 'create' | 'delete' | 'permission' | 'editor';
  };
  editorTrigger?: {
    type: 'nano' | 'vim';
    fileNodeId: string;
    filePath: string;
    initialContent: string;
  };
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

  // Parse arguments
  const parts = line.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

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
    const targetArg = args[0] || '~';
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

    // Build path trace from current to target for flow-line animation
    const traceIds: string[] = [];
    let curr: VFSNode | undefined = targetNode;
    while (curr) {
      traceIds.unshift(curr.id);
      curr = curr.parentId ? nodes[curr.parentId] : undefined;
    }

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
        explanation: `Changed active working directory to "${newPath}". Flow-line animation highlighted path traversal from root.`,
        targetNodeId: targetId,
        animatedPathIds: traceIds,
      },
    };
  }

  // --- 3. ls ---
  if (cmd === 'ls') {
    const showLong = args.some(a => a.includes('l'));
    const showAll = args.some(a => a.includes('a'));
    const pathArg = args.find(a => !a.startsWith('-')) || '.';

    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, pathArg);
    if (!targetId || !nodes[targetId]) {
      return {
        output: `ls: cannot access '${pathArg}': No such file or directory`,
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'Failed listing', explanation: `Path "${pathArg}" not found.` },
      };
    }

    const targetNode = nodes[targetId];
    const childIds = targetNode.type === 'directory' ? (targetNode.childrenIds || []) : [targetNode.id];
    let childNodes = childIds.map(id => nodes[id]).filter(Boolean);

    if (!showAll) {
      childNodes = childNodes.filter(n => !n.name.startsWith('.'));
    }

    let outputStr = '';
    if (showLong) {
      const lines = childNodes.map(n => {
        const typeChar = n.type === 'directory' ? 'd' : '-';
        const perms = `${typeChar}${n.permissions}`;
        const size = n.type === 'directory' ? '4096' : (n.content?.length || 0);
        return `${perms} 1 ${n.owner} ${n.group} ${String(size).padStart(6, ' ')} ${n.modifiedAt} ${n.name}`;
      });
      outputStr = `total ${childNodes.length * 4}\n` + lines.join('\n');
    } else {
      outputStr = childNodes.map(n => n.name).join('  ');
    }

    return {
      output: outputStr,
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Listed ${childNodes.length} entries`,
        explanation: `Directory listing for "${targetNode.name}" (${showLong ? 'long format' : 'short format'}).`,
        targetNodeId: targetId,
      },
    };
  }

  // --- 4. mkdir ---
  if (cmd === 'mkdir') {
    const dirName = args.find(a => !a.startsWith('-'));
    if (!dirName) {
      return {
        output: 'mkdir: missing operand',
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'Syntax error', explanation: 'mkdir requires a directory name argument.' },
      };
    }

    const now = new Date().toISOString().split('T')[0];
    const newId = `dir-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newDirNode: VFSNode = {
      id: newId,
      name: dirName,
      type: 'directory',
      parentId: currentDir.id,
      childrenIds: [],
      owner: nextSnapshot.currentUser,
      group: nextSnapshot.currentGroup,
      permissions: 'rwxr-xr-x',
      octalPermissions: '755',
      createdAt: now,
      modifiedAt: now,
    };

    nodes[newId] = newDirNode;
    currentDir.childrenIds = [...(currentDir.childrenIds || []), newId];

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `+ Created directory: ${dirName} (755)`,
        explanation: `Created new directory "${dirName}" in ${currentPath}. Node added to VFS tree with popIn animation.`,
        targetNodeId: newId,
        mutationType: 'create',
      },
    };
  }

  // --- 5. touch ---
  if (cmd === 'touch') {
    const fileName = args[0];
    if (!fileName) {
      return {
        output: 'touch: missing file operand',
        newSnapshot: snapshot,
        stepRecord: { command: line, diff: 'Syntax error', explanation: 'touch requires a file name.' },
      };
    }

    const existingId = currentDir.childrenIds?.find(id => nodes[id]?.name === fileName);
    const now = new Date().toISOString().split('T')[0];

    if (existingId && nodes[existingId]) {
      nodes[existingId].modifiedAt = now;
      return {
        output: '',
        newSnapshot: nextSnapshot,
        stepRecord: {
          command: line,
          diff: `Updated timestamp for ${fileName}`,
          explanation: `Updated modification time for existing file "${fileName}".`,
          targetNodeId: existingId,
        },
      };
    }

    const newId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const newFileNode: VFSNode = {
      id: newId,
      name: fileName,
      type: 'file',
      parentId: currentDir.id,
      owner: nextSnapshot.currentUser,
      group: nextSnapshot.currentGroup,
      permissions: 'rw-r--r--',
      octalPermissions: '644',
      content: '',
      createdAt: now,
      modifiedAt: now,
    };

    nodes[newId] = newFileNode;
    currentDir.childrenIds = [...(currentDir.childrenIds || []), newId];

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `+ Created empty file: ${fileName} (644)`,
        explanation: `Created new empty file "${fileName}" inside ${currentPath}.`,
        targetNodeId: newId,
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

    if (!targetId || !nodes[targetId]) {
      // Create new file node for editor
      const now = new Date().toISOString().split('T')[0];
      targetId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newFileNode: VFSNode = {
        id: targetId,
        name: fileName,
        type: 'file',
        parentId: currentDir.id,
        owner: nextSnapshot.currentUser,
        group: nextSnapshot.currentGroup,
        permissions: 'rw-r--r--',
        octalPermissions: '644',
        content: '',
        createdAt: now,
        modifiedAt: now,
      };
      nodes[targetId] = newFileNode;
      currentDir.childrenIds = [...(currentDir.childrenIds || []), targetId];
    } else {
      initialContent = nodes[targetId].content || '';
    }

    return {
      output: `[Opened ${cmd.toUpperCase()} Editor for ${fileName}]`,
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Opened ${cmd} editor for ${fileName}`,
        explanation: `Launched interactive ${cmd} text editor modal. Written edits will mutate VFS node state.`,
        targetNodeId: targetId,
        mutationType: 'editor',
      },
      editorTrigger: {
        type: cmd as 'nano' | 'vim',
        fileNodeId: targetId,
        filePath: fileName,
        initialContent,
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
    const perms = modeToSymbolic(modeArg);
    targetNode.permissions = perms.symbolic;
    targetNode.octalPermissions = perms.octal;

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Permissions updated: ${fileArg} -> ${perms.octal} (${perms.symbolic})`,
        explanation: `Updated permission mask on "${fileArg}" to octal ${perms.octal} (${perms.symbolic}). Flash pulse triggered.`,
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
    if (cmd === 'chown') {
      if (ownerArg.includes(':')) {
        const [u, g] = ownerArg.split(':');
        if (u) targetNode.owner = u;
        if (g) targetNode.group = g;
      } else {
        targetNode.owner = ownerArg;
      }
    } else {
      targetNode.group = ownerArg;
    }

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Ownership updated: ${fileArg} -> ${targetNode.owner}:${targetNode.group}`,
        explanation: `Changed ownership of "${fileArg}" to ${targetNode.owner}:${targetNode.group}.`,
        targetNodeId: targetId,
        mutationType: 'permission',
      },
    };
  }

  // --- 11. rm ---
  if (cmd === 'rm') {
    const fileArg = args.find(a => !a.startsWith('-'));
    if (!fileArg) {
      return { output: 'rm: missing operand', newSnapshot: snapshot, stepRecord: { command: line, diff: 'Syntax error', explanation: 'rm requires a file path.' } };
    }

    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, fileArg);
    if (!targetId || !nodes[targetId]) {
      return { output: `rm: cannot remove '${fileArg}': No such file or directory`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'File not found', explanation: `File ${fileArg} not found.` } };
    }

    const targetNode = nodes[targetId];
    const parentId = targetNode.parentId;

    if (parentId && nodes[parentId]) {
      nodes[parentId].childrenIds = nodes[parentId].childrenIds?.filter(id => id !== targetId);
    }
    delete nodes[targetId];

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `- Deleted node: ${fileArg}`,
        explanation: `Removed file/directory node "${fileArg}" from VFS tree.`,
        targetNodeId: parentId || undefined,
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
    if (srcNode.type === 'directory' && !isRecursive) {
      return { output: `cp: -r not specified; omitting directory '${srcPath}'`, newSnapshot: snapshot, stepRecord: { command: line, diff: 'Directory copy omitted', explanation: 'Use cp -r to recursively copy directories.' } };
    }

    const now = new Date().toISOString().split('T')[0];
    const newId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const copyNode: VFSNode = {
      ...JSON.parse(JSON.stringify(srcNode)),
      id: newId,
      name: dstPath.split('/').pop() || dstPath,
      parentId: currentDir.id,
      createdAt: now,
      modifiedAt: now,
    };

    nodes[newId] = copyNode;
    currentDir.childrenIds = [...(currentDir.childrenIds || []), newId];

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `+ Copied ${srcPath} -> ${dstPath}`,
        explanation: `Duplicated node "${srcPath}" to new destination "${dstPath}". Added node to tree.`,
        targetNodeId: newId,
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
    const newName = dstPath.split('/').pop() || dstPath;
    const oldName = srcNode.name;
    srcNode.name = newName;
    srcNode.modifiedAt = new Date().toISOString().split('T')[0];

    return {
      output: '',
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Renamed/Moved: ${oldName} -> ${newName}`,
        explanation: `Moved/Renamed file node from "${oldName}" to "${newName}".`,
        targetNodeId: srcId,
        mutationType: 'create',
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
        targetId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
        const newFileNode: VFSNode = {
          id: targetId,
          name: targetFileName,
          type: 'file',
          parentId: currentDir.id,
          owner: nextSnapshot.currentUser,
          group: nextSnapshot.currentGroup,
          permissions: 'rw-r--r--',
          octalPermissions: '644',
          content: textToWrite,
          createdAt: now,
          modifiedAt: now,
        };
        nodes[targetId] = newFileNode;
        currentDir.childrenIds = [...(currentDir.childrenIds || []), targetId];
      } else {
        const fileNode = nodes[existingId];
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
      const userHomeNode = Object.values(nodes).find(n => n.name === targetUser && n.parentId === 'home');
      if (userHomeNode) {
        delete nodes[userHomeNode.id];
        const homeNode = nodes['home'];
        if (homeNode) homeNode.childrenIds = homeNode.childrenIds?.filter(id => id !== userHomeNode.id);
      }
      return {
        output: '',
        newSnapshot: nextSnapshot,
        stepRecord: {
          command: line,
          diff: `- Deleted user account ${targetUser}`,
          explanation: `Deleted user account "${targetUser}" and removed /home/${targetUser} node.`,
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
  if (cmd === 'whoami') {
    return {
      output: nextSnapshot.currentUser,
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: 'Identity query', explanation: `Prints effective user name: ${nextSnapshot.currentUser}.` },
    };
  }

  if (cmd === 'id') {
    return {
      output: `uid=1000(${nextSnapshot.currentUser}) gid=1000(${nextSnapshot.currentGroup}) groups=1000(${nextSnapshot.currentGroup}),27(sudo)`,
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: 'ID query', explanation: `Prints UID, GID, and supplemental group IDs for active user.` },
    };
  }

  if (cmd === 'who') {
    return {
      output: `${nextSnapshot.currentUser}  tty7         2026-09-05 07:30 (:0)`,
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: 'Session query', explanation: 'Displays active shell user sessions.' },
    };
  }

  // --- 18. find & grep & head & tail & wc & uname ---
  if (cmd === 'find') {
    const matches = Object.values(nodes).map(n => getAbsolutePath(nodes, n.id));
    return {
      output: matches.join('\n'),
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: `Traversed tree (${matches.length} items)`, explanation: `Traversed VFS directory hierarchy matching search pattern.` },
    };
  }

  if (cmd === 'grep') {
    const pattern = args[0] || '';
    const fileArg = args[1] || 'welcome.txt';
    const targetId = resolveNodeId(nodes, nextSnapshot.currentDirId, fileArg);
    const targetNode = targetId ? nodes[targetId] : undefined;
    const fileLines = (targetNode?.content || '').split('\n');
    const matchedLines = fileLines.filter(l => l.toLowerCase().includes(pattern.toLowerCase()));

    return {
      output: matchedLines.join('\n') || `(no lines matching "${pattern}")`,
      newSnapshot: nextSnapshot,
      stepRecord: {
        command: line,
        diff: `Grep matched ${matchedLines.length} lines`,
        explanation: `Searched file "${fileArg}" for regex pattern "${pattern}".`,
        targetNodeId: targetId || undefined,
      },
    };
  }

  if (cmd === 'uname') {
    return {
      output: 'Linux stem-studio 5.15.0-88-generic #98-Ubuntu SMP x86_64 x86_64 x86_64 GNU/Linux',
      newSnapshot: nextSnapshot,
      stepRecord: { command: line, diff: 'Kernel query', explanation: 'Printed Linux kernel release details.' },
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

