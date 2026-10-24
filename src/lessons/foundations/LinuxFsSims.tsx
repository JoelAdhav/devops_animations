import { motion } from 'motion/react'
import { HardDrive } from 'lucide-react'
import type { Scenario } from '../../components/SimLab'
import { ran, saw, type SimState } from '../../lib/sim'
import { HOME, diskUsage, human, makeFs } from '../../lib/vfs'
import { spring } from '../../lib/motion'

const GB = 1024 ** 3
const MB = 1024 ** 2

/** Files every scenario server has, so it feels like a normal Ubuntu box. */
const BASE = {
  '/bin': null,
  '/usr/bin': null,
  '/tmp': null,
  '/root/.bashrc': '# root only',
  '/etc/hostname': 'server',
  '/etc/hosts': '127.0.0.1   localhost\n10.0.2.15   db.internal',
  '/etc/shadow': 'root:$6$...:19700:0:99999:7:::',
  [`${HOME}/.bashrc`]: "alias ll='ls -la'",
}

/* ------------------------------------------------------------------ 1. leaked .env */

const SHOP_CONF = `server {
    listen 80;
    server_name shop.example.com;
    root /var/www/shop;
    index index.html;
}`

const leakedEnv: Scenario = {
  id: 'linux-fs/leaked-env',
  title: 'Secrets leaking from the web server',
  level: 'Easy',
  host: 'web-01',
  brief: (
    <>
      <p>
        <strong>Security scanner:</strong> <code>https://shop.example.com/.env</code> returns a file with passwords in it.
      </p>
      <p>Find the folder nginx serves the shop from, confirm the hidden file is there, check if anyone downloaded it, then move it out of the public folder.</p>
    </>
  ),
  setup: () => ({
    fs: makeFs({
      ...BASE,
      '/etc/nginx/nginx.conf': 'user www-data;\nworker_processes auto;\ninclude /etc/nginx/sites-enabled/*;',
      '/etc/nginx/sites-available/default': 'server {\n    listen 80 default_server;\n    root /var/www/html;\n}',
      '/etc/nginx/sites-available/shop.conf': SHOP_CONF,
      '/etc/nginx/sites-enabled/shop.conf': SHOP_CONF,
      '/var/www/html/index.html': '<h1>Welcome to nginx!</h1>',
      '/var/www/shop/index.html': '<h1>Shop: coming soon</h1>',
      '/var/www/shop/app.js': 'fetch("/api/products").then(render)',
      '/var/www/shop/style.css': 'body { font-family: sans-serif }',
      '/var/www/shop/.env': 'STRIPE_SECRET_KEY=sk_test_FAKE_training_only\nDB_PASSWORD=hunter2',
      '/var/log/nginx/access.log': [
        '198.51.100.4 - - [24/Oct/2026:02:41:09 +0000] "GET / HTTP/1.1" 200 512 "-" "Mozilla/5.0"',
        '198.51.100.4 - - [24/Oct/2026:02:41:10 +0000] "GET /app.js HTTP/1.1" 200 1840 "-" "Mozilla/5.0"',
        '203.0.113.9 - - [24/Oct/2026:02:58:11 +0000] "GET /.env HTTP/1.1" 200 61 "-" "curl/8.5.0"',
        '203.0.113.9 - - [24/Oct/2026:02:58:12 +0000] "GET /.git/config HTTP/1.1" 404 153 "-" "curl/8.5.0"',
        '198.51.100.7 - - [24/Oct/2026:03:02:33 +0000] "GET / HTTP/1.1" 200 512 "-" "Mozilla/5.0"',
      ].join('\n'),
      '/var/log/nginx/error.log': '2026/10/24 02:58:12 [error] open() "/var/www/shop/.git/config" failed (2: No such file or directory)',
      [`${HOME}/notes.txt`]: 'Shop site is on web-01. nginx configs are in /etc/nginx.',
    }),
  }),
  goals: [
    { text: 'Find the shop config and read which folder it serves', check: (s) => saw(s, 'root /var/www/shop;') },
    { text: 'Go into that web folder', check: (s) => s.cwd === '/var/www/shop' || s.log.some((e) => e.cwd === '/var/www/shop') },
    { text: 'List hidden files there and spot the .env', check: (s) => s.log.some((e) => /\bls\b.*\s-\w*a/.test(e.line) && /(^|\s)\.env(\s|$)/m.test(e.out)) },
    { text: 'Check the access log: was /.env downloaded?', check: (s) => saw(s, '"GET /.env') },
    { text: 'Move .env to ~/secrets/.env', check: (s) => !!s.fs[`${HOME}/secrets/.env`] && !s.fs['/var/www/shop/.env'] },
  ],
  hints: [
    'nginx keeps one config file per site in /etc/nginx/sites-enabled. List that folder, then cat the shop file. Look for the "root" line.',
    'Files whose names start with a dot are hidden. Use ls -la inside the web folder.',
    'Search the log instead of reading it all: grep ".env" /var/log/nginx/access.log',
    'Create the folder first with mkdir ~/secrets. The web folder belongs to root, so the move needs sudo: sudo mv .env ~/secrets/',
  ],
  solution: [
    'ls /etc/nginx/sites-enabled',
    'cat /etc/nginx/sites-enabled/shop.conf',
    'cd /var/www/shop',
    'ls -la',
    'grep ".env" /var/log/nginx/access.log',
    'mkdir ~/secrets',
    'sudo mv .env ~/secrets/',
  ],
  debrief: (
    <>
      <p>
        Anything inside nginx's <code>root</code> folder is public, hidden or not. The log shows <code>203.0.113.9</code> downloaded it at 02:58 with
        status <strong>200</strong>, so moving the file is not enough: <strong>rotate every secret in it now</strong>.
      </p>
      <p>
        At work: keep secrets out of web folders (AWS Secrets Manager or SSM Parameter Store), add <code>.env</code> to <code>.gitignore</code>, and
        block dotfiles in nginx with <code>{'location ~ /\\. { deny all; }'}</code>.
      </p>
    </>
  ),
}

