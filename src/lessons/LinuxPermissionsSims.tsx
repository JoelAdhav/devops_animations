import { motion } from 'motion/react'
import type { Scenario } from '../components/SimLab'
import { ran, saw, type SimState } from '../lib/sim'
import { HOME, base, can, makeFs, modeOf, ownerOf, permString, type CustomCommand, type Fs } from '../lib/vfs'
import { spring } from '../lib/motion'

const BASE = {
  '/tmp': null,
  '/root/.bashrc': '# root only',
  '/etc/shadow': 'root:$6$...:19700:0:99999:7:::',
  [`${HOME}/.bashrc`]: "alias ll='ls -la'",
}

/** One row per path: its permission string, owner and group, with the three rwx groups coloured. */
function PermTable({ fs, paths, title, bad }: { fs: Fs; paths: string[]; title: string; bad?: (mode: number, path: string) => boolean }) {
  return (
    <div className="mini-table">
      <header>{title}</header>
      {paths
        .filter((p) => fs[p])
        .map((p) => {
          const n = fs[p]
          const mode = modeOf(p, n)
          const perm = permString(mode, n.type === 'dir')
          const [o, g] = ownerOf(p, n)
          const wrong = bad?.(mode, p)
          return (
            <div className="row" key={p} style={{ justifyContent: 'flex-start', gap: 10 }}>
              <motion.span key={perm} initial={{ scale: 1.25 }} animate={{ scale: 1 }} transition={spring} style={{ whiteSpace: 'pre' }}>
                <span style={{ color: 'var(--muted)' }}>{perm[0]}</span>
                <span style={{ color: 'var(--sky)' }}>{perm.slice(1, 4)}</span>
                <span style={{ color: 'var(--violet)' }}>{perm.slice(4, 7)}</span>
                <span style={{ color: wrong ? 'var(--rose)' : 'var(--amber)', fontWeight: wrong ? 800 : undefined }}>{perm.slice(7)}</span>
              </motion.span>
              <span style={{ color: 'var(--muted)' }}>
                {o}:{g}
              </span>
              <span style={{ marginLeft: 'auto', color: wrong ? 'var(--rose)' : undefined }}>{base(p)}</span>
            </div>
          )
        })}
      <div className="row" style={{ fontFamily: 'var(--font)', fontSize: 12, justifyContent: 'flex-start', gap: 12 }}>
        <span style={{ color: 'var(--sky)' }}>■ owner</span>
        <span style={{ color: 'var(--violet)' }}>■ group</span>
        <span style={{ color: 'var(--amber)' }}>■ everyone else</span>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ 1. script will not run */

const DEPLOY = `${HOME}/deploy.sh`

const notExecutable: Scenario = {
  id: 'perm/not-executable',
  title: './deploy.sh: Permission denied',
  level: 'Easy',
  host: 'build-01',
  brief: (
    <>
      <p>
        <strong>Teammate on Slack:</strong> "I pushed <code>deploy.sh</code> to your home folder. Just run it. Oh, it says permission denied?"
      </p>
      <p>Find out why, give the script permission to run (for you only, not for everyone), and run the deploy.</p>
    </>
  ),
  setup: () => ({
    fs: makeFs({
      ...BASE,
      [DEPLOY]: {
        type: 'file',
        mode: 0o644,
        owner: 'joel',
        content: '#!/bin/bash\n# Deploy the shop\necho "Pulling latest code..."\necho "Building shop v2.4.0..."\nsleep 1\necho "Restarting service..."\necho "Deploy finished OK"',
      },
      [`${HOME}/README.txt`]: 'deploy.sh: run it from your home folder with ./deploy.sh',
    }),
  }),
  goals: [
    { text: 'Run ./deploy.sh and read the error', check: (s) => s.log.some((e) => /\.\/deploy\.sh/.test(e.line) && e.out.includes('Permission denied')) },
    { text: 'Look at its permissions with ls -l (or stat)', check: (s) => s.log.some((e) => /\b(ls|stat)\b/.test(e.line) && /-rw-r--r--.*deploy\.sh|0644/.test(e.out)) },
    {
      text: 'Add execute permission for the owner only',
      check: (s) => {
        const n = s.fs[DEPLOY]
        return !!n && (modeOf(DEPLOY, n) & 0o111) === 0o100
      },
    },
    { text: 'Run the deploy successfully', check: (s) => saw(s, 'Deploy finished OK') },
  ],
  hints: [
    'Type ./deploy.sh and press Enter. The ./ means "the file in this folder".',
    'ls -l deploy.sh shows three groups of rwx: owner, group, everyone else. Is there an x anywhere?',
    'chmod u+x deploy.sh adds x for the user who owns it (u). chmod 755 would also let everyone run it, which this ticket does not want.',
    'Then run ./deploy.sh again.',
  ],
  solution: ['./deploy.sh', 'ls -l deploy.sh', 'chmod u+x deploy.sh', 'ls -l deploy.sh', './deploy.sh'],
  debrief: (
    <>
      <p>
        Files copied, downloaded or pulled from Git often lose their <strong>x</strong> bit. Without it, Linux will not run the file as a program,
        even if you own it. <code>bash deploy.sh</code> would also work, because then bash only needs to <em>read</em> the file.
      </p>
      <p>
        In Git, store the bit once with <code>git update-index --chmod=+x deploy.sh</code> so every clone gets an executable script. In CI, a
        pipeline step failing with exit code <strong>126</strong> almost always means this.
      </p>
    </>
  ),
  Visual: ({ state }: { state: SimState }) => <PermTable fs={state.fs} paths={[DEPLOY]} title="deploy.sh (live)" />,
}

/* ------------------------------------------------------------------ 2. ssh key too open */

const HOST_IP = '10.0.1.20'

const ssh: CustomCommand = (args, { fs, cwd }) => {
  const i = args.indexOf('-i')
  const keyArg = i >= 0 ? args[i + 1] : undefined
  const target = args.filter((a, k) => !a.startsWith('-') && args[k - 1] !== '-i').pop()
  if (!target) return { err: ['usage: ssh [-i identity_file] user@host'], code: 255 }
  const [user, host] = target.includes('@') ? target.split('@') : ['joel', target]
  if (host !== HOST_IP) return { err: [`ssh: connect to host ${host} port 22: Connection timed out`], code: 255 }
  if (!keyArg) return { err: [`${user}@${host}: Permission denied (publickey).`], code: 255 }
  const keyPath = keyArg.startsWith('/') ? keyArg : keyArg.startsWith('~/') ? HOME + keyArg.slice(1) : `${cwd === '/' ? '' : cwd}/${keyArg}`
  const key = fs[keyPath]
  if (!key) return { err: [`Warning: Identity file ${keyArg} not accessible: No such file or directory.`, `${user}@${host}: Permission denied (publickey).`], code: 255 }
  const mode = modeOf(keyPath, key)
  if (mode & 0o077) {
    return {
      err: [
        '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@',
        '@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @',
        '@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@',
        `Permissions 0${mode.toString(8)} for '${keyArg}' are too open.`,
        'It is required that your private key files are NOT accessible by others.',
        'This private key will be ignored.',
        `Load key "${keyArg}": bad permissions`,
        `${user}@${host}: Permission denied (publickey).`,
      ],
      code: 255,
    }
  }
  if (!(mode & 0o400)) return { err: [`Load key "${keyArg}": Permission denied`, `${user}@${host}: Permission denied (publickey).`], code: 255 }
  if (user !== 'ec2-user') return { err: [`${user}@${host}: Permission denied (publickey).`], code: 255 }
  return {
    out: [
      '   ,     #_',
      '   ~\\_  ####_        Amazon Linux 2023',
      "  ~~  \\_#####\\",
      `Last login: Sat Oct 24 02:51:10 2026 from 10.0.0.12`,
      `[ec2-user@ip-10-0-1-20 ~]$ (this sandbox keeps you on the bastion, so the session ends here)`,
      `Connection to ${host} closed.`,
    ],
  }
}

const KEY_DL = `${HOME}/Downloads/prod-key.pem`
const KEY = `${HOME}/.ssh/prod-key.pem`

const sshKey: Scenario = {
  id: 'perm/ssh-key',
  title: 'SSH refuses the new key',
  level: 'Easy',
  host: 'bastion',
  brief: (
    <>
      <p>
        <strong>Your lead:</strong> "I created an EC2 key pair. It's in your <code>~/Downloads</code>. Log in to the app server as{' '}
        <code>ec2-user@{HOST_IP}</code> and check the disk."
      </p>
      <p>SSH refuses the key. Put it where keys belong, lock it down, and connect.</p>
    </>
  ),
  setup: () => ({
    fs: makeFs({
      ...BASE,
      [`${HOME}/.ssh`]: { type: 'dir', mode: 0o700, owner: 'joel' },
      [`${HOME}/.ssh/known_hosts`]: { type: 'file', mode: 0o644, owner: 'joel', content: `${HOST_IP} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA...` },
      [KEY_DL]: { type: 'file', mode: 0o644, owner: 'joel', content: '-----BEGIN RSA PRIVATE KEY-----\n(training key, not real)\n-----END RSA PRIVATE KEY-----' },
    }),
  }),
  commands: { ssh },
  goals: [
    { text: 'Try to connect and read why SSH refuses', check: (s) => saw(s, 'are too open') },
    { text: 'Move the key into ~/.ssh', check: (s) => !!s.fs[KEY] && !s.fs[KEY_DL] },
    {
      text: 'Make the key readable by you and nobody else',
      check: (s) => {
        const n = s.fs[KEY] ?? s.fs[KEY_DL]
        const p = s.fs[KEY] ? KEY : KEY_DL
        return !!n && (modeOf(p, n) & 0o077) === 0 && (modeOf(p, n) & 0o400) !== 0
      },
    },
    { text: `Log in as ec2-user@${HOST_IP}`, check: (s) => saw(s, `Connection to ${HOST_IP} closed.`) },
  ],
  hints: [
    `ssh -i ~/Downloads/prod-key.pem ec2-user@${HOST_IP}   Read the warning: what does it say about permissions?`,
    'mv ~/Downloads/prod-key.pem ~/.ssh/',
    'chmod 600 ~/.ssh/prod-key.pem (read and write for you only). AWS docs use 400: read-only for you.',
    `ssh -i ~/.ssh/prod-key.pem ec2-user@${HOST_IP}`,
  ],
  solution: [
    `ssh -i ~/Downloads/prod-key.pem ec2-user@${HOST_IP}`,
    'ls -l ~/Downloads',
    'mv ~/Downloads/prod-key.pem ~/.ssh/',
    'chmod 400 ~/.ssh/prod-key.pem',
    `ssh -i ~/.ssh/prod-key.pem ec2-user@${HOST_IP}`,
  ],
  debrief: (
    <>
      <p>
        A private key that other users can read is treated as leaked, so OpenSSH ignores it. <code>644</code> means everyone on the machine can read
        it. <code>400</code> or <code>600</code> means only you can. The <code>~/.ssh</code> folder itself should be <code>700</code>.
      </p>
      <p>
        Better still at work: skip SSH keys entirely with <strong>AWS Systems Manager Session Manager</strong> (
        <code>aws ssm start-session --target i-0abc...</code>): no open port 22 and no keys to leak.
      </p>
    </>
  ),
  Visual: ({ state }: { state: SimState }) => <PermTable fs={state.fs} paths={[KEY_DL, `${HOME}/.ssh`, KEY]} title="Key files (live)" bad={(m, p) => p.endsWith('.pem') && (m & 0o077) !== 0} />,
}

/* ------------------------------------------------------------------ 3. world-writable web root */

const WEB = '/var/www/shop'
const WEB_PATHS = [WEB, `${WEB}/index.html`, `${WEB}/app.js`, `${WEB}/style.css`, `${WEB}/uploads`, `${WEB}/uploads/logo.png`]
const worldWritable = (fs: Fs) => WEB_PATHS.filter((p) => fs[p] && modeOf(p, fs[p]) & 0o002)

const webRoot: Scenario = {
  id: 'perm/world-writable',
  title: 'Security audit: world-writable web folder',
  level: 'Medium',
  host: 'web-01',
  brief: (
    <>
      <p>
        <strong>Security audit finding (High):</strong> files under <code>{WEB}</code> are writable by every user on the server. Anyone who gets
        any shell here could replace the site's JavaScript.
      </p>
      <p>
        Fix it with the standard layout: folders <code>755</code>, files <code>644</code>. Careful: nginx runs as <code>www-data</code> and must
        still be able to save customer uploads.
      </p>
    </>
  ),
  setup: () => ({
    fs: makeFs({
      ...BASE,
      [WEB]: { type: 'dir', mode: 0o777 },
      [`${WEB}/index.html`]: { type: 'file', mode: 0o666, content: '<h1>Shop</h1>' },
      [`${WEB}/app.js`]: { type: 'file', mode: 0o666, content: 'fetch("/api/products")' },
      [`${WEB}/style.css`]: { type: 'file', mode: 0o644, content: 'body{}' },
      [`${WEB}/uploads`]: { type: 'dir', mode: 0o777 },
      [`${WEB}/uploads/logo.png`]: { type: 'file', mode: 0o666, owner: 'www-data', size: 18_000, content: '(binary)' },
      '/var/www/html/index.html': '<h1>Welcome to nginx!</h1>',
      '/etc/nginx/nginx.conf': 'user www-data;\nworker_processes auto;',
      [`${HOME}/audit.txt`]: `HIGH: world-writable paths under ${WEB}\nRule: dirs 755, files 644, only the app user writes where it must.`,
    }),
  }),
  goals: [
    { text: 'List everything world-writable with find', check: (s) => s.log.some((e) => /\bfind\b.*-perm/.test(e.line) && e.out.includes(`${WEB}/app.js`)) },
    { text: `Nothing under ${WEB} is world-writable any more`, check: (s) => worldWritable(s.fs).length === 0 },
    {
      text: 'Folders are 755 and files are 644',
      check: (s) => WEB_PATHS.every((p) => s.fs[p] && modeOf(p, s.fs[p]) === (s.fs[p].type === 'dir' ? 0o755 : 0o644)),
    },
    { text: 'nginx (www-data) can still save files in uploads', check: (s) => can(s.fs, 'www-data', `${WEB}/uploads`, 2) && can(s.fs, 'www-data', `${WEB}/uploads`, 1) },
  ],
  hints: [
    'find /var/www -perm -o+w lists every path where "others" (o) have write (w). The minus means "at least these bits".',
    'Fix files and folders in one go: sudo chmod -R u=rwX,go=rX /var/www/shop. Capital X adds x only to folders, so folders get 755 and files 644.',
    'After that, nobody but root can write uploads. Make www-data its owner: sudo chown www-data:www-data /var/www/shop/uploads',
    'Prove it: sudo -u www-data touch /var/www/shop/uploads/test.png, and run the find again (no output means clean).',
  ],
  solution: [
    'find /var/www -perm -o+w',
    `sudo chmod -R u=rwX,go=rX ${WEB}`,
    `sudo chown www-data:www-data ${WEB}/uploads`,
    `ls -l ${WEB}`,
    'find /var/www -perm -o+w',
    `sudo -u www-data touch ${WEB}/uploads/test.png`,
  ],
  debrief: (
    <>
      <p>
        <code>777</code> is never the fix, it is the bug. The safe pattern: code owned by root or the deploy user and read-only to the web server,
        plus one folder (uploads) that only the app user can write. If nginx is ever exploited, the attacker cannot rewrite your code.
      </p>
      <p>
        Better still on AWS: put uploads in <strong>S3</strong> instead of on the server's disk, so web servers stay read-only and can be replaced at
        any time.
      </p>
    </>
  ),
  Visual: ({ state }: { state: SimState }) => <PermTable fs={state.fs} paths={WEB_PATHS} title={`${WEB} (live)`} bad={(m) => (m & 0o002) !== 0} />,
}

/* ------------------------------------------------------------------ 4. shared config for a group */

const CONF = '/opt/team/config.yml'
const CONF_TEXT = 'service: shop-api\nreplicas: 2\nlog_level: info'

const sharedConfig: Scenario = {
  id: 'perm/shared-config',
  title: 'Priya cannot save the shared config',
  level: 'Medium',
  host: 'app-01',
  brief: (
    <>
      <p>
        <strong>Priya:</strong> "I need to change <code>replicas</code> in <code>{CONF}</code> but it says permission denied. Can you make it
        editable for the devs team? Not for everyone, please."
      </p>
    </>
  ),
  setup: () => ({
    fs: makeFs({
      ...BASE,
      '/opt/team': { type: 'dir', mode: 0o755 },
      [CONF]: { type: 'file', mode: 0o644, owner: 'joel', group: 'joel', content: CONF_TEXT },
      '/home/priya/.bashrc': { type: 'file', owner: 'priya', content: '' },
    }),
  }),
  goals: [
    { text: "Check which groups Priya belongs to", check: (s) => ran(s, /^\s*(id|groups)\s+priya\b/) },
    { text: 'Put config.yml in the devs group', check: (s) => !!s.fs[CONF] && ownerOf(CONF, s.fs[CONF])[1] === 'devs' },
    { text: 'Let the group write it, but not everyone else', check: (s) => !!s.fs[CONF] && (modeOf(CONF, s.fs[CONF]) & 0o022) === 0o020 },
    { text: 'Prove it: append a line as Priya', check: (s) => (s.fs[CONF]?.content ?? CONF_TEXT) !== CONF_TEXT && s.log.some((e) => /sudo\s+-u\s+priya/.test(e.line) && !/denied/i.test(e.out)) },
  ],
  hints: [
    'id priya (or groups priya) lists her groups. Which one is the team group?',
    'You own the file, but you are not in devs, so you cannot hand the file to that group yourself: sudo chgrp devs /opt/team/config.yml',
    'chmod g+w /opt/team/config.yml adds write for the group only. Check with ls -l: you want -rw-rw-r--',
    'Test as her: echo "replicas: 3" | sudo -u priya tee -a /opt/team/config.yml',
  ],
  solution: [
    'ls -l /opt/team',
    'id priya',
    `sudo chgrp devs ${CONF}`,
    `chmod g+w ${CONF}`,
    'ls -l /opt/team',
    `echo "replicas: 3" | sudo -u priya tee -a ${CONF}`,
  ],
  debrief: (
    <>
      <p>
        Groups are how Linux shares files without opening them to everyone: owner <code>rw</code>, group <code>rw</code>, others <code>r</code> ={' '}
        <code>664</code>. New people get access by joining the group (<code>sudo usermod -aG devs NAME</code>), not by loosening the file.
      </p>
      <p>
        For a whole shared folder, also set the <strong>setgid</strong> bit (<code>chmod g+s /opt/team</code>) so new files automatically belong
        to the devs group. On AWS the same idea at a bigger scale is <strong>IAM groups</strong>.
      </p>
    </>
  ),
  Visual: ({ state }: { state: SimState }) => <PermTable fs={state.fs} paths={['/opt/team', CONF]} title="Shared config (live)" bad={(m, p) => p === CONF && (m & 0o002) !== 0} />,
}

export const scenarios: Scenario[] = [notExecutable, sshKey, webRoot, sharedConfig]
