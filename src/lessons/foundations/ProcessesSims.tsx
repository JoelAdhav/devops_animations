import { motion } from 'motion/react'
import { Cpu } from 'lucide-react'
import type { Scenario } from '../../components/SimLab'
import { saw, type SimState } from '../../lib/sim'
import { BASE_PROCS, load1, log, newWorld, readWorld, serviceCommands, withWorld, type Unit, type World } from '../../lib/services'
import { HOME, can, makeFs, modeOf } from '../../lib/vfs'
import { spring } from '../../lib/motion'

const BASE = {
  '/tmp': null,
  '/root/.bashrc': '# root only',
  [`${HOME}/.bashrc`]: "alias ll='ls -la'",
}

/** Live view of the services a ticket is about. */
function UnitPanel({ state, names }: { state: SimState; names: string[] }) {
  const w = readWorld(state.fs)
  return (
    <div className="mini-table">
      <header>Services (live)</header>
      {names.map((n) => {
        const u = w.units[n]
        if (!u) return null
        const tone = u.state === 'active' ? 'var(--green)' : u.state === 'failed' ? 'var(--rose)' : 'var(--muted)'
        return (
          <div className="row" key={n}>
            <span>{n}</span>
            <motion.b key={u.state + u.enabled} initial={{ scale: 1.4 }} animate={{ scale: 1 }} transition={spring} style={{ color: tone }}>
              {u.state} · {u.enabled ? 'starts at boot' : 'not at boot'}
            </motion.b>
          </div>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ 1. port 80 taken */

const NGINX: Unit = {
  name: 'nginx',
  description: 'A high performance web server and a reverse proxy server',
  user: 'root',
  exec: '/usr/sbin/nginx -g daemon on; master_process on;',
  enabled: true,
  state: 'failed',
  pid: 811,
  result: 'exit-code',
}

const PY = 4242

const nginxCmds = serviceCommands({
  host: 'web-01',
  start: (_fs, w) =>
    w.procs.some((p) => p.port === 80)
      ? {
          ok: false,
          logs: [
            'nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)',
            'nginx: [emerg] still could not bind()',
          ],
        }
      : { ok: true, proc: { user: 'root', cpu: 0.1, mem: 0.3, cmd: 'nginx: master process /usr/sbin/nginx', port: 80 } },
  http: (_w, p, path) =>
    p.cmd.startsWith('nginx')
      ? { status: 200, headers: ['Server: nginx/1.24.0 (Ubuntu)', 'Content-Type: text/html'], body: '<h1>Shop is up</h1>' }
      : {
          status: 200,
          headers: ['Server: SimpleHTTP/0.6 Python/3.12.3', 'Content-Type: text/html'],
          body: `<title>Directory listing for ${path}</title>\n<h1>Directory listing for ${path}</h1>\n<li><a href="notes.txt">notes.txt</a></li>\n<li><a href="old-site/">old-site/</a></li>`,
        },
})

function nginxWorld(): World {
  let w = newWorld({
    units: {
      nginx: NGINX,
      ssh: { name: 'ssh', description: 'OpenBSD Secure Shell server', user: 'root', exec: '/usr/sbin/sshd -D', enabled: true, state: 'active', pid: 702 },
    },
    procs: [...BASE_PROCS, { pid: PY, user: 'priya', cpu: 0.2, mem: 0.6, cmd: 'python3 -m http.server 80', port: 80 }],
  })
  w = log(w, 'web-01', 'nginx', 'systemd', 1, ['Starting nginx.service - A high performance web server and a reverse proxy server...'])
  w = log(w, 'web-01', 'nginx', 'nginx', 811, ['nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)', 'nginx: [emerg] still could not bind()'])
  w = log(w, 'web-01', 'nginx', 'systemd', 1, [
    'nginx.service: Control process exited, code=exited, status=1/FAILURE',
    "nginx.service: Failed with result 'exit-code'.",
    'Failed to start nginx.service - A high performance web server and a reverse proxy server.',
  ])
  return w
}

const portTaken: Scenario = {
  id: 'proc/port-taken',
  title: 'nginx will not start after the reboot',
  level: 'Easy',
  host: 'web-01',
  brief: (
    <>
      <p>
        <strong>Customer email:</strong> "Your shop shows a weird page that says <em>Directory listing for /</em>."
      </p>
      <p>web-01 was rebooted at 02:50. Find out why nginx is not serving the shop, get it running, and check the site answers.</p>
    </>
  ),
  setup: () => ({
    fs: withWorld(
      makeFs({
        ...BASE,
        '/etc/nginx/nginx.conf': 'user www-data;\ninclude /etc/nginx/sites-enabled/*;',
        '/etc/nginx/sites-enabled/shop.conf': 'server {\n    listen 80;\n    root /var/www/shop;\n}',
        '/var/www/shop/index.html': '<h1>Shop is up</h1>',
        '/home/priya/notes.txt': { type: 'file', owner: 'priya', content: 'testing old-site on port 80 with python http.server' },
      }),
      nginxWorld(),
    ),
  }),
  commands: nginxCmds,
  goals: [
    { text: 'Check the nginx service status', check: (s) => s.log.some((e) => /systemctl\s+status\s+nginx/.test(e.line) && e.out.includes('failed')) },
    { text: "Read nginx's error in the journal", check: (s) => s.log.some((e) => /journalctl/.test(e.line) && e.out.includes('Address already in use')) },
    { text: 'Find which process is holding port 80', check: (s) => saw(s, `pid=${PY}`) || saw(s, `${PY}/python3`) || s.log.some((e) => /lsof/.test(e.line) && e.out.includes(String(PY))) },
    { text: 'Stop that process', check: (s) => !readWorld(s.fs).procs.some((p) => p.pid === PY) },
    { text: 'Start nginx', check: (s) => readWorld(s.fs).units.nginx?.state === 'active' },
    { text: 'Prove the shop answers on port 80', check: (s) => s.log.some((e) => /\bcurl\b/.test(e.line) && e.out.includes('Shop is up')) },
  ],
  hints: [
    'systemctl status nginx shows the state and the last log lines. journalctl -u nginx shows the whole log for that service.',
    '"Address already in use" means another program is listening on port 80. sudo ss -tlnp lists listening ports and which process owns each (without sudo you cannot see other users\' processes).',
    'That process belongs to priya, so you need sudo to stop it: sudo kill 4242',
    'sudo systemctl start nginx, then curl localhost',
  ],
  solution: ['curl localhost', 'systemctl status nginx', 'journalctl -u nginx', 'sudo ss -tlnp', `ps -p ${PY}`, `sudo kill ${PY}`, 'sudo systemctl start nginx', 'curl -i localhost'],
  debrief: (
    <>
      <p>
        Only one program can listen on a port. Someone left a test web server (<code>python3 -m http.server 80</code>) running, it grabbed port 80
        first after the reboot, and nginx failed with <em>Address already in use</em>. Customers got the Python server's directory listing.
      </p>
      <p>
        The order of debugging is the habit that matters: <strong>status → logs → who holds the port → fix → verify</strong>. Afterwards, talk to
        Priya and use a high port (8080) for experiments.
      </p>
    </>
  ),
  Visual: ({ state }: { state: SimState }) => <UnitPanel state={state} names={['nginx']} />,
}

/* ------------------------------------------------------------------ 2. runaway cron job */

const CRON = '/etc/cron.d/report'
const REPORT = '/opt/scripts/report.sh'
const isReport = (cmd: string) => cmd.includes('report.sh')
const reportProc = (pid: number) => ({ pid, user: 'root', cpu: 48.7, mem: 0.4, cmd: `/bin/bash ${REPORT}`, stubborn: true })

const cpuCmds = serviceCommands({
  host: 'app-02',
  start: () => ({ ok: true, proc: { user: 'root', cpu: 0.1, mem: 0.2, cmd: 'service' } }),
  // Cron starts another copy every few commands while its job file exists.
  tick: (fs, w) => {
    if (!fs[CRON] || w.tick % 4 !== 0 || w.procs.filter((p) => isReport(p.cmd)).length >= 6) return w
    return { ...w, procs: [...w.procs, reportProc(w.nextPid)], nextPid: w.nextPid + 3 }
  },
})

function CpuGauge({ state }: { state: SimState }) {
  const w = readWorld(state.fs)
  const busy = Math.min(100, Math.round(w.procs.reduce((s, p) => s + p.cpu, 0) / 2))
  const copies = w.procs.filter((p) => isReport(p.cmd)).length
  const tone = busy >= 90 ? 'var(--rose)' : busy >= 60 ? 'var(--amber)' : 'var(--green)'
  return (
    <div className="gauge">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
        <Cpu size={16} /> CPU (2 cores)
        <motion.span key={busy} initial={{ scale: 1.5 }} animate={{ scale: 1 }} transition={spring} style={{ marginLeft: 'auto', color: tone, fontFamily: 'var(--mono)' }}>
          {busy}%
        </motion.span>
      </div>
      <div className="gauge-track">
        <motion.div animate={{ width: `${busy}%`, backgroundColor: tone }} transition={spring} />
      </div>
      <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
        load {load1(w).toFixed(2)} · {copies} cop{copies === 1 ? 'y' : 'ies'} of report.sh running
      </div>
    </div>
  )
}

const runaway: Scenario = {
  id: 'proc/runaway-cron',
  title: 'CPU stuck at 100%',
  level: 'Medium',
  host: 'app-02',
  brief: (
    <>
      <p>
        <strong>CloudWatch alarm:</strong> <code>app-02 CPUUtilization &gt; 95% for 30 minutes</code>. The API is slow for everyone.
      </p>
      <p>Find what is eating the CPU, stop it for good, and confirm the server calms down.</p>
    </>
  ),
  setup: () => {
    let w = newWorld({
      units: { 'shop-api': { name: 'shop-api', description: 'Shop API', user: 'shop', exec: '/usr/bin/node /opt/shop-api/server.js', enabled: true, state: 'active', pid: 2210 } },
      procs: [...BASE_PROCS, { pid: 2210, user: 'shop', cpu: 3.1, mem: 4.2, cmd: '/usr/bin/node /opt/shop-api/server.js', port: 3000 }, reportProc(6101), reportProc(6407), reportProc(6730), reportProc(7044)],
      nextPid: 7300,
      load: [3.91, 3.12],
    })
    w = log(w, 'app-02', 'cron', 'CRON', 6101, ['(root) CMD (/opt/scripts/report.sh)'])
    w = log(w, 'app-02', 'cron', 'CRON', 7044, ['(root) CMD (/opt/scripts/report.sh)'])
    return {
      fs: withWorld(
        makeFs({
          ...BASE,
          [CRON]: '# Nightly sales report. Added by Arjun on Oct 23.\n*/5 * * * * root /opt/scripts/report.sh',
          '/etc/cron.d/logrotate': '0 0 * * * root /usr/sbin/logrotate /etc/logrotate.conf',
          [REPORT]: { type: 'file', mode: 0o755, content: '#!/bin/bash\n# Build the sales report.\n# BUG: this loop never ends. It should run once and exit.\n# while true; do gzip -9 -c /var/log/app/*.log > /tmp/report.gz; done' },
          '/var/log/app/app.log': '2026-10-24 03:12:01 WARN slow request: GET /products 4210ms',
        }),
        w,
      ),
    }
  },
  commands: cpuCmds,
  goals: [
    { text: 'Check how loaded the server is', check: (s) => saw(s, 'load average:') },
    { text: 'Find what is eating the CPU', check: (s) => s.log.some((e) => /\b(ps|top)\b/.test(e.line) && e.out.includes('report.sh')) },
    { text: 'Stop cron from starting new copies', check: (s) => !s.fs[CRON] },
    { text: 'Kill every copy of report.sh', check: (s) => !readWorld(s.fs).procs.some((p) => isReport(p.cmd)) },
    {
      // Only the latest check counts, and only once nothing can bring the load back.
      text: 'Confirm the load is dropping',
      check: (s) => {
        const last = [...s.log].reverse().find((e) => /\b(uptime|top)\b/.test(e.line))
        return !!last && /load average: 0\./.test(last.out) && !s.fs[CRON] && !readWorld(s.fs).procs.some((p) => isReport(p.cmd))
      },
    },
  ],
  hints: [
    'uptime (or top) shows the load average: how many processes want the CPU. On a 2-core server, anything above 2 means a queue.',
    'top, or ps aux --sort=-%cpu | head, puts the biggest CPU users first. Several copies of the same script is a clue: something keeps starting it. Look in /etc/cron.d.',
    'Disable the job first, or cron starts new copies while you kill: sudo mv /etc/cron.d/report /root/report.cron.disabled (or sudo rm it).',
    'kill sends SIGTERM, a polite "please stop". This script ignores it, so force it: sudo pkill -9 -f report.sh. Then run uptime.',
  ],
  solution: ['uptime', 'ps aux --sort=-%cpu | head -n 6', `cat ${CRON}`, `cat ${REPORT}`, `sudo mv ${CRON} /root/report.cron.disabled`, 'sudo pkill -f report.sh', 'ps aux | grep report', 'sudo pkill -9 -f report.sh', 'uptime'],
  debrief: (
    <>
      <p>
        The script had an endless loop, and cron started a fresh copy every 5 minutes, so copies piled up. Killing them without disabling cron only
        buys a few minutes. <code>kill</code> asks politely (SIGTERM); <code>kill -9</code> (SIGKILL) cannot be ignored, but gives the program no
        chance to clean up, so use it second.
      </p>
      <p>
        The 1-minute load drops at once; the 5 and 15-minute numbers fall slowly. At work: a CloudWatch alarm on CPU, <code>timeout 10m</code> in
        cron jobs, and <code>flock</code> so a job never runs twice at the same time.
      </p>
    </>
  ),
  Visual: CpuGauge,
}

/* ------------------------------------------------------------------ 3. service user cannot write its logs */

const LOGDIR = '/var/log/shop'
const shopCanLog = (fs: SimState['fs']) => can(fs, 'shop', LOGDIR, 2) && can(fs, 'shop', LOGDIR, 1)

const API: Unit = {
  name: 'shop-api',
  description: 'Shop API (Node.js)',
  user: 'shop',
  exec: '/usr/bin/node /opt/shop-api/server.js',
  enabled: false,
  state: 'inactive',
}

const apiCmds = serviceCommands({
  host: 'app-01',
  start: (fs) =>
    shopCanLog(fs)
      ? { ok: true, proc: { user: 'shop', cpu: 1.2, mem: 3.9, cmd: '/usr/bin/node /opt/shop-api/server.js', port: 3000 }, logs: ['shop-api listening on :3000', 'writing logs to /var/log/shop/api.log'] }
      : {
          ok: false,
          logs: [
            "Error: EACCES: permission denied, open '/var/log/shop/api.log'",
            '    at Object.openSync (node:fs:573:18)',
            '    at createLogger (/opt/shop-api/logger.js:12:20)',
          ],
        },
  http: (_w, _p, path) => (path === '/health' ? { status: 200, headers: ['Content-Type: application/json'], body: '{"status":"ok","db":"ok"}' } : { status: 404, body: '{"error":"not found"}' }),
})

const serviceUser: Scenario = {
  id: 'proc/service-user',
  title: 'shop-api is down after the reboot',
  level: 'Hard',
  host: 'app-01',
  brief: (
    <>
      <p>
        <strong>On-call handover:</strong> "app-01 was patched and rebooted. shop-api did not come back. Last week someone cleaned up{' '}
        <code>/var/log</code> by hand. Good luck!"
      </p>
      <p>Get the service running, make sure it survives the next reboot, and check its health endpoint.</p>
    </>
  ),
  setup: () => ({
    fs: withWorld(
      makeFs({
        ...BASE,
        [LOGDIR]: { type: 'dir', mode: 0o755 },
        '/etc/systemd/system/shop-api.service':
          '[Unit]\nDescription=Shop API (Node.js)\nAfter=network.target\n\n[Service]\nUser=shop\nWorkingDirectory=/opt/shop-api\nExecStart=/usr/bin/node /opt/shop-api/server.js\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target',
        '/opt/shop-api/server.js': 'require("./logger")("/var/log/shop/api.log")\napp.listen(3000)',
        '/opt/shop-api/logger.js': 'module.exports = (file) => fs.openSync(file, "a")',
        [`${HOME}/handover.txt`]: 'shop-api: systemd unit "shop-api", health check: curl localhost:3000/health',
      }),
      newWorld({ units: { 'shop-api': API, ssh: { name: 'ssh', description: 'OpenBSD Secure Shell server', user: 'root', exec: '/usr/sbin/sshd -D', enabled: true, state: 'active', pid: 702 } } }),
    ),
  }),
  commands: apiCmds,
  goals: [
    { text: 'Try to start it and find the error in its logs', check: (s) => saw(s, 'EACCES: permission denied') },
    { text: 'Find which user the service runs as', check: (s) => saw(s, 'User=shop') },
    { text: `Give that user write access to ${LOGDIR} (not to everyone)`, check: (s) => shopCanLog(s.fs) && !!s.fs[LOGDIR] && (modeOf(LOGDIR, s.fs[LOGDIR]) & 0o002) === 0 },
    { text: 'Start it and make it start at every boot', check: (s) => readWorld(s.fs).units['shop-api']?.state === 'active' && !!readWorld(s.fs).units['shop-api']?.enabled },
    { text: 'Check the health endpoint answers', check: (s) => s.log.some((e) => /\bcurl\b/.test(e.line) && e.out.includes('"status":"ok"')) },
  ],
  hints: [
    'systemctl status shop-api shows it is inactive and "disabled". sudo systemctl start shop-api, then journalctl -u shop-api to see why it fails.',
    'The unit file says who the service runs as: cat /etc/systemd/system/shop-api.service (look for User=).',
    `ls -ld ${LOGDIR}: it belongs to root, so the shop user cannot create its log there. sudo chown shop:shop ${LOGDIR}. Never chmod 777.`,
    'sudo systemctl enable --now shop-api starts it and turns on start-at-boot in one go. Then curl localhost:3000/health',
  ],
  solution: [
    'systemctl status shop-api',
    'sudo systemctl start shop-api',
    'journalctl -u shop-api -n 20',
    'cat /etc/systemd/system/shop-api.service',
    `ls -ld ${LOGDIR}`,
    `sudo chown shop:shop ${LOGDIR}`,
    'sudo systemctl enable --now shop-api',
    'curl localhost:3000/health',
  ],
  debrief: (
    <>
      <p>
        Two separate problems: the service was <strong>disabled</strong>, so it never starts on boot, and its log folder had been recreated as{' '}
        <code>root</code>, so the <code>shop</code> user could not write to it. Services run as their own low-privilege user on purpose; fix the
        ownership, never run the app as root and never use 777.
      </p>
      <p>
        <code>enable</code> means "start at boot", <code>start</code> means "start now". <code>enable --now</code> does both. After every reboot,
        check <code>systemctl --failed</code>.
      </p>
    </>
  ),
  Visual: ({ state }: { state: SimState }) => <UnitPanel state={state} names={['shop-api']} />,
}

export const scenarios: Scenario[] = [portTaken, runaway, serviceUser]

