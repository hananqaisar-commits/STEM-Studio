export interface LinuxCoreStep {
  title: string;
  explanation: string;
  commands: string[];
}

export interface LinuxCoreLesson {
  id: string;
  title: string;
  summary: string;
  flow: string[];
  steps: LinuxCoreStep[];
  caution?: string;
  quickChecks?: { question: string; choices: string[]; answer: number; explanation: string }[];
}

export const LINUX_CORE_LESSONS: LinuxCoreLesson[] = [
  {
    id: 'ufw',
    title: 'UFW firewall',
    summary: 'UFW is a simpler command interface for Linux firewall rules. It decides which network traffic may reach your computer.',
    flow: ['Incoming traffic', 'UFW rules', 'Allowed service'],
    steps: [
      { title: 'Understand the rule', explanation: 'A firewall checks traffic against rules before it reaches a service. A common personal-machine policy blocks unsolicited incoming connections while allowing outgoing traffic.', commands: ['sudo ufw status verbose'] },
      { title: 'Allow access you need', explanation: 'Rules can allow a service by name or a TCP/UDP port. Add the narrow rule before enabling UFW on a remote machine so you do not lock yourself out.', commands: ['sudo ufw allow OpenSSH', 'sudo ufw allow 8000/tcp'] },
      { title: 'Enable and inspect', explanation: 'Enabling applies the configured rules. Read the status output to confirm the firewall is active and the expected ports are listed.', commands: ['sudo ufw enable', 'sudo ufw status numbered'] },
      { title: 'Remove temporary access', explanation: 'When a temporary service is no longer needed, delete its rule and check the resulting status. Keep only ports that have a current purpose.', commands: ['sudo ufw delete allow 8000/tcp', 'sudo ufw status verbose'] },
    ],
    caution: 'If you are connected over SSH, allow OpenSSH before enabling UFW. These are real system commands; review each rule before running it.',
  },
  {
    id: 'wifi-sharing',
    title: 'Share files over Wi‑Fi',
    summary: 'A temporary local web server can let another device on the same trusted Wi‑Fi download files from one folder.',
    flow: ['Phone / laptop', 'Home Wi‑Fi', 'Linux server', 'Shared folder'],
    steps: [
      { title: 'Choose the folder', explanation: 'Create or choose a folder containing only the files you intend to share. The server will list and serve files from its current directory.', commands: ['mkdir -p ~/share', 'cp ~/Downloads/example.pdf ~/share/', 'cd ~/share'] },
      { title: 'Find the Linux Wi‑Fi address', explanation: 'Find the private IPv4 address assigned to the wireless interface. Other devices must be on the same network and able to reach that address.', commands: ['ip -br addr'] },
      { title: 'Start a temporary server', explanation: 'Python serves the current folder on port 8000. Binding to 0.0.0.0 makes it reachable from other devices on the LAN. Keep the terminal open while sharing.', commands: ['python3 -m http.server 8000 --bind 0.0.0.0'] },
      { title: 'Connect, then stop sharing', explanation: 'On the other device open http://LINUX-IP:8000 and replace LINUX-IP with the address you found. When finished, return to the terminal and press Ctrl+C.', commands: ['sudo ufw allow 8000/tcp', 'sudo ufw delete allow 8000/tcp'] },
    ],
    caution: 'Use a trusted private Wi‑Fi network, share a folder with no private files, and stop the server when finished. Python’s simple server is for temporary sharing, not production hosting.',
  },
  {
    id: 'permissions',
    title: 'Files and permissions',
    summary: 'Read the owner, group, and other access bits; practice safe permission changes; then verify what a user can actually do.',
    flow: ['Choose access class', 'Read / write / execute', 'Apply least access', 'Verify the result'],
    steps: [
      { title: 'Read the mode and identity', explanation: 'In ls -l, the first character is the entry type. The next nine positions are three permission triplets in owner, group, other order. Linux chooses one class: owner first, otherwise matching group, otherwise other. id shows the current user and supplementary groups.', commands: ['ls -l ~/permissions-lab.txt', 'stat ~/permissions-lab.txt', 'id'] },
      { title: 'Read permission: inspect contents', explanation: 'For a regular file, r lets the selected class read its contents. cat needs file read permission plus execute/search permission on every parent directory. For a directory, r has a different job: it lists names inside that directory.', commands: ['cat ~/permissions-lab.txt', 'chmod u-r ~/permissions-lab.txt', 'cat ~/permissions-lab.txt', 'chmod u+r ~/permissions-lab.txt'] },
      { title: 'Write permission: change data', explanation: 'For a regular file, w allows changing its contents. An editor can open only when the selected class can save. Directory write is different: it allows changing names in that directory, usually together with directory execute. Restore the practice file after the denial demonstration.', commands: ['chmod u-w ~/permissions-lab.txt', 'nano ~/permissions-lab.txt', 'chmod u+w ~/permissions-lab.txt'] },
      { title: 'Execute permission: launch a file', explanation: 'For a regular executable or script, x allows launching it. A shell script also needs a valid interpreter in its shebang. Compare ./permission-demo.sh with bash permission-demo.sh: the first checks the file execute bit; the second asks bash to read the file, so it needs read access instead.', commands: ['./permission-demo.sh', 'bash ~/permission-demo.sh', 'chmod u+x ~/permission-demo.sh', './permission-demo.sh'] },
      { title: 'Decode numeric chmod', explanation: 'Each octal digit is one class: owner, group, other. Add r=4, w=2, x=1. So 6 is rw-, 4 is r--, and 0 is ---. Mode 640 means owner can read/write, group can read, and other gets nothing. chmod numeric modes replace the whole permission set.', commands: ['chmod 640 ~/permissions-lab.txt', 'stat ~/permissions-lab.txt', 'ls -l ~/permissions-lab.txt'] },
      { title: 'Understand directories and execute/search', explanation: 'On a directory, x means search/traverse: you can enter it or reach a known name below it. A directory with 6 (rw-) is not traversable because it lacks x, even for its owner. Use the private-lab directory, then restore 700 so the lesson stays usable.', commands: ['chmod 600 ~/private-lab', 'cd ~/private-lab', 'chmod 700 ~/private-lab', 'cd ~'] },
      { title: 'Separate permission bits from ownership', explanation: 'chmod changes mode bits. chown changes the user owner and requires root in this simulator. chgrp changes the group; a regular owner may choose only a group they belong to. Ownership changes which triplet applies, but do not rewrite the mode itself. Restore the lab fixture after the demonstration.', commands: ['stat ~/permissions-lab.txt', 'sudo chown root:sudo ~/permissions-lab.txt', 'stat ~/permissions-lab.txt', 'sudo chown octa:octa ~/permissions-lab.txt'] },
      { title: 'Use umask for safe defaults', explanation: 'umask affects only newly created files and directories. Linux starts regular files at 666 (no execute by default) and directories at 777, then removes masked bits. With umask 027, new files become 640 and directories 750. Existing entries do not change.', commands: ['umask', 'umask 027', 'touch ~/new-report.txt', 'mkdir ~/team-share', 'ls -l ~/new-report.txt', 'ls -ld ~/team-share', 'umask 022'] },
      { title: 'Inspect shared-directory protection', explanation: 'The sticky bit is the t at the end of /tmp permissions and appears as the leading 1 in 1777. It lets users create files in a shared writable directory while restricting who can remove each entry. Setuid and setgid are advanced mode bits; this simulator can display them but deliberately does not emulate privilege-changing execution.', commands: ['ls -ld /tmp', 'stat /tmp'] },
    ],
    caution: 'Practice only on permissions-lab.txt, permission-demo.sh, and private-lab in the virtual filesystem. Avoid chmod 777 as a fix: it grants all three classes broad access. The terminal is a safe simulator, and arbitrary host commands or scripts do not run.',
    quickChecks: [
      { question: 'A file is mode 640. A user belongs to its group but does not own it. What can that user do?', choices: ['Read only', 'Read and write', 'No access'], answer: 0, explanation: 'The group digit is 4, which is r--. The user can read the file, but cannot write or execute it.' },
      { question: 'You own a directory with mode 640. Can you cd into it?', choices: ['Yes, owner write is enough', 'No, it has no execute/search bit', 'Only if the directory is empty'], answer: 1, explanation: 'A directory needs x for search/traversal. Its owner triplet is rw-, so cd fails until execute is granted, for example chmod u+x directory.' },
    ],
  },
  {
    id: 'processes-services',
    title: 'Processes and services',
    summary: 'Processes are running programs. Services are background programs managed by a service manager such as systemd.',
    flow: ['Start request', 'systemd service', 'Running process'],
    steps: [
      { title: 'Inspect running work', explanation: 'Use process tools to see CPU and memory use. q exits top; htop may need to be installed separately.', commands: ['ps aux', 'top'] },
      { title: 'Inspect a service', explanation: 'systemctl status shows whether a service is active and recent log details. The service name varies by distribution and package.', commands: ['systemctl status ssh'] },
      { title: 'Control a service carefully', explanation: 'Starting or restarting a service changes system state. Check the service name and status first, especially on a shared or production machine.', commands: ['sudo systemctl start ssh', 'sudo systemctl restart ssh'] },
      { title: 'Read recent service logs', explanation: 'The journal helps explain why a service failed to start or stopped. Use a time window to keep the output focused.', commands: ['journalctl -u ssh --since today'] },
    ],
    caution: 'Service names differ between distributions. Confirm the correct unit before starting, stopping, or restarting it.',
  },
];
