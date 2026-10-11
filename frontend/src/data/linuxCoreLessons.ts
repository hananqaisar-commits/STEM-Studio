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
    summary: 'Linux permissions control who can read, change, or run a file. Use the smallest permission set that supports the task.',
    flow: ['User', 'Group', 'Other users'],
    steps: [
      { title: 'Read the permission bits', explanation: 'The first character in ls -l describes the file type; the next three groups show read, write, and execute access for owner, group, and others.', commands: ['ls -l script.sh', 'id'] },
      { title: 'Grant a specific permission', explanation: 'Symbolic chmod changes one permission class. For example, u+x gives the owner permission to execute a script without changing other access.', commands: ['chmod u+x script.sh'] },
      { title: 'Set a precise mode', explanation: 'Numeric modes encode read as 4, write as 2, and execute as 1. Mode 640 gives owner read/write, group read, and no access to others.', commands: ['chmod 640 notes.txt'] },
      { title: 'Check ownership', explanation: 'Files have an owner and group. chown changes them and usually needs administrator rights when assigning another user.', commands: ['stat notes.txt', 'sudo chown user:group notes.txt'] },
    ],
    caution: 'Avoid chmod 777 as a quick fix: it grants every local user broad access and can expose or alter files.',
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