/* ------------------------------------------------------------------ 2. disk full */

function DiskGauge({ state }: { state: SimState }) {
  const used = diskUsage(state.fs)
  const pct = Math.ceil(used * 100)
  const tone = pct >= 90 ? 'var(--rose)' : pct >= 80 ? 'var(--amber)' : 'var(--green)'
  return (
    <div className="gauge">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
        <HardDrive size={16} /> Disk /dev/root
        <motion.span key={pct} initial={{ scale: 1.5 }} animate={{ scale: 1 }} transition={spring} style={{ marginLeft: 'auto', color: tone, fontFamily: 'var(--mono)' }}>
          {pct}%
        </motion.span>
      </div>
      <div className="gauge-track">
        <motion.div animate={{ width: `${pct}%`, backgroundColor: tone }} transition={spring} />
      </div>
      <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
        {human(Math.round(used * 20 * GB))} of 20G used · alert fires above 90%
      </div>
    </div>
  )
}

const OLD_LOG = (day: number) => `2026-10-${day} 00:00:01 INFO  log rotated\n2026-10-${day} 08:14:22 INFO  GET /health 200 2ms\n(... 31 million more lines ...)`

const diskFull: Scenario = {
  id: 'linux-fs/disk-full',
  title: 'Disk full at 3 AM',
  level: 'Medium',
  host: 'web-01',
  brief: (
    <>
      <p>
        <strong>PagerDuty:</strong> <code>web-01 disk / at 96%</code>. The app logs <em>"No space left on device"</em> and checkout is failing.
      </p>
      <p>Confirm the disk is full, find what is using the space, and free it without breaking the running app.</p>
    </>
  ),
  setup: () => ({
    fs: makeFs({
      ...BASE,
      '/opt/app/server.js': 'require("http").createServer(handler).listen(3000)',
      '/var/log/app/app.log': {
        type: 'file',
        size: 1.1 * GB,
        content: '2026-10-24 03:09:58 INFO  POST /checkout 200 120ms\n2026-10-24 03:10:01 ERROR write failed: ENOSPC: No space left on device\n2026-10-24 03:10:02 ERROR POST /checkout 500',
      },
      '/var/log/app/app.log.1': { type: 'file', size: 2.9 * GB, content: OLD_LOG(23) },
      '/var/log/app/app.log.2': { type: 'file', size: 2.9 * GB, content: OLD_LOG(22) },
      '/var/log/app/app.log.3': { type: 'file', size: 2.9 * GB, content: OLD_LOG(21) },
      '/var/log/app/app.log.4': { type: 'file', size: 2.9 * GB, content: OLD_LOG(20) },
      '/var/log/nginx/access.log': { type: 'file', size: 400 * MB, content: '198.51.100.4 - - [24/Oct/2026:03:10:02 +0000] "POST /checkout HTTP/1.1" 500 21' },
      '/var/log/syslog': 'Oct 24 03:10:01 web-01 kernel: EXT4-fs warning (device sda1): ext4_dx_add_entry: Directory index full!\nOct 24 03:10:01 web-01 app[812]: write failed: No space left on device',
      '/var/cache/apt/archives/nginx_1.24.0_amd64.deb': { type: 'file', size: 90 * MB, content: '(binary)' },
    }),
  }),
  goals: [
    { text: 'Confirm the disk is full', check: (s) => ran(s, /\bdf\b/) },
    { text: 'Find the folder that is eating the space', check: (s) => s.log.some((e) => /\bdu\b/.test(e.line) && /app/.test(e.out)) },
    { text: 'Delete the old rotated logs, but keep the live app.log', check: (s) => [1, 2, 3, 4].every((n) => !s.fs[`/var/log/app/app.log.${n}`]) && !!s.fs['/var/log/app/app.log'] },
    { text: 'Get disk usage under 80%', check: (s) => diskUsage(s.fs) < 0.8 },
  ],
  hints: [
    'df -h shows how full each disk is (look at Use%).',
    'du -sh /var/log/* shows the size of each folder in /var/log. Add | sort -h to put the biggest last. Then look inside the biggest one with ls -lh.',
    'app.log.1 to app.log.4 are old, rotated copies. A glob matches them all: /var/log/app/app.log.* (it does not match app.log itself).',
    'Log files belong to root, so deleting them needs sudo: sudo rm /var/log/app/app.log.*',
  ],
  solution: ['df -h', 'du -sh /var/log/* | sort -h', 'ls -lh /var/log/app', 'sudo rm /var/log/app/app.log.*', 'df -h'],
  debrief: (
    <>
      <p>
        Why keep <code>app.log</code>? The app still has it open. If you delete an open file, Linux hides the name but keeps the space until the
        process restarts (<code>lsof | grep deleted</code> finds these). To empty a live log, use <code>sudo truncate -s 0 app.log</code> instead.
      </p>
      <p>
        Stop it happening again: configure <strong>logrotate</strong> (compress, keep 4), ship logs to CloudWatch, and add an alarm at 80% disk so you
        hear about it before customers do.
      </p>
    </>
  ),
  Visual: DiskGauge,
}

