import type { QuizCheckpoint, QuizQuestion, QuizRevisionData } from '../../../engine/types/Quiz';
import { buildOptions } from '../../../engine/types/Quiz';
import type { CommandExecutionResult } from './vfsInterpreter';

export interface OSQuizQuestionDef {
  id: string;
  prompt: string;
  correct: string;
  distractors: [string, string, string];
  explanation: string;
  hint: string;
  concept: string;
}

export const OS_VFS_QUIZ_BANK: OSQuizQuestionDef[] = [
  {
    id: 'os-q1',
    prompt: 'What is the top-level root directory of the Linux Filesystem Hierarchy Standard (FHS)?',
    correct: '/ (Root directory)',
    distractors: ['/root', '/home', '/bin'],
    explanation: 'The single forward slash / is the root of the entire Linux filesystem hierarchy. All partitions, folders, and devices anchor under /.',
    hint: 'Think of the single symbol that starts all absolute paths in Linux.',
    concept: 'Root Hierarchy',
  },
  {
    id: 'os-q2',
    prompt: 'Which FHS directory stores system-wide configuration files like /etc/passwd and /etc/hosts?',
    correct: '/etc',
    distractors: ['/var', '/sys', '/config'],
    explanation: '/etc is dedicated to system-wide administration configuration files and system databases.',
    hint: 'Short for "et cetera", this directory holds static config files.',
    concept: 'System Configuration',
  },
  {
    id: 'os-q3',
    prompt: 'What special mode is set on the /tmp directory to ensure users can only delete their own temporary files?',
    correct: 'Sticky Bit (Octal 1777 / drwxrwxrwt)',
    distractors: ['SUID Bit', 'SGID Bit', 'Read-Only Mode'],
    explanation: 'The Sticky Bit (1777) allows anyone to write temporary files to /tmp, but prevents users from renaming or deleting files owned by others.',
    hint: 'It "sticks" file deletion rights strictly to the file owner.',
    concept: 'Special Permissions',
  },
  {
    id: 'os-q4',
    prompt: 'Which directory contains essential user command binaries available to all users (e.g. ls, cp, bash)?',
    correct: '/bin',
    distractors: ['/sbin', '/lib', '/usr/share'],
    explanation: '/bin contains fundamental system binaries required for single-user mode and normal user execution.',
    hint: 'Short for "binaries".',
    concept: 'Binary Executables',
  },
  {
    id: 'os-q5',
    prompt: 'What numerical octal permission mode corresponds to POSIX string rwxr-xr-x?',
    correct: '755',
    distractors: ['644', '777', '700'],
    explanation: 'User rwx (4+2+1=7), Group r-x (4+0+1=5), Others r-x (4+0+1=5) equals octal 755.',
    hint: 'Read=4, Write=2, Execute=1. Sum each group of 3 bits.',
    concept: 'Octal Permissions',
  },
  {
    id: 'os-q6',
    prompt: 'Which Linux command changes file ownership and group in a single command?',
    correct: 'chown owner:group filename',
    distractors: ['chmod', 'chgrp', 'usermod'],
    explanation: 'chown (change owner) accepts owner:group syntax to update both file owner and group attributes.',
    hint: 'Command stands for "change owner".',
    concept: 'File Ownership',
  },
  {
    id: 'os-q7',
    prompt: 'Where are dynamic system runtime log files like /var/log/syslog stored in FHS?',
    correct: '/var/log',
    distractors: ['/tmp/log', '/etc/log', '/proc/log'],
    explanation: '/var houses variable data that continuously grows during system operation, including logs in /var/log.',
    hint: 'Directory named for "variable" data.',
    concept: 'System Logging',
  },
  {
    id: 'os-q8',
    prompt: 'What does the bash command pwd accomplish?',
    correct: 'Prints the absolute path of the current working directory',
    distractors: ['Changes current directory to root', 'Lists files in the current folder', 'Shows logged in user password'],
    explanation: 'pwd stands for "Print Working Directory" and outputs the current absolute path context.',
    hint: 'P-W-D = Print Working Directory.',
    concept: 'Shell Navigation',
  },
  {
    id: 'os-q9',
    prompt: 'Which directory contains special device nodes representing hardware disks, null sinks, and pseudo-random generators?',
    correct: '/dev',
    distractors: ['/proc', '/sys', '/mnt'],
    explanation: '/dev contains device special files like block disks (/dev/sda), /dev/null, and /dev/urandom.',
    hint: 'Short for "devices".',
    concept: 'Device Nodes',
  },
  {
    id: 'os-q10',
    prompt: 'What distinguishes an absolute path from a relative path in Linux?',
    correct: 'Absolute paths begin at root /; relative paths begin from the current working directory',
    distractors: [
      'Absolute paths can only be 32 characters long',
      'Relative paths require root sudo privileges to execute',
      'Absolute paths only work for directories, not files'
    ],
    explanation: 'Absolute paths start with / and specify the complete path from root, while relative paths resolve from your active PWD.',
    hint: 'Look for the leading forward slash /.',
    concept: 'Path Resolution',
  },
  {
    id: 'os-q11',
    prompt: 'Which flag allows mkdir to create nested parent directories automatically without error?',
    correct: 'mkdir -p',
    distractors: ['mkdir -r', 'mkdir -f', 'mkdir -a'],
    explanation: 'mkdir -p (parents) creates any missing intermediate directories along the specified path.',
    hint: '-p stands for "parents".',
    concept: 'Directory Creation',
  },
  {
    id: 'os-q12',
    prompt: 'In Vim text editor, which key switches from Insert Mode back to Normal Mode?',
    correct: 'ESC key',
    distractors: ['CTRL + C', 'ENTER key', 'TAB key'],
    explanation: 'Pressing ESC in Vim exits Insert/Visual mode and returns to Normal mode for navigation and key commands.',
    hint: 'Escape from typing back to command navigation.',
    concept: 'Vim Modal Architecture',
  },
  {
    id: 'os-q13',
    prompt: 'In Vim command-line mode (:), what sequence saves the text buffer and exits the editor?',
    correct: ':wq',
    distractors: [':q!', ':x!', ':saveexit'],
    explanation: ':w writes changes to disk, :q quits the editor. Combined :wq saves and exits.',
    hint: 'Write + Quit.',
    concept: 'Vim File Operations',
  },
  {
    id: 'os-q14',
    prompt: 'Which command outputs the active user UID, username, and assigned GID group memberships?',
    correct: 'id',
    distractors: ['whoami', 'uname', 'useradd'],
    explanation: 'id displays full identity breakdown including User ID (UID), primary Group ID (GID), and secondary groups.',
    hint: 'Two-letter command for "identity".',
    concept: 'User Identity',
  },
  {
    id: 'os-q15',
    prompt: 'Which directory stores user personal documents, desktop files, and user-level configuration dotfiles?',
    correct: '/home',
    distractors: ['/root', '/usr', '/var'],
    explanation: '/home contains individual user home folders (e.g. /home/octa).',
    hint: 'Where user personal files live.',
    concept: 'User Space',
  },
  {
    id: 'os-q16',
    prompt: 'What pseudo-filesystem dynamically exposes Linux kernel status metrics and active process info?',
    correct: '/proc',
    distractors: ['/dev', '/etc', '/var'],
    explanation: '/proc is a virtual filesystem generated in RAM by the kernel containing process IDs and system stats.',
    hint: 'Short for "processes".',
    concept: 'Kernel Pseudo-Filesystems',
  },
  {
    id: 'os-q17',
    prompt: 'What numerical octal mode gives full permissions (rwx) to the file owner and zero permissions to group/others?',
    correct: '700',
    distractors: ['755', '600', '777'],
    explanation: 'Owner rwx (7), Group --- (0), Others --- (0) equals octal mode 700.',
    hint: '7 for owner, 0 for group, 0 for others.',
    concept: 'Private Permissions',
  },
  {
    id: 'os-q18',
    prompt: 'Which command recursively and forcibly removes a non-empty directory tree?',
    correct: 'rm -rf directory_name',
    distractors: ['rmdir directory_name', 'delete -all directory_name', 'unlink -r directory_name'],
    explanation: 'rm -r enables recursive directory traversal, -f forces deletion without confirmation prompts.',
    hint: 'Recursive (-r) + Force (-f).',
    concept: 'File Deletion',
  },
  {
    id: 'os-q19',
    prompt: 'What command modifies read, write, and execute POSIX permission bits on files and folders?',
    correct: 'chmod',
    distractors: ['chown', 'chgrp', 'umask'],
    explanation: 'chmod (change mode) updates the read, write, and execute access bits on targeted files.',
    hint: 'Short for "change mode".',
    concept: 'Permission Management',
  },
  {
    id: 'os-q20',
    prompt: 'Which FHS directory is designated for mounting external removable media like USB flash drives and CDs?',
    correct: '/media',
    distractors: ['/mnt', '/dev', '/opt'],
    explanation: '/media is auto-mounted by modern Linux desktop operating systems for removable storage media.',
    hint: 'Where digital media automounts.',
    concept: 'Mount Points',
  },
  {
    id: 'os-q21',
    prompt: 'What command creates a new empty file if it does not exist, or updates access timestamps if it does?',
    correct: 'touch filename',
    distractors: ['create filename', 'mkfile filename', 'cat filename'],
    explanation: 'touch creates empty files or refreshes the access and modification timestamps of existing files.',
    hint: '"Touching" a file updates its timestamp.',
    concept: 'File Timestamps',
  },
  {
    id: 'os-q22',
    prompt: 'What shortcut character in Linux shell paths represents the currently logged in user\'s home directory?',
    correct: '~ (Tilde)',
    distractors: ['. (Dot)', '.. (Dot Dot)', '* (Asterisk)'],
    explanation: '~ expands in the shell to the absolute path of the current user home directory (/home/username).',
    hint: 'The wavy tilde symbol.',
    concept: 'Shell Expansion',
  },
  {
    id: 'os-q23',
    prompt: 'In POSIX permissions rwxr-xr-x, what rights are granted to Others (the third triplet)?',
    correct: 'Read & Execute (r-x)',
    distractors: ['Full control (rwx)', 'Read only (r--)', 'No permissions (---)'],
    explanation: 'The third triplet r-x grants read and execute permissions to all non-owner/non-group users.',
    hint: 'Look at the last 3 characters: r-x.',
    concept: 'POSIX Triplets',
  },
  {
    id: 'os-q24',
    prompt: 'Which command lists directory contents in long format showing permissions, owner, group, size, and date?',
    correct: 'ls -l',
    distractors: ['ls -a', 'ls -r', 'ls -s'],
    explanation: 'ls -l displays detailed long-listing format with permissions, ownership, byte sizes, and timestamps.',
    hint: '-l stands for "long listing".',
    concept: 'Directory Inspection',
  },
  {
    id: 'os-q25',
    prompt: 'What is the Virtual File System (VFS) in the Linux kernel architecture?',
    correct: 'An abstraction layer providing a uniform API for diverse filesystems (ext4, NTFS, VFS in-memory)',
    distractors: [
      'A graphical desktop file explorer software package',
      'A database engine for storing web browser cache files',
      'A hardware device driver for USB flash drives'
    ],
    explanation: 'The VFS abstracts system storage structures, providing a single consistent system call interface for file operations.',
    hint: 'An abstraction layer unifying different filesystems under root /.',
    concept: 'VFS Abstraction',
  },
];

