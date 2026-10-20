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