/* ------------------------------------------------------------------ 3. crash investigation */

const CRASH_LOG = [
  '2026-10-24 03:11:02 INFO  payments-api v2.4.1 starting',
  '2026-10-24 03:11:02 INFO  loading config from /opt/payments/config/.env',
  '2026-10-24 03:11:03 INFO  listening on :8080',
  '2026-10-24 03:11:40 INFO  POST /charge 200 81ms',
  '2026-10-24 03:11:52 WARN  db pool: no free connections, opening new one',
  '2026-10-24 03:12:01 ERROR db: connect ECONNREFUSED 10.0.2.15:5433',
  '2026-10-24 03:12:01 INFO  retrying db connection (1/4)',
  '2026-10-24 03:12:03 ERROR db: connect ECONNREFUSED 10.0.2.15:5433',
  '2026-10-24 03:12:03 INFO  retrying db connection (2/4)',
  '2026-10-24 03:12:07 ERROR db: connect ECONNREFUSED 10.0.2.15:5433',
  '2026-10-24 03:12:07 INFO  retrying db connection (3/4)',
  '2026-10-24 03:12:15 ERROR db: connect ECONNREFUSED 10.0.2.15:5433',
  '2026-10-24 03:12:15 INFO  retrying db connection (4/4)',
  '2026-10-24 03:12:31 ERROR db: connect ECONNREFUSED 10.0.2.15:5433',
  '2026-10-24 03:12:40 ERROR POST /charge 500 database unavailable',
  '2026-10-24 03:12:41 FATAL too many database failures, shutting down',
]
const ERROR_LINES = CRASH_LOG.filter((l) => l.includes('ERROR'))