export function buildOSQuizCheckpoints(
  stepHistory: CommandExecutionResult['stepRecord'][]
): QuizCheckpoint[] {
  const checkpoints: QuizCheckpoint[] = [];

  // Map quiz questions to steps
  OS_VFS_QUIZ_BANK.forEach((qDef, idx) => {
    const targetStepIdx = Math.min(idx * 2, Math.max(0, stepHistory.length - 1));
    const question: QuizQuestion = {
      id: qDef.id,
      prompt: qDef.prompt,
      options: buildOptions(qDef.correct, qDef.distractors),
      explanation: qDef.explanation,
      hint: qDef.hint,
      weight: (idx % 3) + 1 as 1 | 2 | 3,
      concept: qDef.concept,
    };

    checkpoints.push({
      stepIndex: targetStepIdx,
      question,
    });
  });

  return checkpoints;
}

export function buildOSRevisionData(): QuizRevisionData {
  return {
    algorithmId: 'filesystem',
    algorithmName: 'Linux Virtual File System (VFS)',
    summary: 'Master Linux FHS directory structures, octal permissions, path resolution, and terminal commands.',
    keyTakeaways: [
      'Root / is the single anchor of the Linux filesystem hierarchy.',
      '/etc stores configurations; /var holds logs; /tmp carries the Sticky Bit 1777.',
      'POSIX permissions (rwx) translate to numeric octal modes (755, 644, 700).',
      'Vim operates in 3 modes: Normal mode for navigation, Insert mode for typing, Command mode for saving.',
    ],
    commonPitfalls: [
      'Confusing / (root directory) with /root (superuser home directory).',
      'Using rm -rf without verifying active PWD context.',
      'Forgetting that /tmp Sticky Bit permits deleting only your own files.',
    ],
  };
}
