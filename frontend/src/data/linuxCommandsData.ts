export interface CommandExample {
  cmd: string;
  desc: string;
}

export interface CommandItem {
  id: string;
  name: string;
  type?: 'command' | 'concept';
  shortDesc: string;
  theory: string;
  syntax: string;
  examples: CommandExample[];
  badge?: string;
  vimModes?: {
    name: string;
    description: string;
    keybindings: string[];
  }[];
}

export interface CommandGroup {
  id: string;
  title: string;
  description: string;
  iconName: string;
  commands: CommandItem[];
}

export const LINUX_COMMAND_GROUPS: CommandGroup[] = [
  // 1. Path Concepts
  {
    id: 'path-concepts',
    title: 'Path Concepts',
    description: 'Fundamental directory navigation concepts in Linux file systems',
    iconName: 'FolderGit2',
    commands: [
      {
        id: 'abs-vs-rel',
        name: 'Absolute vs Relative Paths',
        type: 'concept',
        shortDesc: 'Understanding absolute path starting from root vs relative path from current directory',
        theory: 'An Absolute Path specifies a location starting from the root directory (/), e.g., /home/user/docs. It always points to the exact same file regardless of your current directory. A Relative Path specifies a location relative to your current working directory, e.g., docs/letter.txt or ../downloads.',
        syntax: '/path/from/root  (Absolute)\npath/from/pwd   (Relative)',
        examples: [
          { cmd: 'cd /var/log/nginx', desc: 'Absolute path navigation directly from root /' },
          { cmd: 'cd ./documents/notes', desc: 'Relative path navigation inside current directory .' },
          { cmd: 'cat ../config.json', desc: 'Relative path reference to parent directory ..' }
        ]
      },
      {
        id: 'dot-and-dotdot',
        name: '. (Current) and .. (Parent)',
        type: 'concept',
        shortDesc: 'Special directory aliases for current directory (.) and parent directory (..)',
        theory: 'In Linux, every directory contains two hidden pointers: "." refers to the current directory itself, while ".." refers to the parent directory one level up in the hierarchy. These shortcuts are crucial for relative path navigation and script execution.',
        syntax: '.  (Current Directory)\n.. (Parent Directory)',
        examples: [
          { cmd: 'python3 ./app.py', desc: 'Execute script located in the current working directory' },
          { cmd: 'cd ..', desc: 'Move up one directory level' },
          { cmd: 'cp ../shared/file.txt .', desc: 'Copy file from parent directory to current directory .' }
        ]
      },
      {
        id: 'tilde',
        name: '~ (Home Directory Shortcut)',
        type: 'concept',
        shortDesc: 'Tilde expansion shortcut representing the current user\'s home directory',
        theory: 'The tilde (~) symbol is a shell shortcut representing the home directory of the currently logged-in user (e.g., /home/student or /root). Using ~ saves typing long absolute paths.',
        syntax: '~         (Current user home)\n~username (Target user home)',
        examples: [
          { cmd: 'cd ~', desc: 'Navigate directly to your home directory' },
          { cmd: 'cat ~/.bashrc', desc: 'View user bash configuration file in home folder' },
          { cmd: 'cp data.csv ~/downloads/', desc: 'Copy file into downloads directory inside user home' }
        ]
      }
    ]
  },

  // 2. Navigation
  {
    id: 'navigation',
    title: 'Navigation',
    description: 'Commands to print working directory, change folders, and list contents',
    iconName: 'Compass',
    commands: [
      {
        id: 'pwd',
        name: 'pwd',
        shortDesc: 'Print name of current/working directory',
        theory: 'pwd (Print Working Directory) outputs the full absolute path of the directory you are currently in. Useful when executing scripts or verifying path location before running destructive operations.',
        syntax: 'pwd [options]',
        examples: [
          { cmd: 'pwd', desc: 'Prints absolute path of current working location, e.g., /home/student/projects' },
          { cmd: 'pwd -P', desc: 'Prints physical path resolving symbolic links' }
        ]
      },
      {
        id: 'cd',
        name: 'cd',
        shortDesc: 'Change the shell working directory',
        theory: 'cd (Change Directory) allows moving between directories in the filesystem hierarchy. Supports absolute paths, relative paths, home directory shortcuts (~), and previous directory toggles (-).',
        syntax: 'cd [directory]',
        examples: [
          { cmd: 'cd /var/www/html', desc: 'Change to absolute path /var/www/html' },
          { cmd: 'cd ~', desc: 'Navigate directly to current user\'s home directory' },
          { cmd: 'cd -', desc: 'Switch back to the previous directory location' },
          { cmd: 'cd ..', desc: 'Move up one level into parent directory' }
        ]
      },
      {
        id: 'ls',
        name: 'ls',
        shortDesc: 'List directory contents',
        theory: 'ls lists files and subdirectories within a directory. Supports detailed long-format output (-l), showing hidden files starting with dot (-a), and human-readable file sizes (-lh).',
        syntax: 'ls [options] [file/dir...]',
        examples: [
          { cmd: 'ls -l', desc: 'Long listing format showing permissions, owner, size, and modification date' },
          { cmd: 'ls -a', desc: 'List all entries including hidden files (starting with dot .)' },
          { cmd: 'ls -lh', desc: 'Detailed listing with human-readable file sizes (e.g. 4.2K, 120M, 1.5G)' }
        ]
      }
    ]
  },

  // 3. File & Directory Ops
  {
    id: 'file-ops',
    title: 'File & Directory Operations',
    description: 'Creating, copying, moving, renaming, and removing files and directories',
    iconName: 'FolderPlus',
    commands: [
      {
        id: 'mkdir',
        name: 'mkdir',
        shortDesc: 'Make directories',
        theory: 'mkdir creates new directories. The -p (parents) option creates missing nested parent directories automatically without throwing errors if they already exist.',
        syntax: 'mkdir [options] directory_name...',
        examples: [
          { cmd: 'mkdir projects', desc: 'Create a directory named "projects" in current folder' },
          { cmd: 'mkdir -p src/components/ui', desc: 'Create nested directory hierarchy in a single command' }
        ]
      },
      {
        id: 'rmdir',
        name: 'rmdir',
        shortDesc: 'Remove empty directories',
        theory: 'rmdir removes empty directories from the filesystem. Safety guard: it fails if the directory contains any files or subfolders, preventing accidental mass deletion.',
        syntax: 'rmdir [options] directory_name...',
        examples: [
          { cmd: 'rmdir temp_dir', desc: 'Remove empty directory named "temp_dir"' },
          { cmd: 'rmdir -p a/b/c', desc: 'Remove empty subdirectories and parent directories recursively' }
        ]
      },
      {
        id: 'touch',
        name: 'touch',
        shortDesc: 'Change file timestamps or create empty file',
        theory: 'touch updates the access and modification timestamps of a file. If the file does not exist, touch creates a new empty file (0 bytes). Commonly used to create blank placeholder files.',
        syntax: 'touch [options] filename...',
        examples: [
          { cmd: 'touch index.html', desc: 'Create an empty file named index.html if it does not exist' },
          { cmd: 'touch file1.txt file2.txt', desc: 'Create multiple empty files simultaneously' }
        ]
      },
      {
        id: 'cp',
        name: 'cp',
        shortDesc: 'Copy files and directories',
        theory: 'cp copies files or directories from source to destination. To copy folders recursively with all nested contents, use the -r or -R flag.',
        syntax: 'cp [options] source destination',
        examples: [
          { cmd: 'cp config.sample.env .env', desc: 'Copy config file to new .env file' },
          { cmd: 'cp -r src/ backup/src_backup', desc: 'Recursively copy entire directory tree' },
          { cmd: 'cp -v data.json /tmp/', desc: 'Copy file with verbose output showing file operations' }
        ]
      },
      {
        id: 'mv',
        name: 'mv',
        shortDesc: 'Move or rename files and directories',
        theory: 'mv moves files or directories to a new location or renames them if source and destination are in the same directory. Unlike cp, mv deletes the original source upon completion.',
        syntax: 'mv [options] source destination',
        examples: [
          { cmd: 'mv draft.txt final.txt', desc: 'Rename file from draft.txt to final.txt' },
          { cmd: 'mv report.pdf ~/documents/', desc: 'Move file report.pdf into documents directory' }
        ]
      },
      {
        id: 'rm',
        name: 'rm',
        shortDesc: 'Remove files or directories',
        theory: 'rm deletes specified files or directories from the system. Caution: Linux command line has no recycling bin! Use -r for recursive directory deletion and -f to force deletion without confirmation prompt.',
        syntax: 'rm [options] file/dir...',
        examples: [
          { cmd: 'rm temp.log', desc: 'Delete single log file' },
          { cmd: 'rm -rf node_modules', desc: 'Forcefully and recursively remove directory and all contents' },
          { cmd: 'rm -i dangerous.sh', desc: 'Interactive prompt asking confirmation before deletion' }
        ]
      }
    ]
  },

  // 4. Search & Lookup
  {
    id: 'search-lookup',
    title: 'Search & Lookup',
    description: 'Tools to locate binaries, search directory trees, and filter text streams using regex',
    iconName: 'Search',
    commands: [
      {
        id: 'find',
        name: 'find',
        shortDesc: 'Search for files in a directory hierarchy',
        theory: 'find traverses directory trees to locate files matching specified criteria like name, type, size, modification time (-mtime), or permissions. Can execute custom shell commands on matching files via -exec.',
        syntax: 'find [path] [expression]',
        examples: [
          { cmd: 'find . -name "*.log"', desc: 'Find all files ending with .log in current directory tree' },
          { cmd: 'find /var/www -type d', desc: 'Find all directories under /var/www' },
          { cmd: 'find /tmp -mtime +7 -exec rm {} \\;', desc: 'Find and delete files in /tmp older than 7 days' }
        ]
      },
      {
        id: 'whereis',
        name: 'whereis',
        shortDesc: 'Locate the binary, source, and manual page files for a command',
        theory: 'whereis searches standard system binary directories (/bin, /usr/bin, etc.) for executable files, source code, and man pages matching command name.',
        syntax: 'whereis [options] command_name',
        examples: [
          { cmd: 'whereis python3', desc: 'Outputs locations of python3 binary, source, and man pages' },
          { cmd: 'whereis -b nginx', desc: 'Search only for binary executable locations of nginx' }
        ]
      },
      {
        id: 'grep',
        name: 'grep',
        shortDesc: 'Print lines matching a pattern using regular expressions',
        theory: 'grep (Global Regular Expression Print) searches text files or stdin for lines matching a pattern. Key options include -i (ignore case), -r (recursive search in directory), and -n (print line numbers).',
        syntax: 'grep [options] PATTERN [FILE...]',
        examples: [
          { cmd: 'grep -i "error" /var/log/syslog', desc: 'Case-insensitive search for "error" in syslog' },
          { cmd: 'grep -rn "TODO" ./src/', desc: 'Recursive search for "TODO" with line numbers in ./src/' },
          { cmd: 'ps aux | grep node', desc: 'Filter process list output for node processes' }
        ]
      },
      {
        id: 'sed',
        name: 'sed',
        shortDesc: 'Stream editor for filtering and transforming text',
        theory: 'sed performs automated text transformations on an input stream (a file or input from a pipeline). Most commonly used for inline text substitution s/find/replace/g.',
        syntax: 'sed [options] \'command\' file',
        examples: [
          { cmd: 'sed \'s/http/https/g\' config.txt', desc: 'Replace all occurrences of http with https in stream output' },
          { cmd: 'sed -i \'s/v1/v2/g\' API.js', desc: 'In-place edit (-i) substituting v1 with v2 inside API.js' }
        ]
      },
      {
        id: 'awk',
        name: 'awk',
        shortDesc: 'Pattern scanning and text processing language',
        theory: 'awk is a powerful text-processing tool designed for extracting and manipulating structured data organized into rows and columns (fields delimited by spaces or commas). $1, $2 represent fields.',
        syntax: 'awk \'pattern { action }\' file',
        examples: [
          { cmd: 'awk \'{print $1, $3}\' data.txt', desc: 'Print 1st and 3rd whitespace-delimited columns of data.txt' },
          { cmd: 'ls -l | awk \'{print $5, $9}\'', desc: 'Extract and print file size ($5) and file name ($9) from ls -l' }
        ]
      }
    ]
  },

  // 5. Editors
  {
    id: 'editors',
    title: 'Text Editors',
    description: 'Terminal text editors from beginner nano to advanced modal Vim',
    iconName: 'Edit3',
    commands: [
      {
        id: 'nano',
        name: 'nano',
        shortDesc: 'Simple, beginner-friendly terminal text editor',
        theory: 'nano is a straightforward command-line text editor with visible keybinding shortcuts displayed at the bottom of the screen. Ideal for quick config file edits without complex command modes.',
        syntax: 'nano [options] filename',
        examples: [
          { cmd: 'nano /etc/hosts', desc: 'Open /etc/hosts file for editing' },
          { cmd: 'Ctrl+O then Enter', desc: 'Save (Write Out) changes inside nano' },
          { cmd: 'Ctrl+X', desc: 'Exit nano editor' }
        ]
      },
      {
        id: 'vim',
        name: 'vim (Vi Improved)',
        shortDesc: 'Highly configurable, modal text editor built for efficiency',
        badge: 'Extra Depth',
        theory: 'Vim is a modal text editor designed for keyboard-only speed. Unlike traditional editors where typing key presses instantly inserts text, Vim operates in distinct "modes". Modal design eliminates reliance on arrow keys or mouse movement, allowing developers to perform rapid text editing commands directly from the touch-typing home row position.',
        syntax: 'vim [filename]',
        examples: [
          { cmd: 'vim server.js', desc: 'Open server.js in Vim Normal mode' },
          { cmd: 'i', desc: 'Switch to Insert mode to start typing text' },
          { cmd: 'Esc -> :wq', desc: 'Return to Normal mode, type :wq to write file and quit' },
          { cmd: 'dd', desc: 'Delete (cut) current line in Normal mode' },
          { cmd: 'yy then p', desc: 'Yank (copy) line and paste below cursor position' },
          { cmd: '/pattern', desc: 'Search for text pattern within file' }
        ],
        vimModes: [
          {
            name: '1. Normal Mode (Command Mode)',
            description: 'Default startup mode. Keys map to navigation and text manipulation commands (e.g. h/j/k/l navigation, dd to delete line, yy to copy). Typing characters does NOT insert text directly.',
            keybindings: ['i -> Switch to Insert Mode', ': -> Switch to Command-line Mode', 'dd -> Delete (cut) line', 'yy -> Copy (yank) line', 'p -> Paste below cursor', 'u -> Undo last action']
          },
          {
            name: '2. Insert Mode',
            description: 'Entered by pressing "i" (or "a" for append, "o" for new line). Functions like a standard text editor where typed characters appear directly on screen.',
            keybindings: ['Esc -> Exit back to Normal Mode', 'Typed characters appear on buffer']
          },
          {
            name: '3. Command-line Mode',
            description: 'Entered from Normal mode by typing ":". Allows executing file commands like saving (:w), quitting (:q), force quit without saving (:q!), or searching (/pattern).',
            keybindings: [':w -> Save (write) file', ':q -> Quit editor', ':wq -> Save and quit', ':q! -> Force quit discarding unsaved edits', '/search_term -> Search forward']
          }
        ]
      }
    ]
  },

  // 6. User Management
  {
    id: 'user-management',
    title: 'User Management',
    description: 'Managing system accounts, passwords, identity, and elevated privileges',
    iconName: 'UserCheck',
    commands: [
      {
        id: 'useradd',
        name: 'useradd / adduser',
        shortDesc: 'Create a new user account or update default new user information',
        theory: 'useradd is a low-level utility to create system users, while adduser is an interactive user-friendly wrapper on Debian/Ubuntu. Creates home directory, assigns shell, and initializes default user environment.',
        syntax: 'useradd [options] username\nadduser username',
        examples: [
          { cmd: 'sudo useradd -m -s /bin/bash alice', desc: 'Create user alice with home directory (-m) and bash shell (-s)' },
          { cmd: 'sudo adduser bob', desc: 'Interactive prompt creating user bob with password assignment' }
        ]
      },
      {
        id: 'userdel',
        name: 'userdel',
        shortDesc: 'Delete a user account and related files',
        theory: 'userdel removes a user account from system user databases (/etc/passwd, /etc/shadow). Using -r option removes the user\'s home directory and mail spool as well.',
        syntax: 'userdel [options] username',
        examples: [
          { cmd: 'sudo userdel tempuser', desc: 'Delete user account while retaining home directory files' },
          { cmd: 'sudo userdel -r tempuser', desc: 'Delete user account AND recursively remove user\'s home folder' }
        ]
      },
      {
        id: 'passwd',
        name: 'passwd',
        shortDesc: 'Change user password',
        theory: 'passwd changes password for current user or specified user account (requires root/sudo for changing other users). Updates encrypted password hash stored in /etc/shadow.',
        syntax: 'passwd [options] [username]',
        examples: [
          { cmd: 'passwd', desc: 'Prompt to update current user\'s password' },
          { cmd: 'sudo passwd alice', desc: 'Set or reset password for user alice' }
        ]
      },
      {
        id: 'usermod',
        name: 'usermod',
        shortDesc: 'Modify a user account',
        theory: 'usermod modifies existing user account settings, such as appending user to supplemental groups (-aG), changing home folder (-d), or setting login shell (-s).',
        syntax: 'usermod [options] username',
        examples: [
          { cmd: 'sudo usermod -aG sudo alice', desc: 'Append (-a) user alice to supplemental group (-G) sudo' },
          { cmd: 'sudo usermod -s /bin/zsh bob', desc: 'Change bob\'s default login shell to zsh' }
        ]
      },
      {
        id: 'who-whoami-id',
        name: 'who / whoami / id',
        shortDesc: 'Check logged-in users, identity, and group membership IDs',
        theory: 'who shows logged-in system users. whoami prints current effective username. id prints detailed UID (User ID), GID (Group ID), and list of all active user group memberships.',
        syntax: 'whoami\nid [username]\nwho',
        examples: [
          { cmd: 'whoami', desc: 'Prints active username, e.g., student' },
          { cmd: 'id alice', desc: 'Prints UID, primary GID, and secondary group IDs for alice' },
          { cmd: 'who', desc: 'Shows list of currently logged-in users and terminal sessions' }
        ]
      },
      {
        id: 'su-sudo',
        name: 'su / sudo',
        shortDesc: 'Substitute user identity or execute command with superuser privileges',
        theory: 'su (Switch User) switches current shell identity to another user account (default root). sudo (SuperUser DO) executes a single command with root privileges as governed by /etc/sudoers.',
        syntax: 'sudo command\nsu - [username]',
        examples: [
          { cmd: 'sudo systemctl restart nginx', desc: 'Execute service command with root administrative rights' },
          { cmd: 'su - alice', desc: 'Switch user shell to alice loading alice\'s environment' }
        ]
      }
    ]
  },

  // 7. Group Management
  {
    id: 'group-management',
    title: 'Group Management',
    description: 'Creating groups, assigning permissions, and inspecting /etc/passwd & /etc/group',
    iconName: 'Users',
    commands: [
      {
        id: 'groupadd-del-mod',
        name: 'groupadd / groupdel / groupmod',
        shortDesc: 'Create, delete, or modify group definitions',
        theory: 'Linux permissions use Groups to grant shared directory/file access to multiple users. groupadd creates a new group, groupdel removes an existing group, and groupmod modifies group names or GIDs.',
        syntax: 'sudo groupadd group_name\nsudo groupdel group_name',
        examples: [
          { cmd: 'sudo groupadd developers', desc: 'Create new group named "developers"' },
          { cmd: 'sudo groupdel old_team', desc: 'Remove unused group "old_team"' },
          { cmd: 'sudo groupmod -n dev_team developers', desc: 'Rename group developers to dev_team' }
        ]
      },
      {
        id: 'usermod-ag-gpasswd',
        name: 'usermod -aG / gpasswd',
        shortDesc: 'Add or remove users from system groups',
        theory: 'To grant group permissions, users are added to groups. Always use -aG (append) with usermod so existing group memberships are preserved! gpasswd -d explicitly removes a user from a group.',
        syntax: 'sudo usermod -aG group user\nsudo gpasswd -d user group',
        examples: [
          { cmd: 'sudo usermod -aG docker student', desc: 'Add user student to docker group (preserving existing groups)' },
          { cmd: 'sudo gpasswd -d student docker', desc: 'Remove user student from docker group' },
          { cmd: 'groups student', desc: 'List all groups user student belongs to' }
        ]
      },
      {
        id: 'passwd-group-files',
        name: '/etc/passwd and /etc/group Files',
        type: 'concept',
        shortDesc: 'System databases storing user account records and group configurations',
        theory: '/etc/passwd contains user account info formatted as username:x:UID:GID:comment:home:shell. /etc/group contains group definitions formatted as groupname:x:GID:user1,user2.',
        syntax: 'cat /etc/passwd\ncat /etc/group',
        examples: [
          { cmd: 'grep student /etc/passwd', desc: 'Inspect account entry for user student' },
          { cmd: 'grep developers /etc/group', desc: 'View list of users assigned to group developers' }
        ]
      }
    ]
  },

  // 8. Permissions
  {
    id: 'permissions',
    title: 'Permissions & Ownership',
    description: 'Read, write, execute rights in symbolic (rwx) and octal (755) notation, chown, umask, and special bits',
    iconName: 'ShieldCheck',
    commands: [
      {
        id: 'chmod',
        name: 'chmod',
        shortDesc: 'Change file access permissions (symbolic and octal modes)',
        theory: 'Linux permissions govern Read (r=4), Write (w=2), and Execute (x=1) access for User (u), Group (g), and Others (o). chmod accepts symbolic assignments (e.g. u+x, g-w) OR Octal numbers (e.g. 755 = rwxr-xr-x, 644 = rw-r--r--).',
        syntax: 'chmod [options] mode file\nOctal: 4=r, 2=w, 1=x',
        examples: [
          { cmd: 'chmod 755 script.sh', desc: 'Octal 755 (rwxr-xr-x): User=rwx (7), Group=r-x (5), Others=r-x (5)' },
          { cmd: 'chmod 644 document.txt', desc: 'Octal 644 (rw-r--r--): User=rw (6), Group=r (4), Others=r (4)' },
          { cmd: 'chmod u+x build.sh', desc: 'Symbolic: Add execute (+x) permission for user owner (u)' },
          { cmd: 'chmod g-w file.txt', desc: 'Symbolic: Remove write (-w) permission for group (g)' }
        ]
      },
      {
        id: 'chown-chgrp',
        name: 'chown / chgrp',
        shortDesc: 'Change file owner and group association',
        theory: 'chown changes file owner user and/or group. chgrp changes group ownership. Essential when configuring web server document roots or shared directory ownership.',
        syntax: 'chown owner:group file\nchgrp group file',
        examples: [
          { cmd: 'sudo chown www-data:www-data /var/www/html', desc: 'Set user owner and group owner to www-data' },
          { cmd: 'sudo chown -R alice:devs ./project', desc: 'Recursively change owner to alice and group to devs' }
        ]
      },
      {
        id: 'umask-special-bits',
        name: 'umask & Special Bits (SetUID, SetGID, Sticky)',
        type: 'concept',
        shortDesc: 'Default permission mask (umask) and special bits (SetUID 4000, SetGID 2000, Sticky Bit 1000)',
        theory: 'umask defines default permissions subtracted from new files (666) and directories (777). Special Bits: SetUID (4000) executes binary as file owner; SetGID (2000) inherits group ownership for new files; Sticky Bit (1777 on /tmp) allows users to create files in shared folders but only delete their own files.',
        syntax: 'umask 022\nchmod 1777 /tmp (Sticky Bit)',
        examples: [
          { cmd: 'umask 022', desc: 'Default mask setting new file perms to 644 and dirs to 755' },
          { cmd: 'ls -ld /tmp', desc: 'View /tmp directory perms showing sticky bit (drwxrwxrwt)' },
          { cmd: 'chmod 4755 executable', desc: 'SetUID bit on binary file so it executes with owner rights' }
        ]
      }
    ]
  },

  // 9. Process Management
  {
    id: 'process-management',
    title: 'Process Management',
    description: 'Monitoring system processes, priority (nice/renice), signals, and job control',
    iconName: 'Cpu',
    commands: [
      {
        id: 'ps',
        name: 'ps',
        shortDesc: 'Report snapshot of current processes',
        theory: 'ps displays active system processes. Standard invocation ps aux shows all running processes across all users with CPU/memory usage, process IDs (PID), and start commands.',
        syntax: 'ps [options]',
        examples: [
          { cmd: 'ps aux', desc: 'List all running processes in BSD syntax format' },
          { cmd: 'ps -ef', desc: 'List all system processes in full standard POSIX format' },
          { cmd: 'ps aux | grep nginx', desc: 'Filter running process list for nginx daemon' }
        ]
      },
      {
        id: 'top-htop',
        name: 'top / htop',
        shortDesc: 'Display real-time dynamic view of system processes',
        theory: 'top prints interactive real-time process activity, CPU usage, memory consumption, and system load averages. htop is an enhanced color-coded interactive version with scrollable process trees.',
        syntax: 'top\nhtop',
        examples: [
          { cmd: 'top', desc: 'Standard real-time terminal process monitor' },
          { cmd: 'htop', desc: 'Interactive visual process viewer (supports kill signal directly)' }
        ]
      },
      {
        id: 'nice-renice',
        name: 'nice / renice',
        shortDesc: 'Run a program with modified scheduling priority',
        theory: 'Nice values range from -20 (highest priority, least nice) to 19 (lowest priority, most nice to other processes). nice launches a command with specified priority; renice modifies a running PID\'s priority.',
        syntax: 'nice -n priority command\nrenice priority -p PID',
        examples: [
          { cmd: 'nice -n 10 python3 heavy_script.py', desc: 'Launch CPU-intensive script with low priority (nice 10)' },
          { cmd: 'sudo renice -5 -p 1234', desc: 'Elevate PID 1234 process priority to -5' }
        ]
      },
      {
        id: 'job-control',
        name: 'Job Control (&, fg, bg, jobs, nohup, disown)',
        shortDesc: 'Manage background jobs, job state, and process survival across session logout',
        theory: 'Appending & runs a command in the background. jobs lists background jobs. fg brings a job to foreground; bg resumes suspended job in background. nohup and disown keep background jobs running after shell disconnect.',
        syntax: 'command &\nfg %job_id\nnohup command &',
        examples: [
          { cmd: 'python3 server.py &', desc: 'Run server script as background job' },
          { cmd: 'jobs', desc: 'List active background jobs in current shell session' },
          { cmd: 'fg %1', desc: 'Bring job #1 to foreground' },
          { cmd: 'nohup node app.js &', desc: 'Run node app surviving shell terminal disconnect' }
        ]
      },
      {
        id: 'kill-variants',
        name: 'kill / killall / pkill',
        shortDesc: 'Send termination signals to processes',
        theory: 'kill sends signals to processes by PID (default SIGTERM 15). SIGKILL (-9) forcefully terminates unresponsive processes. killall and pkill target processes by process name.',
        syntax: 'kill [-signal] PID\npkill process_name',
        examples: [
          { cmd: 'kill 1420', desc: 'Send graceful termination signal (SIGTERM 15) to PID 1420' },
          { cmd: 'kill -9 1420', desc: 'Force kill process PID 1420 immediately (SIGKILL 9)' },
          { cmd: 'pkill -f node', desc: 'Kill all running processes matching name "node"' }
        ]
      }
    ]
  },

  // 10. Package Management
  {
    id: 'package-management',
    title: 'Package Management',
    description: 'Debian/Ubuntu package manager commands (apt) and accelerated downloads',
    iconName: 'Package',
    commands: [
      {
        id: 'apt',
        name: 'apt (Advanced Package Tool)',
        shortDesc: 'Debian/Ubuntu package management command-line utility',
        theory: 'apt handles installing, updating, upgrading, and removing software packages from repository mirrors. Automatically resolves and downloads dependent libraries.',
        syntax: 'sudo apt subcommand [package_name]',
        examples: [
          { cmd: 'sudo apt update', desc: 'Fetch latest repository package indexes' },
          { cmd: 'sudo apt upgrade', desc: 'Upgrade all installed packages to latest versions' },
          { cmd: 'sudo apt install curl git', desc: 'Install curl and git packages' },
          { cmd: 'sudo apt remove nginx', desc: 'Remove installed package nginx' }
        ]
      },
      {
        id: 'apt-fast-aria2',
        name: 'apt-fast + aria2',
        shortDesc: 'Accelerated parallel package downloader for apt',
        theory: 'apt-fast is a wrapper script for apt-get that drastically speeds up package downloading by opening multiple simultaneous connections per package using aria2 multi-threaded engine.',
        syntax: 'sudo apt-fast install package_name',
        examples: [
          { cmd: 'sudo apt-fast update', desc: 'Update repository listings using parallel connections' },
          { cmd: 'sudo apt-fast install build-essential', desc: 'Download package chunks in parallel via aria2' }
        ]
      }
    ]
  },

  // 11. Network Commands
  {
    id: 'network-commands',
    title: 'Network Commands',
    description: 'Network connectivity diagnostic, IP inspection, HTTP clients, and remote SSH tools',
    iconName: 'Globe',
    commands: [
      {
        id: 'ping',
        name: 'ping',
        shortDesc: 'Send ICMP ECHO_REQUEST to network hosts',
        theory: 'ping sends ICMP packet requests to a destination host to check reachability and measure round-trip latency time in milliseconds.',
        syntax: 'ping [options] destination',
        examples: [
          { cmd: 'ping google.com', desc: 'Test connectivity and latency to google.com' },
          { cmd: 'ping -c 4 192.168.1.1', desc: 'Send exactly 4 ICMP ping requests to gateway' }
        ]
      },
      {
        id: 'curl-wget',
        name: 'curl / wget',
        shortDesc: 'Command-line tools to transfer data and download files via HTTP/HTTPS/FTP',
        theory: 'curl transfers data to or from a server supporting REST APIs and custom HTTP headers. wget is a non-interactive downloader capable of recursive directory fetching.',
        syntax: 'curl [options] URL\nwget [options] URL',
        examples: [
          { cmd: 'curl -I https://example.com', desc: 'Fetch HTTP response headers only' },
          { cmd: 'curl -X POST -d "{\"key\":\"val\"}" http://api/data', desc: 'Send HTTP POST payload' },
          { cmd: 'wget https://downloads.org/archive.tar.gz', desc: 'Download file directly to current folder' }
        ]
      },
      {
        id: 'ip-ifconfig',
        name: 'ip a / ifconfig',
        shortDesc: 'Display and configure network interface addresses',
        theory: 'ip a (from iproute2 package) is the modern Linux standard for inspecting IP addresses, MAC addresses, and interface link status. ifconfig is the legacy net-tools equivalent.',
        syntax: 'ip a\nip addr show dev eth0',
        examples: [
          { cmd: 'ip a', desc: 'Display all network interfaces and assigned IP addresses' },
          { cmd: 'ip route show', desc: 'Display default gateway routing table' }
        ]
      },
      {
        id: 'ss-netstat',
        name: 'ss / netstat',
        shortDesc: 'Investigate socket statistics and listening ports',
        theory: 'ss (Socket Statistics) inspects network ports, open TCP/UDP sockets, and listening services. Displays process PID listening on specific port numbers.',
        syntax: 'ss [options]',
        examples: [
          { cmd: 'ss -tulpn', desc: 'Show all listening (-l) TCP (-t) and UDP (-u) ports with PID (-p) and numeric (-n)' },
          { cmd: 'netstat -tulpn', desc: 'Legacy socket inspection tool listing open network ports' }
        ]
      },
      {
        id: 'ssh-scp',
        name: 'ssh / scp',
        shortDesc: 'Secure Shell remote login and Secure Copy protocol',
        theory: 'ssh provides encrypted remote terminal login to Linux servers. scp copies files securely over an SSH connection between local and remote hosts.',
        syntax: 'ssh user@host\nscp source user@host:destination',
        examples: [
          { cmd: 'ssh -i ~/.ssh/id_rsa user@192.168.1.50', desc: 'Log in to remote server using SSH private key' },
          { cmd: 'scp build.zip user@remote:/var/www/', desc: 'Securely copy local zip file to remote server path' }
        ]
      }
    ]
  },

  // 12. System Commands
  {
    id: 'system-commands',
    title: 'System Commands',
    description: 'System info, disk space analysis, uptime, and systemctl service management',
    iconName: 'Server',
    commands: [
      {
        id: 'uname',
        name: 'uname',
        shortDesc: 'Print system information and Linux kernel release version',
        theory: 'uname prints details about system hardware architecture, hostname, operating system, and Linux kernel version. uname -a prints all available system details.',
        syntax: 'uname [options]',
        examples: [
          { cmd: 'uname -a', desc: 'Print system architecture, kernel version, hostname, and build date' },
          { cmd: 'uname -r', desc: 'Output kernel release version (e.g. 5.15.0-88-generic)' }
        ]
      },
      {
        id: 'df-du',
        name: 'df -h / du -h',
        shortDesc: 'Report file system disk space usage and directory space consumption',
        theory: 'df -h displays overall disk space available and used across mounted filesystems. du -h calculates disk space used by a specific directory tree in human-readable sizes.',
        syntax: 'df -h\ndu -h [directory]',
        examples: [
          { cmd: 'df -h', desc: 'Display disk capacity and percentage used per mount point' },
          { cmd: 'du -sh /var/log', desc: 'Summarize (-s) total disk space consumed by /var/log' }
        ]
      },
      {
        id: 'uptime',
        name: 'uptime',
        shortDesc: 'Tell how long the system has been running and load average',
        theory: 'uptime prints current system time, how long the OS has been powered on without reboot, number of active users, and 1, 5, and 15 minute CPU load averages.',
        syntax: 'uptime',
        examples: [
          { cmd: 'uptime', desc: 'Outputs system uptime and load average numbers' }
        ]
      },
      {
        id: 'systemctl',
        name: 'systemctl',
        shortDesc: 'Control systemd system and service manager',
        theory: 'systemctl is the core command to start, stop, restart, enable, disable, and check status of system services (daemons) managed by systemd in modern Linux distributions.',
        syntax: 'sudo systemctl command service_name',
        examples: [
          { cmd: 'sudo systemctl status nginx', desc: 'Check if nginx web server is active/running' },
          { cmd: 'sudo systemctl restart docker', desc: 'Restart docker service daemon' },
          { cmd: 'sudo systemctl enable nginx', desc: 'Configure nginx to start automatically on system boot' }
        ]
      }
    ]
  },

  // 13. Scheduling
  {
    id: 'scheduling',
    title: 'Scheduling Jobs',
    description: 'Automating recurring background tasks using cron and crontab',
    iconName: 'Clock',
    commands: [
      {
        id: 'cron-crontab',
        name: 'cron / crontab',
        shortDesc: 'Schedule recurring background commands and scripts',
        theory: 'cron is a daemon that executes scheduled tasks (cron jobs) specified in crontab configuration tables. Syntax format: minute hour day_of_month month day_of_week command.',
        syntax: 'crontab -e  (Edit user cron schedule)\ncrontab -l  (List user cron schedule)',
        examples: [
          { cmd: 'crontab -e', desc: 'Open interactive crontab file in default text editor' },
          { cmd: '0 2 * * * /scripts/backup.sh', desc: 'Run backup.sh every night at 2:00 AM' },
          { cmd: '*/15 * * * * /bin/check_health.sh', desc: 'Run health check script every 15 minutes' },
          { cmd: 'crontab -l', desc: 'List active cron jobs for current user' }
        ]
      }
    ]
  }
];