const crash: Scenario = {
  id: 'linux-fs/payments-crash',
  title: 'Why did the payments API die?',
  level: 'Medium',
  host: 'api-02',
  brief: (
    <>
      <p>
        <strong>Slack #incidents:</strong> "payments-api went down at 03:12 and won't stay up. Can someone look at the logs?"
      </p>
      <p>Find what killed it, count the errors, save them for the incident report, and find the config the app was using.</p>
    </>
  ),
  setup: () => ({
    fs: makeFs({
      ...BASE,
      '/var/log/payments/app.log': CRASH_LOG.join('\n'),
      '/var/log/payments/app-2026-10-23.log': '2026-10-23 09:00:00 INFO  payments-api v2.4.0 starting\n2026-10-23 09:00:01 INFO  listening on :8080',
      '/var/log/syslog': 'Oct 24 03:12:41 api-02 systemd[1]: payments.service: Main process exited, code=exited, status=1/FAILURE',
      '/opt/payments/app.js': 'const db = connect(process.env.DB_HOST, process.env.DB_PORT)',
      '/opt/payments/config/.env': 'PORT=8080\nDB_HOST=10.0.2.15\nDB_PORT=5433\nDB_NAME=payments',
      '/opt/payments/config/.env.example': 'PORT=8080\nDB_HOST=db.internal\nDB_PORT=5432\nDB_NAME=payments',
      [`${HOME}/runbook.txt`]: 'payments-api\n- logs: /var/log/payments\n- database: PostgreSQL on 10.0.2.15, port 5432',
    }),
  }),
  goals: [
    { text: 'Find the FATAL line that stopped the app', check: (s) => saw(s, 'FATAL too many') },
    {
      text: 'Count the ERROR lines (grep -c, or pipe into wc -l)',
      check: (s) => s.log.some((e) => /ERROR/.test(e.line) && (/\s-\w*c/.test(e.line) || /wc\s+-l/.test(e.line)) && e.out.trim() === String(ERROR_LINES.length)),
    },
    {
      text: 'Save every ERROR line into ~/incident.txt',
      check: (s) => {
        const body = s.fs[`${HOME}/incident.txt`]?.content?.trim().split('\n') ?? []
        return body.length === ERROR_LINES.length && body.every((l) => l.includes('ERROR'))
      },
    },
    { text: 'Find the config file the app loads and read it', check: (s) => saw(s, 'DB_PORT=5433') },
  ],
  hints: [
    'Logs live under /var/log. Search instead of scrolling: grep FATAL /var/log/payments/app.log',
    'grep -c ERROR FILE prints how many lines match. Or: grep ERROR FILE | wc -l',
    'Send grep output into a file with >: grep ERROR /var/log/payments/app.log > ~/incident.txt',
    'The second log line says where the config comes from. It is a hidden file, so use ls -a to see it, then cat it. Compare it with the runbook in your home folder.',
  ],
  solution: [
    'grep FATAL /var/log/payments/app.log',
    'grep -c ERROR /var/log/payments/app.log',
    'grep ERROR /var/log/payments/app.log > ~/incident.txt',
    'head -n 3 /var/log/payments/app.log',
    'cat /opt/payments/config/.env',
    'cat ~/runbook.txt',
  ],
  debrief: (
    <>
      <p>
        Root cause: the app connects to port <strong>5433</strong>, but PostgreSQL listens on <strong>5432</strong> (see the runbook and{' '}
        <code>.env.example</code>). Every connection was refused, retries ran out, and the app shut itself down.
      </p>
      <p>
        At work you would fix the config, restart with <code>sudo systemctl restart payments</code>, and add the timeline and the saved error lines to
        the incident report. A config check in the CI pipeline would have caught the typo before it shipped.
      </p>
    </>
  ),
}

