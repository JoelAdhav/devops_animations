import { KeyRound } from 'lucide-react'
import type { Lesson } from '../types'
import LinuxPermissions from '../LinuxPermissions'
import { scenarios } from '../LinuxPermissionsSims'

const lesson: Lesson = {
  id: 'linux-permissions',
  title: 'Linux file permissions',
  track: "Foundations: Linux and tools",
  tone: 'rose',
  icon: KeyRound,
  summary: 'Decode chmod numbers bit by bit. Toggle read, write and execute for owner, group and others, and see exactly who can do what.',
  minutes: 5,
  Playground: LinuxPermissions,
  playgroundIntro: 'Click the r, w and x buttons, type a chmod number, or pick a preset.',
  simulation: {
    intro: 'Real permission problems on a real-feeling server. ls -l, chmod, chown, sudo -u and find -perm all behave like on Ubuntu.',
    scenarios,
  },
  interview: [
    {
      q: 'What does chmod 755 mean?',
      a: 'Owner 7 = 4+2+1 = read, write, execute. Group 5 = 4+1 = read, execute. Others 5 = read, execute. Typical for scripts and directories.',
    },
    {
      q: 'Why does SSH refuse my private key?',
      a: 'If the key file is readable by others, SSH errors with "UNPROTECTED PRIVATE KEY FILE". Fix with chmod 600 key.pem (owner read/write only) or 400.',
    },
    {
      q: 'What does execute mean on a directory?',
      a: 'Permission to enter it (cd) and access files inside by name. Read on a directory lets you list names; you usually need both r and x.',
    },
    {
      q: 'Why is chmod 777 bad?',
      a: 'Everyone on the system can modify or replace the file. On a web server that can mean anyone exploiting the app can overwrite code. Fix ownership with chown instead.',
    },
  ],
  commands: [
    { cmd: 'ls -l deploy.sh', note: 'Show permissions, owner and group' },
    { cmd: 'chmod 755 deploy.sh', note: 'rwxr-xr-x' },
    { cmd: 'chmod u+x deploy.sh', note: 'Add execute for the owner only' },
    { cmd: 'chown joel:devs deploy.sh', note: 'Change owner and group' },
    { cmd: 'chmod 600 ~/.ssh/key.pem', note: 'Lock down an SSH key' },
  ],
}

export default lesson