/* ------------------------------------------------------------------ 4. manual release */

const BUILD = { 'index.html': '<h1>Shop v2</h1>', 'app.js': 'console.log("v2")', 'style.css': 'body { color: navy }' }

const release: Scenario = {
  id: 'linux-fs/manual-release',
  title: 'Ship release v2 by hand',
  level: 'Hard',
  host: 'web-01',
  brief: (
    <>
      <p>
        <strong>Your lead:</strong> "CI is down, so ship v2 by hand. The build is in <code>~/build</code>. Clean out the temp junk, copy it into a new{' '}
        <code>/opt/shop/releases/v2</code>, back up the config, and point <code>current.txt</code> at v2."
      </p>
    </>
  ),
  setup: () => ({
    fs: makeFs({
      ...BASE,
      ...Object.fromEntries(Object.entries(BUILD).map(([k, v]) => [`${HOME}/build/${k}`, v])),
      [`${HOME}/build/debug.tmp`]: 'tmp',
      [`${HOME}/build/cache.tmp`]: 'tmp',
      [`${HOME}/build/upload.tmp`]: 'tmp',
      '/opt/shop/releases/v1/index.html': '<h1>Shop v1</h1>',
      '/opt/shop/releases/v1/app.js': 'console.log("v1")',
      '/opt/shop/releases/v1/style.css': 'body { color: black }',
      '/opt/shop/config/app.conf': 'port=3000\nenv=production\nreleases=/opt/shop/releases',
      '/opt/shop/current.txt': 'v1',
    }),
  }),
  goals: [
    { text: 'Delete all .tmp files from ~/build', check: (s) => !Object.keys(s.fs).some((k) => k.startsWith(`${HOME}/build/`) && k.endsWith('.tmp')) },
    { text: 'Create the folder /opt/shop/releases/v2', check: (s) => s.fs['/opt/shop/releases/v2']?.type === 'dir' },
    {
      text: 'Copy the 3 build files into v2 (and no .tmp files)',
      check: (s) =>
        Object.keys(BUILD).every((f) => s.fs[`/opt/shop/releases/v2/${f}`]?.type === 'file') && !Object.keys(s.fs).some((k) => k.startsWith('/opt/shop/releases/v2/') && k.endsWith('.tmp')),
    },
    { text: 'Back up app.conf as app.conf.bak in the same folder', check: (s) => s.fs['/opt/shop/config/app.conf.bak']?.content === s.fs['/opt/shop/config/app.conf']?.content },
    { text: 'Make /opt/shop/current.txt say v2', check: (s) => s.fs['/opt/shop/current.txt']?.content?.trim() === 'v2' },
  ],
  hints: [
    'A glob deletes all temp files at once: rm ~/build/*.tmp (try ls ~/build/*.tmp first to see what it matches).',
    '/opt belongs to root, so creating folders there needs sudo: sudo mkdir -p /opt/shop/releases/v2',
    'Copy everything with one glob: sudo cp ~/build/* /opt/shop/releases/v2/',
    'sudo does not apply to > redirects, because your own shell opens the file. The trick is tee: echo v2 | sudo tee /opt/shop/current.txt',
  ],
  solution: [
    'ls ~/build/*.tmp',
    'rm ~/build/*.tmp',
    'sudo mkdir -p /opt/shop/releases/v2',
    'sudo cp ~/build/* /opt/shop/releases/v2/',
    'sudo cp /opt/shop/config/app.conf /opt/shop/config/app.conf.bak',
    'echo v2 | sudo tee /opt/shop/current.txt',
    'tree /opt/shop',
  ],
  debrief: (
    <>
      <p>
        You just did a deploy by hand: clean, copy, back up, switch. Real servers use a <strong>symlink</strong> instead of current.txt:{' '}
        <code>ln -sfn releases/v2 current</code>. Rolling back is pointing it at v1 again, which takes one second.
      </p>
      <p>A CI/CD pipeline (see the CI/CD lesson) runs these exact steps for you on every push, so nobody types them at 3 AM.</p>
    </>
  ),
}

export const scenarios: Scenario[] = [leakedEnv, diskFull, crash, release]
